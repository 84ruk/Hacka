/**
 * Única fuente de verdad para variables de entorno en test.
 * Si NODE_ENV=test, la app usa *_TEST como fuente preferente.
 * Fail-fast: DATABASE_URL_TEST es obligatoria en test para no usar la BD de dev por accidente.
 * JWT_SECRET_TEST: prioridad *_TEST, fallback a JWT_SECRET; si ambos faltan en test se usa un valor por defecto para e2e (documentado).
 */
export function applyTestEnvOverrides(): void {
  if (process.env.NODE_ENV !== 'test') return;

  if (!process.env.DATABASE_URL_TEST || process.env.DATABASE_URL_TEST.trim() === '') {
    throw new Error(
      'DATABASE_URL_TEST is required when NODE_ENV=test. Create .env.test from .env.test.example to avoid using the dev database.',
    );
  }

  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  process.env.JWT_SECRET =
    process.env.JWT_SECRET_TEST ||
    process.env.JWT_SECRET ||
    'default-test-secret-min-32-chars-for-e2e';
}
