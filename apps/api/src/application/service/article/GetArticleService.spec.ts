import { GetArticleService } from './GetArticleService';
import type { LoadConvertedArticlePort } from '../../port/out/article/LoadConvertedArticlePort';
import type { ConvertedArticle } from '../../../domain/model/ConvertedArticle';
import { ArticleNotFoundException } from '../../../domain/exception/ArticleNotFoundException';

const article: ConvertedArticle = {
  id: 'a1',
  title: 't',
  sourceFilename: 'a.pptx',
  html: '<div></div>',
  inventory: [],
  slideCount: 1,
  accuracy: { overall: 1, text: 1, image: 1, coverage: 1, slides: [] },
  status: 'success',
  createdAt: new Date(),
};

describe('GetArticleService', () => {
  it('找到時回傳文章', async () => {
    const load: jest.Mocked<LoadConvertedArticlePort> = {
      list: jest.fn(),
      findById: jest.fn().mockResolvedValue(article),
    };
    const service = new GetArticleService(load);

    await expect(service.execute('a1')).resolves.toEqual(article);
  });

  it('找不到時拋 ArticleNotFoundException', async () => {
    const load: jest.Mocked<LoadConvertedArticlePort> = {
      list: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
    };
    const service = new GetArticleService(load);

    await expect(service.execute('missing')).rejects.toBeInstanceOf(
      ArticleNotFoundException,
    );
  });
});
