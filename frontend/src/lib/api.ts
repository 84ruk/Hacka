/**
 * Cliente API: fetch con credentials: 'include' para cookies httpOnly.
 * No se guardan tokens en el frontend; el backend usa cookies seguras.
 */

import { getApiBaseUrl } from './env';
import { refreshSession as authRefreshSession } from './auth';

export type ApiError = {
  status: number;
  message: string;
  body?: unknown;
};

type ApiOptions = RequestInit & { accessToken?: string; _retry?: boolean };

function isAuthPath(path: string): boolean {
  return path.startsWith('/auth/');
}

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function api<T>(
  path: string,
  options: ApiOptions = {},
): Promise<{ data: T } | { error: ApiError }> {
  const { accessToken, _retry, ...init } = options;
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const method = (init.method ?? 'GET').toUpperCase();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = getCookieValue('auth_csrf_token');
    if (csrfToken) {
      (headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
    }
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });
  let body: unknown;
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) {
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
  } else {
    body = await res.text();
  }

  const message =
    typeof body === 'object' && body !== null && 'message' in body
      ? String((body as { message: string }).message)
      : res.statusText || 'Error';

  if (!res.ok) {
    if (res.status === 401 && !isAuthPath(path) && !options._retry) {
      const refreshed = await authRefreshSession();
      if (refreshed) {
        return api<T>(path, { ...options, _retry: true });
      }
    }
    return {
      error: {
        status: res.status,
        message,
        body,
      },
    };
  }

  return { data: body as T };
}

export function assertOk<T>(result: { data: T } | { error: ApiError }): result is { data: T } {
  if ('error' in result) {
    throw result.error;
  }
  return true;
}
