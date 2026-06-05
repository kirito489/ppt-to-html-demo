/**
 * PPT 解析 / 轉換失敗
 */
export class PptParseException extends Error {
  constructor(message = 'PPT 解析失敗') {
    super(message);
    this.name = 'PptParseException';
  }
}
