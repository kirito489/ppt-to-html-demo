export const LIST_PENDING_SOURCES_USE_CASE = 'LIST_PENDING_SOURCES_USE_CASE';

export interface PendingSource {
  /** 公槽中待轉換的檔名 */
  name: string;
}

export interface ListPendingSourcesUseCase {
  /** 列出公槽中已上傳、尚未轉換的來源檔 */
  execute(): Promise<PendingSource[]>;
}
