import { UploadPptService } from './UploadPptService';
import type { SourceStoragePort } from '../../port/out/ppt/SourceStoragePort';

describe('UploadPptService', () => {
  it('把上傳檔案存進來源並回傳存入檔名（不轉換）', async () => {
    const source: jest.Mocked<SourceStoragePort> = {
      list: jest.fn(),
      read: jest.fn(),
      dispose: jest.fn(),
      save: jest.fn().mockResolvedValue({
        name: 'demo-123.pptx',
        path: '/in/demo-123.pptx',
      }),
    };
    const service = new UploadPptService(source);

    const result = await service.execute({
      buffer: Buffer.from('pptx-bytes'),
      filename: 'demo.pptx',
    });

    expect(source.save).toHaveBeenCalledWith('demo.pptx', expect.any(Buffer));
    expect(result.filename).toBe('demo-123.pptx');
  });
});
