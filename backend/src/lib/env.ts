import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(1337),
  APP_KEYS: z.string(),
  API_TOKEN_SALT: z.string(),
  ADMIN_JWT_SECRET: z.string(),
  TRANSFER_TOKEN_SALT: z.string(),
  JWT_SECRET: z.string(),
  DATABASE_CLIENT: z.enum(['sqlite', 'postgres', 'mysql']).default('sqlite'),
  DATABASE_FILENAME: z.string().optional(),
  RATE_LIMIT_DURATION: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment variables');
  }

  return result.data;
}

export const env = validateEnv();
