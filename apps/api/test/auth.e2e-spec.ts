import bcrypt from 'bcrypt';
import request from 'supertest';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createE2EApp, createMockRedis } from './test-app';

// ──────────────────────────────────────────────
// Mock 資料（精簡後：無 RBAC，角色由後端常數填入）
// ──────────────────────────────────────────────
const TEST_PASSWORD = 'TestPass123!';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 1);
const MEMBER_UUID = '00000000-0000-0000-0000-000000000001';

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
const DISABLED_MEMBER_RECORD = { ...MEMBER_RECORD, status: false };

const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  memberRecord: {
    findFirst: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
};

const mockRedis = createMockRedis();

describe('Auth E2E', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    ({ app } = await createE2EApp({ prisma: mockPrisma, redis: mockRedis }));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.memberRecord.findFirst.mockResolvedValue(MEMBER_RECORD);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.isTokenBlacklisted.mockResolvedValue(false);
    mockRedis.throttleIncrement.mockResolvedValue(1);
  });

  describe('POST /api/auth/login', () => {
    it('正確憑證 → 200 + 雙 token + roleName', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD });

      expect(response.status).toBe(200);
      const body = response.body as {
        data: {
          accessToken: string;
          refreshToken: string;
          accessTokenExpiresIn: number;
          refreshTokenExpiresIn: number;
          member: {
            id: string;
            email: string;
            member: string;
            roleName: string;
          };
        };
      };
      expect(typeof body.data.accessToken).toBe('string');
      expect(typeof body.data.refreshToken).toBe('string');
      expect(body.data.accessTokenExpiresIn).toBeGreaterThan(0);
      expect(body.data.member.roleName).toBe('管理員');
    });

    it('登入成功 → 寫入 lastLoginAt', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD });

      await new Promise((r) => setImmediate(r));

      const updateCalls = mockPrisma.memberRecord.update.mock.calls;
      const lastLoginUpdate = updateCalls.find(
        (call) =>
          (call[0] as { data?: { lastLoginAt?: unknown } })?.data
            ?.lastLoginAt !== undefined,
      );
      expect(lastLoginUpdate).toBeDefined();
    });

    it('無效 email 格式 → 400', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'any' });
      expect(response.status).toBe(400);
    });

    it('使用者不存在 → 401', async () => {
      mockPrisma.memberRecord.findFirst.mockResolvedValue(null);
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'any' });
      expect(response.status).toBe(401);
    });

    it('密碼錯誤 → 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong-password' });
      expect(response.status).toBe(401);
    });

    it('帳號停用 → 403 ACCOUNT_DISABLED', async () => {
      mockPrisma.memberRecord.findFirst.mockResolvedValue(
        DISABLED_MEMBER_RECORD,
      );
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD });
      expect(response.status).toBe(403);
      expect((response.body as { code: string }).code).toBe('ACCOUNT_DISABLED');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('無 JWT → 401', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/auth/logout',
      );
      expect(response.status).toBe(401);
    });

    it('login → logout → 204 + token 加入黑名單', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD });
      const { accessToken, refreshToken } = (
        loginRes.body as { data: { accessToken: string; refreshToken: string } }
      ).data;

      const logoutRes = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(logoutRes.status).toBe(204);
      expect(mockRedis.addToBlacklist).toHaveBeenCalledWith(
        accessToken,
        expect.any(Number),
      );
      expect(mockRedis.addToBlacklist).toHaveBeenCalledWith(
        refreshToken,
        expect.any(Number),
      );
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('有效 refresh token → 200 + 新 access token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD });
      const { refreshToken } = (
        loginRes.body as { data: { refreshToken: string } }
      ).data;

      const refreshRes = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(200);
      expect(
        typeof (refreshRes.body as { data: { accessToken: string } }).data
          .accessToken,
      ).toBe('string');
    });

    it('缺少 refreshToken → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({});
      expect(res.status).toBe(400);
    });

    it('無效 refresh token → 401 INVALID_REFRESH_TOKEN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'not-a-valid-jwt' });
      expect(res.status).toBe(401);
      expect((res.body as { code: string }).code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('以 access token 呼叫 → 401', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD });
      const { accessToken } = (
        loginRes.body as { data: { accessToken: string } }
      ).data;

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: accessToken });
      expect(res.status).toBe(401);
    });

    it('帳號停用 → 403 ACCOUNT_DISABLED', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: TEST_PASSWORD });
      const { refreshToken } = (
        loginRes.body as { data: { refreshToken: string } }
      ).data;

      mockPrisma.memberRecord.findFirst.mockResolvedValue(
        DISABLED_MEMBER_RECORD,
      );

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken });
      expect(res.status).toBe(403);
      expect((res.body as { code: string }).code).toBe('ACCOUNT_DISABLED');
    });
  });

  describe('Rate Limiting', () => {
    it('超過速率限制 → 429', async () => {
      mockRedis.throttleIncrement.mockResolvedValue(101);
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'any' });
      expect(response.status).toBe(429);
    });
  });
});
