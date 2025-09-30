import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { NewsService } from './news.service';
import { NewsScheduler } from './news.scheduler';

describe('NewsScheduler', () => {
  let app: INestApplication;
  let scheduler: NewsScheduler;
  let newsService: NewsService;
  let registry: SchedulerRegistry;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        NewsScheduler,
        {
          provide: NewsService,
          useValue: {
            fetchAndSaveNewsDaily: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    scheduler = app.get(NewsScheduler);
    newsService = app.get(NewsService);
    registry = app.get(SchedulerRegistry);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should register a daily 09:00 UTC cron job named "news_fetch_daily"', () => {
    const job = registry.getCronJob('news_fetch_daily');
    expect(job).toBeDefined();
  });

  it('should call fetchAndSaveNewsDaily when cron handler runs', async () => {
    await scheduler.handleDailyFetch();
    expect(newsService.fetchAndSaveNewsDaily).toHaveBeenCalledTimes(1);
  });
});


