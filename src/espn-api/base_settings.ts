export class BaseSettings {
  reg_season_count: number;
  matchup_periods: any;
  veto_votes_required: number;
  team_count: number;
  playoff_team_count: number;
  keeper_count: number;
  trade_deadline: number;
  division_map: Record<number, string> = {};
  name: string;
  tie_rule: any;
  playoff_tie_rule: any;
  playoff_matchup_period_length: number;
  playoff_seed_tie_rule: any;
  scoring_type?: string;
  faab: boolean;
  acquisition_budget: number;

  constructor(data: any) {
    this.reg_season_count = data?.scheduleSettings?.matchupPeriodCount;
    this.matchup_periods = data?.scheduleSettings?.matchupPeriods;
    this.veto_votes_required = data?.tradeSettings?.vetoVotesRequired;
    this.team_count = data?.size;
    this.playoff_team_count = data?.scheduleSettings?.playoffTeamCount;
    this.keeper_count = data?.draftSettings?.keeperCount;
    this.trade_deadline = data?.tradeSettings?.deadlineDate ?? 0;
    this.name = data?.name;
    this.tie_rule = data?.scoringSettings?.matchupTieRule;
    this.playoff_tie_rule = data?.scoringSettings?.playoffMatchupTieRule;
    this.playoff_matchup_period_length = data?.scheduleSettings?.playoffMatchupPeriodLength ?? 0;
    this.playoff_seed_tie_rule = data?.scheduleSettings?.playoffSeedingRule;
    this.scoring_type = data?.scoringSettings?.scoringType;
    this.faab = !!data?.acquisitionSettings?.isUsingAcquisitionBudget;
    this.acquisition_budget = data?.acquisitionSettings?.acquisitionBudget ?? 0;
    const divisions = Array.isArray(data?.scheduleSettings?.divisions) ? data.scheduleSettings.divisions : [];
    for (const division of divisions) {
      const id = division?.id ?? 0;
      const name = division?.name ?? '';
      this.division_map[id] = name;
    }
  }
}


