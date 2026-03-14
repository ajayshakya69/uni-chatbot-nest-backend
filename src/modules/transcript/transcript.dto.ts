import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class StoreTranscriptRequestDto {
  @ApiProperty({
    description: 'YouTube video URL to transcribe and store',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  @IsString()
  @IsNotEmpty()
  video_url: string;
}

export class StoreTranscriptResponseDto {
  @ApiProperty({
    description: 'Number of chunks stored',
    example: 42,
  })
  stored: number;
}

export class SearchResultDto {
  @ApiProperty({
    description: 'YouTube video URL',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  video_url: string;

  @ApiProperty({
    description: 'Timestamp in seconds (for YouTube &t= parameter)',
    example: 120,
  })
  timestamp: number;

  @ApiProperty({
    description: 'Matching transcript chunk text',
    example: 'This is a sample transcript text from the video.',
  })
  text: string;
}

export class VideoChunkDto {
  @ApiProperty({ description: 'Chunk UUID', example: 'a1b2c3d4-...' })
  id: string;

  @ApiProperty({
    description: 'Transcript text',
    example: 'टोबैक्यू इज इंजूरियस टू नेशन',
  })
  text: string;

  @ApiProperty({ description: 'Start time in seconds', example: 0.0 })
  start_time: number;

  @ApiProperty({ description: 'End time in seconds', example: 30.5 })
  end_time: number;

  @ApiProperty({
    description: 'Floored start time for YouTube &t= param',
    example: 0,
  })
  timestamp: number;
}

export class VideoChunksResponseDto {
  @ApiProperty({
    description: 'YouTube video URL',
    example: 'https://www.youtube.com/watch?v=bUWvXm1fvAM',
  })
  video_url: string;

  @ApiProperty({ description: 'Total number of chunks', example: 5 })
  total_chunks: number;

  @ApiProperty({ type: [VideoChunkDto], description: 'All chunks ordered by timestamp' })
  chunks: VideoChunkDto[];
}

export class SearchResponseDto {
  @ApiProperty({
    type: [SearchResultDto],
    description: 'Search results ordered by similarity',
  })
  results: SearchResultDto[];

  @ApiPropertyOptional({
    description: 'Message when no results found',
    example: 'No relevant speech found for this query',
  })
  message?: string;
}
