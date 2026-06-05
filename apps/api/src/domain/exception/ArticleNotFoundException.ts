/**
 * 找不到指定的轉換文章
 */
export class ArticleNotFoundException extends Error {
  constructor(message = '找不到指定的文章') {
    super(message);
    this.name = 'ArticleNotFoundException';
  }
}
