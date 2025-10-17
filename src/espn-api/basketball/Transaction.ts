export class TransactionItem {
  type: string;
  player: string;
  constructor(data: any, player_map: Record<string, number>) {
    this.type = data?.type;
    this.player = (player_map as any)[data?.playerId];
  }
}

export class Transaction {
  team: any;
  type: string;
  status: string;
  scoring_period: number;
  date?: number;
  bid_amount?: number;
  items: TransactionItem[] = [];
  constructor(data: any, player_map: Record<string, number>, get_team_data: (id: number) => any) {
    this.team = get_team_data(data?.teamId);
    this.type = data?.type;
    this.status = data?.status;
    this.scoring_period = data?.scoringPeriodId;
    this.date = data?.processDate;
    this.bid_amount = data?.bidAmount;
    for (const item of data?.items ?? []) this.items.push(new TransactionItem(item, player_map));
  }
}


