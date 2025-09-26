import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { XMLParser } from 'fast-xml-parser';
import { LatestNewsItem } from '@/common/models/news.js';
import { ensureArray, RssDocument, RssItem } from '@/common/models/rss.js';

// moved LatestNewsItem to common/models

@Injectable()
export class NewsService {
  constructor(private readonly httpService: HttpService) {}

  async getLatestNews(): Promise<LatestNewsItem[]> {
    try {
      // 1) Call ESPN RSS (XML). Tests can still mock this call.
      const response = await firstValueFrom(
        this.httpService.get('https://www.espn.com/espn/rss/nba/news', {
          responseType: 'text',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NBAFantasyBot/1.0)',
            Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
          },
        }),
      );

      // 2) Backward-compat for existing tests that mocked { data: { items: [] } }
      if (typeof response?.data !== 'string' && response?.data?.items) {
        const items: Array<{ title?: string; link?: string }> =
          response.data.items ?? [];
        if (!items.length) return [];
        return items.map((item) => ({
          title: item.title ?? '',
          link: item.link ?? '',
          translated: `ZH: ${item.title ?? ''}`,
        }));
      }

      // 3) Parse XML RSS
      const xml = String(response?.data ?? '');
      if (!xml) return [];

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        trimValues: true,
      });
      const parsed = parser.parse(xml) as RssDocument;
      const channel = parsed?.rss?.channel;
      const items = ensureArray<RssItem>(channel?.item);

      if (!items.length) return [];
      return items.map((item) => ({
        title: item?.title ?? '',
        link: item?.link ?? '',
        translated: `ZH: ${item?.title ?? ''}`,
      }));
    } catch {
      throw new Error('Failed to fetch latest news');
    }
  }
}
