import { Inject, Injectable } from '@nestjs/common';
import {
  LOGIN_USE_CASE,
  LoginCommand,
  LoginResult,
  LoginUseCase,
} from '../port/in/auth/LoginUseCase';
import {
  LOGOUT_USE_CASE,
  LogoutCommand,
  LogoutUseCase,
} from '../port/in/auth/LogoutUseCase';
import {
  REFRESH_TOKEN_USE_CASE,
  RefreshTokenCommand,
  RefreshTokenResult,
  RefreshTokenUseCase,
} from '../port/in/auth/RefreshTokenUseCase';

@Injectable()
export class AuthFacade {
  constructor(
    @Inject(LOGIN_USE_CASE)
    private readonly loginUseCase: LoginUseCase,
    @Inject(LOGOUT_USE_CASE)
    private readonly logoutUseCase: LogoutUseCase,
    @Inject(REFRESH_TOKEN_USE_CASE)
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
  ) {}

  login(command: LoginCommand): Promise<LoginResult> {
    return this.loginUseCase.execute(command);
  }

  logout(command: LogoutCommand): Promise<void> {
    return this.logoutUseCase.execute(command);
  }

  refreshToken(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    return this.refreshTokenUseCase.execute(command);
  }
}
