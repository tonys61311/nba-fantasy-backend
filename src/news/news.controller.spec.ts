import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { NewsModule } from './news.module';
import { NewsService } from './news.service';
import request from 'supertest';
import OpenAI from 'openai';

describe('NewsController (e2e-ish)', () => {
  let app: INestApplication;
  let newsService: NewsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [NewsModule],
    })
      .overrideProvider(OpenAI)
      .useValue({ chat: { completions: { create: jest.fn() } } })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    newsService = app.get(NewsService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /news/daily should call fetchAndSaveNewsDaily and return summary', async () => {
    const mock = jest
      .spyOn(newsService as any, 'fetchAndSaveNewsDaily')
      .mockResolvedValue({ dateKey: '2025-09-30', articles: [{ url: 'https://a', blocks: [] }] });

    const res = await request(app.getHttpServer()).get('/news/daily');
    expect(mock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ dateKey: '2025-09-30' }),
      }),
    );
  });

  it('GET /news should return latest articles from Firestore', async () => {
    jest
      .spyOn(newsService as any, 'getLatestArticlesFromRepo')
      .mockResolvedValue([{ url: 'https://a', blocks: [] }]);

    const res = await request(app.getHttpServer()).get('/news');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({ data: expect.any(Array) }),
    );
  });
});
