import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService, AuthResponse, AuthTokens } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UserResponse } from '../users/users.service';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  clearAuthCookies,
  clearCsrfCookie,
  createCsrfToken,
  setAuthCookies,
  setCsrfCookie,
  REFRESH_TOKEN_COOKIE,
} from './auth.cookies';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registro de usuario' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Usuario registrado', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.register(dto);
    setAuthCookies(res, this.config, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    setCsrfCookie(res, this.config, createCsrfToken());
    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'Login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: 'Login correcto', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.login(dto);
    setAuthCookies(res, this.config, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    setCsrfCookie(res, this.config, createCsrfToken());
    return result;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refrescar tokens' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 201, description: 'Nuevos tokens', type: AuthTokensDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokens> {
    const cookieToken =
      typeof req.cookies?.[REFRESH_TOKEN_COOKIE] === 'string'
        ? req.cookies[REFRESH_TOKEN_COOKIE]
        : undefined;
    const result = await this.authService.refresh(dto, cookieToken);
    setAuthCookies(res, this.config, result);
    setCsrfCookie(res, this.config, createCsrfToken());
    return result;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 201, description: 'Sesión cerrada' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const cookieToken =
      typeof req.cookies?.[REFRESH_TOKEN_COOKIE] === 'string'
        ? req.cookies[REFRESH_TOKEN_COOKIE]
        : undefined;
    await this.authService.logout(dto, cookieToken);
    clearAuthCookies(res, this.config);
    clearCsrfCookie(res, this.config);
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Usuario actual (JWT)' })
  @ApiResponse({ status: 200, description: 'Usuario actual', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async me(@CurrentUser() user: UserResponse): Promise<UserResponse> {
    return user;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar reset de contraseña' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Mensaje neutro (si existe el email se envía enlace)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If an account exists with this email, you will receive a reset link.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña con token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password has been reset. You can now log in with your new password.' };
  }
}
