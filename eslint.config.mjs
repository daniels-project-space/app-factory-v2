import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Committed generated Expo applications and the starter are independently
    // configured and validated from their own project roots. Applying the
    // Next.js production app rules here made the root command lint unrelated
    // mobile code with a mismatched React configuration.
    "apps/**",
    "templates/**",
    "convex/_generated/**",
  ]),
]);

export default eslintConfig;
