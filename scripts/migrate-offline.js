// Additive schema change. SQL backup must be verified before creating receipts.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
process.env.DOTENV_CONFIG_QUIET = 'true';
const { connect, server, database } = await import('../server/db.js');
const { loadKey } = await import('../server/crypto.js');
loadKey();
const pool = await connect();
async function snapshot() {
  const summary = {};
  for (const [table, order] of [['Categories', 'Id'], ['Notes', 'Id'], ['NoteVersions', 'NoteId,Revision'], ['Imports', 'Hash'], ['NoteImages', 'Id']]) {
    const rows = (await pool.request().query(`SELECT * FROM dbo.${table} ORDER BY ${order}`)).recordset;
    summary[table] = { count: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
  }
  return summary;
}
try {
  const before = await snapshot();
  execFileSync(process.execPath, ['scripts/backup-database.js'], { stdio: 'inherit', windowsHide: true });
  await pool.request().batch(readFileSync('database/schema.sql', 'utf8'));
  const after = await snapshot();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Se detectaron cambios concurrentes. Revisa el recibo y cierra otras instancias antes de repetir.');
  mkdirSync('.local/backups', { recursive: true });
  writeFileSync('.local/backups/offline-migration.json', JSON.stringify({ server, database, at: new Date().toISOString(), existingDataUnchanged: true, before, after }, null, 2));
  console.log('SyncOperations disponible. Las cinco tablas anteriores se conservaron sin cambios.');
} finally { await pool.close(); }
