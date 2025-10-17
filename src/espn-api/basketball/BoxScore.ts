import { STATS_MAP, POSITION_MAP, PRO_TEAM_MAP } from './constant';
import { Player } from './Player';

export abstract class BoxScore {
  winner: string;
  home_team: any;
  away_team: any;
  scoring_period: number;
  constructor(data: any, scoring_period: number) {
    this.winner = data?.winner ?? 'UNDECIDED';
    this.home_team = data?.home?.teamId ?? 0;
    this.away_team = data?.away?.teamId ?? 0;
    this.scoring_period = scoring_period;
  }

  protected _get_player_lineup(team: 'home' | 'away', data: any, pro_schedule: any, by_matchup: boolean, year: number) {
    if (!(team in data)) return [];
    const roster_key = by_matchup ? 'rosterForMatchupPeriod' : 'rosterForCurrentScoringPeriod';
    const roster = data[team]?.[roster_key] ?? {};
    return (roster?.entries ?? []).map((p: any) => new BoxPlayer(p, pro_schedule, year, this.scoring_period));
  }
}

export class H2HPointsBoxScore extends BoxScore {
  home_score: number;
  home_projected: number;
  home_lineup: any[];
  away_score: number;
  away_projected: number;
  away_lineup: any[];
  constructor(data: any, pro_schedule: any, by_matchup: boolean, year: number, scoring_period = 0) {
    super(data, scoring_period);
    [this.home_score, this.home_projected, this.home_lineup] = this._get_team_data('home', data, pro_schedule, by_matchup, year);
    [this.away_score, this.away_projected, this.away_lineup] = this._get_team_data('away', data, pro_schedule, by_matchup, year);
  }
  private _get_team_data(team: 'home' | 'away', data: any, pro_schedule: any, by_matchup: boolean, year: number) {
    if (!(team in data)) return [0, -1, []];
    let team_projected = -1;
    const roster_key = by_matchup ? 'rosterForMatchupPeriod' : 'rosterForCurrentScoringPeriod';
    const team_roster = data[team]?.[roster_key] ?? {};
    let team_score: number;
    if ('totalPointsLive' in data[team] && by_matchup) {
      team_score = Math.round((data[team]?.totalPointsLive ?? 0) * 100) / 100;
      team_projected = Math.round((data[team]?.totalProjectedPointsLive ?? -1) * 100) / 100;
    } else {
      team_score = Math.round((team_roster?.appliedStatTotal ?? 0) * 100) / 100;
    }
    const lineup = this._get_player_lineup(team, data, pro_schedule, by_matchup, year);
    return [team_score, team_projected, lineup];
  }
}

export class H2HCategoryBoxScore extends BoxScore {
  home_wins: number;
  home_ties: number;
  home_losses: number;
  home_stats: Record<string, any>;
  home_lineup: any[];
  away_wins: number;
  away_ties: number;
  away_losses: number;
  away_stats: Record<string, any>;
  away_lineup: any[];
  constructor(data: any, pro_schedule: any, by_matchup: boolean, year: number, scoring_period = 0) {
    super(data, scoring_period);
    [this.home_wins, this.home_ties, this.home_losses, this.home_stats, this.home_lineup] = this._get_team_data('home', data, pro_schedule, by_matchup, year);
    [this.away_wins, this.away_ties, this.away_losses, this.away_stats, this.away_lineup] = this._get_team_data('away', data, pro_schedule, by_matchup, year);
  }
  private _get_team_data(team: 'home' | 'away', data: any, pro_schedule: any, by_matchup: boolean, year: number) {
    if (!(team in data)) return [0, 0, 0, {}, []];
    const cumulative = data[team]?.cumulativeScore ?? {};
    const wins = cumulative?.wins ?? 0;
    const ties = cumulative?.ties ?? 0;
    const losses = cumulative?.losses ?? 0;
    const team_stats: Record<string, any> = {};
    for (const [stat_key, stat_dict] of Object.entries(cumulative?.scoreByStat ?? {})) {
      const mapped = (STATS_MAP as any)[stat_key] ?? stat_key;
      team_stats[mapped] = { value: (stat_dict as any).score, result: (stat_dict as any).result };
    }
    const lineup = this._get_player_lineup(team, data, pro_schedule, by_matchup, year);
    return [wins, ties, losses, team_stats, lineup];
  }
}

export class BoxPlayer extends Player {
  slot_position: string = 'FA';
  pro_opponent: string = 'None';
  game_played: number = 100;
  points: number = 0;
  points_breakdown: Record<string, number> = {};
  constructor(data: any, pro_schedule: any, year: number, scoring_period: number) {
    super(data, year, pro_schedule);
    if ('lineupSlotId' in data) this.slot_position = POSITION_MAP[data['lineupSlotId']];
    const player = data?.playerPoolEntry?.player ?? data?.player ?? {};
    const pro_id = player?.proTeamId;
    const teamSched = pro_schedule?.[pro_id];
    if (teamSched && teamSched[String(scoring_period)]) {
      const game = teamSched[String(scoring_period)][0];
      const opp_id = game['awayProTeamId'] !== pro_id ? game['awayProTeamId'] : game['homeProTeamId'];
      const gameDate = new Date(game['date']);
      const threeHoursMs = 3 * 60 * 60 * 1000;
      this.game_played = Date.now() > (gameDate.getTime() + threeHoursMs) ? 100 : 0;
      this.pro_opponent = PRO_TEAM_MAP[opp_id] ?? 'None';
    }
    const player_stats = player?.stats ?? [];
    for (const stats of player_stats) {
      const stats_breakdown = (stats?.appliedStats ?? stats?.stats ?? {}) as Record<string, number>;
      const breakdown: Record<string, number> = {};
      for (const [k, v] of Object.entries(stats_breakdown)) breakdown[(STATS_MAP as any)[k] ?? k] = v as number;
      const points = Math.round(((stats?.appliedTotal ?? 0) as number) * 100) / 100;
      this.points = points;
      this.points_breakdown = breakdown;
    }
  }
}

export function get_box_scoring_type_class(type?: string) {
  const ScoringType: Record<string, any> = {
    H2H_POINTS: H2HPointsBoxScore,
    H2H_CATEGORY: H2HCategoryBoxScore,
    H2H_MOST_CATEGORIES: H2HCategoryBoxScore,
  };
  return ScoringType[type ?? ''] ?? H2HPointsBoxScore;
}


