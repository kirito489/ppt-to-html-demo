import { Inject, Injectable, Logger } from '@nestjs/common';
import { IngestPptUseCase } from '../../port/in/ppt/IngestPptUseCase';
import {
  CONVERT_PPT_USE_CASE,
  ConvertPptUseCase,
} from '../../port/in/ppt/ConvertPptUseCase';
import {
  SOURCE_STORAGE_PORT,
  SourceStoragePort,
} from '../../port/out/ppt/SourceStoragePort';
import {
  SAVE_CONVERTED_ARTICLE_PORT,
  SaveConvertedArticlePort,
} from '../../port/out/article/SaveConvertedArticlePort';
import {
  SAVE_CONVERSION_JOB_PORT,
  SaveConversionJobPort,
} from '../../port/out/conversion-job/SaveConversionJobPort';
import type {
  ConversionJob,
  JobFileDetail,
  JobTrigger,
} from '../../../domain/model/ConversionJob';

/**
 * 攝取編排：掃描來源 → 逐檔轉換 → 持久化文章 → 處置來源檔，並累積批次紀錄。
 * 單檔失敗隔離（不影響其他檔），失敗來源檔保留不處置。
 */
@Injectable()
export class IngestPptService implements IngestPptUseCase {
  private readonly logger = new Logger(IngestPptService.name);

  constructor(
    @Inject(SOURCE_STORAGE_PORT)
    private readonly source: SourceStoragePort,
    @Inject(CONVERT_PPT_USE_CASE)
    private readonly converter: ConvertPptUseCase,
    @Inject(SAVE_CONVERTED_ARTICLE_PORT)
    private readonly saveArticle: SaveConvertedArticlePort,
    @Inject(SAVE_CONVERSION_JOB_PORT)
    private readonly saveJob: SaveConversionJobPort,
  ) {}

  async execute(trigger: JobTrigger): Promise<ConversionJob> {
    const startedAt = new Date();
    const files = await this.source.list();
    const detail: JobFileDetail[] = [];
    let converted = 0;
    let failed = 0;

    for (const file of files) {
      try {
        const buffer = await this.source.read(file);
        const result = await this.converter.execute({
          buffer,
          filename: file.name,
        });
        const articleId = await this.saveArticle.save({
          title: result.title,
          sourceFilename: file.name,
          html: result.html,
          inventory: result.inventory,
          slideCount: result.slideCount,
          accuracy: result.accuracy,
          status: result.status,
        });
        await this.source.dispose(file);
        converted++;
        detail.push({
          filename: file.name,
          status: 'success',
          articleId,
          accuracyOverall: result.accuracy.overall,
        });
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`轉換失敗，保留來源檔 ${file.name}：${message}`);
        detail.push({ filename: file.name, status: 'failed', error: message });
      }
    }

    const finishedAt = new Date();
    const jobInput = {
      trigger,
      startedAt,
      finishedAt,
      filesScanned: files.length,
      filesConverted: converted,
      filesFailed: failed,
      detail,
    };
    const id = await this.saveJob.save(jobInput);

    return { id, createdAt: finishedAt, ...jobInput };
  }
}
