import fs from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { pool } from "../db.mjs";

const migrationPath = path.resolve("server/migrations/001_initial.sql");
const sql = await fs.readFile(migrationPath, "utf8");
for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
  await pool.query(statement);
}
await pool.end();
console.log("MySQL migration completed.");
