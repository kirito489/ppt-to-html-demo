import { Inject, Injectable } from '@nestjs/common';
import {
  ListPendingSourcesUseCase,
  PendingSource,
} from '../../port/in/ppt/ListPendingSourcesUseCase';
import {
  SOURCE_STORAGE_PORT,
  SourceStoragePort,
} from '../../port/out/ppt/SourceStoragePort';

/** 列出公槽中待轉換的來源檔（尚未被攝取轉換的 .pptx） */
@Injectable()
export class ListPendingSourcesService implements ListPendingSourcesUseCase {
  constructor(
    @Inject(SOURCE_STORAGE_PORT)
    private readonly source: SourceStoragePort,
  ) {}

  async execute(): Promise<PendingSource[]> {
    const files = await this.source.list();
    return files.map((f) => ({ name: f.name }));
  }
}
