import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@/app.controller.js';
import { AppService } from '@/app.service.js';
import { NewsModule } from '@/news/news.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), NewsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
