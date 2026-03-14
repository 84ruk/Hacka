import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { randomBytes } from 'crypto';

export const ACCESS_TOKEN_COOKIE = 'auth_access_token';
export const REFRESH_TOKEN_COOKIE = 'auth_refresh_token';
export const CSRF_TOKEN_COOKIE = 'auth_csrf_token';

type CookieOptions = {
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  path: string;
  maxAge?: number;
};

function parseDurationToMs(value?: string): number | undefined {
  if (!value) return undefined;
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  const multiplier = multipliers[unit];
  if (!multiplier || Number.isNaN(amount)) return undefined;
  return amount * multiplier;
}

type ClearCookieOptions = Pick<CookieOptions, 'path' | 'sameSite' | 'secure' | 'httpOnly'>;

function getCookieOptions(
  config: ConfigService,
  kind: 'access' | 'refresh' | 'csrf',
): CookieOptions {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const sameSite =
    (config.get<'lax' | 'strict' | 'none'>('COOKIE_SAME_SITE') as
      | 'lax'
      | 'strict'
      | 'none'
      | undefined) ?? 'lax';
  const secureFromEnv = config.get<boolean>('COOKIE_SECURE');
  const secure =
    typeof secureFromEnv === 'boolean' ? secureFromEnv : isProd || sameSite === 'none';
  const maxAge =
    kind === 'access'
      ? parseDurationToMs(config.get<string>('JWT_ACCESS_EXPIRATION'))
      : parseDurationToMs(config.get<string>('JWT_REFRESH_EXPIRATION'));
  const csrfMaxAge = parseDurationToMs(config.get<string>('JWT_REFRESH_EXPIRATION'));
  return {
    httpOnly: kind !== 'csrf',
    sameSite,
    secure,
    path: '/',
    ...(kind === 'csrf' ? (csrfMaxAge ? { maxAge: csrfMaxAge } : {}) : {}),
    ...(kind !== 'csrf' && maxAge ? { maxAge } : {}),
  };
}

/** Opciones para clearCookie: mismo path/sameSite/secure/httpOnly que al setear, sin maxAge (deprecado en Express 5). */
function getClearCookieOptions(
  config: ConfigService,
  kind: 'access' | 'refresh' | 'csrf',
): ClearCookieOptions {
  const opts = getCookieOptions(config, kind);
  return {
    path: opts.path,
    sameSite: opts.sameSite,
    secure: opts.secure,
    httpOnly: opts.httpOnly,
  };
}

export function setAuthCookies(
  res: Response,
  config: ConfigService,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const accessOptions = getCookieOptions(config, 'access');
  const refreshOptions = getCookieOptions(config, 'refresh');
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, accessOptions);
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, refreshOptions);
}

export function createCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function setCsrfCookie(res: Response, config: ConfigService, token: string): void {
  const options = getCookieOptions(config, 'csrf');
  res.cookie(CSRF_TOKEN_COOKIE, token, options);
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  const accessOptions = getClearCookieOptions(config, 'access');
  const refreshOptions = getClearCookieOptions(config, 'refresh');
  res.clearCookie(ACCESS_TOKEN_COOKIE, accessOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, refreshOptions);
}

export function clearCsrfCookie(res: Response, config: ConfigService): void {
  const options = getClearCookieOptions(config, 'csrf');
  res.clearCookie(CSRF_TOKEN_COOKIE, options);
}
