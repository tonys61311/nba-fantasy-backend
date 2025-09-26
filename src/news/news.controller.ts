import { Controller, Get, Query } from '@nestjs/common';
import { NewsService } from './news.service';
import { LatestNewsItem, LatestNewsResponse, ArticleContent } from '../common/models/news';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get('latest')
  async getLatest(): Promise<LatestNewsResponse> {
    const items: LatestNewsItem[] = await this.newsService.getLatestNews();
    return { data: items };
  }

  @Get('article')
  async getArticle(@Query('url') url: string): Promise<ArticleContent> {
    return this.newsService.getArticleContent(url);
  }
}
