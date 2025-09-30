import { Injectable } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { ArticleContent } from '../common/models/news';
import crypto from 'crypto';

export interface DailyNewsDocument {
  createdAt: string;
  articles: ArticleContent[];
}

@Injectable()
export class FirestoreRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async saveDailyNews(dateKey: string, articles: ArticleContent[]): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const col = db.collection('news');
    const ref = col.doc(dateKey);
    const payload: DailyNewsDocument = {
      createdAt: new Date().toISOString(),
      articles,
    };
    await ref.set(payload);
  }

  async getLatestNews(): Promise<DailyNewsDocument | null> {
    const db = this.firebaseService.getFirestore();
    const col = db.collection('news');
    const snap = await col.orderBy('createdAt', 'desc').limit(1).get();
    if (!snap || snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data() as DailyNewsDocument | undefined;
    if (!data) return null;
    return data;
  }

  private getArticleDocId(url: string): string {
    return crypto.createHash('sha1').update(url).digest('hex');
  }

  async articleExists(url: string): Promise<boolean> {
    const db = this.firebaseService.getFirestore();
    const col = db.collection('news');
    const docId = this.getArticleDocId(url);
    const ref = col.doc(docId);
    const snap = await ref.get();
    return Boolean(snap?.exists);
  }

  async saveArticle(article: ArticleContent): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const col = db.collection('news');
    const docId = this.getArticleDocId(article.url);
    const ref = col.doc(docId);

    const nowIso = new Date().toISOString();
    await ref.set({
      ...article,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  async getLatestArticles(limit = 10): Promise<ArticleContent[]> {
    const db = this.firebaseService.getFirestore();
    const col = db.collection('news');
    const snap = await col.orderBy('createdAt', 'desc').limit(limit).get();
    if (!snap || snap.empty) return [];
    return snap.docs.map((d) => d.data() as ArticleContent);
  }
}


