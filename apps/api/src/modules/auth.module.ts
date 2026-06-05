import { Module } from '@nestjs/common';
import { AuthController } from '../adapter/in/web/auth/AuthController';
import { AuthFacade } from '../application/facade/AuthFacade';
import { LoginService } from '../application/service/auth/LoginService';
import { LogoutService } from '../application/service/auth/LogoutService';
import { RefreshTokenService } from '../application/service/auth/RefreshTokenService';
import { LOGIN_USE_CASE } from '../application/port/in/auth/LoginUseCase';
import { LOGOUT_USE_CASE } from '../application/port/in/auth/LogoutUseCase';
import { REFRESH_TOKEN_USE_CASE } from '../application/port/in/auth/RefreshTokenUseCase';
import { MemberModule } from './member.module';
import { JwtModule } from './jwt.module';

@Module({
  imports: [MemberModule, JwtModule],
  controllers: [AuthController],
  providers: [
    // TOKEN_BLACKLIST_PORT / CLEAR_MEMBER_CONTEXT_PORT / SESSION_ACTIVITY_PORT 由 @Global() RedisModule 提供
    // SAVE_AUTH_LOG_PORT 由 @Global() AuthLogModule 提供
    LoginService,
    LogoutService,
    RefreshTokenService,
    { provide: LOGIN_USE_CASE, useExisting: LoginService },
    { provide: LOGOUT_USE_CASE, useExisting: LogoutService },
    { provide: REFRESH_TOKEN_USE_CASE, useExisting: RefreshTokenService },
    AuthFacade,
  ],
})
export class AuthModule {}
