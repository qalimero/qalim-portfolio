import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for src/middleware.ts
 *
 * astro:middleware is mocked so defineMiddleware returns its handler as-is.
 * isDevelopment is exposed via vi.hoisted() so its return value can be
 * changed per test without re-registering the mock.
 */

type MiddlewareHandler = (context: unknown, next: unknown) => Promise<Response>;

// ---------------------------------------------------------------------------
// Hoisted mock state (must be declared before vi.mock hoisting)
// ---------------------------------------------------------------------------
const { mockIsDevelopment } = vi.hoisted(() => ({
	mockIsDevelopment: vi.fn(() => false),
}));

vi.mock("astro:middleware", () => ({
	defineMiddleware: (fn: unknown) => fn,
}));

vi.mock("../lib/env", () => ({
	isDevelopment: mockIsDevelopment,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(pathname = "/", method = "GET") {
	const locals: Record<string, unknown> = {};
	return {
		url: new URL(`http://localhost${pathname}`),
		request: { method },
		redirect: vi.fn((target: string) => {
			return new Response(null, {
				status: 302,
				headers: { Location: target },
			});
		}),
		locals,
	};
}

function createMockNext(status = 200) {
	return vi.fn(async () => new Response("OK", { status }));
}

afterEach(() => {
	mockIsDevelopment.mockReset();
	mockIsDevelopment.mockImplementation(() => false);
	vi.unstubAllEnvs();
	vi.resetModules();
});

// ---------------------------------------------------------------------------
// Security headers (maintenance mode OFF)
// ---------------------------------------------------------------------------
describe("middleware – security headers", () => {
	it("adds X-Content-Type-Options: nosniff", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "false");
		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/");
		const response = await (onRequest as MiddlewareHandler)(
			ctx,
			createMockNext(),
		);
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
	});

	it("adds X-Frame-Options: DENY", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "false");
		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/");
		const response = await (onRequest as MiddlewareHandler)(
			ctx,
			createMockNext(),
		);
		expect(response.headers.get("X-Frame-Options")).toBe("DENY");
	});

	it("adds X-XSS-Protection header", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "false");
		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/");
		const response = await (onRequest as MiddlewareHandler)(
			ctx,
			createMockNext(),
		);
		expect(response.headers.get("X-XSS-Protection")).toBe("1; mode=block");
	});

	it("adds Referrer-Policy header", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "false");
		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/");
		const response = await (onRequest as MiddlewareHandler)(
			ctx,
			createMockNext(),
		);
		expect(response.headers.get("Referrer-Policy")).toBe(
			"strict-origin-when-cross-origin",
		);
	});

	it("adds Permissions-Policy header", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "false");
		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/");
		const response = await (onRequest as MiddlewareHandler)(
			ctx,
			createMockNext(),
		);
		expect(response.headers.get("Permissions-Policy")).toBe(
			"geolocation=(), microphone=(), camera=()",
		);
	});
});

// ---------------------------------------------------------------------------
// Performance headers (development mode)
// ---------------------------------------------------------------------------
describe("middleware – development performance headers", () => {
	it("adds X-Response-Time and X-Request-ID in development", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "false");
		mockIsDevelopment.mockReturnValue(true);

		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/");
		const response = await (onRequest as MiddlewareHandler)(
			ctx,
			createMockNext(),
		);

		expect(response.headers.get("X-Response-Time")).toMatch(/^\d+ms$/);
		expect(response.headers.get("X-Request-ID")).toMatch(/^req_\d+_/);
	});

	it("does not add X-Response-Time and X-Request-ID in production", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "false");
		mockIsDevelopment.mockReturnValue(false);

		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/");
		const response = await (onRequest as MiddlewareHandler)(
			ctx,
			createMockNext(),
		);

		expect(response.headers.get("X-Response-Time")).toBeNull();
		expect(response.headers.get("X-Request-ID")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// context.locals population
// ---------------------------------------------------------------------------
describe("middleware – context.locals", () => {
	it("sets requestStartTime as a number", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "false");
		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/");
		await (onRequest as MiddlewareHandler)(ctx, createMockNext());
		expect(typeof ctx.locals.requestStartTime).toBe("number");
	});

	it("sets requestId matching the req_ prefix pattern", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "false");
		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/");
		await (onRequest as MiddlewareHandler)(ctx, createMockNext());
		expect(String(ctx.locals.requestId)).toMatch(/^req_\d+_/);
	});

	it("sets maintenanceMode to false when env flag is false", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "false");
		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/");
		await (onRequest as MiddlewareHandler)(ctx, createMockNext());
		expect(ctx.locals.maintenanceMode).toBe(false);
	});

	it("sets maintenanceMode to true when env flag is true", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "true");
		const { onRequest } = await import("../middleware");
		// Use /maintenance to avoid the redirect so locals get populated
		const ctx = createMockContext("/maintenance");
		await (onRequest as MiddlewareHandler)(ctx, createMockNext());
		expect(ctx.locals.maintenanceMode).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Maintenance mode redirect
// ---------------------------------------------------------------------------
describe("middleware – maintenance mode redirect", () => {
	it("redirects non-/maintenance paths when maintenance mode is on", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "true");
		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/about");
		const next = createMockNext();
		await (onRequest as MiddlewareHandler)(ctx, next);

		expect(ctx.redirect).toHaveBeenCalledWith("/maintenance");
		expect(next).not.toHaveBeenCalled();
	});

	it("does not redirect /maintenance when maintenance mode is on", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "true");
		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/maintenance");
		const next = createMockNext();
		await (onRequest as MiddlewareHandler)(ctx, next);

		expect(ctx.redirect).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalled();
	});

	it("passes through all paths when maintenance mode is off", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "false");
		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/about");
		const next = createMockNext();
		await (onRequest as MiddlewareHandler)(ctx, next);

		expect(ctx.redirect).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalled();
	});

	it("passes through the root path when maintenance mode is off", async () => {
		vi.stubEnv("PUBLIC_MAINTENANCE_MODE", "false");
		const { onRequest } = await import("../middleware");
		const ctx = createMockContext("/");
		const next = createMockNext();
		await (onRequest as MiddlewareHandler)(ctx, next);

		expect(ctx.redirect).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalled();
	});
});
