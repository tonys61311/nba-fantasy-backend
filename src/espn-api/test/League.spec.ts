import 'dotenv/config';
import { League } from '../basketball/League';

describe('League (basketball)', () => {
  it('should construct without fetching when fetchLeague=false', () => {
    const league = new League(12345, 2024, undefined, undefined, false, false);
    expect(league).toBeDefined();
    expect(league.leagueId).toBe(12345);
    expect(league.seasonId).toBe(2024);
  });

  it('should fetch real league data with .env credentials', async () => {
    jest.setTimeout(30000);
    const leagueId = Number(process.env.league_id ?? process.env.LEAGUE_ID);
    const year = Number(process.env.year ?? process.env.YEAR);
    const espn_s2 = process.env.espn_s2 ?? process.env.ESPN_S2;
    const swid = process.env.SWID ?? process.env.swid;

    if (!leagueId || !year || !espn_s2 || !swid) {
      console.warn('Missing env: league_id/year/espn_s2/SWID. Skipping real fetch test.');
      return;
    }

    const league = new League(leagueId, year, espn_s2, swid, true, false);
    // 等待 ready 完成 fetch
    await league.ready;
  });

  it('should call and log all public League methods with .env credentials', async () => {
    jest.setTimeout(60000);
    const leagueId = Number(process.env.league_id ?? process.env.LEAGUE_ID);
    const year = Number(process.env.year ?? process.env.YEAR);
    const espn_s2 = process.env.espn_s2 ?? process.env.ESPN_S2;
    const swid = process.env.SWID ?? process.env.swid;

    if (!leagueId || !year || !espn_s2 || !swid) {
      console.warn('Missing env: league_id/year/espn_s2/SWID. Skipping public methods test.');
      return;
    }

    const league = new League(leagueId, year, espn_s2, swid, false, false);
    await league.fetch_league();

    // standings()
    const standings = league.standings();
    console.log(standings);
    // scoreboard()
    try {
      const scoreboard = await league.scoreboard();
      console.log('scoreboard:', Array.isArray(scoreboard) ? scoreboard.slice(0, 2) : scoreboard);
    } catch (e) {
      console.warn('scoreboard error:', (e as any)?.message);
    }

    // recent_activity()
    try {
      const acts = await league.recent_activity(10);
      console.log('recent_activity size:', acts.length, acts[0]);
    } catch (e) {
      console.warn('recent_activity error:', (e as any)?.message);
    }

    // transactions()
    try {
      const txs = await league.transactions();
      console.log('transactions size:', txs.length, txs[0]);
    } catch (e) {
      console.warn('transactions error:', (e as any)?.message);
    }

    // free_agents()
    try {
      const fas = await league.free_agents();
      console.log('free_agents size:', fas.length, fas[0]?.name);
    } catch (e) {
      console.warn('free_agents error:', (e as any)?.message);
    }

    // box_scores()
    try {
      const boxes = await league.box_scores();
      console.log('box_scores size:', boxes);
    } catch (e) {
      console.warn('box_scores error:', (e as any)?.message);
    }

    // player_info() by name (take first key from map)
    try {
      const names = Object.keys(league.player_map ?? {});
      if (names.length) {
        const pi = await league.player_info(names[0]);
        console.log('player_info by name:', names[0], pi);
      } else {
        console.warn('player_info skip: empty player_map');
      }
    } catch (e) {
      console.warn('player_info error:', (e as any)?.message);
    }
  });
});


