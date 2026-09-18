import 'dotenv/config';
import sql from 'mssql/msnodesqlv8.js';
import { databaseSettings, poolConfig } from './db-config.js';
export { sql };
export const settings = databaseSettings();
export const { database, server, authentication } = settings;
export function connect(db = database) {
  return new sql.ConnectionPool(poolConfig(settings, db)).connect();
}
