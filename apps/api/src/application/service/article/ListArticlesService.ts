import { Inject, Injectable } from '@nestjs/common';
import { ListArticlesUseCase } from '../../port/in/article/ListArticlesUseCase';
import {
  ArticlesPage,
  ListArticlesParams,
  LOAD_CONVERTED_ARTICLE_PORT,
  LoadConvertedArticlePort,
} from '../../port/out/article/LoadConvertedArticlePort';

@Injectable()
export class ListArticlesService implements ListArticlesUseCase {
  constructor(
    @Inject(LOAD_CONVERTED_ARTICLE_PORT)
    private readonly load: LoadConvertedArticlePort,
  ) {}

  execute(params: ListArticlesParams): Promise<ArticlesPage> {
    return this.load.list(params);
  }
}
