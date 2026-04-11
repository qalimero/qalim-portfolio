// Environment variables validation with Zod
import { z } from "zod";

/**
 * Schema for environment variables validation
 * Ensures all required env vars are present and valid at build/runtime
 */
const envSchema = z.object({
	// Public site configuration
	PUBLIC_SITE_URL: z
		.string()
		.url()
		.optional()
		.describe("Public site URL for canonical links and OG images"),

	// Node environment
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development")
		.describe("Current environment"),

	// Production flag
	PROD: z
		.boolean()
		.optional()
		.describe("Whether the app is running in production"),
});

/**
 * Lazy validation to avoid SSR/client hydration issues
 * Only validates when env is actually accessed
 */
let _env: z.infer<typeof envSchema> | null = null;

function validateEnv(): z.infer<typeof envSchema> {
	if (_env) return _env;

	try {
		_env = envSchema.parse({
			PUBLIC_SITE_URL: import.meta.env.PUBLIC_SITE_URL,
			NODE_ENV: import.meta.env.NODE_ENV,
			PROD: import.meta.env.PROD,
		});
		return _env;
	} catch (error) {
		console.error("Environment validation error:", error);
		// Return defaults on error to prevent app crash
		return {
			NODE_ENV: "development",
		} as z.infer<typeof envSchema>;
	}
}

/**
 * Validated and typed environment variables
 * Use this throughout your app instead of import.meta.env
 */
export const env = new Proxy({} as z.infer<typeof envSchema>, {
	get(target, prop) {
		return validateEnv()[prop as keyof z.infer<typeof envSchema>];
	},
});

/**
 * Type-safe environment variables type
 * Can be used for additional typing if needed
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Utility to check if running in production
 */
export const isProduction = () =>
	env.NODE_ENV === "production" || env.PROD === true;

/**
 * Utility to check if running in development
 */
export const isDevelopment = () => env.NODE_ENV === "development";
