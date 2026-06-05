import type { Accuracy, ArticleStatus, SlideInventory } from './conversion';

/** 持久化後的轉換文章（讀取用完整型別） */
export interface ConvertedArticle {
  id: string;
  title: string;
  sourceFilename: string;
  html: string;
  inventory: SlideInventory[];
  slideCount: number;
  accuracy: Accuracy;
  status: ArticleStatus;
  createdAt: Date;
}

/** 新增文章的輸入（尚未有 id / createdAt） */
export interface NewConvertedArticle {
  title: string;
  sourceFilename: string;
  html: string;
  inventory: SlideInventory[];
  slideCount: number;
  accuracy: Accuracy;
  status: ArticleStatus;
}

/** 列表用精簡型別（不含 html / inventory） */
export interface ArticleListItem {
  id: string;
  title: string;
  sourceFilename: string;
  slideCount: number;
  accuracyOverall: number;
  status: ArticleStatus;
  createdAt: Date;
}
