import { POSITION_MAP, PRO_TEAM_MAP, STATS_MAP, STAT_ID_MAP, ACTIVITY_MAP, TRANSACTION_TYPES, NINE_CAT_STATS } from '../basketball/constant';

describe('basketball/constant', () => {
  it('maps positions both ways', () => {
    expect(POSITION_MAP[0]).toBe('PG');
    expect(POSITION_MAP['PG']).toBe(0);
  });

  it('has pro team map', () => {
    expect(PRO_TEAM_MAP[1]).toBe('ATL');
  });

  it('has stats maps', () => {
    expect(STATS_MAP['0']).toBe('PTS');
    expect(STAT_ID_MAP['00']).toBe('total');
  });

  it('activity and transactions include expected values', () => {
    expect(ACTIVITY_MAP[178]).toBe('FA ADDED');
    expect(ACTIVITY_MAP['FA']).toBe(178);
    expect(TRANSACTION_TYPES.has('FREEAGENT')).toBe(true);
  });

  it('has nine category stats', () => {
    expect(NINE_CAT_STATS.has('PTS')).toBe(true);
  });
});


