import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";

/**
 * Complementa o Prettier: linhas em branco entre secções (imports, blocos, etc.).
 * Não usar `next: "*"` depois de `import` — isso inclui o próximo `import` e bagunça o grupo.
 */
export default defineConfig(
  {
    ignores: ["dist/**", "node_modules/**", ".serverless/**", "coverage/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "never", prev: "import", next: "import" },
        {
          blankLine: "always",
          prev: "import",
          next: ["const", "let", "var", "export", "function", "class", "expression"],
        },
        { blankLine: "always", prev: "const", next: "export" },
        { blankLine: "always", prev: "block-like", next: "*" },
      ],
    },
  },
  eslintConfigPrettier
);
