// Additive migration. A verified backup is required before any schema write.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
process.env.DOTENV_CONFIG_QUIET = 'true';
const { connect, server, database } = await import('../server/db.js');
const { loadKey } = await import('../server/crypto.js');
loadKey(); // Never create or replace the original key.
const pool = await connect();
async function snapshot() {
  const result = {};
  for (const [table, order] of [['Categories', 'Id'], ['Notes', 'Id'], ['NoteVersions', 'NoteId,Revision'], ['Imports', 'Hash']]) {
    const rows = (await pool.request().query(`SELECT * FROM dbo.${table} ORDER BY ${order}`)).recordset;
    result[table] = { count: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
  }
  return result;
}
try {
  const before = await snapshot();
  execFileSync(process.execPath, ['scripts/backup-database.js'], { stdio: 'inherit', windowsHide: true });
  await pool.request().batch(readFileSync('database/schema.sql', 'utf8'));
  const after = await snapshot();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Los datos cambiaron durante la migración; revisa escrituras concurrentes. No se modificaron notas desde este script.');
  await pool.request().query('SELECT TOP (0) Id,Hash,Payload,CreatedAt FROM dbo.NoteImages');
  mkdirSync('.local/backups', { recursive: true });
  writeFileSync('.local/backups/images-migration.json', JSON.stringify({ server, database, at: new Date().toISOString(), existingDataUnchanged: true, before, after }, null, 2));
  console.log('NoteImages disponible. Categorías, notas, historial e importaciones conservados sin cambios.');
} finally { await pool.close(); }
