import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FirebaseService {
  private readonly app: admin.app.App;

  constructor() {
    const configJson = process.env.FIREBASE_CONFIG; // 直接是 JSON 字串
    let credential: admin.credential.Credential | undefined;

    if (configJson && configJson.trim().length > 0) {
      // FIREBASE_CONFIG 是 JSON 物件字串，需處理 private_key 換行
      const parsed = JSON.parse(configJson);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.private_key === 'string') {
          parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
        }
        credential = admin.credential.cert(parsed);
      }
    } 

    this.app = admin.apps.length
      ? admin.app()
      : (credential
          ? admin.initializeApp({ credential })
          : admin.initializeApp());
  }

  getFirestore() {
    return this.app.firestore();
  }

  getMessaging() {
    return this.app.messaging();
  }

  getAuth() {
    return this.app.auth();
  }
}


