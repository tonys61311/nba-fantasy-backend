import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FirebaseService } from '../firebase/firebase.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const firebase = app.get(FirebaseService);

  const email = process.argv[2];
  const role = process.argv[3] || 'guest';

  if (!email) {
    console.error('Usage: ts-node src/scripts/create-whitelist.ts <email> [role]');
    process.exit(1);
  }

  try {
    const db = firebase.getFirestore();
    const whitelistRef = db.collection('whitelist').doc(email);
    await whitelistRef.set({ role, email, updatedAt: new Date() }, { merge: true });

    console.log(`Whitelist upserted for ${email} with role ${role}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to upsert whitelist:', err);
    process.exit(1);
  }
}

main();
