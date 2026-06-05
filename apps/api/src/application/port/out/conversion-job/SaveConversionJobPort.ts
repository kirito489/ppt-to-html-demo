import type { NewConversionJob } from '../../../../domain/model/ConversionJob';

export const SAVE_CONVERSION_JOB_PORT = 'SAVE_CONVERSION_JOB_PORT';

export interface SaveConversionJobPort {
  /** 儲存攝取批次紀錄，回傳新建 id */
  save(job: NewConversionJob): Promise<string>;
}
