import { Inject, Injectable } from '@nestjs/common';
import {
  LIST_ARTICLES_USE_CASE,
  ListArticlesUseCase,
} from '../port/in/article/ListArticlesUseCase';
import {
  GET_ARTICLE_USE_CASE,
  GetArticleUseCase,
} from '../port/in/article/GetArticleUseCase';
import {
  LIST_CONVERSION_JOBS_USE_CASE,
  ListConversionJobsUseCase,
} from '../port/in/article/ListConversionJobsUseCase';
import {
  INGEST_PPT_USE_CASE,
  IngestPptUseCase,
} from '../port/in/ppt/IngestPptUseCase';
import type {
  ArticlesPage,
  ListArticlesParams,
} from '../port/out/article/LoadConvertedArticlePort';
import type {
  JobsPage,
  ListJobsParams,
} from '../port/out/conversion-job/LoadConversionJobPort';
import type { ConvertedArticle } from '../../domain/model/ConvertedArticle';
import type { ConversionJob } from '../../domain/model/ConversionJob';

@Injectable()
export class PptFacade {
  constructor(
    @Inject(LIST_ARTICLES_USE_CASE)
    private readonly listArticlesUseCase: ListArticlesUseCase,
    @Inject(GET_ARTICLE_USE_CASE)
    private readonly getArticleUseCase: GetArticleUseCase,
    @Inject(LIST_CONVERSION_JOBS_USE_CASE)
    private readonly listConversionJobsUseCase: ListConversionJobsUseCase,
    @Inject(INGEST_PPT_USE_CASE)
    private readonly ingestPptUseCase: IngestPptUseCase,
  ) {}

  listArticles(params: ListArticlesParams): Promise<ArticlesPage> {
    return this.listArticlesUseCase.execute(params);
  }

  getArticle(id: string): Promise<ConvertedArticle> {
    return this.getArticleUseCase.execute(id);
  }

  listConversionJobs(params: ListJobsParams): Promise<JobsPage> {
    return this.listConversionJobsUseCase.execute(params);
  }

  /** demo 手動觸發一次攝取 */
  ingest(): Promise<ConversionJob> {
    return this.ingestPptUseCase.execute('manual');
  }
}
