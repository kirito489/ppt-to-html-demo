import type {
  ConversionJob,
  JobTrigger,
} from '../../../../domain/model/ConversionJob';

export const INGEST_PPT_USE_CASE = 'INGEST_PPT_USE_CASE';

export interface IngestPptUseCase {
  /** 執行一次攝取批次（掃描來源 → 轉換 → 持久化 → 清除來源），回傳批次紀錄 */
  execute(trigger: JobTrigger): Promise<ConversionJob>;
}
