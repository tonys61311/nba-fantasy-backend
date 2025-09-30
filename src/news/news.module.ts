import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { HttpModule } from '@nestjs/axios';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import OpenAI from 'openai';
import { FirestoreRepository } from '../firebase/firestore.repository';
import { ScheduleModule } from '@nestjs/schedule';
import { NewsScheduler } from './news.scheduler';
@Module({
  imports: [
    FirebaseModule,
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: 8000,
      maxRedirects: 5,
    }),
  ],
  controllers: [NewsController],
  providers: [
    NewsService,
    FirestoreRepository,
    NewsScheduler,
    {
      provide: OpenAI,
      useFactory: () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    },
  ],
  exports: [NewsService],
})
export class NewsModule {}
