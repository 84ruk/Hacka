import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  RESET_TOKEN_EXPIRATION_MINUTES: Joi.number().default(60),
  RESET_PASSWORD_BASE_URL: Joi.string().optional(),
  DATABASE_URL_TEST: Joi.string().optional(),
  JWT_SECRET_TEST: Joi.string().optional(),
  COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  COOKIE_SECURE: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .optional(),
});
