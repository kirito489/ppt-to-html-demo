import { Module } from '@nestjs/common';
import { ArticleController } from '../adapter/in/web/article/ArticleController';
import { PptFacade } from '../application/facade/PptFacade';
import { ConvertPptService } from '../application/service/ppt/ConvertPptService';
import { IngestPptService } from '../application/service/ppt/IngestPptService';
import { UploadPptService } from '../application/service/ppt/UploadPptService';
import { ListArticlesService } from '../application/service/article/ListArticlesService';
import { GetArticleService } from '../application/service/article/GetArticleService';
import { ListConversionJobsService } from '../application/service/article/ListConversionJobsService';
import { LocalFolderSourceAdapter } from '../adapter/out/ppt/LocalFolderSourceAdapter';
import { PrismaConvertedArticleRepository } from '../adapter/out/persistence/article/PrismaConvertedArticleRepository';
import { PrismaConversionJobRepository } from '../adapter/out/persistence/conversion-job/PrismaConversionJobRepository';
import { PptIngestScheduler } from '../adapter/in/scheduler/PptIngestScheduler';
import { MemberModule } from './member.module';
import { CONVERT_PPT_USE_CASE } from '../application/port/in/ppt/ConvertPptUseCase';
import { INGEST_PPT_USE_CASE } from '../application/port/in/ppt/IngestPptUseCase';
import { UPLOAD_PPT_USE_CASE } from '../application/port/in/ppt/UploadPptUseCase';
import { LIST_ARTICLES_USE_CASE } from '../application/port/in/article/ListArticlesUseCase';
import { GET_ARTICLE_USE_CASE } from '../application/port/in/article/GetArticleUseCase';
import { LIST_CONVERSION_JOBS_USE_CASE } from '../application/port/in/article/ListConversionJobsUseCase';
import { SOURCE_STORAGE_PORT } from '../application/port/out/ppt/SourceStoragePort';
import { SAVE_CONVERTED_ARTICLE_PORT } from '../application/port/out/article/SaveConvertedArticlePort';
import { LOAD_CONVERTED_ARTICLE_PORT } from '../application/port/out/article/LoadConvertedArticlePort';
import { SAVE_CONVERSION_JOB_PORT } from '../application/port/out/conversion-job/SaveConversionJobPort';
import { LOAD_CONVERSION_JOB_PORT } from '../application/port/out/conversion-job/LoadConversionJobPort';
import { JwtModule } from './jwt.module';

/**
 * PPT→HTML 攝取與文章查詢模組。
 * PrismaService（@Global PrismaModule）與 SchedulerRegistry（ScheduleModule.forRoot）為全域，無需 import。
 */
@Module({
  // MemberModule 提供 JwtAuthGuard 所需的 LOAD_MEMBER_CONTEXT_PORT
  imports: [JwtModule, MemberModule],
  controllers: [ArticleController],
  providers: [
    // Use case 實作
    ConvertPptService,
    { provide: CONVERT_PPT_USE_CASE, useExisting: ConvertPptService },
    IngestPptService,
    { provide: INGEST_PPT_USE_CASE, useExisting: IngestPptService },
    UploadPptService,
    { provide: UPLOAD_PPT_USE_CASE, useExisting: UploadPptService },
    ListArticlesService,
    { provide: LIST_ARTICLES_USE_CASE, useExisting: ListArticlesService },
    GetArticleService,
    { provide: GET_ARTICLE_USE_CASE, useExisting: GetArticleService },
    ListConversionJobsService,
    {
      provide: LIST_CONVERSION_JOBS_USE_CASE,
      useExisting: ListConversionJobsService,
    },
    // Out adapters
    LocalFolderSourceAdapter,
    { provide: SOURCE_STORAGE_PORT, useExisting: LocalFolderSourceAdapter },
    PrismaConvertedArticleRepository,
    {
      provide: SAVE_CONVERTED_ARTICLE_PORT,
      useExisting: PrismaConvertedArticleRepository,
    },
    {
      provide: LOAD_CONVERTED_ARTICLE_PORT,
      useExisting: PrismaConvertedArticleRepository,
    },
    PrismaConversionJobRepository,
    {
      provide: SAVE_CONVERSION_JOB_PORT,
      useExisting: PrismaConversionJobRepository,
    },
    {
      provide: LOAD_CONVERSION_JOB_PORT,
      useExisting: PrismaConversionJobRepository,
    },
    // Facade + 排程
    PptFacade,
    PptIngestScheduler,
  ],
})
export class PptModule {}
