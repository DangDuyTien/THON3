import fs from "node:fs";
import mysql from "mysql2/promise";
import "dotenv/config";

const ssl = process.env.MYSQL_SSL_CA
  ? { ca: fs.readFileSync(process.env.MYSQL_SSL_CA, "utf8") }
  : process.env.MYSQL_SSL === "true"
    ? {}
    : undefined;

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE || "xa_me_linh",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  ssl,
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 5),
  namedPlaceholders: true,
});

export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
