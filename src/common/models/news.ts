export interface LatestNewsItem {
  title: string;
  link: string;
  translated: string;
}

export interface LatestNewsResponse {
  data: LatestNewsItem[];
}

export interface ArticleBlockText {
  type: 'text';
  html: string; // 保留段落內的 inline 標籤
}

export interface ArticleBlockImage {
  type: 'image';
  src: string;
  alt?: string;
  caption?: string;
}

export type ArticleBlock = ArticleBlockText | ArticleBlockImage;

export interface ArticleContent {
  title?: string;
  blocks: ArticleBlock[];
  url: string;
}
