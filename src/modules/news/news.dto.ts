import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetTrendsQueryDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['news', 'x', 'all'], default: 'all' })
  @IsOptional()
  @IsIn(['news', 'x', 'all'])
  source?: string = 'all';

  @ApiPropertyOptional({
    enum: ['politics', 'education', 'economy', 'social', 'mixed', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['politics', 'education', 'economy', 'social', 'mixed', 'all'])
  niche?: string = 'all';
}

export class GenerateIdeasBodyDto {
  @ApiProperty({ description: 'MongoDB ObjectId of the trend' })
  @IsString()
  topic_id: string;
}
