import { Module } from '@nestjs/common';
import { EspnService } from './espn.service';
import { EspnController } from './espn.controller';

@Module({
  controllers: [EspnController],
  providers: [EspnService],
  exports: [EspnService],
})
export class EspnModule {}


