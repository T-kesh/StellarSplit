import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
  AWS_ACCESS_KEY: Joi.string().optional(),
  AWS_SECRET_KEY: Joi.string().optional(),
  AWS_BUCKET: Joi.string().optional(),
  JWT_SECRET: Joi.string().min(32).required(),
  REQUEST_SIZE_LIMIT: Joi.string().default('1mb'),
});
