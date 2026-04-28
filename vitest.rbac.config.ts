import { defineConfig } from "vitest/config";
import path from "path";

// Dedicated config for RBAC / cross-tenant integration tests.
// These tests hit the live backend and require:
//   - VITE_SUPABASE_URL
//   - VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)
//   - SUPABASE_SERVICE_ROLE_KEY  (server-only; do NOT commit)
//
// Run with:  bunx vitest run --config vitest.rbac.config.ts
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/test/rbac/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Single fork — tests share seeded users and must run sequentially.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
