// Read-only startup preflight: never creates a database, schema or encryption key.
import { existsSync } from 'node:fs';
import { decrypt, loadKey } from '../server/crypto.js';

let pool;
try {
  process.env.DOTENV_CONFIG_QUIET = 'true';
  if (!existsSync('.env') || !existsSync('.local/master.key')) throw new Error('missingConfiguration');
  const { connect, server, database, authentication } = await import('../server/db.js');
  const key = loadKey();
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
  console.log(JSON.stringify({ ok: true, server, database, authentication, keyChecked: rows.recordset.length > 0 }));
} catch {
  console.error('Preflight fallido: comprueba .env, red/ODBC, esquema SQL y la clave original. No se hicieron escrituras.');
  process.exitCode = 1;
} finally {
  if (pool) await pool.close();
}
