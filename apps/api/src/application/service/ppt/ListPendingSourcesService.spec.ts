import { ListPendingSourcesService } from './ListPendingSourcesService';
import type { SourceStoragePort } from '../../port/out/ppt/SourceStoragePort';

describe('ListPendingSourcesService', () => {
  const makeSource = (
    overrides: Partial<jest.Mocked<SourceStoragePort>> = {},
  ): jest.Mocked<SourceStoragePort> => ({
    list: jest.fn(),
    read: jest.fn(),
    dispose: jest.fn(),
    save: jest.fn(),
    ...overrides,
  });

  it('把公槽來源檔對映成只含檔名的待轉換清單', async () => {
    const source = makeSource({
      list: jest.fn().mockResolvedValue([
        { name: 'a.pptx', path: '/in/a.pptx' },
        { name: 'b.pptx', path: '/in/b.pptx' },
      ]),
    });
    const service = new ListPendingSourcesService(source);

    const result = await service.execute();

    expect(result).toEqual([{ name: 'a.pptx' }, { name: 'b.pptx' }]);
  });

  it('來源為空時回傳空陣列', async () => {
    const source = makeSource({ list: jest.fn().mockResolvedValue([]) });
    const service = new ListPendingSourcesService(source);

    await expect(service.execute()).resolves.toEqual([]);
  });
});
