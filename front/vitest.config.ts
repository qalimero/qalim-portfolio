import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Vite plugin that stubs Astro-specific virtual modules so that source files
 * importing `astro:content` or `astro/loaders` can be transformed outside an
 * Astro build context (e.g. Vitest running under the jsdom environment).
 *
 * Without this, Vite's `vite:import-analysis` plugin throws a resolution error
 * at transform time before any `vi.mock()` calls can take effect. The stubs
 * are intentionally minimal — tests that need custom behaviour override them
 * with `vi.mock()` as usual.
 */
function astroVirtualStubs(): Plugin {
	return {
		name: "vitest:astro-virtual-stubs",
		enforce: "pre",
		resolveId(id: string) {
			if (id === "astro:content") return "\0vitest-astro:content";
			if (id === "astro/loaders") return "\0vitest-astro/loaders";
		},
		load(id: string) {
			if (id === "\0vitest-astro:content") {
				return "export const defineCollection = (config) => config;";
			}
			if (id === "\0vitest-astro/loaders") {
				return 'export const file = (_path, _opts) => ({ type: "file" });';
			}
		},
	};
}

export default defineConfig({
	plugins: [astroVirtualStubs()],
	resolve: {
		alias: {
			"astro/zod": "zod",
		},
	},
	test: {
		environment: "node",
		globals: true,
	},
});
