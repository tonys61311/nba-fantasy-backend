import { POSITION_MAP, PRO_TEAM_MAP, STATS_MAP, STAT_ID_MAP, NINE_CAT_STATS } from './constant';

export class Player {
  name: string;
  playerId: number;
  year: number;
  position: string;
  lineupSlot: string;
  eligibleSlots: string[];
  acquisitionType: string;
  proTeam: string;
  injuryStatus: string;
  posRank: number;
  stats: Record<string, any> = {};
  schedule: Record<string, any> = {};
  news: any = {};
  expected_return_date?: Date | null;
  injured?: boolean;
  total_points?: number;
  avg_points?: number;
  projected_total_points?: number;
  projected_avg_points?: number;

  constructor(data: any, year: number, pro_team_schedule?: any, opts?: { news?: any[] }) {
    const get = (obj: any, path: string, def?: any) => {
      try {
        return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj) ?? def;
      } catch {
        return def;
      }
    };
    const player = data?.playerPoolEntry?.player ?? data?.player ?? data;
    this.name = get(player, 'fullName', '');
    this.playerId = get(player, 'id', 0);
    this.year = year;
    this.position = POSITION_MAP[get(player, 'defaultPositionId', 0) - 1] ?? '';
    this.lineupSlot = POSITION_MAP[get(data, 'lineupSlotId', '')] ?? '';
    const eligible = get(player, 'eligibleSlots', []) as number[];
    this.eligibleSlots = Array.isArray(eligible) ? eligible.map((pos) => POSITION_MAP[pos]).filter(Boolean) : [];
    this.acquisitionType = get(player, 'acquisitionType', '');
    this.proTeam = PRO_TEAM_MAP[get(player, 'proTeamId', 0)] ?? 'FA';
    this.injuryStatus = get(player, 'injuryStatus', '');
    this.posRank = get(player, 'positionalRanking', 0);

    const expected = get(player, 'expectedReturnDate');
    this.expected_return_date = Array.isArray(expected) && expected.length >= 3 ? new Date(expected[0], expected[1] - 1, expected[2]) : null;

    if (pro_team_schedule) {
      const pro_team_id = get(player, 'proTeamId');
      const team_schedule = pro_team_schedule?.[pro_team_id] ?? {};
      for (const key of Object.keys(team_schedule)) {
        const game = team_schedule[key]?.[0];
        if (!game) continue;
        const opponent = game['awayProTeamId'] !== pro_team_id ? game['awayProTeamId'] : game['homeProTeamId'];
        this.schedule[key] = { team: PRO_TEAM_MAP[opponent], date: new Date(game['date']) };
      }
    }

    if (opts?.news) {
      this.news = (opts.news || []).map((item: any) => ({
        published: item?.published ?? '',
        headline: item?.headline ?? '',
        story: item?.story ?? '',
      }));
    }

    // enrich stats
    this.injuryStatus = player?.injuryStatus ?? this.injuryStatus;
    this.injured = !!player?.injured;
    for (const split of player?.stats ?? []) {
      if (split?.seasonId !== year) continue;
      const idPrefix = split?.id as string;
      const pretty = this._stat_id_pretty(idPrefix, split?.scoringPeriodId);
      const applied_total = split?.appliedTotal ?? 0;
      const applied_avg = Math.round((split?.appliedAverage ?? 0) * 100) / 100;
      const game = this.schedule[pretty] ?? {};
      const entry: any = { applied_total, applied_avg, team: game.team, date: game.date };
      const splitStats = split?.stats;
      if (splitStats) {
        if ('averageStats' in split) {
          const avg = Object.fromEntries(Object.keys(split?.averageStats ?? {}).filter((i) => (STATS_MAP as any)[i] !== '').map((i) => [(STATS_MAP as any)[i] ?? i, split.averageStats[i]]));
          const total = Object.fromEntries(Object.keys(split?.stats ?? {}).filter((i) => (STATS_MAP as any)[i] !== '').map((i) => [(STATS_MAP as any)[i] ?? i, split.stats[i]]));
          entry.avg = avg;
          entry.total = total;
        } else {
          entry.avg = null;
          entry.total = Object.fromEntries(Object.keys(split?.stats ?? {}).filter((i) => (STATS_MAP as any)[i] !== '').map((i) => [(STATS_MAP as any)[i] ?? i, split.stats[i]]));
        }
      }
      this.stats[pretty] = entry;
    }
    this.total_points = this.stats?.[`${year}_total`]?.applied_total ?? 0;
    this.avg_points = this.stats?.[`${year}_total`]?.applied_avg ?? 0;
    this.projected_total_points = this.stats?.[`${year}_projected`]?.applied_total ?? 0;
    this.projected_avg_points = this.stats?.[`${year}_projected`]?.applied_avg ?? 0;
  }

  private _stat_id_pretty(id: string, scoring_period: number) {
    const type = STAT_ID_MAP[id?.slice(0, 2) as string];
    return type ? `${id.slice(2)}_${type}` : String(scoring_period);
  }

  get nine_cat_averages(): Record<string, number> {
    const total = this.stats?.[`${this.year}_total`]?.avg ?? {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(total)) {
      if (NINE_CAT_STATS.has(k)) out[k] = k === 'FG%' || k === 'FT%' ? Number((v as number).toFixed(3)) : Number((v as number).toFixed(1));
    }
    return out;
  }
}


