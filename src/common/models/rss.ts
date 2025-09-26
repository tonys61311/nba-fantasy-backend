export interface RssItem {
  title?: string;
  link?: string;
}

export interface RssChannel {
  item?: RssItem | RssItem[];
}

export interface RssDocument {
  rss?: { channel?: RssChannel };
}

export function ensureArray<T>(maybeArray: T | T[] | undefined | null): T[] {
  if (!maybeArray) return [];
  return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
}
