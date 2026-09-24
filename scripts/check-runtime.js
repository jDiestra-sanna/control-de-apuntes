// Read-only startup preflight: never creates a database, schema or encryption key.
import { existsSync } from 'node:fs';
import { decrypt, loadKey } from '../server/crypto.js';
import { diskStore, offlineDirectory } from '../server/offline-store.js';

let pool;
try {
  process.env.DOTENV_CONFIG_QUIET = 'true';
  if (!existsSync('.env') || !existsSync('.local/master.key')) throw new Error('missingConfiguration');
  const { connect, server, database, authentication } = await import('../server/db.js');
  const key = loadKey();
  if (process.env.APUNTES_STORAGE !== 'sql') {
    const store = diskStore({ directory: offlineDirectory(server, database, process.env.APUNTES_OFFLINE_ROOT), key, target: `${server.toLowerCase()}/${database.toLowerCase()}` });
    const state = store.read();
    // Read-only and independent of VPN. Startup creates directories when necessary.
    for (const id of Object.keys(state.images)) store.getImage(state, id);
    console.log(JSON.stringify({ ok: true, server, database, authentication, keyChecked: true, storage: 'files', initialized: state.initialized, pending: state.pending.length }));
    process.exit(0);
  }
  pool = await connect();
  await pool.request().query(`
    SELECT TOP (0) Id,Name,Color,SortOrder FROM dbo.Categories;
    SELECT TOP (0) Id,CategoryId,Payload,Revision,CreatedAt,UpdatedAt,DeletedAt FROM dbo.Notes;
    SELECT TOP (0) NoteId,Revision,Payload,SavedAt FROM dbo.NoteVersions;
    SELECT TOP (0) Hash,ImportedAt,Added,Skipped FROM dbo.Imports;
    SELECT TOP (0) Id,Hash,Payload,CreatedAt FROM dbo.NoteImages;
  `);
  const rows = await pool.request().query('SELECT TOP (1) Payload FROM dbo.Notes UNION ALL SELECT TOP (1) Payload FROM dbo.NoteVersions UNION ALL SELECT TOP (1) Payload FROM dbo.NoteImages;');
  for (const row of rows.recordset) decrypt(row.Payload, key);
  console.log(JSON.stringify({ ok: true, server, database, authentication, storage: 'sql', keyChecked: rows.recordset.length > 0 }));
} catch {
  console.error('Preflight fallido: comprueba .env, la clave original y la copia local; en modo SQL, también red/ODBC y esquema. No se hicieron escrituras.');
  process.exitCode = 1;
} finally {
  if (pool) await pool.close();
}
