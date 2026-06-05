import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AccountDisabledException } from '../../../domain/exception/AccountDisabledException';
import {
  LoginCommand,
  LoginResult,
  LoginUseCase,
} from '../../port/in/auth/LoginUseCase';
import {
  LOAD_MEMBER_PORT,
  LoadMemberPort,
} from '../../port/out/member/LoadMemberPort';
import {
  SAVE_MEMBER_PORT,
  SaveMemberPort,
} from '../../port/out/member/SaveMemberPort';
import {
  SAVE_AUTH_LOG_PORT,
  SaveAuthLogPort,
} from '../../port/out/auth/SaveAuthLogPort';
import {
  SESSION_ACTIVITY_PORT,
  SessionActivityPort,
} from '../../port/out/auth/SessionActivityPort';
import { FeatureFlagService } from '../shared/FeatureFlagService';
import { JwtPayload } from '../../port/jwt-payload';
import { getEnv } from '../../../infrastructure/validate-env';

/** 精簡後的登入：載入會員 → bcrypt 驗證 → status 檢查 → 簽發雙 Token。 */
@Injectable()
export class LoginService implements LoginUseCase {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    @Inject(LOAD_MEMBER_PORT)
    private readonly loadMember: LoadMemberPort,
    @Inject(SAVE_MEMBER_PORT)
    private readonly saveMember: SaveMemberPort,
    @Inject(SAVE_AUTH_LOG_PORT)
    private readonly saveAuthLog: SaveAuthLogPort,
    @Inject(SESSION_ACTIVITY_PORT)
    private readonly sessionActivity: SessionActivityPort,
    private readonly jwtService: JwtService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const { email, password, ip, userAgent } = command;

    const member = await this.loadMember.loadMemberByEmail(email);
    if (!member) {
      await this.logAuth(
        email,
        undefined,
        'LOGIN_FAILURE',
        ip,
        userAgent,
        '帳號不存在',
      );
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) {
      await this.logAuth(
        email,
        member.id.toString(),
        'LOGIN_FAILURE',
        ip,
        userAgent,
        '密碼錯誤',
      );
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    // status 檢查（放在 bcrypt 後避免 user enumeration）
    if (!member.status) {
      await this.logAuth(
        email,
        member.id.toString(),
        'LOGIN_FAILURE',
        ip,
        userAgent,
        '帳號已停用',
      );
      throw new AccountDisabledException();
    }

    const memberId = member.id.toString();
    const env = getEnv();

    // 雙 Token 簽發（雙 secret 分離）
    const accessToken = this.jwtService.sign(
      { sub: memberId, type: 'access' } satisfies JwtPayload,
      { secret: env.ACCESS_SECRET, expiresIn: env.ACCESS_TOKEN_EXPIRES_IN },
    );
    const refreshToken = this.jwtService.sign(
      { sub: memberId, type: 'refresh' } satisfies JwtPayload,
      { secret: env.REFRESH_SECRET, expiresIn: env.REFRESH_TOKEN_EXPIRES_IN },
    );

    // 初始化 session 活動追蹤
    if (this.featureFlags.isEnabled('sessionIdleEnabled')) {
      await this.sessionActivity.touchActivity(
        memberId,
        env.APPLICATION_SESSION_IDLE_TIMEOUT,
      );
    }

    // 更新 lastLoginAt（fire-and-forget；DB 寫入失敗不影響登入成功流程）
    this.saveMember.updateLastLoginAt(memberId).catch((err) => {
      this.logger.warn('updateLastLoginAt 失敗', err);
    });

    await this.logAuth(email, memberId, 'LOGIN_SUCCESS', ip, userAgent);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
      refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
      member: {
        id: memberId,
        email: member.email.toString(),
        member: member.member,
        roleName: member.roleName || '管理員',
      },
    };
  }

  /** 條件式記錄登入日誌（FeatureFlag 控制） */
  private async logAuth(
    email: string,
    memberId: string | undefined,
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE',
    ip?: string,
    userAgent?: string,
    detail?: string,
  ): Promise<void> {
    if (!this.featureFlags.isEnabled('authLogEnabled')) return;
    try {
      await this.saveAuthLog.saveAuthLog({
        email,
        memberId,
        action,
        ipAddress: ip,
        userAgent,
        detail,
      });
    } catch (err) {
      // fire-and-forget：日誌寫入失敗不影響登入流程
      this.logger.error('登入日誌寫入失敗', err);
    }
  }
}
