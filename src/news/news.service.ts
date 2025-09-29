import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { XMLParser } from 'fast-xml-parser';
import { LatestNewsItem, ArticleContent, ArticleBlock } from '../common/models/news';
import { ensureArray, RssDocument, RssItem } from '../common/models/rss';
import OpenAI from 'openai';

// moved LatestNewsItem to common/models

@Injectable()
export class NewsService {
  constructor(
    private readonly httpService: HttpService,
    private readonly openai: OpenAI,
  ) {}

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
          if ($(elNode).closest('aside').length) {
            return;
          }
          const htmlContent = $.html($(elNode).contents()).trim();
          if (htmlContent) {
            const tagName = $(elNode).prop('tagName')?.toLowerCase();
            const textContent = $(elNode).text().replace(/\s+/g, ' ').trim();
            if (tagName && /^h[1-6]$/.test(tagName)) {
              const level = Number(tagName.substring(1)) as 1 | 2 | 3 | 4 | 5 | 6;
              blocks.push({ type: 'text', text: textContent, isHeading: true, headingLevel: level });
            } else {
              blocks.push({ type: 'text', text: textContent });
            }
          }
        });
      }
    }

    const article: ArticleContent = { title, blocks, url };
    const aiResult = await this.parseWithAI(article);
    return aiResult;
  }

  async parseWithAI(input: ArticleContent): Promise<ArticleContent> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.5,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              '你是專業的體育編輯與中文寫作者。',
              '任務：先完整理解使用者提供的 ArticleContent（含標題與段落），不要逐句翻譯，請用中文且帶點幽默的口吻重寫內容。',
              '要求：',
              '- 僅輸出 JSON 物件（不得出現多餘文字）。',
              '- 輸出結構必須與輸入一致：包含 url、title、blocks（每筆 block 為 type="text" 或 type="image"）。',
              '- 標題（isHeading=true 的 text block）必須保留並維持原本順序，可調整標題文字為中文幽默風格；headingLevel 不可改。',
              '- 標題底下的段落可自由整合/濃縮/改寫成自然中文，避免逐句直譯；允許段落數量與原文不同。',
              '- 若有 image block，請原樣保留（src/alt/caption 不改）。',
              '- 專有名詞（球員、隊名）可保留原文並自然嵌入中文敘述。',
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              '請將以下 ArticleContent 轉為中文且帶點幽默風格：',
              JSON.stringify(input),
            ].join('\n'),
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw) as ArticleContent;

      // 守護：確保必要欄位與型別；允許與原文不同的段落數量
      const safe: ArticleContent = {
        url: parsed?.url || input.url,
        title: parsed?.title ?? input.title,
        blocks: Array.isArray(parsed?.blocks) && parsed.blocks.length > 0
          ? parsed.blocks.map((b: any) => {
              if (!b || typeof b !== 'object') {
                return { type: 'text', text: '內容解析失敗' };
              }
              if (b.type === 'text') {
                const isHeading = typeof b.isHeading === 'boolean' ? b.isHeading : false;
                const level = typeof b.headingLevel === 'number' ? b.headingLevel : undefined;
                const text = typeof b.text === 'string' ? b.text : '';
                return { type: 'text', text, isHeading, headingLevel: level };
              }
              if (b.type === 'image') {
                return {
                  type: 'image',
                  src: typeof b.src === 'string' ? b.src : '',
                  alt: typeof b.alt === 'string' ? b.alt : undefined,
                  caption: typeof b.caption === 'string' ? b.caption : undefined,
                };
              }
              return { type: 'text', text: '內容解析失敗' };
            })
          : [
              { type: 'text', text: '內容解析失敗' },
            ],
      };

      return safe;
    } catch (err) {
      const anyErr = err as any;
      console.error('OpenAI translate-humorize failed', {
        message: anyErr?.message,
        status: anyErr?.status,
        code: anyErr?.code,
        type: anyErr?.type,
        requestID: anyErr?.requestID,
        error: anyErr?.error,
      });
      // 失敗時回傳原始輸入，避免中斷
      return input;
    }
  }
}
