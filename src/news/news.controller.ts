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

  @Get('daily')
  async getDaily(): Promise<{ data: ArticleContent[] }> {
    const articles = await this.newsService.fetchAndSaveNewsDaily(1);
    return { data: articles };
  }

  // 新需求：GET /news 回傳 Firestore 最新文章列表
  @Get()
  async getLatestFromFirestore(): Promise<{ data: ArticleContent[] }> {
    const articles = await this.newsService.getLatestArticlesFromRepo(10);
    return { data: articles };
  }
}
