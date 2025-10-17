import { Player } from '../basketball/Player';

describe('Player', () => {
  it('parses core fields from playerPoolEntry', () => {
    const data = {
      playerPoolEntry: {
        player: {
          id: 123,
          fullName: 'Test Player',
          defaultPositionId: 2,
          eligibleSlots: [0, 1],
          acquisitionType: 'DRAFT',
          proTeamId: 1,
          stats: [
            { seasonId: 2026, id: '002026', scoringPeriodId: 1, appliedTotal: 10, appliedAverage: 10, stats: { '0': 10 } },
          ],
        },
      },
    };
    const p = new Player(data as any, 2026);
    expect(p.name).toBe('Test Player');
    expect(p.playerId).toBe(123);
    expect(p.position).toBe('SG');
    expect(p.eligibleSlots).toEqual(expect.arrayContaining(['PG', 'SG']));
  });
});


