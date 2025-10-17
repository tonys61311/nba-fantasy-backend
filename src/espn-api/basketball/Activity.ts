import { ACTIVITY_MAP, POSITION_MAP } from './constant';

export class Activity {
  actions: Array<[any, string, string, string?]> = [];
  date: number;
  constructor(data: any, playerMap: Record<string, number>, get_team_data: (id: number) => any, opts?: { include_moved?: boolean }) {
    this.date = data?.date;
    const include_moved = !!opts?.include_moved;
    for (const msg of data?.messages ?? []) {
      let team: any = '';
      let action = 'UNKNOWN';
      let player = '';
      let position = '';
      const msg_id = msg?.messageTypeId;
      if (msg_id === 244) team = get_team_data(msg?.from);
      else if (msg_id === 239) team = get_team_data(msg?.for);
      else if (msg_id === 188 && include_moved && POSITION_MAP[msg?.to]) position = POSITION_MAP[msg?.to];
      else team = get_team_data(msg?.to);

      if (msg_id in ACTIVITY_MAP) {
        if (include_moved) action = ACTIVITY_MAP[msg_id];
        else if (msg_id !== 188) action = ACTIVITY_MAP[msg_id];
      }
      if (msg?.targetId in playerMap) {
        const pid = msg?.targetId as number;
        player = (playerMap as any)[pid] ?? '';
      }
      if (action !== 'UNKNOWN') this.actions.push([team, action, player, position]);
    }
  }
}


