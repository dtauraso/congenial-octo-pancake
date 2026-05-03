import esbuild from "esbuild";
import { copyFileSync } from "fs";

const copyCss = () => copyFileSync("src/webview/webview.css", "out/webview.css");
const cssCopyPlugin = {
  name: "copy-css",
  setup(build) {
    build.onEnd(copyCss);
  },
};

const watch = process.argv.includes("--watch");

const common = {
  bundle: true,
  sourcemap: true,
  target: "es2022",
  logLevel: "info",
};

const extension = {
  ...common,
  entryPoints: ["src/extension.ts"],
  outfile: "out/extension.js",
  platform: "node",
  format: "cjs",
  external: ["vscode"],
};

const webview = {
  ...common,
  entryPoints: ["src/webview/main.ts"],
  outfile: "out/webview.js",
  platform: "browser",
  format: "iife",
  plugins: [cssCopyPlugin],
};

if (watch) {
  const ctxA = await esbuild.context(extension);
  const ctxB = await esbuild.context(webview);
  await Promise.all([ctxA.watch(), ctxB.watch()]);
} else {
  await Promise.all([esbuild.build(extension), esbuild.build(webview)]);
}
