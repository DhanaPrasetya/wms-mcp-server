import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
	// Ignore build outputs and external folders
	{
		ignores: ["node_modules/**"],
	},
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: __dirname,
				sourceType: "module",
			},
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
			prettier: prettierPlugin,
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			...prettierConfig.rules,
			"@typescript-eslint/typedef": [
				"error",
				{
					variableDeclaration: true,
					variableDeclarationIgnoreFunction: true,
				},
			],
		},
	},
];
