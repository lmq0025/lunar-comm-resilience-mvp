import react from "@vitejs/plugin-react";
import { startVitest } from "vitest/node";

const ctx = await startVitest(
  "test",
  [],
  {
    run: true,
    config: false,
    cache: false,
    root: process.cwd(),
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: ["node_modules/**", "dist/**", "e2e/**", "playwright-report/**", "test-results/**"]
  },
  {
    cacheDir: ".vite-cache",
    plugins: [react()]
  }
);

if (!ctx) {
  process.exit(1);
}

const failedFiles = ctx.state
  .getFiles()
  .filter((file) => file.result?.state === "fail");
const unhandledErrors = ctx.state.getUnhandledErrors();

await ctx.close();

process.exit(failedFiles.length > 0 || unhandledErrors.length > 0 ? 1 : 0);
