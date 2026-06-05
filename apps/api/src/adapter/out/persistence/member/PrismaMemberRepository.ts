import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { LoadMemberPort } from '../../../../application/port/out/member/LoadMemberPort';
import { SaveMemberPort } from '../../../../application/port/out/member/SaveMemberPort';
import {
  LoadMemberContextPort,
  MemberContextData,
} from '../../../../application/port/out/member/LoadMemberContextPort';
import { Member } from '../../../../domain/model/Member';

// 精簡 demo 無 RBAC，所有會員以單一管理員角色呈現
const DEFAULT_ROLE_NAME = '管理員';
const DEFAULT_ROLE_CODE = 'ADMIN';

@Injectable()
export class PrismaMemberRepository
  implements LoadMemberPort, SaveMemberPort, LoadMemberContextPort
{
  constructor(private readonly prisma: PrismaService) {}

  async loadMemberByEmail(email: string): Promise<Member | null> {
    const r = await this.prisma.memberRecord.findFirst({
      where: { email, deletedAt: null },
    });
    if (!r) return null;
    return Member.reconstitute(
      r.id,
      r.email,
      r.member,
      r.password,
      '',
      r.status,
      r.isDefault,
      r.createdAt,
      DEFAULT_ROLE_NAME,
    );
  }

  async updateLastLoginAt(id: string): Promise<void> {
    await this.prisma.memberRecord.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async loadMemberContext(memberId: string): Promise<MemberContextData | null> {
    const member = await this.prisma.memberRecord.findFirst({
      where: { id: memberId, deletedAt: null },
    });
    if (!member) return null;
    return {
      id: member.id,
      email: member.email,
      name: member.member,
      roleName: DEFAULT_ROLE_NAME,
      roleCode: DEFAULT_ROLE_CODE,
      permissions: [],
      status: member.status,
      lastPasswordChange: member.lastPasswordChange,
    };
  }
}
