import { Test, TestingModule } from '@nestjs/testing';
import { EspnService } from './espn.service';
import * as imageUtil from '../common/utils/fetchImageAsBase64';

// Mock League class to avoid real network calls
jest.mock('../espn-api/basketball/League', () => {
  const mockStandings = jest.fn().mockReturnValue([
    { team_name: "Tony's Dream Team", wins: 5, losses: 2, points_for: 823.5, points: 823.5, logo_url: 'https://logo/1.png' },
    { team_name: 'Katniss Flaming Arrows', wins: 4, losses: 3, points_for: 795.0, points: 795.0, logo_url: 'https://logo/2.png' },
  ]);
  return {
    League: class LeagueMock {
      static lastArgs: any;
      ready: Promise<void> = Promise.resolve();
      standings = mockStandings;
      constructor(leagueId: number, year: number, espnS2?: string, swid?: string) {
        (this.constructor as any).lastArgs = { leagueId, year, espnS2, swid };
      }
    },
  };
});

describe('EspnService', () => {
  let service: EspnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EspnService],
    }).compile();

    service = module.get<EspnService>(EspnService);
  });

  it('should return standings with logoBase64 embedded', async () => {
    const spy = jest.spyOn(imageUtil, 'fetchImageAsBase64').mockResolvedValue('data:image/png;base64,AAA');
    const res = await service.standings({ leagueId: 123456, seasonId: 2025 });
    expect(res.status).toBe('ok');
    expect(res.seasonId).toBe(2025);
    expect(Array.isArray(res.standings)).toBe(true);
    // ensure base64 attached
    expect(res.standings[0]).toHaveProperty('logoBase64', 'data:image/png;base64,AAA');
    expect(res.standings[1]).toHaveProperty('logoBase64', 'data:image/png;base64,AAA');
    // ensure util called twice
    expect(spy).toHaveBeenCalledTimes(2);
  });

});


