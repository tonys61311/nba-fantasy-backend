import { Matchup } from '../basketball/Matchup';

describe('Matchup', () => {
  it('builds from schedule data', () => {
    const data = {
      winner: 'AWAY',
      home: {
        teamId: 1,
        totalPoints: 100,
        cumulativeScore: {
          wins: 5,
          ties: 1,
          losses: 3,
          scoreByStat: { '0': { score: 30, result: 'WIN' } },
        },
      },
      away: {
        teamId: 2,
        totalPoints: 90,
        cumulativeScore: {
          wins: 3,
          ties: 1,
          losses: 5,
          scoreByStat: { '0': { score: 28, result: 'LOSS' } },
        },
      },
    };
    const m = new Matchup(data as any);
    expect(m.winner).toBe('AWAY');
    expect(m.home_team).toBe(1);
    expect(m.away_team).toBe(2);
    expect(m.home_final_score).toBe(100);
    expect(m.away_final_score).toBe(90);
    expect(m.home_team_cats?.PTS?.score).toBe(30);
  });
});


