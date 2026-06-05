import { IngestPptService } from './IngestPptService';
import type { SourceStoragePort } from '../../port/out/ppt/SourceStoragePort';
import type { ConvertPptUseCase } from '../../port/in/ppt/ConvertPptUseCase';
import type { SaveConvertedArticlePort } from '../../port/out/article/SaveConvertedArticlePort';
import type { SaveConversionJobPort } from '../../port/out/conversion-job/SaveConversionJobPort';
import type { ConversionResult } from '../../../domain/model/conversion';

const okResult = (title: string): ConversionResult => ({
  title,
  html: `<div>${title}</div>`,
  slideCount: 1,
  inventory: [],
  accuracy: { overall: 1, text: 1, image: 1, coverage: 1, slides: [] },
  status: 'success',
});

const makeDeps = () => {
  const source: jest.Mocked<SourceStoragePort> = {
    list: jest.fn(),
    read: jest.fn().mockResolvedValue(Buffer.from('pptx')),
    dispose: jest.fn().mockResolvedValue(undefined),
  };
  const converter: jest.Mocked<ConvertPptUseCase> = {
    execute: jest.fn(),
  };
  const saveArticle: jest.Mocked<SaveConvertedArticlePort> = {
    save: jest.fn().mockResolvedValue('article-id'),
  };
  const saveJob: jest.Mocked<SaveConversionJobPort> = {
    save: jest.fn().mockResolvedValue('job-id'),
  };
  return { source, converter, saveArticle, saveJob };
};

describe('IngestPptService', () => {
  it('全部成功：存檔每篇、處置每個來源、累積批次紀錄', async () => {
    const { source, converter, saveArticle, saveJob } = makeDeps();
    source.list.mockResolvedValue([
      { name: 'a.pptx', path: '/in/a.pptx' },
      { name: 'b.pptx', path: '/in/b.pptx' },
    ]);
    converter.execute
      .mockResolvedValueOnce(okResult('A'))
      .mockResolvedValueOnce(okResult('B'));

    const service = new IngestPptService(
      source,
      converter,
      saveArticle,
      saveJob,
    );
    const job = await service.execute('manual');

    expect(job.filesScanned).toBe(2);
    expect(job.filesConverted).toBe(2);
    expect(job.filesFailed).toBe(0);
    expect(job.trigger).toBe('manual');
    expect(job.id).toBe('job-id');
    expect(saveArticle.save).toHaveBeenCalledTimes(2);
    expect(source.dispose).toHaveBeenCalledTimes(2);
    expect(saveJob.save).toHaveBeenCalledTimes(1);
  });

  it('單檔轉換失敗：計入失敗、不處置該來源、記錄錯誤', async () => {
    const { source, converter, saveArticle, saveJob } = makeDeps();
    source.list.mockResolvedValue([
      { name: 'good.pptx', path: '/in/good.pptx' },
      { name: 'bad.pptx', path: '/in/bad.pptx' },
    ]);
    converter.execute
      .mockResolvedValueOnce(okResult('good'))
      .mockRejectedValueOnce(new Error('解析失敗'));

    const service = new IngestPptService(
      source,
      converter,
      saveArticle,
      saveJob,
    );
    const job = await service.execute('scheduled');

    expect(job.filesConverted).toBe(1);
    expect(job.filesFailed).toBe(1);
    expect(saveArticle.save).toHaveBeenCalledTimes(1);
    // 只有成功的來源被處置
    expect(source.dispose).toHaveBeenCalledTimes(1);
    expect(source.dispose).toHaveBeenCalledWith({
      name: 'good.pptx',
      path: '/in/good.pptx',
    });
    const failed = job.detail.find((d) => d.filename === 'bad.pptx');
    expect(failed?.status).toBe('failed');
    expect(failed?.error).toContain('解析失敗');
  });

  it('來源為空：批次紀錄全為 0，不存任何文章', async () => {
    const { source, converter, saveArticle, saveJob } = makeDeps();
    source.list.mockResolvedValue([]);

    const service = new IngestPptService(
      source,
      converter,
      saveArticle,
      saveJob,
    );
    const job = await service.execute('scheduled');

    expect(job.filesScanned).toBe(0);
    expect(job.filesConverted).toBe(0);
    expect(job.filesFailed).toBe(0);
    expect(saveArticle.save).not.toHaveBeenCalled();
    expect(converter.execute).not.toHaveBeenCalled();
    expect(saveJob.save).toHaveBeenCalledTimes(1);
  });
});
