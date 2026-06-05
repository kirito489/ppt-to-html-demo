export type JobTrigger = 'scheduled' | 'manual';

/** 單一來源檔的處理結果（寫入 job detail） */
export interface JobFileDetail {
  filename: string;
  status: 'success' | 'failed';
  /** 成功時對應的文章 id */
  articleId?: string;
  /** 成功時的整體準確率 */
  accuracyOverall?: number;
  /** 失敗原因 */
  error?: string;
}

/** 持久化後的攝取批次紀錄 */
export interface ConversionJob {
  id: string;
  trigger: JobTrigger;
  startedAt: Date;
  finishedAt: Date | null;
  filesScanned: number;
  filesConverted: number;
  filesFailed: number;
  detail: JobFileDetail[];
  createdAt: Date;
}

/** 新增攝取紀錄的輸入 */
export interface NewConversionJob {
  trigger: JobTrigger;
  startedAt: Date;
  finishedAt: Date;
  filesScanned: number;
  filesConverted: number;
  filesFailed: number;
  detail: JobFileDetail[];
}
