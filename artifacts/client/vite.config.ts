import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ command }) => {
  const rawPort = process.env.FRONTEND_PORT || process.env.PORT;

  // Only serving needs a port. `vite build` is driven by CI (Vercel), where
  // neither variable exists, so throwing unconditionally would fail the build
  // before Vite ever started.
  if (command === "serve" && !rawPort) {
    throw new Error(
      "FRONTEND_PORT or PORT environment variable is required but was not provided.",
    );
  }

  const port = Number(rawPort ?? 5173);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  // Defaults to "/", which is correct for a Vercel root deploy. App.tsx mounts
  // wouter at `import.meta.env.BASE_URL`, so the two stay in step.
  const basePath = process.env.BASE_PATH ?? "/";

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
