import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import typescript from "@typescript-eslint/eslint-plugin";

const common = {
  plugins: {
    react,
    "react-hooks": reactHooks,
  },
  settings: {
    react: { version: "detect" },
  },
  rules: {
    ...react.configs.recommended.rules,
    ...reactHooks.configs.recommended.rules,
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "react/jsx-uses-react": "off",
    "no-undef": "off",
  },
};

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    ...common,
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...common.rules,
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    ...common,
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      ...common.plugins,
      "@typescript-eslint": typescript,
    },
    rules: {
      ...common.rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
