import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NewsService } from './news.service';
import { GenerateIdeasBodyDto, GetTrendsQueryDto } from './news.dto';

@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get('trends')
  @ApiOperation({
    summary: 'Get trending Indian topics',
    description:
      'Returns top Indian trends sorted by news relevance score. Proxied from the news service.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'source', required: false, enum: ['news', 'x', 'all'] })
  @ApiQuery({
    name: 'niche',
    required: false,
    enum: ['politics', 'education', 'economy', 'social', 'mixed', 'all'],
  })
  @ApiResponse({ status: 200, description: 'Trend list returned successfully' })
  @ApiResponse({ status: 502, description: 'News service unavailable' })
  async getTrends(@Query() query: GetTrendsQueryDto) {
    return this.newsService.getTrends(query);
  }

  @Post('generate-ideas')
  @ApiOperation({
    summary: 'Generate content ideas for a trending topic',
    description:
      'Uses AI to generate tweets, hooks, opinions, and hashtags for the given trend. Proxied from the news service.',
  })
  @ApiBody({ type: GenerateIdeasBodyDto })
  @ApiResponse({ status: 200, description: 'Ideas generated successfully' })
  @ApiResponse({ status: 404, description: 'Trend not found' })
  @ApiResponse({ status: 502, description: 'News service unavailable' })
  async generateIdeas(@Body() body: GenerateIdeasBodyDto) {
    return this.newsService.generateIdeas(body.topic_id);
  }
}
