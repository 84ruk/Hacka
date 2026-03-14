/**
 * Aplica migraciones Prisma a la BD de test.
 * Carga .env.test, aplica la misma regla que env-resolver (DATABASE_URL = DATABASE_URL_TEST, fail-fast) y ejecuta prisma migrate deploy.
 * Ejecutar desde backend/: node scripts/migrate-test-db.js
 */
const path = require('path');
const { spawnSync } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.test') });
process.env.NODE_ENV = 'test';

if (!process.env.DATABASE_URL_TEST || process.env.DATABASE_URL_TEST.trim() === '') {
  console.error('DATABASE_URL_TEST is required when NODE_ENV=test. Create .env.test from .env.test.example.');
  process.exit(1);
}
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
  cwd: path.resolve(__dirname, '..'),
});
process.exit(result.status || 0);
