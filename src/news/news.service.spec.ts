import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { NewsService } from './news.service';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

describe('NewsService', () => {
  let service: NewsService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [NewsService],
    }).compile();

    service = module.get<NewsService>(NewsService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should return an array item containing title, link, translated', async () => {
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
        link: expect.any(String),
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
});
