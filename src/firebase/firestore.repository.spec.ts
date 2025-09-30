import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseService } from '../firebase/firebase.service';
import { ArticleContent } from '../common/models/news';
import { FirestoreRepository } from './firestore.repository';
import crypto from 'crypto';

describe('FirestoreRepository (per-article)', () => {
  let repo: FirestoreRepository;

  const setMock = jest.fn();
  const getDocMock = jest.fn();
  const docMock = jest.fn(() => ({ set: setMock, get: getDocMock }));

  const getQueryMock = jest.fn(async () => ({
    empty: false,
    docs: [
      { data: () => ({ url: 'https://a', blocks: [], createdAt: 'Z' }) },
      { data: () => ({ url: 'https://b', blocks: [], createdAt: 'Z' }) },
    ],
  } as any));
  const limitMock = jest.fn(() => ({ get: getQueryMock }));
  const orderByMock = jest.fn(() => ({ limit: limitMock }));
  const collectionMock = jest.fn(() => ({ doc: docMock, orderBy: orderByMock }));

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirestoreRepository,
        {
          provide: FirebaseService,
          useValue: {
            getFirestore: () => ({ collection: collectionMock }),
          },
        },
      ],
    }).compile();

    repo = module.get(FirestoreRepository);
  });

  it('saveArticle: should save into news/<sha1(url)> with timestamps', async () => {
    const article: ArticleContent = { url: 'https://espn.com/a', title: 't', blocks: [] };
    await repo.saveArticle(article);

    const docId = crypto.createHash('sha1').update(article.url).digest('hex');
    expect(collectionMock).toHaveBeenCalledWith('news');
    expect(docMock).toHaveBeenCalledWith(docId);
    expect(setMock).toHaveBeenCalledTimes(1);
    const payload = setMock.mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        url: 'https://espn.com/a',
        title: 't',
        blocks: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
  });

  it('articleExists: should check if document exists by sha1(url)', async () => {
    getDocMock.mockResolvedValueOnce({ exists: true });
    const exists = await repo.articleExists('https://espn.com/a');
    expect(exists).toBe(true);
    const docId = crypto.createHash('sha1').update('https://espn.com/a').digest('hex');
    expect(docMock).toHaveBeenCalledWith(docId);
  });

  it('getLatestArticles: should return latest N articles', async () => {
    const list = await repo.getLatestArticles(2);
    expect(orderByMock).toHaveBeenCalledWith('createdAt', 'desc');
    expect(limitMock).toHaveBeenCalledWith(2);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(2);
    expect(list[0]).toEqual(expect.objectContaining({ url: expect.any(String) }));
  });
});


