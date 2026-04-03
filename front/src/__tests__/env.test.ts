import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for src/lib/env.ts
 *
 * The module uses a lazy-evaluation cache (_env). vi.resetModules() clears
 * the cache between tests so each dynamic import gets a fresh instance.
 */
describe("env", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	// ---------------------------------------------------------------------------
	// isProduction()
	// ---------------------------------------------------------------------------
	describe("isProduction()", () => {
		it('returns true when NODE_ENV is "production"', async () => {
			vi.stubEnv("NODE_ENV", "production");
			const { isProduction } = await import("../lib/env");
			expect(isProduction()).toBe(true);
		});

		it("returns true when PROD is true", async () => {
			vi.stubEnv("NODE_ENV", "development");
			vi.stubEnv("PROD", true);
			const { isProduction } = await import("../lib/env");
			expect(isProduction()).toBe(true);
		});

		it('returns false when NODE_ENV is "development" and PROD is not set', async () => {
			vi.stubEnv("NODE_ENV", "development");
			const { isProduction } = await import("../lib/env");
			expect(isProduction()).toBe(false);
		});

		it('returns false when NODE_ENV is "test"', async () => {
			vi.stubEnv("NODE_ENV", "test");
			const { isProduction } = await import("../lib/env");
			expect(isProduction()).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// isDevelopment()
	// ---------------------------------------------------------------------------
	describe("isDevelopment()", () => {
		it('returns true when NODE_ENV is "development"', async () => {
			vi.stubEnv("NODE_ENV", "development");
			const { isDevelopment } = await import("../lib/env");
			expect(isDevelopment()).toBe(true);
		});

		it('returns false when NODE_ENV is "production"', async () => {
			vi.stubEnv("NODE_ENV", "production");
			const { isDevelopment } = await import("../lib/env");
			expect(isDevelopment()).toBe(false);
		});

		it('returns false when NODE_ENV is "test"', async () => {
			vi.stubEnv("NODE_ENV", "test");
			const { isDevelopment } = await import("../lib/env");
			expect(isDevelopment()).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// env proxy
	// ---------------------------------------------------------------------------
	describe("env proxy", () => {
		it("exposes NODE_ENV", async () => {
			vi.stubEnv("NODE_ENV", "production");
			const { env } = await import("../lib/env");
			expect(env.NODE_ENV).toBe("production");
		});

		it("exposes PUBLIC_SITE_URL when set to a valid URL", async () => {
			vi.stubEnv("NODE_ENV", "development");
			vi.stubEnv("PUBLIC_SITE_URL", "https://example.com");
			const { env } = await import("../lib/env");
			expect(env.PUBLIC_SITE_URL).toBe("https://example.com");
		});

		it("PUBLIC_SITE_URL is undefined when not set", async () => {
			vi.stubEnv("NODE_ENV", "development");
			const { env } = await import("../lib/env");
			expect(env.PUBLIC_SITE_URL).toBeUndefined();
		});

		it("falls back to defaults when NODE_ENV is invalid", async () => {
			vi.stubEnv("NODE_ENV", "invalid-env-value");
			const { env } = await import("../lib/env");
			// envSchema.parse() fails → returns { NODE_ENV: 'development' }
			expect(env.NODE_ENV).toBe("development");
		});

		it("falls back to defaults when PUBLIC_SITE_URL is not a valid URL", async () => {
			vi.stubEnv("NODE_ENV", "development");
			vi.stubEnv("PUBLIC_SITE_URL", "not-a-valid-url");
			const { env } = await import("../lib/env");
			// Validation fails → returns fallback default
			expect(env.NODE_ENV).toBe("development");
		});
	});
});
