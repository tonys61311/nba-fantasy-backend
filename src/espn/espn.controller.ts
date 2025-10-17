import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { EspnService } from './espn.service';

@Controller('league')
export class EspnController {
  constructor(private readonly espnService: EspnService) {}

  @Get('standings')
  async getStandings(): Promise<unknown> {
    try {
      return await this.espnService.standings();
    } catch {
      throw new HttpException('Failed to fetch standings', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}


