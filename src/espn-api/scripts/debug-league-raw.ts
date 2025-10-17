import 'dotenv/config';
import { League } from '../basketball/League';

async function main() {
  const leagueId = Number(process.env.league_id ?? process.env.LEAGUE_ID);
  const year = Number(process.env.year ?? process.env.YEAR);
  const espn_s2 = process.env.espn_s2 ?? process.env.ESPN_S2;
  const swid = process.env.SWID ?? process.env.swid;

  if (!leagueId || !year || !espn_s2 || !swid) {
    console.error('Missing env: league_id, year, espn_s2, SWID');
    process.exit(1);
  }

  const league = new League(leagueId, year, espn_s2, swid, false, false);
  // 直接打原始 endpoint
  const data = await league.espnRequest.get_league();

  const status = {
    seasonId: data?.seasonId,
    scoringPeriodId: data?.scoringPeriodId,
    currentMatchupPeriod: data?.status?.currentMatchupPeriod,
    finalScoringPeriod: data?.status?.finalScoringPeriod,
  };

  const t0 = Array.isArray(data?.teams) && data.teams.length ? data.teams[0] : {};
  const team0 = {
    id: t0?.id,
    abbrev: t0?.abbrev,
    name: t0?.name,
    location: t0?.location,
    nickname: t0?.nickname,
    divisionId: t0?.divisionId,
    record_overall: t0?.record?.overall ?? null,
  };

  const s0 = Array.isArray(data?.schedule) && data.schedule.length ? data.schedule[0] : {};
  const sched0 = {
    matchupPeriodId: s0?.matchupPeriodId,
    homeTeamId: s0?.home?.teamId,
    homeTotalPoints: s0?.home?.totalPoints,
    awayTeamId: s0?.away?.teamId,
    awayTotalPoints: s0?.away?.totalPoints,
    hasCumulative: !!s0?.home?.cumulativeScore || !!s0?.away?.cumulativeScore,
  };

  const settings = {
    name: data?.settings?.name,
    teamCount: data?.settings?.size,
    divisions: data?.settings?.scheduleSettings?.divisions ?? [],
    scoringType: data?.settings?.scoringSettings?.scoringType,
  };

  console.log(JSON.stringify({ status, team0, sched0, settings }, null, 2));
  // console.log(JSON.stringify(data.settings));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


