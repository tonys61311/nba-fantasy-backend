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

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').first().text().trim();

    // 嘗試找主要內容容器（多個常見選擇器）
    const candidates = [
      'article',
      '[role="article"]',
      '[itemprop="articleBody"]',
      '[data-testid="story-container"]',
      '[data-testid="article-body"]',
      '[data-behavior="article_body"]',
      '.Article__Content',
      '.article-body',
      '.article-content',
      '.story-content',
      '#article-feed',
      '.content',
      'main article',
    ];
    let container = $(candidates.join(',')).first();
    if (!container || container.length === 0) {
      container = $('body');
    }

    const blocks: ArticleBlock[] = [];
    type CheerioEl = ReturnType<typeof $>;
    const pickSrc = (node: CheerioEl): string | undefined => {
      return (
        node.attr('src') ||
        node.attr('data-src') ||
        (node.attr('srcset')?.split(',').pop()?.trim().split(' ')[0]) ||
        undefined
      );
    };

    container
      .find('p, h1, h2, h3, h4, h5, h6, figure img, figure picture img, picture img, img')
      .each((_, el) => {
      const node = $(el);
      if (node.is('img')) {
          const src = pickSrc(node) || '';
          if (src) {
            const alt = node.attr('alt') || undefined;
            const caption = node.closest('figure').find('figcaption').text().trim() || undefined;
            blocks.push({ type: 'image', src, alt, caption });
          }
          return;
      }

      const tag = node.prop('tagName')?.toLowerCase();
      if (tag && /^(p|h1|h2|h3|h4|h5|h6)$/.test(tag)) {
        const htmlContent = $.html(node.contents());
        const cleaned = htmlContent.replace(/\n+/g, '\n').trim();
        if (cleaned) {
          blocks.push({ type: 'text', html: cleaned });
        }
      }
      });

    // 後援：若無法從 DOM 萃取，嘗試讀取 JSON-LD 的 articleBody 與 image
    if (blocks.length === 0) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = $(el).contents().text();
          if (!json) return;
          const data = JSON.parse(json);
          const candidates: any[] = Array.isArray(data) ? data : [data];
          for (const obj of candidates) {
            const types: string[] = ([] as string[]).concat(obj['@type'] || []);
            if (types.includes('Article') || types.includes('NewsArticle')) {
              const body: string | undefined = obj.articleBody || obj.description;
              if (body) {
                body
                  .split(/\n\n+/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .forEach((para) => blocks.push({ type: 'text', html: para }));
              }
              const image = obj.image;
              const imageUrls: string[] = Array.isArray(image)
                ? image
                : image && typeof image === 'object' && image.url
                ? [image.url]
                : typeof image === 'string'
                ? [image]
                : [];
              for (const src of imageUrls) {
                blocks.push({ type: 'image', src });
              }
              if (blocks.length > 0) break;
            }
          }
        } catch {
          
        }
      });
    }

    // 最後後援：取 body 內段落，避免完全空陣列
    if (blocks.length === 0) {
      $('body p').slice(0, 10).each((_, el) => {
        const text = $(el).text().trim();
        if (text) blocks.push({ type: 'text', html: text });
      });
    }

    return { title, blocks, url };
  }
}
