import { STATS_MAP } from './constant';

export class Matchup {
  winner: any;
  home_team: any;
  home_final_score: number;
  home_team_cats?: Record<string, any> | null;
  home_team_live_score?: number | null;
  away_team: any;
  away_final_score: number;
  away_team_cats?: Record<string, any> | null;
  away_team_live_score?: number | null;
  matchupPeriodId?: number;

  constructor(data: any) {
    this.winner = data?.winner;
    this.matchupPeriodId = data?.matchupPeriodId;
    [this.home_team, this.home_final_score, this.home_team_cats, this.home_team_live_score] = this._fetch_matchup_info(data, 'home');
    [this.away_team, this.away_final_score, this.away_team_cats, this.away_team_live_score] = this._fetch_matchup_info(data, 'away');
  }

  private _fetch_matchup_info(data: any, team: 'home' | 'away') {
    if (!(team in data)) return [0, 0, null, null];
    const team_id = data[team]?.teamId;
    const final_score = data[team]?.totalPoints ?? 0;
    let team_cats: Record<string, any> | null = null;
    let team_live_score: number | null = null;

    const cumulative = data[team]?.cumulativeScore;
    const scoreByStat = cumulative?.scoreByStat;
    if (cumulative && scoreByStat) {
      team_live_score = (cumulative.wins ?? 0) + (cumulative.ties ?? 0) / 2;
      team_cats = Object.keys(scoreByStat).reduce((acc: Record<string, any>, key) => {
        acc[STATS_MAP[key] ?? key] = {
          score: scoreByStat[key]?.score,
          result: scoreByStat[key]?.result,
        };
        return acc;
      }, {});
    }
    return [team_id, final_score, team_cats, team_live_score];
  }
}


