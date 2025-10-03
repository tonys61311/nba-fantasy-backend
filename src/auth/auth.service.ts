import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { VerifiedUser, UserWithRole } from '../common/models/auth';

@Injectable()
export class AuthService {
  constructor(private readonly firebaseService: FirebaseService) { }

  async verifyToken(idToken: string): Promise<VerifiedUser> {
    try {
      const auth = this.firebaseService.getAuth();
      const decoded = await auth.verifyIdToken(idToken);
      const uid = String(decoded.uid);
      const email = String(decoded.email ?? '');
      return { uid, email };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async getUserRoleFromWhitelist(email: string): Promise<string> {
    const db = this.firebaseService.getFirestore();
    const whitelistRef = db.collection('whitelist').doc(email);
    const whitelistSnap = await whitelistRef.get();
    return whitelistSnap?.exists ? (whitelistSnap.data() as { role: string }).role : 'guest';
  }

  async login(idToken: string): Promise<UserWithRole> {
    const { uid, email } = await this.verifyToken(idToken);
    const db = this.firebaseService.getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const whitelistRole = await this.getUserRoleFromWhitelist(email);

    if (userSnap?.exists) {
      const data = userSnap.data() as { role: string; email: string };
      if ((data.role ?? 'guest') !== whitelistRole) {
        await userRef.update({ role: whitelistRole });
      }
      await userRef.update({ lastLogin: new Date() });
      return { uid, email, role: whitelistRole };
    }

    await userRef.set({
      uid,
      email,
      role: whitelistRole,
      createdAt: new Date(),
      lastLogin: new Date(),
    });

    return { uid, email, role: whitelistRole };
  }

  async getMe(idToken: string): Promise<UserWithRole> {
    const { uid, email } = await this.verifyToken(idToken);
    const db = this.firebaseService.getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap?.exists) {
      throw new NotFoundException('User not found');
    }
    const data = userSnap.data() as { role: string; email: string };
    const whitelistRole = await this.getUserRoleFromWhitelist(email);
    if ((data.role ?? 'guest') !== whitelistRole) {
      await userRef.update({ role: whitelistRole });
    }
    return { uid, email, role: whitelistRole };
  }
}


