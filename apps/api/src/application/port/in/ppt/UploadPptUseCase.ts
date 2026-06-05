export const UPLOAD_PPT_USE_CASE = 'UPLOAD_PPT_USE_CASE';

export interface UploadPptCommand {
  /** 上傳的 .pptx 內容 */
  buffer: Buffer;
  /** 原始檔名 */
  filename: string;
}

export interface UploadPptResult {
  /** 實際存入公槽的檔名（同名會自動去重） */
  filename: string;
}

export interface UploadPptUseCase {
  /** 把上傳的 .pptx 存入公槽（來源儲存），不在此時轉換；轉換交由排程或手動觸發 */
  execute(command: UploadPptCommand): Promise<UploadPptResult>;
}
