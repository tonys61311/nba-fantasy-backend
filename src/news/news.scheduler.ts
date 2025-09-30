import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NewsService } from './news.service';

@Injectable()
export class NewsScheduler {
  constructor(private readonly newsService: NewsService) {}

  // 每天 09:00 UTC 執行
  @Cron(CronExpression.EVERY_DAY_AT_9AM, { name: 'news_fetch_daily', timeZone: 'UTC' })
  async handleDailyFetch(): Promise<void> {
    await this.newsService.fetchAndSaveNewsDaily();
  }
}


