import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guard/JwtAuthGuard';
import {
  CurrentMember,
  MemberContext,
} from '../decorator/current-member.decorator';
import {
  LOAD_MEMBER_CONTEXT_PORT,
  LoadMemberContextPort,
} from '../../../../application/port/out/member/LoadMemberContextPort';

/** 取得目前登入者基本資料（含名稱，供前端顯示） */
@Controller('me')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    @Inject(LOAD_MEMBER_CONTEXT_PORT)
    private readonly loadContext: LoadMemberContextPort,
  ) {}

  @Get()
  async getProfile(@CurrentMember() actor: MemberContext) {
    const ctx = await this.loadContext.loadMemberContext(actor.sub);
    return {
      id: actor.sub,
      email: actor.email,
      name: ctx?.name ?? '',
    };
  }
}
