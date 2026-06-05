import { Module } from '@nestjs/common';
import { ProfileController } from '../adapter/in/web/profile/ProfileController';
import { PrismaMemberRepository } from '../adapter/out/persistence/member/PrismaMemberRepository';
import { LOAD_MEMBER_PORT } from '../application/port/out/member/LoadMemberPort';
import { SAVE_MEMBER_PORT } from '../application/port/out/member/SaveMemberPort';
import { LOAD_MEMBER_CONTEXT_PORT } from '../application/port/out/member/LoadMemberContextPort';
import { JwtModule } from './jwt.module';

/**
 * 精簡後的會員模組：僅保留登入與 /me 所需的會員讀取能力。
 * 會員 CRUD、角色權限已隨 demo 精簡移除。
 */
@Module({
  imports: [JwtModule],
  controllers: [ProfileController],
  providers: [
    PrismaMemberRepository,
    { provide: LOAD_MEMBER_PORT, useExisting: PrismaMemberRepository },
    { provide: SAVE_MEMBER_PORT, useExisting: PrismaMemberRepository },
    { provide: LOAD_MEMBER_CONTEXT_PORT, useExisting: PrismaMemberRepository },
  ],
  exports: [LOAD_MEMBER_PORT, SAVE_MEMBER_PORT, LOAD_MEMBER_CONTEXT_PORT],
})
export class MemberModule {}
