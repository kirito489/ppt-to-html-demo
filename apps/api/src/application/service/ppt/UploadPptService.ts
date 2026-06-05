import { Inject, Injectable } from '@nestjs/common';
import {
  UploadPptCommand,
  UploadPptResult,
  UploadPptUseCase,
} from '../../port/in/ppt/UploadPptUseCase';
import {
  SOURCE_STORAGE_PORT,
  SourceStoragePort,
} from '../../port/out/ppt/SourceStoragePort';

/**
 * 上傳：把 .pptx 存入公槽（來源儲存），不在此時轉換。
 * 轉換沿用既有路徑——排程定時掃描或手動觸發 `POST /api/articles/ingest`。
 */
@Injectable()
export class UploadPptService implements UploadPptUseCase {
  constructor(
    @Inject(SOURCE_STORAGE_PORT)
    private readonly source: SourceStoragePort,
  ) {}

  async execute(command: UploadPptCommand): Promise<UploadPptResult> {
    const saved = await this.source.save(command.filename, command.buffer);
    return { filename: saved.name };
  }
}
