import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TranscriptService } from './transcript.service';
import {
  StoreTranscriptRequestDto,
  StoreTranscriptResponseDto,
  SearchResponseDto,
  VideoChunksResponseDto,
} from './transcript.dto';

@ApiTags('Transcript')
@Controller('transcript')
export class TranscriptController {
  constructor(private readonly transcriptService: TranscriptService) {}

  @Post('store')
  @ApiOperation({
    summary: 'Store transcript from YouTube URL',
    description:
      'Calls Python /transcribe, generates OpenAI embeddings, stores chunks in transcript_chunks.',
  })
  @ApiBody({ type: StoreTranscriptRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Transcript chunks stored successfully',
    type: StoreTranscriptResponseDto,
  })
  async store(@Body() body: StoreTranscriptRequestDto) {
    return this.transcriptService.storeFromUrl(body.video_url);
  }

  @Get('all')
  @ApiOperation({
    summary: 'Get all videos with their transcript chunks',
    description: 'Returns every stored video URL with all its chunks ordered by timestamp.',
  })
  async getAllVideos() {
    return this.transcriptService.getAllVideosWithChunks();
  }

  @Get('video')
  @ApiOperation({
    summary: 'Get all transcript chunks for a video',
    description:
      'Returns all stored chunks for a given YouTube video URL, ordered by timestamp.',
  })
  @ApiQuery({
    name: 'url',
    required: true,
    description: 'YouTube video URL',
    example: 'https://www.youtube.com/watch?v=bUWvXm1fvAM',
  })
  @ApiResponse({
    status: 200,
    description: 'All chunks for the video',
    type: VideoChunksResponseDto,
  })
  async getVideoChunks(@Query('url') url: string) {
    return this.transcriptService.getChunksByVideo(url ?? '');
  }

  @Get('search')
  @ApiOperation({
    summary: 'Semantic search over transcript chunks',
    description:
      'Hybrid search combining vector similarity with keyword matching. Returns results with video_url, timestamp, and text.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query (semantic + keyword)',
    example: 'tobacco harmful to nation',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results (1-20, default 5)',
    example: 5,
  })
  @ApiQuery({
    name: 'debug',
    required: false,
    description: 'Include distance and keyword_score in results',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results ordered by similarity',
    type: SearchResponseDto,
  })
  async search(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('debug') debug?: string,
  ) {
    const limitNum = limit ? Math.min(parseInt(limit, 10) || 5, 20) : 5;
    const isDebug = debug === 'true' || debug === '1';
    return this.transcriptService.search(q ?? '', limitNum, isDebug);
  }

  @Get('search/debug')
  @ApiOperation({
    summary: 'Debug similarity scores (top N closest chunks)',
    description:
      'Returns all chunks ordered by distance regardless of threshold. Useful for tuning.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 5)' })
  async debugSearch(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? Math.min(parseInt(limit, 10) || 20, 20) : 5;
    return this.transcriptService.debugSearch(q ?? '', limitNum);
  }
}
