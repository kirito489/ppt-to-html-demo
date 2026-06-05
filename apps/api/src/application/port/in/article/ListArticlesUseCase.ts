import type {
  ArticlesPage,
  ListArticlesParams,
} from '../../out/article/LoadConvertedArticlePort';

export const LIST_ARTICLES_USE_CASE = 'LIST_ARTICLES_USE_CASE';

export interface ListArticlesUseCase {
  execute(params: ListArticlesParams): Promise<ArticlesPage>;
}
