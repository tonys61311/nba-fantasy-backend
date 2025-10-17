/* Centralized environment variable access with backward-compatible aliases.
 * Preferred names:
 * - PORT
 * - OPENAI_API_KEY
 * - FIREBASE_CONFIG
 * - LEAGUE_ID
 * - SESSION_ID (a.k.a seasonId/year)
 * - ESPN_S2
 * - SWID
 */

// Extra helpers for other modules
function getPort(): number {
  return readNumber(process.env.PORT)?.valueOf() ?? 3000;
}

function getOpenAiApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY ?? undefined;
}

function getFirebaseConfigJson(): string | undefined {
  return process.env.FIREBASE_CONFIG;
}

function hasFirebaseCredentials(): boolean {
  return Boolean(
    process.env.FIREBASE_CONFIG ||
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.FIREBASE_PROJECT_ID,
  );
}

function readNumber(value: string | undefined): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function getLeagueId(): number | undefined {
  return (
    readNumber(process.env.LEAGUE_ID)
  );
}

function getSessionId(): number | undefined {
  // SESSION_ID is the new canonical name; support YEAR/year/SEASON_ID for compatibility
  return (
    readNumber(process.env.SESSION_ID)
  );
}

function getEspnS2(): string | undefined {
  return process.env.ESPN_S2;
}

function getSwid(): string | undefined {
  return process.env.SWID;
}

export const env = {
  getLeagueId,
  getSessionId,
  getEspnS2,
  getSwid,
  getPort,
  getOpenAiApiKey,
  getFirebaseConfigJson,
  hasFirebaseCredentials,
};


