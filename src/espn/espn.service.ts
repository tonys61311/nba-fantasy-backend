import { Injectable } from '@nestjs/common';
import { League } from '../espn-api/basketball/League';
import { env } from '../config/env';
import { Team } from '../espn-api/basketball/Team';
import { fetchImageAsBase64 } from '../common/utils/fetchImageAsBase64';

export interface GetStandingsParams {
  leagueId: number | string;
  seasonId: number | string;
  espnS2?: string;
  swid?: string;
}

@Injectable()
export class EspnService {
  async standings(params?: Partial<GetStandingsParams>): Promise<{ status: 'ok'; seasonId: number; standings: Team[] }> {
    const leagueId = (typeof params?.leagueId === 'string' ? Number(params?.leagueId) : (params?.leagueId as number)) ?? env.getLeagueId();
    const seasonId = (typeof params?.seasonId === 'string' ? Number(params?.seasonId) : (params?.seasonId as number)) ?? env.getSessionId();
    const espnS2 = params?.espnS2 ?? env.getEspnS2();
    const swid = params?.swid ?? env.getSwid();

    const league = new League(leagueId, seasonId, espnS2, swid);
    if (league.ready) await league.ready;
    const teams = league.standings().sort((a: any, b: any) => b.points - a.points);

    const enhancedTeams = await Promise.all(
      teams.map(async (team) => {
        const logoUrl = (team as any).logo_url || (team as any).logo || '';
        const logoBase64 = await fetchImageAsBase64(logoUrl).catch(() => null);
        return { ...(team as Team), logoBase64 } as Team & { logoBase64: string | null };
      }),
    );

    return { status: 'ok', seasonId, standings: enhancedTeams };
  }
}


