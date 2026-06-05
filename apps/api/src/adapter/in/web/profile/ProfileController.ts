import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guard/JwtAuthGuard';
import {
  CurrentMember,
  MemberContext,
} from '../decorator/current-member.decorator';

/** 取得目前登入者基本資料（精簡版，僅供前端顯示與權限判斷） */
@Controller('me')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  @Get()
  getProfile(@CurrentMember() actor: MemberContext) {
    return {
      id: actor.sub,
      email: actor.email,
      roleName: actor.roleName,
      roleCode: actor.roleCode,
      permissionCodes: actor.permissions,
    };
  }
}
