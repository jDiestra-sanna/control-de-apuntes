import { readFileSync, copyFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { connect } from '../server/db.js';
import { decryptBackup, loadKey } from '../server/crypto.js';
import { repository } from '../server/repository.js';
import { normalizeImport } from '../server/model.js';

const file = process.argv[2];
if (!file) throw new Error('Uso: npm run import -- <archivo.enc.json> [--inspect]. La contraseña se lee desde stdin.');
process.stdout.write('Esperando contraseña por entrada estándar (no se guarda)...\n');
let password = '';
for await (const chunk of process.stdin) { password += chunk; if (password.includes('\n')) break; }
password = password.replace(/\r?\n$/, '');
let data;
try { data = decryptBackup(JSON.parse(readFileSync(file, 'utf8')), password); } catch { throw new Error('No se pudo descifrar el respaldo. Verifica la contraseña y el archivo.'); }
password = '';
const normalized = normalizeImport(data);
console.log(JSON.stringify({ notes: normalized.notes.length, categories: normalized.categories.map(c => ({ name: c.name, count: normalized.notes.filter(n => n.categoryId === c.id).length })), pinned: normalized.notes.filter(n => n.pinned).length, archived: normalized.notes.filter(n => n.archived).length, fields: [...new Set(data.notes.flatMap(Object.keys))] }, null, 2));
if (!process.argv.includes('--inspect')) {
  const source = readFileSync(file);
  const backup = `.local/backups/${basename(file)}`;
  copyFileSync(file, backup);
  writeFileSync(`${backup}.sha256`, createHash('sha256').update(source).digest('hex'));
  const pool = await connect();
  try {
    const repo = repository(pool, loadKey());
    const result = await repo.importData(data);
    const stored = await repo.notes(); const cats = await repo.categories();
    const byId = new Map(stored.map(n => [n.id, n]));
    const mismatches = normalized.notes.filter(n => {
      const s = byId.get(n.id);
      return !s || n.title !== s.title || n.content !== s.content || JSON.stringify(n.tags) !== JSON.stringify(s.tags) || n.createdAt !== s.createdAt || n.updatedAt !== s.updatedAt || n.pinned !== s.pinned || n.archived !== s.archived || normalized.categories.find(c => c.id === n.categoryId)?.name !== cats.find(c => c.id === s.categoryId)?.name;
    });
    console.log(JSON.stringify({ ...result, verified: normalized.notes.length - mismatches.length, mismatches: mismatches.length }));
    writeFileSync('.local/migration-report.json', JSON.stringify({ verifiedAt: new Date().toISOString(), sourceFile: basename(file), sourceSha256: createHash('sha256').update(source).digest('hex'), sourceNotes: normalized.notes.length, sourceCategories: normalized.categories.length, sourcePinned: normalized.notes.filter(n => n.pinned).length, sourceArchived: normalized.notes.filter(n => n.archived).length, verified: normalized.notes.length - mismatches.length, mismatches: mismatches.length, checkedFields: ['id', 'title', 'content', 'category', 'tags', 'createdAt', 'updatedAt', 'pinned', 'archived'], ...result }, null, 2));
    if (mismatches.length) process.exitCode = 1;
  } finally { await pool.close(); }
}
