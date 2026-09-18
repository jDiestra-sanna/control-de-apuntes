import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, win32, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { connect, database, server, settings, sql } from '../server/db.js';
mkdirSync('.local/backups', { recursive: true });
const basename = `${database}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const pool = await connect('master');
try {
  let path;
  if (settings.local) path = resolve(`.local/backups/${basename}.bak`);
  else {
    const row = (await pool.request().query("SELECT CONVERT(nvarchar(4000), SERVERPROPERTY('InstanceDefaultBackupPath')) AS directory")).recordset[0];
    const directory = process.env.SQL_BACKUP_DIRECTORY || row.directory;
    if (!directory) throw new Error('Configura SQL_BACKUP_DIRECTORY con una carpeta del servidor SQL.');
    path = (directory.startsWith('/') ? posix : win32).join(directory, `${basename}.bak`);
  }
  const backup = pool.request().input('path', sql.NVarChar(4000), path); backup.timeout = 120000;
  await backup.query(`BACKUP DATABASE [${database}] TO DISK=@path WITH COPY_ONLY, CHECKSUM`);
  const verify = pool.request().input('path', sql.NVarChar(4000), path); verify.timeout = 120000;
  await verify.query('RESTORE VERIFYONLY FROM DISK=@path WITH CHECKSUM');
  const receipt = { server, database, path, verifiedAt: new Date().toISOString(), checksum: true, verifyOnly: true, storage: settings.local ? 'local' : 'sql-server', requiresMasterKey: true };
  if (settings.local) {
    receipt.sha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
    writeFileSync(`${path}.sha256`, receipt.sha256);
  }
  writeFileSync(resolve(`.local/backups/${basename}.receipt.json`), JSON.stringify(receipt, null, 2) + '\n');
  console.log(`Backup SQL verificado (${receipt.storage}): ${path}. Requiere conservar .local/master.key para recuperar el contenido.`);
} finally { await pool.close(); }
