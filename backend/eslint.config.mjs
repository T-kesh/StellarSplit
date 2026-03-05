import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Base JS config
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    ...js.configs.recommended,
    languageOptions: {
      globals: globals.node, // ✅ Node instead of browser
    },
  },

  // CommonJS support (your project uses it)
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
    },
  },

  // TypeScript config
  ...tseslint.configs.recommended,

  // 🔥 Custom rules for large NestJS backend
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",

      // 🔥 Disable strict import rule (you use require in analytics)
      "@typescript-eslint/no-require-imports": "off",

      // 🔥 Disable advanced error wrapping rule
      "preserve-caught-error": "off",

      // 🔥 Relax stylistic rules
      "no-useless-escape": "warn",
      "no-empty": "warn",
    },
  },

  // Ignore build output
  {
    ignores: ["dist", "node_modules"],
  },
]);
