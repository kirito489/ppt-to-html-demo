import type { NewConvertedArticle } from '../../../../domain/model/ConvertedArticle';

export const SAVE_CONVERTED_ARTICLE_PORT = 'SAVE_CONVERTED_ARTICLE_PORT';

export interface SaveConvertedArticlePort {
  /** 儲存轉換後文章，回傳新建 id */
  save(article: NewConvertedArticle): Promise<string>;
}
