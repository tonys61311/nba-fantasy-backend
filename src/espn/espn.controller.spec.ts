import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EspnModule } from './espn.module';
import { EspnService } from './espn.service';

describe('EspnController (standings)', () => {
  let app: INestApplication;
  let espnService: EspnService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EspnModule],
    })
      .overrideProvider(EspnService)
      .useValue({
        standings: jest.fn().mockResolvedValue({
          status: 'ok',
          seasonId: 2025,
          standings: [
            { team: "Tony's Dream Team", wins: 5, losses: 2, points: 823.5 },
            { team: 'Katniss Flaming Arrows', wins: 4, losses: 3, points: 795.0 },
          ],
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    espnService = app.get(EspnService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/league/standings should return standings JSON', async () => {
    const res = await request(app.getHttpServer()).get('/league/standings?leagueId=1&seasonId=2025');
    expect(espnService.standings).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        seasonId: 2025,
        standings: expect.any(Array),
      }),
    );
  });

  it('GET /api/league/standings works without params (uses env/service defaults)', async () => {
    const res = await request(app.getHttpServer()).get('/league/standings');
    expect(res.status).toBe(200);
  });

  it('GET /api/league/standings server error returns 500', async () => {
    // Override provider for this test to throw
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EspnModule],
    })
      .overrideProvider(EspnService)
      .useValue({ standings: jest.fn().mockRejectedValue(new Error('upstream error')) })
      .compile();
    const tmpApp = moduleFixture.createNestApplication();
    await tmpApp.init();

    const res = await request(tmpApp.getHttpServer()).get('/league/standings?leagueId=1&seasonId=2025');
    expect(res.status).toBe(500);
    await tmpApp.close();
  });
});


