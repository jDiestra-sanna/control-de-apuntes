import 'dotenv/config';
import sql from 'mssql/msnodesqlv8.js';
import { databaseSettings, poolConfig } from './db-config.js';
export { sql };
export const settings = databaseSettings();
export const { database, server, authentication } = settings;
export async function connect(db = database) {
  const pool = new sql.ConnectionPool(poolConfig(settings, db));
  try { return await pool.connect(); }
  catch (error) { await pool.close().catch(() => {}); throw error; }
}
