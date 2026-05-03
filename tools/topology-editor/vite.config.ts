import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The browser POSTs to /api/spec without auth; Vite forwards to topogend on
// localhost:8080 and injects the X-Topogend-Token header server-side so the
// token never leaves the dev machine into page JS. Token comes from
// $TOPOGEND_TOKEN if set, otherwise from the gitignored .topogend-token file
// that topogend writes at startup — zero manual coordination needed.
const tokenFile = resolve(__dirname, "../../.topogend-token");
function readToken(): string {
  if (process.env.TOPOGEND_TOKEN) return process.env.TOPOGEND_TOKEN;
  try {
    return readFileSync(tokenFile, "utf8").trim();
  } catch {
    return "";
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    fs: { allow: ["..", "../.."] },
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api/, ""),
        configure: proxy => {
          proxy.on("proxyReq", proxyReq => {
            const tok = readToken();
            if (tok) proxyReq.setHeader("X-Topogend-Token", tok);
          });
        },
      },
    },
  },
});
