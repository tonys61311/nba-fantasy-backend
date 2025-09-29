import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { HttpModule } from '@nestjs/axios';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import OpenAI from 'openai';
@Module({
  imports: [
    FirebaseModule,
    HttpModule.register({
      timeout: 8000,
      maxRedirects: 5,
    }),
  ],
  controllers: [NewsController],
  providers: [
    NewsService,
    {
      provide: OpenAI,
      useFactory: () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    },
  ],
  exports: [NewsService],
})
export class NewsModule {}
