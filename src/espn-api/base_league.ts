import axios, { AxiosInstance } from 'axios';
import { BaseSettings } from './base_settings';

export interface Cookies {
  espnS2?: string;
  swid?: string;
}

export class ESPNAccessDenied extends Error {}
export class ESPNInvalidLeague extends Error {}
export class ESPNUnknownError extends Error {}

export class EspnFantasyRequests {
  private axios: AxiosInstance;
  public ENDPOINT: string;
  public NEWS_ENDPOINT: string;
  public LEAGUE_ENDPOINT: string;
  
  constructor(
    private sport: 'nba' | 'nfl' | 'nhl' | 'mlb' | 'wnba',
    private year: number,
    private leagueId: number,
    private cookies?: Cookies,
  ) {
    const sportMap: Record<string, string> = {
      nfl: 'ffl',
      nba: 'fba',
      nhl: 'fhl',
      mlb: 'flb',
      wnba: 'wfba',
    };
    const FANTASY_BASE_ENDPOINT = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/';
    const NEWS_BASE_ENDPOINT = 'https://site.api.espn.com/apis/fantasy/v3/games/';

    this.ENDPOINT = `${FANTASY_BASE_ENDPOINT}${sportMap[sport]}/seasons/${this.year}`;
    this.NEWS_ENDPOINT = `${NEWS_BASE_ENDPOINT}${sportMap[sport]}/news/players`;
    this.LEAGUE_ENDPOINT = `${FANTASY_BASE_ENDPOINT}${sportMap[sport]}`;
    if (year < 2018) {
      this.LEAGUE_ENDPOINT += `/leagueHistory/${this.leagueId}?seasonId=${this.year}`;
    } else {
      this.LEAGUE_ENDPOINT += `/seasons/${this.year}/segments/0/leagues/${this.leagueId}`;
    }

    this.axios = axios.create({
      paramsSerializer: {
        serialize: (params: any) => {
          const usp = new URLSearchParams();
          if (params && typeof params === 'object') {
            for (const [k, v] of Object.entries(params)) {
              if (v == null) continue;
              if (Array.isArray(v)) {
                for (const item of v) usp.append(k, String(item));
              } else {
                usp.set(k, String(v));
              }
            }
          }
          return usp.toString();
        },
      },
    });
  }

  private get headers(): Record<string, string> {
    if (this.cookies?.espnS2 && this.cookies?.swid) {
      return { Cookie: `espn_s2=${this.cookies.espnS2}; SWID=${this.cookies.swid};` };
    }
    return {};
  }

  private async checkRequestStatus(status: number, extend = '', params?: any, headers?: any): Promise<any | null> {
    if (status === 401) {
      if (this.LEAGUE_ENDPOINT.includes('/leagueHistory/')) {
        const base = this.LEAGUE_ENDPOINT.split('/leagueHistory/')[0];
        this.LEAGUE_ENDPOINT = `${base}/seasons/${this.year}/segments/0/leagues/${this.leagueId}`;
      } else {
        const base = this.LEAGUE_ENDPOINT.split('/seasons/')[0];
        this.LEAGUE_ENDPOINT = `${base}/leagueHistory/${this.leagueId}?seasonId=${this.year}`;
      }
      const r = await this.axios.get(this.LEAGUE_ENDPOINT + extend, { params, headers: { ...headers, ...this.headers }, withCredentials: true });
      if (r.status === 200) return r.data;
      if (!this.cookies?.espnS2 || !this.cookies?.swid) {
        throw new ESPNAccessDenied('espn_s2 and swid are required');
      }
      throw new ESPNAccessDenied(`League ${this.leagueId} cannot be accessed with espn_s2=${this.cookies.espnS2} and swid=${this.cookies.swid}`);
    }
    if (status === 404) throw new ESPNInvalidLeague(`League ${this.leagueId} does not exist`);
    if (status !== 200) throw new ESPNUnknownError(`ESPN returned an HTTP ${status}`);
    return null;
  }

  async leagueGet(params?: any, headers?: any, extend = ''): Promise<any> {
    const endpoint = this.LEAGUE_ENDPOINT + extend;
    const r = await this.axios.get(endpoint, { params, headers: { ...headers, ...this.headers } });
    const alt = await this.checkRequestStatus(r.status, extend, params, headers);
    const response = alt ?? r.data;
    return Array.isArray(response) ? response[0] : response;
  }

  async get(params?: any, headers?: any, extend = ''): Promise<any> {
    const endpoint = this.ENDPOINT + extend;
    const r = await this.axios.get(endpoint, { params, headers: { ...headers, ...this.headers } });
    await this.checkRequestStatus(r.status);
    return r.data;
  }

  async newsGet(params?: any, headers?: any, extend = ''): Promise<any> {
    const endpoint = this.NEWS_ENDPOINT + extend;
    const r = await this.axios.get(endpoint, { params, headers: { ...headers, ...this.headers } });
    return r.data;
  }

  async get_league(): Promise<any> {
    const params = { view: ['mTeam', 'mRoster', 'mMatchup', 'mSettings', 'mStandings'] };
    return this.leagueGet(params);
  }

  async get_pro_schedule(): Promise<any> {
    const params = { view: 'proTeamSchedules_wl' };
    return this.get(params);
  }

  async get_pro_players(): Promise<any> {
    const params = { view: 'players_wl' };
    const filters = { filterActive: { value: true } };
    const headers = { 'x-fantasy-filter': JSON.stringify(filters) };
    return this.get(params, headers, '/players');
  }

  async get_league_draft(): Promise<any> {
    const params = { view: 'mDraftDetail' };
    return this.leagueGet(params);
  }

  async get_player_card(playerIds: number[], maxScoringPeriod: number, additionalFilters?: any[]): Promise<any> {
    const params = { view: 'kona_playercard' };
    const additionalValue = [`00${this.year}`, `10${this.year}`, ...(additionalFilters ?? [])];
    const filters = { players: { filterIds: { value: playerIds }, filterStatsForTopScoringPeriodIds: { value: maxScoringPeriod, additionalValue } } };
    const headers = { 'x-fantasy-filter': JSON.stringify(filters) };
    return this.leagueGet(params, headers);
  }

  async get_player_news(playerId: number): Promise<any> {
    const params = { playerId };
    return this.newsGet(params);
  }
}

export class BaseLeague {
  public leagueId: number;
  public seasonId: number;
  public espnS2?: string;
  public swid?: string;
  public debug?: boolean;
  public sport: string;
  public espnRequest: EspnFantasyRequests;

  // Common fields used by League
  public teams: any[] = [];
  public settings: BaseSettings = new BaseSettings({});
  public currentMatchupPeriod = 1;
  public scoringPeriodId = 1;
  public current_week = 1;
  public playerNameById: Record<number, string> = {};
  public playerIdByName: Record<string, number> = {};
  public finalScoringPeriod = 1;
  public firstScoringPeriod = 1;
  public previousSeasons: number[] = [];

  constructor(opts: { leagueId: number; year: number; sport: string; espnS2?: string; swid?: string; debug?: boolean }) {
    this.leagueId = opts.leagueId;
    this.seasonId = opts.year;
    this.sport = opts.sport;
    this.espnS2 = opts.espnS2;
    this.swid = opts.swid;
    this.debug = opts.debug;
    this.espnRequest = new EspnFantasyRequests(opts.sport as any, opts.year, opts.leagueId, { espnS2: opts.espnS2, swid: opts.swid });
  }

  // Back-compat access used by callers expecting name->id mapping
  public get player_map(): Record<string, number> {
    return this.playerIdByName;
  }

  // Stubs approximating python base behavior
  protected async _fetch_league(): Promise<any> {
    const data = await this.espnRequest.get_league();
    this.currentMatchupPeriod = data?.status?.currentMatchupPeriod ?? this.currentMatchupPeriod;
    this.scoringPeriodId = data?.scoringPeriodId ?? this.scoringPeriodId;
    this.firstScoringPeriod = data?.status?.firstScoringPeriod ?? this.firstScoringPeriod;
    this.finalScoringPeriod = data?.status?.finalScoringPeriod ?? this.finalScoringPeriod;
    const prev = Array.isArray(data?.status?.previousSeasons) ? data.status.previousSeasons : [];
    this.previousSeasons = prev.filter((y: unknown) => typeof y === 'number' && (y as number) < this.seasonId) as number[];
    if (this.seasonId < 2018) {
      this.current_week = data?.scoringPeriodId ?? this.current_week;
    } else {
      const final = data?.status?.finalScoringPeriod ?? this.finalScoringPeriod;
      this.current_week = this.scoringPeriodId <= final ? this.scoringPeriodId : final;
    }
    this.settings = new BaseSettings(data?.settings ?? {});
    return data;
  }

  protected async _get_all_pro_schedule(): Promise<any> {
    return this.espnRequest.get_pro_schedule();
  }

  protected _fetch_teams(data: any, options?: { TeamClass?: any; pro_schedule?: any }): void {
    const rawTeams = Array.isArray(data?.teams) ? data.teams : [];
    const schedule = Array.isArray(data?.schedule) ? data.schedule : [];
    const seasonId = data?.seasonId;
    const members = Array.isArray(data?.members) ? data.members : [];
    if (options?.TeamClass) {
      this.teams = rawTeams.map((t: any) => {
        const owners = members.filter((m: any) => Array.isArray(t?.owners) && t.owners.includes(m?.id));
        return new options.TeamClass(t, { schedule, year: seasonId, owners, pro_schedule: options?.pro_schedule, roster: t?.roster });
      });
    } else {
      this.teams = rawTeams;
    }
    // sort by team id
    this.teams = [...this.teams].sort((a: any, b: any) => (a?.team_id ?? 0) - (b?.team_id ?? 0));
  }

  protected async _fetch_draft(): Promise<void> {
    await this.espnRequest.get_league_draft();
  }

  protected async _fetch_players(): Promise<void> {
    const proPlayers = await this.espnRequest.get_pro_players();
    // Python 版：回傳陣列，每筆 { id, fullName }
    if (Array.isArray(proPlayers)) {
      for (const p of proPlayers) {
        if (typeof p?.id === 'number' && typeof p?.fullName === 'string') {
          this.playerNameById[p.id] = p.fullName;
          if (!(p.fullName in this.playerIdByName)) {
            this.playerIdByName[p.fullName] = p.id;
          }
        }
      }
      return;
    }
    // 後援：某些端點回到物件 players: []
    if (Array.isArray((proPlayers as any)?.players)) {
      for (const p of (proPlayers as any).players) {
        const id = p?.id ?? p?.player?.id;
        const fullName = p?.fullName ?? p?.player?.fullName;
        if (typeof id === 'number' && typeof fullName === 'string') {
          this.playerNameById[id] = fullName;
          if (!(fullName in this.playerIdByName)) this.playerIdByName[fullName] = id;
        }
      }
    }
  }

  public get_team_data = (teamId: number): any => {
    const found = (this.teams as any[]).find((t) => t?.team_id === teamId || t?.id === teamId);
    return found ?? { team_id: teamId };
  };
}


