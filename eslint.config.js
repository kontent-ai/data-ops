import js from "@eslint/js";
import kontentConfig from "@kontent-ai/eslint-config";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["build/**"]),
  js.configs.recommended,
  tsPlugin.configs["flat/eslint-recommended"],
  kontentConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module",
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.tests.jsonc"],
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "no-loop-func": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-loop-func": "error",
      "@typescript-eslint/no-redundant-type-constituents": "error",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
      "@typescript-eslint/no-unnecessary-qualifier": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/prefer-includes": "error",
      "@typescript-eslint/prefer-return-this-type": "error",
      "@typescript-eslint/prefer-string-starts-ends-with": "error",
      "@typescript-eslint/prefer-for-of": "error",
      "@typescript-eslint/prefer-function-type": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/prefer-reduce-type-parameter": "error",
      "@typescript-eslint/prefer-ts-expect-error": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='console'][property.name=/^(log|warn|error|info|trace)$/]",
          message:
            "Don't log into the console directly. Use one of the functions from the log.ts file (logInfo, logWarning, logError) to ensure provided --logLevel is respected.",
        },
        {
          selector: "CallExpression[callee.name='createManagementClient']",
          message: "Use the createClient function from src/utils/client.ts instead.",
        },
        {
          selector: "NewExpression[callee.name='ManagementClient']",
          message: "Use the createClient function from src/utils/client.ts instead.",
        },
      ],
    },
  },
]);
