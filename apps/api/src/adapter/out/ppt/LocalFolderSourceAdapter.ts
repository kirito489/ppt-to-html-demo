import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  SourceFile,
  SourceStoragePort,
} from '../../../application/port/out/ppt/SourceStoragePort';
import { getEnv } from '../../../infrastructure/validate-env';

/**
 * 以本地資料夾模擬公槽 SFTP 的來源儲存 adapter。
 * 未來改接真實 SFTP 只需替換此 adapter，不動上層攝取流程。
 */
@Injectable()
export class LocalFolderSourceAdapter implements SourceStoragePort {
  private readonly logger = new Logger(LocalFolderSourceAdapter.name);

  private resolveDir(dir: string): string {
    return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
  }

  async list(): Promise<SourceFile[]> {
    const dir = this.resolveDir(getEnv().INGEST_SOURCE_DIR);
    await fs.mkdir(dir, { recursive: true });
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter(
        (e) =>
          e.isFile() &&
          e.name.toLowerCase().endsWith('.pptx') &&
          !e.name.startsWith('~$'), // 略過 Office 暫存鎖檔
      )
      .map((e) => ({ name: e.name, path: path.join(dir, e.name) }));
  }

  async read(file: SourceFile): Promise<Buffer> {
    return fs.readFile(file.path);
  }

  async save(filename: string, content: Buffer): Promise<SourceFile> {
    const dir = this.resolveDir(getEnv().INGEST_SOURCE_DIR);
    await fs.mkdir(dir, { recursive: true });
    // path.basename 防路徑穿越；同名則加時間戳去重，避免覆蓋既有來源
    const safe = path.basename(filename);
    let dest = path.join(dir, safe);
    try {
      await fs.access(dest);
      const ext = path.extname(safe);
      const stem = ext ? safe.slice(0, -ext.length) : safe;
      dest = path.join(dir, `${stem}-${Date.now()}${ext}`);
    } catch {
      // 不存在 → 直接用原名
    }
    await fs.writeFile(dest, content);
    this.logger.log(`已上傳來源檔 ${path.basename(dest)}`);
    return { name: path.basename(dest), path: dest };
  }

  async dispose(file: SourceFile): Promise<void> {
    const env = getEnv();
    if (env.INGEST_AFTER_CONVERT === 'delete') {
      await fs.unlink(file.path);
      this.logger.log(`已刪除來源檔 ${file.name}`);
      return;
    }
    const processedDir = this.resolveDir(env.INGEST_PROCESSED_DIR);
    await fs.mkdir(processedDir, { recursive: true });
    // 前綴時間戳避免 processed 內重名覆蓋
    const dest = path.join(processedDir, `${Date.now()}-${file.name}`);
    await fs.rename(file.path, dest);
    this.logger.log(`已搬移來源檔 ${file.name} → processed`);
  }
}
