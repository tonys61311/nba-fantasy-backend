import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { FirebaseService } from './firebase.service';

jest.setTimeout(30000);

describe('FirebaseService', () => {
  let service: FirebaseService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [FirebaseService],
    }).compile();

    service = moduleRef.get(FirebaseService);
  });

  it('should get Firestore and perform write/read', async () => {
    if (!process.env.FIREBASE_CONFIG && !process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCLOUD_PROJECT && !process.env.FIREBASE_PROJECT_ID) {
      console.warn('Skipping Firestore write/read test due to missing Firebase credentials in environment');
      return;
    }
    const db = service.getFirestore();
    const col = db.collection('test_firebase_service');
    const docId = `spec_${Date.now()}`;
    const ref = col.doc(docId);

    const payload = { hello: 'world', createdAt: new Date().toISOString() };
    await ref.set(payload);

    const snap = await ref.get();
    console.log(snap);
    expect(snap.exists).toBe(true);
    expect(snap.get('hello')).toBe('world');

    await ref.delete();
  });

  it('should expose Messaging client', () => {
    const messaging = service.getMessaging();
    expect(messaging).toBeDefined();
  });
});


