import type {
  ArticleListItem,
  ConvertedArticle,
} from '../../../../domain/model/ConvertedArticle';

export const LOAD_CONVERTED_ARTICLE_PORT = 'LOAD_CONVERTED_ARTICLE_PORT';

export interface ListArticlesParams {
  page: number;
  limit: number;
}

export interface ArticlesPage {
  data: ArticleListItem[];
  total: number;
}

export interface LoadConvertedArticlePort {
  list(params: ListArticlesParams): Promise<ArticlesPage>;
  findById(id: string): Promise<ConvertedArticle | null>;
}
