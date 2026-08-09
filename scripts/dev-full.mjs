import { spawn } from "node:child_process";

const children = [];
const run = (command, args) => {
  const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env });
  children.push(child);
  return child;
};

run("server", ["server/index.mjs"]);
const frontend = run("frontend", ["scripts/dev-server.mjs", "--host", "0.0.0.0", ...process.argv.slice(2)]);

let shuttingDown = false;
const stop = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach((child) => child.kill("SIGTERM"));
  setTimeout(() => process.exit(code), 250);
};

children.forEach((child) => child.on("exit", (code) => {
  if (!shuttingDown && code && child === frontend) stop(code);
}));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
