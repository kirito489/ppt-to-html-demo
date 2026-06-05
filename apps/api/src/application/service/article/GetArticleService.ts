import { Inject, Injectable } from '@nestjs/common';
import { GetArticleUseCase } from '../../port/in/article/GetArticleUseCase';
import {
  LOAD_CONVERTED_ARTICLE_PORT,
  LoadConvertedArticlePort,
} from '../../port/out/article/LoadConvertedArticlePort';
import type { ConvertedArticle } from '../../../domain/model/ConvertedArticle';
import { ArticleNotFoundException } from '../../../domain/exception/ArticleNotFoundException';

@Injectable()
export class GetArticleService implements GetArticleUseCase {
  constructor(
    @Inject(LOAD_CONVERTED_ARTICLE_PORT)
    private readonly load: LoadConvertedArticlePort,
  ) {}

  async execute(id: string): Promise<ConvertedArticle> {
    const article = await this.load.findById(id);
    if (!article) throw new ArticleNotFoundException();
    return article;
  }
}
