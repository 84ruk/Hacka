/**
 * Configuración reactiva por ENV. El frontend usa siempre variables de entorno para la URL del backend.
 * NEXT_PUBLIC_API_BASE_URL es obligatoria (sin trailing slash).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';

export const env = {
  NEXT_PUBLIC_API_BASE_URL: API_BASE_URL,
} as const;

export function getApiBaseUrl(): string {
  const url = env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) {
    if (typeof window !== 'undefined') {
      throw new Error('NEXT_PUBLIC_API_BASE_URL is not set. Check .env.local');
    }
    return '';
  }
  return url;
}
