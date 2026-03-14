import { envSchema } from './env.schema';

export default () => {
  const { error, value } = envSchema.validate(process.env, { stripUnknown: true });
  if (error) {
    throw new Error(`Config validation failed: ${error.message}`);
  }
  return {
    PORT: value.PORT,
    NODE_ENV: value.NODE_ENV,
    DATABASE_URL: value.DATABASE_URL,
    JWT_SECRET: value.JWT_SECRET,
    JWT_ACCESS_EXPIRATION: value.JWT_ACCESS_EXPIRATION,
    JWT_REFRESH_EXPIRATION: value.JWT_REFRESH_EXPIRATION,
    RESET_TOKEN_EXPIRATION_MINUTES: value.RESET_TOKEN_EXPIRATION_MINUTES,
    RESET_PASSWORD_BASE_URL: value.RESET_PASSWORD_BASE_URL || 'http://localhost:3000',
    COOKIE_SAME_SITE: value.COOKIE_SAME_SITE,
    COOKIE_SECURE:
      typeof value.COOKIE_SECURE === 'boolean'
        ? value.COOKIE_SECURE
        : value.NODE_ENV === 'production',
  };
};
