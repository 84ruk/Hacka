/**
 * Helpers de auth: login, register, logout, refresh, me.
 * Sesión solo con cookies httpOnly (seguridad): el backend establece las cookies
 * en login/register/refresh; el frontend usa credentials: 'include' y no guarda tokens.
 */

import { api, ApiError } from './api';

export type UserMe = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  user: UserMe;
  accessToken: string;
  refreshToken: string;
};

export async function login(email: string, password: string): Promise<AuthResponse> {
  const result = await api<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if ('error' in result) throw result.error;
  return result.data;
}

export async function register(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<AuthResponse> {
  const result = await api<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if ('error' in result) throw result.error;
  return result.data;
}

export async function logout(): Promise<void> {
  await api('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  }).catch(() => {});
}

export async function refreshSession(): Promise<boolean> {
  const result = await api<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if ('error' in result) return false;
  return true;
}

export async function fetchMe(): Promise<UserMe> {
  const result = await api<UserMe>('/auth/me');
  if ('error' in result) throw result.error;
  return result.data;
}

export async function forgotPassword(email: string): Promise<void> {
  const result = await api<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if ('error' in result) throw result.error;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const result = await api<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
  if ('error' in result) throw result.error;
}

export { type ApiError };
