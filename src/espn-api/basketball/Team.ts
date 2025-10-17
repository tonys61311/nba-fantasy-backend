export class Team {
  team_id: number;
  team_abbrev?: string;
  team_name: string;
  division_id?: number;
  division_name?: string;
  schedule: Array<any> = [];
  final_standing: number;
  standing: number;
  wins?: number;
  losses?: number;
  ties?: number;
  points_for?: number;
  points_against?: number;
  logo_url?: string;
  owners?: any[];

  constructor(data: any, opts?: { roster?: any; schedule?: any[]; year?: number; owners?: any[]; pro_schedule?: any }) {
    this.team_id = data?.id ?? 0;
    this.team_abbrev = data?.abbrev;
    const name = data?.name ?? '';
    if (name) this.team_name = name;
    else if (data?.location || data?.nickname) this.team_name = `${data?.location ?? 'Unknown'} ${data?.nickname ?? 'Unknown'}`;
    else this.team_name = data?.abbrev ?? 'Unknown';
    this.division_id = data?.divisionId;
    this.division_name = '';
    this.wins = data?.record?.overall?.wins ?? 0;
    this.losses = data?.record?.overall?.losses ?? 0;
    this.ties = data?.record?.overall?.ties ?? 0;
    this.points_for = data?.record?.overall?.pointsFor ?? 0;
    this.points_against = typeof data?.record?.overall?.pointsAgainst === 'number' ? Math.round(data.record.overall.pointsAgainst * 100) / 100 : 0;
    this.standing = data?.playoffSeed ?? 0;
    this.final_standing = data?.rankCalculatedFinal ?? 0;
    if (data?.logo) this.logo_url = data.logo;
    this.owners = opts?.owners ?? [];
    this.schedule = [];
    const schedule = Array.isArray(opts?.schedule) ? opts?.schedule : [];
    for (const match of schedule) {
      const awayTeamId = match?.away?.teamId ?? -1;
      const homeTeamId = match?.home?.teamId ?? -1;
      if (awayTeamId === this.team_id || homeTeamId === this.team_id) {
        const m: any = { ...match, away_team: awayTeamId, home_team: homeTeamId };
        if (awayTeamId === this.team_id) m.away_team = this;
        if (homeTeamId === this.team_id) m.home_team = this;
        this.schedule.push(m);
      }
    }
  }
}


