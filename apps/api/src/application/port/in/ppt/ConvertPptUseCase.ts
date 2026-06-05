import type { ConversionResult } from '../../../../domain/model/conversion';

export const CONVERT_PPT_USE_CASE = 'CONVERT_PPT_USE_CASE';

export interface ConvertPptCommand {
  /** .pptx 檔案內容 */
  buffer: Buffer;
  /** 原始檔名（用於標題 fallback 與紀錄） */
  filename: string;
}

export interface ConvertPptUseCase {
  execute(command: ConvertPptCommand): Promise<ConversionResult>;
}
