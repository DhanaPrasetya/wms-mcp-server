import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: "**/*.spec.ts",
	use: {
		baseURL: "http://127.0.0.1:4173",
	},
	webServer: {
		command: "tsx tests/e2e/server.ts",
		url: "http://127.0.0.1:4173/mcp",
		reuseExistingServer: false,
	},
});
