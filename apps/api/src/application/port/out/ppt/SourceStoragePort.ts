export const SOURCE_STORAGE_PORT = 'SOURCE_STORAGE_PORT';

/** 來源儲存中的一個檔案 */
export interface SourceFile {
  /** 檔名（含副檔名） */
  name: string;
  /** 在來源儲存中的位置（adapter 內部使用，如本地絕對路徑） */
  path: string;
}

/**
 * 來源儲存抽象：demo 以本地資料夾模擬公槽 SFTP，
 * 未來可替換為真實 SFTP adapter 而不更動上層流程。
 */
export interface SourceStoragePort {
  /** 列出所有待處理的 .pptx 來源檔 */
  list(): Promise<SourceFile[]>;
  /** 讀取來源檔內容 */
  read(file: SourceFile): Promise<Buffer>;
  /** 依設定策略處置來源檔（move 搬到 processed / delete 真刪） */
  dispose(file: SourceFile): Promise<void>;
  /** 寫入一個新來源檔（上傳用），回傳實際存入的檔案（檔名可能去重） */
  save(filename: string, content: Buffer): Promise<SourceFile>;
}
