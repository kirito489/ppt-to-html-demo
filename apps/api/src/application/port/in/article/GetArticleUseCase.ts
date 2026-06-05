import type { ConvertedArticle } from '../../../../domain/model/ConvertedArticle';

export const GET_ARTICLE_USE_CASE = 'GET_ARTICLE_USE_CASE';

export interface GetArticleUseCase {
  /** 取得單篇文章；找不到時拋 ArticleNotFoundException */
  execute(id: string): Promise<ConvertedArticle>;
}
