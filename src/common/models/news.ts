export interface LatestNewsItem {
  title: string;
  link: string;
  translated: string;
}

export interface LatestNewsResponse {
  data: LatestNewsItem[];
}
