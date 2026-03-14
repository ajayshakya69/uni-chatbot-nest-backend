import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TranscriptController } from './transcript.controller';
import { TranscriptService } from './transcript.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 120000,
      maxRedirects: 5,
    }),
  ],
  controllers: [TranscriptController],
  providers: [TranscriptService],
  exports: [TranscriptService],
})
export class TranscriptModule {}
