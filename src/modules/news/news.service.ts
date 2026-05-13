import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GetTrendsQueryDto } from './news.dto';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly newsBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.newsBaseUrl = this.config.get<string>(
      'NEWS_SERVICE_URL',
      'http://localhost:4001',
    );
  }

  async getTrends(query: GetTrendsQueryDto): Promise<unknown[]> {
    const params = new URLSearchParams();
    if (query.limit != null) params.set('limit', String(query.limit));
    if (query.source) params.set('source', query.source);
    if (query.niche) params.set('niche', query.niche);

    const url = `${this.newsBaseUrl}/v1/trends?${params.toString()}`;
    this.logger.log(`Fetching trends: ${url}`);

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      // FastAPI returns { data: Trend[], meta: {} } — unwrap before NestJS re-wraps
      return response.data?.data ?? [];
    } catch (err: unknown) {
      this.handleAxiosError(err, 'getTrends');
    }
  }

  async generateIdeas(topicId: string): Promise<unknown> {
    const url = `${this.newsBaseUrl}/v1/generate-ideas`;
    this.logger.log(`Generating ideas for topic: ${topicId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, { topic_id: topicId }),
      );
      // FastAPI returns { data: GeneratedIdeas, meta: {} } — unwrap
      return response.data?.data ?? {};
    } catch (err: unknown) {
      this.handleAxiosError(err, 'generateIdeas');
    }
  }

  private handleAxiosError(err: unknown, context: string): never {
    const axiosErr = err as {
      response?: { status?: number; data?: { meta?: { message?: string } } };
      message?: string;
    };

    const status = axiosErr?.response?.status ?? 502;
    const message =
      axiosErr?.response?.data?.meta?.message ??
      axiosErr?.message ??
      'News service unavailable';

    this.logger.error(`[${context}] ${status}: ${message}`);
    throw new HttpException(message, status);
  }
}
