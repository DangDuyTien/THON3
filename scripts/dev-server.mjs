import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const runtimeRoot = mkdtempSync(join(tmpdir(), "thon-vite-"));
const projectEntries = ["index.html", "package.json", "vite.config.js", "src", "public", "media", "node_modules"];

for (const entry of projectEntries) {
  symlinkSync(join(projectRoot, entry), join(runtimeRoot, entry));
}

const viteEntry = join(runtimeRoot, "node_modules", "vite", "bin", "vite.js");
const vite = spawn(process.execPath, [
  "--preserve-symlinks",
  "--preserve-symlinks-main",
  viteEntry,
  runtimeRoot,
  ...process.argv.slice(2),
], { stdio: "inherit" });

let cleaned = false;
const cleanUp = () => {
  if (cleaned) return;
  cleaned = true;
  rmSync(runtimeRoot, { force: true, recursive: true });
};

vite.on("exit", (code, signal) => {
  cleanUp();
  if (signal) process.kill(process.pid, signal);
  process.exitCode = code ?? 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => vite.kill(signal));
}
