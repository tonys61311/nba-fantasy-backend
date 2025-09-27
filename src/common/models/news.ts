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
  text: string; // 純文字（移除所有標籤與屬性）
  // 是否為段落標題（h1~h6）
  isHeading?: boolean;
  // 標題等級（1~6），僅當 isHeading 為 true 時有值
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
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
