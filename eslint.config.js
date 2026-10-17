import ts from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";

// Oxlint owns JS/TS and JSX rules. Keep the official React analysis until
// Oxlint's native Compiler port is stable and its coverage is verified.
export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "artifacts/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "worker-configuration.d.ts",
      "**/*.generated.*",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser: ts.parser },
    plugins: { "react-hooks": hooks },
    rules: hooks.configs["recommended-latest"].rules,
  },
];
