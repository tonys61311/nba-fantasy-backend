import { Controller, Get } from '@nestjs/common';
import { NewsService } from '@/news/news.service';
import { LatestNewsItem, LatestNewsResponse } from '@/common/models/news';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get('latest')
  async getLatest(): Promise<LatestNewsResponse> {
    const items: LatestNewsItem[] = await this.newsService.getLatestNews();
    return { data: items };
  }
}
