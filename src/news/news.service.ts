import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { XMLParser } from 'fast-xml-parser';
import { LatestNewsItem, ArticleContent, ArticleBlock } from '../common/models/news';
import { ensureArray, RssDocument, RssItem } from '../common/models/rss';

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

  async getArticleContent(url: string): Promise<ArticleContent> {
    const response = await firstValueFrom(
      this.httpService.get<string>(url, {
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NBAFantasyBot/1.0)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      }),
    );

    const html = String(response.data ?? '');
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    const titleFromHeader = $('header.article-header h1').first().text().trim();
    const title =
      titleFromHeader ||
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').first().text().trim();

    const blocks: ArticleBlock[] = [];

    // ESPN 結構：標題在 header.article-header > h1；內文位於 .article-body 的段落
    const espnBody = $('#article-feed article .article-body').first();
    if (espnBody && espnBody.length) {
      const nodes = espnBody.find('h1, h2, h3, h4, h5, h6, p');
      if (nodes.length) {
        nodes.each((_, elNode) => {
          const htmlContent = $.html($(elNode).contents()).trim();
          if (htmlContent) {
            const tagName = $(elNode).prop('tagName')?.toLowerCase();
            const textContent = $(elNode).text().replace(/\s+/g, ' ').trim();
            if (tagName && /^h[1-6]$/.test(tagName)) {
              const level = Number(tagName.substring(1)) as 1 | 2 | 3 | 4 | 5 | 6;
              blocks.push({ type: 'text', html: htmlContent, text: textContent, isHeading: true, headingLevel: level });
            } else {
              blocks.push({ type: 'text', html: htmlContent, text: textContent });
            }
          }
        });
      }
    }

    return { title, blocks, url };
  }
}
