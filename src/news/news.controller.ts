import { Controller, Get } from '@nestjs/common';
import { NewsService } from '@/news/news.service.js';
import { LatestNewsItem, LatestNewsResponse } from '@/common/models/news.js';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get('latest')
  async getLatest(): Promise<LatestNewsResponse> {
    const items: LatestNewsItem[] = await this.newsService.getLatestNews();
    return { data: items };
  }
}
