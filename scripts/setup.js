import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { connect, database, server } from '../server/db.js';

if (process.platform === 'win32' && server === '(localdb)\\ApuntesLocal') {
  const instances = execFileSync('SqlLocalDB', ['info'], { encoding: 'utf8' });
  if (!instances.split(/\r?\n/).some(s => s.trim() === 'ApuntesLocal')) execFileSync('SqlLocalDB', ['create', 'ApuntesLocal'], { stdio: 'pipe' });
  execFileSync('SqlLocalDB', ['start', 'ApuntesLocal'], { stdio: 'pipe' });
}

mkdirSync('.local/backups', { recursive: true });
// La clave nunca se regenera: perderla impide descifrar la base y su historial.
if (!existsSync('.local/master.key')) {
  const master = await connect('master');
  try {
    const existing = await master.request().input('db', database).query('SELECT DB_ID(@db) AS id');
    if (existing.recordset[0].id) throw new Error('La base ya existe pero falta .local/master.key. Restaura la clave original antes de continuar.');
  } finally { await master.close(); }
  writeFileSync('.local/master.key', randomBytes(32).toString('base64'), { flag: 'wx', mode: 0o600 });
}
if (process.platform === 'win32') {
  const account = execFileSync('whoami', [], { encoding: 'utf8' }).trim();
  execFileSync('icacls', ['.local', '/inheritance:r', '/grant:r', `${account}:(OI)(CI)F`, '/Q'], { stdio: 'pipe' });
  // Proteger la clave sin recorrer caches, capturas y dependencias de QA en cada inicio.
  execFileSync('icacls', ['.local/master.key', '/inheritance:r', '/grant:r', `${account}:F`, '/Q'], { stdio: 'pipe' });
}
const master = await connect('master');
try { await master.request().query(`IF DB_ID(N'${database}') IS NULL CREATE DATABASE [${database}];`); } finally { await master.close(); }
const pool = await connect();
try {
  await pool.request().batch(readFileSync('database/schema.sql', 'utf8'));
  const count = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.Categories');
  if (!count.recordset[0].total) await pool.request().query("INSERT INTO dbo.Categories (Id,Name,Color,SortOrder) VALUES (N'general',N'General','#6b8e7b',0)");
  console.log(`Base ${database} preparada. Clave local protegida. No se modificaron otras bases.`);
} finally { await pool.close(); }
