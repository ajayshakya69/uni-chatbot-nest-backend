import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { QueryTypes } from 'sequelize';
import { DbService } from 'src/core/services/db-service/db.service';

interface TranscribeChunk {
  chunk_text: string;
  start_time: number;
  end_time: number;
}

interface TranscribeResponse {
  video_url: string;
  chunks: TranscribeChunk[];
}

interface EmbedResponse {
  embeddings: number[][];
}

export interface SearchResult {
  video_url: string;
  timestamp: number;
  text: string;
  distance?: number;
  keyword_score?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  message?: string;
}

const EMBEDDING_DIM = 768;
const EMBEDDING_BATCH_SIZE = 32;
const DEFAULT_SEARCH_LIMIT = 5;
const SIMILARITY_THRESHOLD = 0.22;

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);
  private readonly pythonServiceUrl: string;

  constructor(
    private readonly dbService: DbService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.pythonServiceUrl = this.config.get<string>(
      'PYTHON_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  async storeFromUrl(videoUrl: string): Promise<{ stored: number }> {
    if (!videoUrl?.trim()) {
      throw new BadRequestException('video_url is required');
    }

    this.logger.log(`[storeFromUrl] Starting transcription for ${videoUrl}`);

    const transcript = await this.callTranscribe(videoUrl);
    const { video_url, chunks } = transcript;

    if (!chunks?.length) {
      this.logger.warn(`[storeFromUrl] No chunks returned for ${videoUrl}`);
      return { stored: 0 };
    }

    this.logger.log(`[storeFromUrl] Generating embeddings for ${chunks.length} chunks`);
    const texts = chunks.map((c) => c.chunk_text);
    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
      const batchEmbeddings = await this.callEmbed(batch);
      embeddings.push(...batchEmbeddings);
    }

    this.logger.log(`[storeFromUrl] Inserting ${chunks.length} chunks into DB`);
    const TranscriptChunkModel = this.dbService.sqlService.TranscriptChunkModel;

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i] ?? this.embedPlaceholderSync(chunk.chunk_text);
        await TranscriptChunkModel.create({
          video_url,
          chunk_text: chunk.chunk_text,
          start_time: chunk.start_time,
          end_time: chunk.end_time,
          embedding,
        });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[storeFromUrl] DB insert failed: ${msg}`, (error as Error)?.stack);
      throw new InternalServerErrorException(`Failed to store chunks: ${msg}`);
    }

    this.logger.log(`[storeFromUrl] Stored ${chunks.length} chunks for ${video_url}`);
    return { stored: chunks.length };
  }

  async search(
    query: string,
    limit = DEFAULT_SEARCH_LIMIT,
    debug = false,
  ): Promise<SearchResponse> {
    if (!query?.trim()) {
      return { results: [], message: 'No relevant speech found for this query' };
    }

    this.logger.log(`[search] query="${query.trim()}" limit=${limit} debug=${debug}`);

    const embedding = await this.getQueryEmbedding(query.trim());
    const sequelize = this.dbService.getSqlConnection().getSequelizeInstance();
    const embeddingStr = `[${embedding.join(',')}]`;

    let raw: any;
    try {
      raw = await sequelize.query(
        `SELECT
           video_url,
           chunk_text,
           start_time,
           embedding <=> :embedding::vector AS distance,
           similarity(chunk_text, :query) AS keyword_score
         FROM transcript_chunks
         WHERE embedding <=> :embedding::vector < :threshold
         ORDER BY
           (embedding <=> :embedding::vector) ASC,
           similarity(chunk_text, :query) DESC
         LIMIT :limit`,
        {
          replacements: {
            embedding: embeddingStr,
            query: query.trim(),
            threshold: SIMILARITY_THRESHOLD,
            limit,
          },
          type: QueryTypes.SELECT,
        },
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[search] Query failed: ${msg}`, (error as Error)?.stack);
      throw new InternalServerErrorException(`Search query failed: ${msg}`);
    }

    const rowsArray = Array.isArray(raw) ? raw : [];
    this.logger.log(`[search] Found ${rowsArray.length} results`);

    const results: SearchResult[] = rowsArray.map(
      (r: {
        video_url: string;
        chunk_text: string;
        start_time: number;
        distance: number;
        keyword_score: number;
      }) => {
        const result: SearchResult = {
          video_url: r.video_url,
          timestamp: Math.floor(r.start_time),
          text: r.chunk_text,
        };
        if (debug) {
          result.distance = parseFloat(Number(r.distance).toFixed(4));
          result.keyword_score = parseFloat(Number(r.keyword_score).toFixed(4));
        }
        return result;
      },
    );

    if (results.length === 0) {
      return {
        results: [],
        message: 'No relevant speech found for this query',
      };
    }

    return { results };
  }

  async getAllVideosWithChunks(): Promise<{
    url: string;
    chunks: { id: string; text: string; start_time: number; end_time: number; timestamp: number }[];
  }[]> {
    this.logger.log('[getAllVideosWithChunks] Fetching all videos');

    const TranscriptChunkModel = this.dbService.sqlService.TranscriptChunkModel;

    const rows = await TranscriptChunkModel.findAll({
      order: [['video_url', 'ASC'], ['start_time', 'ASC']],
      attributes: ['id', 'video_url', 'chunk_text', 'start_time', 'end_time'],
    });

    const videoMap = new Map<string, { id: string; text: string; start_time: number; end_time: number; timestamp: number }[]>();

    for (const r of rows) {
      const chunks = videoMap.get(r.video_url) ?? [];
      chunks.push({
        id: r.id,
        text: r.chunk_text,
        start_time: r.start_time,
        end_time: r.end_time,
        timestamp: Math.floor(r.start_time),
      });
      videoMap.set(r.video_url, chunks);
    }

    const result = Array.from(videoMap.entries()).map(([url, chunks]) => ({
      url,
      chunks,
    }));

    this.logger.log(`[getAllVideosWithChunks] Found ${result.length} videos, ${rows.length} total chunks`);
    return result;
  }

  async getChunksByVideo(videoUrl: string): Promise<{
    video_url: string;
    total_chunks: number;
    chunks: { id: string; text: string; start_time: number; end_time: number; timestamp: number }[];
  }> {
    if (!videoUrl?.trim()) {
      throw new BadRequestException('url query parameter is required');
    }

    this.logger.log(`[getChunksByVideo] Fetching chunks for ${videoUrl}`);

    const TranscriptChunkModel = this.dbService.sqlService.TranscriptChunkModel;

    const rows = await TranscriptChunkModel.findAll({
      where: { video_url: videoUrl.trim() },
      order: [['start_time', 'ASC']],
      attributes: ['id', 'video_url', 'chunk_text', 'start_time', 'end_time', 'createdAt'],
    });

    this.logger.log(`[getChunksByVideo] Found ${rows.length} chunks`);

    return {
      video_url: videoUrl.trim(),
      total_chunks: rows.length,
      chunks: rows.map((r) => ({
        id: r.id,
        text: r.chunk_text,
        start_time: r.start_time,
        end_time: r.end_time,
        timestamp: Math.floor(r.start_time),
      })),
    };
  }

  async debugSearch(query: string, limit = 5): Promise<any[]> {
    if (!query?.trim()) return [];

    const embedding = await this.getQueryEmbedding(query.trim());
    const sequelize = this.dbService.getSqlConnection().getSequelizeInstance();
    const embeddingStr = `[${embedding.join(',')}]`;

    const raw = await sequelize.query(
      `SELECT
         chunk_text,
         embedding <=> :embedding::vector AS distance
       FROM transcript_chunks
       ORDER BY distance
       LIMIT :limit`,
      {
        replacements: { embedding: embeddingStr, limit },
        type: QueryTypes.SELECT,
      },
    );

    return Array.isArray(raw) ? raw : [];
  }

  private async callTranscribe(videoUrl: string): Promise<TranscribeResponse> {
    try {
      this.logger.log(`[callTranscribe] POST ${this.pythonServiceUrl}/transcribe`);
      const { data } = await firstValueFrom(
        this.httpService.post<TranscribeResponse>(
          `${this.pythonServiceUrl}/transcribe`,
          { url: videoUrl },
          { timeout: 0, headers: { 'Content-Type': 'application/json' } },
        ),
      );
      this.logger.log(`[callTranscribe] Received ${data?.chunks?.length ?? 0} chunks`);
      return data;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const axiosData = (error as any)?.response?.data;
      const detail = axiosData ? JSON.stringify(axiosData) : msg;
      this.logger.error(`[callTranscribe] Failed: ${detail}`, (error as Error)?.stack);
      throw new ServiceUnavailableException(`Transcribe service error: ${detail}`);
    }
  }

  private async callEmbed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    try {
      this.logger.log(`[callEmbed] Embedding ${texts.length} texts`);
      const { data } = await firstValueFrom(
        this.httpService.post<EmbedResponse>(
          `${this.pythonServiceUrl}/embed`,
          { texts, is_query: false },
          { timeout: 60000, headers: { 'Content-Type': 'application/json' } },
        ),
      );
      if (!data?.embeddings || data.embeddings.length !== texts.length) {
        throw new Error(
          `Invalid embedding response: expected ${texts.length}, got ${data?.embeddings?.length ?? 0}`,
        );
      }
      return data.embeddings;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[callEmbed] Failed (using placeholder): ${msg}`);
      return texts.map((t) => this.embedPlaceholderSync(t));
    }
  }

  private async getQueryEmbedding(text: string): Promise<number[]> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<EmbedResponse>(
          `${this.pythonServiceUrl}/embed`,
          { texts: [text], is_query: true },
          { timeout: 10000, headers: { 'Content-Type': 'application/json' } },
        ),
      );
      if (data?.embeddings?.[0]) return data.embeddings[0];
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[getQueryEmbedding] Failed (using placeholder): ${msg}`);
    }
    return this.embedPlaceholderSync(text);
  }

  private embedPlaceholderSync(text: string): number[] {
    const arr = new Array<number>(EMBEDDING_DIM);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      arr[i] = Math.sin(hash * (i + 1) + i) * 0.1;
    }
    const norm = Math.sqrt(arr.reduce((s, x) => s + x * x, 0)) || 1;
    return arr.map((x) => x / norm);
  }
}
