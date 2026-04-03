import { describe, expect, it, vi } from "vitest";

/**
 * Tests for the Zod schemas exported from src/content.config.ts.
 *
 * astro:content, astro/loaders, and astro/zod (already aliased to zod in
 * vitest.config.ts) are mocked so the file can be imported outside of an
 * Astro build context.
 */

vi.mock("astro:content", () => ({
	defineCollection: (config: unknown) => config,
}));

vi.mock("astro/loaders", () => ({
	file: (_path: string, _opts?: unknown) => ({ type: "file" }),
}));

// Static import works because vi.mock calls above are hoisted by Vitest
import { collections, marqueeItemSchema } from "../content.config";

// ---------------------------------------------------------------------------
// marqueeItemSchema
// ---------------------------------------------------------------------------
describe("marqueeItemSchema", () => {
	// Valid inputs
	it("accepts a plain list item", () => {
		const result = marqueeItemSchema.safeParse({ listItem: "hello" });
		expect(result.success).toBe(true);
	});

	it("accepts a list item with a valid URL linkItem", () => {
		const result = marqueeItemSchema.safeParse({
			listItem: "LinkedIn",
			linkItem: "https://linkedin.com",
		});
		expect(result.success).toBe(true);
	});

	it("accepts a list item with an explicit null linkItem", () => {
		const result = marqueeItemSchema.safeParse({
			listItem: "no link",
			linkItem: null,
		});
		expect(result.success).toBe(true);
	});

	it("accepts a list item without the optional linkItem field", () => {
		const result = marqueeItemSchema.safeParse({ listItem: "no link" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.linkItem).toBeUndefined();
		}
	});

	// Invalid inputs
	it("rejects an empty listItem", () => {
		const result = marqueeItemSchema.safeParse({ listItem: "" });
		expect(result.success).toBe(false);
	});

	it("rejects when listItem is missing", () => {
		const result = marqueeItemSchema.safeParse({ linkItem: null });
		expect(result.success).toBe(false);
	});

	it("rejects a non-URL string as linkItem", () => {
		const result = marqueeItemSchema.safeParse({
			listItem: "bad link",
			linkItem: "not-a-url",
		});
		expect(result.success).toBe(false);
	});

	it("rejects a number as listItem", () => {
		const result = marqueeItemSchema.safeParse({ listItem: 42 });
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// collections export
// ---------------------------------------------------------------------------
describe("collections", () => {
	it("exports a siteConfig collection", () => {
		expect(collections).toHaveProperty("siteConfig");
	});
});
