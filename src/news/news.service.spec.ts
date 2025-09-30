import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { NewsService } from './news.service';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import OpenAI from 'openai';
import { FirestoreRepository } from '../firebase/firestore.repository';

describe('NewsService', () => {
  let service: NewsService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        NewsService,
        {
          provide: OpenAI,
          useValue: {
            chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: '{}' } }] }) } },
          },
        },
        {
          provide: FirestoreRepository,
          useValue: {
            saveDailyNews: jest.fn(),
            articleExists: jest.fn(),
            saveArticle: jest.fn(),
            getLatestArticles: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should return an array item containing title, url, translated', async () => {
    type ItemsData = { items: Array<{ title?: string; link?: string }> };
    const mockConfig = { headers: {} } as InternalAxiosRequestConfig;
    const mockResponse: AxiosResponse<ItemsData> = {
      data: {
        items: [{ title: 'Mock Title', link: 'https://example.com/news/1' }],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: mockConfig,
    };
    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

    const result = await service.getLatestNews();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        url: expect.any(String),
        translated: expect.any(String),
      }),
    );
  });

  it('should return empty array when data items is empty', async () => {
    type ItemsData = { items: Array<{ title?: string; link?: string }> };
    const mockConfig = { headers: {} } as InternalAxiosRequestConfig;
    const mockResponse: AxiosResponse<ItemsData> = {
      data: { items: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: mockConfig,
    };
    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

    const result = await service.getLatestNews();
    expect(result).toEqual([]);
  });

  it('should throw when httpService fails', async () => {
    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(throwError(() => new Error('network')));

    await expect(service.getLatestNews()).rejects.toThrow(
      'Failed to fetch latest news',
    );
  });

  describe('fetchAndSaveNewsDaily', () => {
    it('should fetch latest, map to ArticleContent[], and dedupe by articleExists then saveArticle', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-09-29T09:00:00.000Z'));

      const firestoreRepo = (service as any).firestoreRepository as FirestoreRepository | undefined;
      expect(firestoreRepo).toBeDefined();

      const latest: any = [
        { title: 'A', url: 'https://a', translated: 'ZA' },
        { title: 'B', url: 'https://b', translated: 'ZB' },
      ];

      jest.spyOn(service, 'getLatestNews').mockResolvedValue(latest);
      jest
        .spyOn(service, 'getArticleContent')
        .mockImplementation(async (url: string) => ({ url, blocks: [], title: url.toUpperCase() }));

      const existsMock = jest
        .spyOn((firestoreRepo as any), 'articleExists')
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      const saveArticleMock = jest
        .spyOn((firestoreRepo as any), 'saveArticle')
        .mockResolvedValue(void 0);

      // Act
      await (service as any).fetchAndSaveNewsDaily();

      // Assert
      expect(service.getLatestNews).toHaveBeenCalledTimes(1);
      // 第二篇已存在，應跳過解析，因此僅呼叫一次
      expect(service.getArticleContent).toHaveBeenCalledTimes(1);
      expect(existsMock).toHaveBeenCalledTimes(2);
      expect(saveArticleMock).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('parseWithAI - undefined fields', () => {
    it('should not include undefined headingLevel or optional fields', async () => {
      // Arrange: mock OpenAI to return text block with isHeading false and no level
      (service as any).openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      url: 'https://x',
                      title: 't',
                      blocks: [
                        { type: 'text', text: 'p1', isHeading: false },
                        { type: 'text', text: 'h1', isHeading: true },
                        { type: 'image', src: 's', alt: undefined, caption: undefined },
                      ],
                    }),
                  },
                },
              ],
            }),
          },
        },
      } as any;

      // Act
      const output = await service.parseWithAI({ url: 'https://x', title: 't', blocks: [{ type: 'text', text: 'raw' }] });

      // Assert
      expect(output.blocks.length).toBe(3);
      const b0 = output.blocks[0] as any;
      expect(b0.type).toBe('text');
      expect(b0.isHeading).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(b0, 'headingLevel')).toBe(false);

      const b1 = output.blocks[1] as any;
      expect(b1.type).toBe('text');
      expect(b1.isHeading).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(b1, 'headingLevel')).toBe(false);

      const b2 = output.blocks[2] as any;
      expect(b2.type).toBe('image');
      expect(Object.prototype.hasOwnProperty.call(b2, 'alt')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(b2, 'caption')).toBe(false);
    });
  });
});
