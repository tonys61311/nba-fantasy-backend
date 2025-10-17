import { BaseLeague } from '../base_league';
import { Team } from './Team';
import { Player } from './Player';
import { Matchup } from './Matchup';
import { get_box_scoring_type_class, BoxScore, H2HPointsBoxScore } from './BoxScore';
import { Activity } from './Activity';
import { Transaction } from './Transaction';
import { POSITION_MAP, ACTIVITY_MAP, TRANSACTION_TYPES } from './constant';

export class League extends BaseLeague {
  teams: Team[] = [];
  private BoxScoreClass: new (...args: any[]) => BoxScore = H2HPointsBoxScore;
  private matchup_ids: Record<number, string[]> = {};
  private pro_schedule: any;
  public ready?: Promise<void>;

  constructor(
    leagueId: number,
    year: number,
    espn_s2?: string,
    swid?: string,
    fetch_league = true,
    debug = false,
  ) {
    super({ leagueId, year, sport: 'nba', espnS2: espn_s2, swid, debug });
    if (fetch_league) {
      this.ready = this.fetch_league();
    }
  }

  async fetch_league(): Promise<void> {
    const data = await this._fetch_league();
    await this._fetch_teams(data);
    await super._fetch_draft();

    this.BoxScoreClass = get_box_scoring_type_class(this.settings.scoring_type as any);
  }

  protected async _fetch_league(): Promise<any> {
    const data = await super._fetch_league();
    await this._fetch_players();
    this._map_matchup_ids(data?.schedule ?? []);
    return data;
  }

  private _map_matchup_ids(schedule: any[]): void {
    this.matchup_ids = {};
    for (const match of schedule ?? []) {
      const matchup_period = match?.matchupPeriodId as number | undefined;
      const scoring_periods = Object.keys(match?.home?.pointsByScoringPeriod ?? {});
      if (scoring_periods.length > 0 && typeof matchup_period === 'number') {
        if (!(matchup_period in this.matchup_ids)) {
          this.matchup_ids[matchup_period] = [...scoring_periods].sort();
        } else {
          const combined = new Set([...(this.matchup_ids[matchup_period] ?? []), ...scoring_periods]);
          this.matchup_ids[matchup_period] = Array.from(combined).sort();
        }
      }
    }
  }

  protected async _fetch_teams(data: any): Promise<void> {
    this.pro_schedule = await this._get_all_pro_schedule();
    const schedule = data?.schedule ?? [];
    const members = data?.members ?? [];
    // let BaseLeague create Team instances with full context
    super._fetch_teams({ teams: data?.teams, schedule, seasonId: data?.seasonId, members }, { TeamClass: Team, pro_schedule: this.pro_schedule });
    // Some ESPN responses don't include team.schedule; keep safe no-op mapping
    for (const team of this.teams) {
      team.division_name = this.settings.division_map?.[team.division_id ?? -1] ?? '';
      const sched: Array<any> = Array.isArray(team.schedule) ? team.schedule : [];
      for (const matchup of sched) {
        for (const opponent of this.teams) {
          if ((matchup as any).away_team === opponent.team_id) (matchup as any).away_team = opponent;
          if ((matchup as any).home_team === opponent.team_id) (matchup as any).home_team = opponent;
        }
      }
    }
  }

  standings(): Team[] {
    const standings = [...this.teams].sort((a, b) => {
      const aStanding = a.final_standing !== 0 ? a.final_standing ?? a.standing ?? 0 : a.standing ?? 0;
      const bStanding = b.final_standing !== 0 ? b.final_standing ?? b.standing ?? 0 : b.standing ?? 0;
      return aStanding - bStanding;
    });
    return standings;
  }

  async scoreboard(matchupPeriod?: number): Promise<Matchup[]> {
    if (!matchupPeriod) matchupPeriod = this.currentMatchupPeriod;
    const params = { view: 'mMatchup' } as any;
    const data = await this.espnRequest.leagueGet(params);
    const schedule = data['schedule'] ?? [];
    const matchups = schedule.filter((m: any) => m['matchupPeriodId'] === matchupPeriod).map((m: any) => new Matchup(m));
    for (const team of this.teams) {
      for (const matchup of matchups) {
        if (matchup.home_team === team.team_id) matchup.home_team = team;
        else if (matchup.away_team === team.team_id) matchup.away_team = team;
      }
    }
    return matchups;
  }

  async recent_activity(size = 25, msg_type?: string, offset = 0, include_moved = false): Promise<Activity[]> {
    if (this.seasonId < 2019) throw new Error('Cant use recent activity before 2019');
    let msg_types = [178, 180, 179, 239, 181, 244, 188];
    if (msg_type && msg_type in ACTIVITY_MAP) msg_types = [ACTIVITY_MAP[msg_type]];
    const params = { view: 'kona_league_communication' } as any;
    const filters = { topics: { filterType: { value: ['ACTIVITY_TRANSACTIONS'] }, limit: size, limitPerMessageSet: { value: 25 }, offset, sortMessageDate: { sortPriority: 1, sortAsc: false }, sortFor: { sortPriority: 2, sortAsc: false }, filterIncludeMessageTypeIds: { value: msg_types } } };
    const headers = { 'x-fantasy-filter': JSON.stringify(filters) } as any;
    try {
      const data = await this.espnRequest.leagueGet(params, headers, '/communication/');
      const topics = data['topics'] ?? [];
      const activity = topics.map((t: any) => new Activity(t, this.playerNameById as any, this.get_team_data, { include_moved }));
      return activity;
    } catch {
      return [];
    }
  }

  async transactions(scoring_period?: number, types: Set<string> = new Set(['FREEAGENT', 'WAIVER', 'WAIVER_ERROR'])): Promise<Transaction[]> {
    if (!scoring_period) scoring_period = this.scoringPeriodId;
    for (const t of types) {
      if (!TRANSACTION_TYPES.has(t)) throw new Error('Invalid transaction type');
    }
    const params: any = { view: 'mTransactions2', scoringPeriodId: scoring_period };
    const filters = { transactions: { filterType: { value: Array.from(types) } } };
    const headers = { 'x-fantasy-filter': JSON.stringify(filters) } as any;
    const data = await this.espnRequest.leagueGet(params, headers);
    const transactions = data['transactions'] ?? [];
    return transactions.map((tr: any) => new Transaction(tr, this.playerNameById as any, this.get_team_data));
  }

  async free_agents(week?: number, size = 50, position?: string, position_id?: number): Promise<Player[]> {
    if (this.seasonId < 2019) throw new Error('Cant use free agents before 2019');
    if (!week) week = this.current_week;
    const slot_filter: number[] = [];
    if (position && position in POSITION_MAP) slot_filter.push(POSITION_MAP[position]);
    if (typeof position_id === 'number') slot_filter.push(position_id);
    const params: any = { view: 'kona_player_info', scoringPeriodId: week };
    const filters = { players: { filterStatus: { value: ['FREEAGENT', 'WAIVERS'] }, filterSlotIds: { value: slot_filter }, limit: size, sortPercOwned: { sortPriority: 1, sortAsc: false }, sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'STANDARD' } } };
    const headers = { 'x-fantasy-filter': JSON.stringify(filters) } as any;
    const data = await this.espnRequest.leagueGet(params, headers);
    const players = data['players'] ?? [];
    return players.map((p: any) => new Player(p, this.seasonId));
  }

  async box_scores(matchup_period?: number, scoring_period?: number, matchup_total = true): Promise<BoxScore[]> {
    if (this.seasonId < 2019) throw new Error('Cant use box score before 2019');
    let matchup_id = this.currentMatchupPeriod;
    let scoring_id = this.current_week;
    if (matchup_period && scoring_period) {
      matchup_id = matchup_period;
      scoring_id = scoring_period;
    } else if (matchup_period && matchup_period < matchup_id) {
      matchup_id = matchup_period;
      scoring_id = this.matchup_ids[matchup_period]?.[this.matchup_ids[matchup_period].length - 1] ? Number(this.matchup_ids[matchup_period][this.matchup_ids[matchup_period].length - 1]) : 1;
    } else if (scoring_period && scoring_period <= scoring_id) {
      scoring_id = scoring_period;
      for (const m of Object.keys(this.matchup_ids)) {
        if ((this.matchup_ids as any)[m]?.includes(String(scoring_id))) {
          matchup_id = Number(m);
          break;
        }
      }
    }
    const params: any = { view: ['mMatchupScore', 'mScoreboard'], scoringPeriodId: scoring_id };
    const filters = { schedule: { filterMatchupPeriodIds: { value: [matchup_id] } } };
    const headers = { 'x-fantasy-filter': JSON.stringify(filters) } as any;
    const data = await this.espnRequest.leagueGet(params, headers);
    const schedule = data['schedule'] ?? [];
    const box_data = schedule.map((m: any) => new this.BoxScoreClass(m, this.pro_schedule, matchup_total, this.seasonId, scoring_id));
    for (const team of this.teams) {
      for (const matchup of box_data as any[]) {
        if (matchup.home_team === team.team_id) matchup.home_team = team;
        else if (matchup.away_team === team.team_id) matchup.away_team = team;
      }
    }
    return box_data as any;
  }

  async player_info(name?: string, playerId?: number | number[] | null, include_news = false): Promise<Player | Player[] | null> {
    if (name) playerId = this.player_map?.[name];
    if (playerId == null || typeof playerId === 'string') return null;
    if (!Array.isArray(playerId)) playerId = [playerId];
    const data = await this.espnRequest.get_player_card(playerId as number[], this.finalScoringPeriod);
    let news: Record<number, any[]> = {};
    if (include_news) {
      news = {};
      for (const id of playerId) {
        const n = await this.espnRequest.get_player_news(id);
        news[id] = n;
      }
    }
    if ((data['players'] ?? []).length === 1) {
      const p = data['players'][0];
      return new Player(p, this.seasonId, this.pro_schedule, { news: include_news ? news[(playerId as number[])[0]] ?? [] : undefined });
    }
    if ((data['players'] ?? []).length > 1) {
      return data['players'].map((p: any) => new Player(p, this.seasonId, this.pro_schedule, { news: include_news ? news[p['id']] ?? [] : undefined }));
    }
    return null;
  }
}


