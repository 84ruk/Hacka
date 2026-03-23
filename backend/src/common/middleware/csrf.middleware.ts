import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  createCsrfToken,
  setCsrfCookie,
} from '../../auth/auth.cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Rutas exactas o prefijos que quedan fuera del CSRF (sin cookies de auth en el demo)
const NO_CSRF_EXACT = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
]);
const NO_CSRF_PREFIXES = ['/simulacion/', '/nodos', '/nodos/', '/alertas', '/alertas/', '/analisis', '/analisis/', '/recuperacion', '/recuperacion/', '/timeline', '/timeline/', '/logs', '/logs/'];

function isNocsrfPath(path: string): boolean {
  if (NO_CSRF_EXACT.has(path)) return true;
  return NO_CSRF_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

@Injectable()
export class CsrfMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const accessCookie =
      typeof req.cookies?.[ACCESS_TOKEN_COOKIE] === 'string'
        ? req.cookies[ACCESS_TOKEN_COOKIE]
        : undefined;

    const refreshCookie =
      typeof req.cookies?.[REFRESH_TOKEN_COOKIE] === 'string'
        ? req.cookies[REFRESH_TOKEN_COOKIE]
        : undefined;

    if (!accessCookie && !refreshCookie) {
      next();
      return;
    }

    const path = req.path || '';
    const method = req.method?.toUpperCase() || 'GET';
    const isSafe = SAFE_METHODS.has(method);

    if (isNocsrfPath(path)) {
      next();
      return;
    }

    const csrfCookie =
      typeof req.cookies?.[CSRF_TOKEN_COOKIE] === 'string'
        ? req.cookies[CSRF_TOKEN_COOKIE]
        : undefined;

    if (!csrfCookie) {
      if (isSafe) {
        setCsrfCookie(res, this.config, createCsrfToken());
        next();
        return;
      }
      res.status(403).json({ message: 'CSRF token missing' });
      return;
    }

    if (!isSafe) {
      const headerToken = req.header('x-csrf-token');
      if (!headerToken || headerToken !== csrfCookie) {
        res.status(403).json({ message: 'Invalid CSRF token' });
        return;
      }
    }

    next();
  }
}
