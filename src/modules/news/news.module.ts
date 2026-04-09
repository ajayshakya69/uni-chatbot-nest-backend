import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60_000,
      maxRedirects: 3,
    }),
  ],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
