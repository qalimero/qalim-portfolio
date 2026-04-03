import { defineConfig } from "vitest/config";

export default defineConfig({
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
