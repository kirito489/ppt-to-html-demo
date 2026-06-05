import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import pino from 'pino';

const log = pino({
  name: 'seed-test-members',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss' },
  },
});

const BCRYPT_ROUNDS = 10;

// 管理員帳號可透過 env 覆蓋（ADMIN_DEFAULT_EMAIL / ADMIN_DEFAULT_PASSWORD）
const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@test.com';
const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin1234!';

export default async function seed(prisma: PrismaClient): Promise<void> {
  log.info('插入管理員帳號...');

  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

  await prisma.memberRecord.upsert({
    where: { email: adminEmail },
    update: {
      member: '管理員',
      password: passwordHash,
      isDefault: true,
    },
    create: {
      email: adminEmail,
      member: '管理員',
      password: passwordHash,
      isDefault: true,
    },
  });

  log.info(`完成：管理員帳號（${adminEmail}）`);
}
