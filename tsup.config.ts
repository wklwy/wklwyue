import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  splitting: false,
  target: "es2019",
  platform: "neutral", // 支持浏览器和 Node.js
  external: ["mitt", "axios"],
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".js" : ".mjs"
    };
  }
});
