import type { Request } from 'express';
import { buildSystemLogData } from './system-log-helper';

const makeReq = (): Request =>
  // 測試僅需 buildSystemLogData 讀取的少數欄位
  ({
    method: 'GET',
    ip: '127.0.0.1',
    url: '/api/articles/x',
    headers: {},
    body: {},
    query: {},
  }) as unknown as Request;

describe('buildSystemLogData', () => {
  const t0 = new Date('2026-06-05T00:00:00.000Z');
  const t1 = new Date('2026-06-05T00:00:01.000Z');

  it('截斷過長的 response，避免超出 DB TEXT 欄位', () => {
    const huge = { html: 'x'.repeat(40_000) };
    const data = buildSystemLogData(makeReq(), 200, huge, t0, t1);
    expect((data.response ?? '').length).toBeLessThan(20_000);
    expect(data.response ?? '').toContain('[truncated');
  });

  it('移除回應中內嵌的 base64 圖片', () => {
    const payload = { html: '<img src="data:image/png;base64,AAAABBBB=="/>' };
    const data = buildSystemLogData(makeReq(), 200, payload, t0, t1);
    expect(data.response ?? '').toContain('[BASE64_IMAGE_REMOVED]');
    expect(data.response ?? '').not.toContain('base64,AAAA');
  });
});
