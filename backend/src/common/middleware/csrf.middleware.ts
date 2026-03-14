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
const NO_CSRF_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

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

    if (NO_CSRF_PATHS.has(path)) {
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
