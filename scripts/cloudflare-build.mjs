/**
 * Cloudflare Workers Builds entry point, run from the repo root
 * (`npm run build`, with the dashboard's default settings).
 *
 * 1. Installs the app's dependencies (they live in app/, not at the root).
 * 2. Runs the OpenNext Cloudflare build (app: `npm run cf:build`).
 * 3. Writes a root wrangler.json derived from app/wrangler.jsonc, with paths
 *    pointing into app/, so the default deploy command (`npx wrangler deploy`)
 *    works from the root. app/wrangler.jsonc stays the single source of truth.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const app = path.join(root, "app");
const run = (cmd) => execSync(cmd, { cwd: app, stdio: "inherit" });

run("npm ci");
run("npm run cf:build");

// app/wrangler.jsonc only uses whole-line // comments.
const text = fs
  .readFileSync(path.join(app, "wrangler.jsonc"), "utf8")
  .split("\n")
  .filter((line) => !line.trim().startsWith("//"))
  .join("\n");
const config = JSON.parse(text);
delete config.$schema;
config.main = `app/${config.main.replace(/^\.\//, "")}`;
if (config.assets?.directory) config.assets.directory = `app/${config.assets.directory.replace(/^\.\//, "")}`;
fs.writeFileSync(path.join(root, "wrangler.json"), JSON.stringify(config, null, 2) + "\n");
console.log("[cloudflare-build] wrote wrangler.json -> deploy with `npx wrangler deploy`");
