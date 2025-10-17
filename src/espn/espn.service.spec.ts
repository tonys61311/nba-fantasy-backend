import { Test, TestingModule } from '@nestjs/testing';
import { EspnService } from './espn.service';

// Mock League class to avoid real network calls
jest.mock('../espn-api/basketball/League', () => {
  const mockStandings = jest.fn().mockReturnValue([
    { team_name: "Tony's Dream Team", wins: 5, losses: 2, points_for: 823.5 },
    { team_name: 'Katniss Flaming Arrows', wins: 4, losses: 3, points_for: 795.0 },
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

  it('should build League and return Team[] standings', async () => {
    const res = await service.standings({ leagueId: 123456, seasonId: 2025 });
    expect(res.status).toBe('ok');
    expect(res.seasonId).toBe(2025);
    expect(Array.isArray(res.standings)).toBe(true);
    expect(res.standings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ team_name: "Tony's Dream Team", points_for: 823.5 }),
      ]),
    );
  });

});


