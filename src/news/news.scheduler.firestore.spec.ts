import 'dotenv/config';
import crypto from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import OpenAI from 'openai';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseService } from '../firebase/firebase.service';
import { FirestoreRepository } from '../firebase/firestore.repository';
import { NewsService } from './news.service';
import { NewsScheduler } from './news.scheduler';

jest.setTimeout(60000);

describe('NewsScheduler Firestore Integration', () => {
  let app: INestApplication;
  let newsService: NewsService;
  let firebase: FirebaseService;
  let scheduler: NewsScheduler;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ScheduleModule.forRoot(),
        HttpModule,
        FirebaseModule,
      ],
      providers: [
        NewsScheduler,
        NewsService,
        FirestoreRepository,
        {
          provide: OpenAI,
          useValue: {
            chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: '{}' } }] }) } },
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    newsService = app.get(NewsService);
    firebase = app.get(FirebaseService);
    scheduler = app.get(NewsScheduler);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('should persist documents into Firestore when handleDailyFetch runs', async () => {
    // 環境無 Firebase 憑證時跳過
    if (!process.env.FIREBASE_CONFIG && !process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCLOUD_PROJECT && !process.env.FIREBASE_PROJECT_ID) {
      console.warn('Skipping Firestore integration: missing Firebase credentials');
      return;
    }

    jest.spyOn(newsService, 'getLatestNews').mockResolvedValue([
      { title: 'A', url: 'https://a', translated: 'ZA' },
      { title: 'B', url: 'https://b', translated: 'ZB' },
    ]);
    jest
      .spyOn(newsService, 'getArticleContent')
      .mockImplementation(async (url: string) => ({ url, title: `T:${url}`, blocks: [] }));

    await scheduler.handleDailyFetch();

    // 以 per-article 結構驗證：news/<sha1(url)>
    const db = firebase.getFirestore();
    const aId = crypto.createHash('sha1').update('https://a').digest('hex');
    const bId = crypto.createHash('sha1').update('https://b').digest('hex');

    const aSnap = await db.collection('news').doc(aId).get();
    const bSnap = await db.collection('news').doc(bId).get();
    expect(aSnap.exists).toBe(true);
    expect(bSnap.exists).toBe(true);

    // 清理測試資料
    await db.collection('news').doc(aId).delete();
    await db.collection('news').doc(bId).delete();

  });
});


