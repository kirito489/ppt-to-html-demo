import bcrypt from 'bcrypt';
import request from 'supertest';
import { rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createE2EApp, createMockRedis } from './test-app';

const TEST_PASSWORD = 'TestPass123!';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 1);
const MEMBER_UUID = '00000000-0000-0000-0000-000000000001';
const ARTICLE_UUID = '11111111-1111-4111-8111-111111111111';

const MEMBER_RECORD = {
  id: MEMBER_UUID,
  email: 'test@example.com',
  member: 'Test User',
  password: TEST_HASH,
  status: true,
  isDefault: false,
  lastPasswordChange: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  lastLoginAt: null,
};

const ARTICLE_ROW = {
  id: ARTICLE_UUID,
  title: '示範簡報',
  sourceFilename: 'demo.pptx',
  slideCount: 2,
  accuracyOverall: 0.95,
  status: 'success',
  createdAt: new Date('2026-06-05T00:00:00.000Z'),
};

const ARTICLE_FULL = {
  ...ARTICLE_ROW,
  html: '<div class="ppt-article"><section class="ppt-slide"></section></div>',
  accuracyText: 1,
  accuracyImage: 1,
  accuracyCoverage: 0.9,
  inventory: {
    inventory: [
      {
        index: 1,
        elements: [{ kind: 'text', restored: true, text: '標題' }],
      },
    ],
    slides: [{ index: 1, coverage: 0.9, text: 1, image: 1, overall: 0.95 }],
  },
};

const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  memberRecord: {
    findFirst: jest.fn().mockResolvedValue(MEMBER_RECORD),
    update: jest.fn().mockResolvedValue({}),
  },
  convertedArticleRecord: {
    findMany: jest.fn().mockResolvedValue([ARTICLE_ROW]),
    count: jest.fn().mockResolvedValue(1),
    findUnique: jest.fn().mockResolvedValue(ARTICLE_FULL),
  },
  conversionJobRecord: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockResolvedValue({ id: 'job-1' }),
  },
};

const mockRedis = createMockRedis();

describe('Article E2E', () => {
  let app: NestExpressApplication;
  let token: string;

  beforeAll(async () => {
    // 清掉前次執行殘留的上傳檔，確保「來源為空」的攝取測試成立
    await rm(join(tmpdir(), 'ppt-e2e-incoming'), {
      recursive: true,
      force: true,
    });

    ({ app } = await createE2EApp({ prisma: mockPrisma, redis: mockRedis }));

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: TEST_PASSWORD });
    token = (loginRes.body as { data: { accessToken: string } }).data
      .accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('登入保護', () => {
    it('GET /api/articles 無 JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/articles');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/articles', () => {
    it('回傳分頁文章列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/articles')
        .set('authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as {
        data: { items: Array<{ id: string }>; meta: { total: number } };
      };
      expect(body.data.items).toHaveLength(1);
      expect(body.data.items[0].id).toBe(ARTICLE_UUID);
      expect(body.data.meta.total).toBe(1);
    });
  });

  describe('GET /api/articles/:id', () => {
    it('找到 → 回傳完整文章（含 html / accuracy / inventory）', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/articles/${ARTICLE_UUID}`)
        .set('authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as {
        data: {
          html: string;
          accuracy: { overall: number; slides: unknown[] };
          inventory: unknown[];
        };
      };
      expect(body.data.html).toContain('ppt-slide');
      expect(body.data.accuracy.overall).toBe(0.95);
      expect(body.data.accuracy.slides).toHaveLength(1);
      expect(body.data.inventory).toHaveLength(1);
    });

    it('找不到 → 404 ARTICLE_NOT_FOUND', async () => {
      mockPrisma.convertedArticleRecord.findUnique.mockResolvedValueOnce(null);
      const res = await request(app.getHttpServer())
        .get(`/api/articles/${ARTICLE_UUID}`)
        .set('authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect((res.body as { code: string }).code).toBe('ARTICLE_NOT_FOUND');
    });

    it('非 UUID → 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/articles/not-a-uuid')
        .set('authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/articles/ingest', () => {
    it('手動觸發 → 200 + 批次結果（來源為空時全 0）', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/articles/ingest')
        .set('authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as {
        data: { filesScanned: number; trigger: string };
      };
      expect(body.data.filesScanned).toBe(0);
      expect(body.data.trigger).toBe('manual');
    });
  });

  describe('GET /api/conversion-jobs', () => {
    it('回傳分頁批次紀錄', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/conversion-jobs')
        .set('authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as { data: { items: unknown[]; meta: unknown } };
      expect(Array.isArray(body.data.items)).toBe(true);
    });
  });

  describe('POST /api/articles/upload', () => {
    it('無 JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/articles/upload')
        .attach('file', Buffer.from('fake-pptx'), 'demo.pptx');
      expect(res.status).toBe(401);
    });

    it('有效 .pptx → 200 + 回存入檔名（不轉換）', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/articles/upload')
        .set('authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake-pptx'), 'demo.pptx');

      expect(res.status).toBe(200);
      const filename = (res.body as { data: { filename: string } }).data
        .filename;
      expect(filename).toMatch(/\.pptx$/);
    });

    it('中文檔名不亂碼（latin1 → UTF-8）', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/articles/upload')
        .set('authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake-pptx'), '量化策略.pptx');

      expect(res.status).toBe(200);
      const filename = (res.body as { data: { filename: string } }).data
        .filename;
      expect(filename).toContain('量化策略');
    });

    it('非 .pptx → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/articles/upload')
        .set('authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('not pptx'), 'demo.txt');
      expect(res.status).toBe(400);
    });

    it('缺少檔案 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/articles/upload')
        .set('authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/articles/pending', () => {
    it('無 JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/articles/pending',
      );
      expect(res.status).toBe(401);
    });

    it('有 JWT → 200 + 列出公槽中待轉換的 .pptx', async () => {
      // 先上傳一個檔到公槽，待轉換清單應列出它
      await request(app.getHttpServer())
        .post('/api/articles/upload')
        .set('authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake-pptx'), 'pending-demo.pptx');

      const res = await request(app.getHttpServer())
        .get('/api/articles/pending')
        .set('authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const items = (res.body as { data: { items: Array<{ name: string }> } })
        .data.items;
      expect(items.some((i) => i.name.endsWith('.pptx'))).toBe(true);
    });
  });

  describe('GET /api/me', () => {
    it('無 JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/me');
      expect(res.status).toBe(401);
    });

    it('有 JWT → 200 + 回 { id, email, name }', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/me')
        .set('authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const body = res.body as {
        data: { id: string; email: string; name: string };
      };
      expect(body.data.email).toBe('test@example.com');
      expect(body.data.name).toBe('Test User');
    });
  });
});
