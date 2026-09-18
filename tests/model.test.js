import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { normalizeImport, noteSchema } from '../server/model.js';
import { encrypt, decrypt, decryptBackup } from '../server/crypto.js';
import { encryptBackup } from '../src/backup.js';
import { calendarDate, calendarDay, filterNotes, localDay } from '../src/utils.js';

const legacy = { categories: [{ name: 'Acceso', color: '#ffcc00' }, { name: 'SQL', color: '#6688aa' }], notes: [{ id: 'legacy-1', title: 'Ejemplo áéñ', content: 'SELECT 1;\n-- línea 2', category: 'acceso', tags: ['sql'], createdAt: 1600000000000, updatedAt: 1700000000000, pinned: true, archived: true }] };
test('calendar dates round-trip without shifting a day and today follows Lima midnight', () => {
  for (const day of ['2026-01-01', '2028-02-29', '2026-12-31']) {
    const date = calendarDate(day); assert.equal(date.getHours(), 12); assert.equal(calendarDay(date), day);
  }
  assert.equal(calendarDate(null), null); assert.equal(calendarDay(null), null); assert.equal(calendarDay(new Date('invalid')), null);
  assert.equal(localDay(new Date('2026-09-18T04:59:59Z')), '2026-09-17');
  assert.equal(localDay(new Date('2026-09-18T05:00:00Z')), '2026-09-18');
});
test('import preserves original IDs, content, dates, tags and flags; sensitive previews are hidden', () => {
  const { notes, categories } = normalizeImport(legacy); const n = notes[0];
  assert.equal(n.id, 'legacy-1'); assert.equal(n.content, legacy.notes[0].content); assert.deepEqual(n.tags, ['sql']);
  assert.equal(n.createdAt, new Date(1600000000000).toISOString()); assert.equal(n.updatedAt, new Date(1700000000000).toISOString());
  assert.equal(n.pinned, true); assert.equal(n.archived, true); assert.equal(n.private, true); assert.equal(n.categoryId, categories[0].id);
});
test('import keeps uncatalogued categories instead of losing their notes', () => {
  const d = normalizeImport({ categories: ['General'], notes: [{ ...legacy.notes[0], category: 'Otro tema' }] });
  assert.equal(d.categories.length, 2); assert.equal(d.notes[0].categoryId, d.categories[1].id);
});
test('duplicate IDs and malformed dates reject the entire import', () => {
  assert.throws(() => normalizeImport({ ...legacy, notes: [legacy.notes[0], legacy.notes[0]] }), /duplicados/);
  assert.throws(() => normalizeImport({ ...legacy, notes: [{ ...legacy.notes[0], createdAt: 'bad' }] }), /fecha/);
});
test('modern backups remap category IDs and preserve deleted/checklist state', () => {
  const d = normalizeImport({ categories: [{ id: 'old', name: 'SQL', color: '#6688aa' }], notes: [{ ...legacy.notes[0], categoryId: 'old', category: undefined, status: 'doing', deletedAt: '2026-01-01T00:00:00Z', checklist: [{ id: 'one', text: 'Probar', done: true }] }] });
  assert.equal(d.notes[0].categoryId, d.categories[0].id); assert.equal(d.notes[0].status, 'doing'); assert.equal(d.notes[0].checklist[0].done, true); assert.ok(d.notes[0].deletedAt);
});
test('AES-GCM keeps content encrypted and rejects a changed ciphertext or wrong key', () => {
  const key = randomBytes(32), payload = { title: 'private-value', content: 'datos reservados' }, encrypted = encrypt(payload, key);
  assert.ok(!encrypted.includes('private-value')); assert.deepEqual(decrypt(encrypted, key), payload);
  assert.throws(() => decrypt(encrypted, randomBytes(32)));
  const tampered = JSON.parse(encrypted); tampered.tag = randomBytes(16).toString('base64');
  assert.throws(() => decrypt(JSON.stringify(tampered), key));
});
test('browser encrypted export is compatible with original AES-GCM/PBKDF2 import', async () => {
  const encrypted = await encryptBackup(legacy, 'synthetic-test-password');
  assert.deepEqual(decryptBackup(encrypted, 'synthetic-test-password'), legacy);
  assert.throws(() => decryptBackup(encrypted, 'incorrect'));
  assert.throws(() => decryptBackup({ ...encrypted, iter: 100000000 }, 'synthetic-test-password'), /Formato/);
});
test('schema rejects invalid states, invalid calendar days, empty titles and long tags', () => {
  const base = { title: 'Nota', categoryId: 'cat' };
  for (const change of [{ status: 'unknown' }, { dueDate: '2026-02-30' }, { title: ' ' }, { tags: ['a'.repeat(41)] }]) assert.equal(noteSchema.safeParse({ ...base, ...change }).success, false);
  assert.equal(noteSchema.safeParse({ ...base, dueDate: '2028-02-29' }).success, true);
});
test('search survives state changes and excludes archived and deleted notes in active views', () => {
  const base = { ...noteSchema.parse({ title: 'Reunión técnica', categoryId: 'cat', content: 'Consulta', tags: ['técnico'] }), id: 'a', updatedAt: '2026-01-01', createdAt: '2026-01-01', deletedAt: null };
  const list = [base, { ...base, id: 'b', archived: true }, { ...base, id: 'c', deletedAt: '2026-01-02' }];
  assert.deepEqual(filterNotes(list, { query: 'reunion' }).map(n => n.id), ['a']);
  assert.equal(filterNotes(list, { query: '#tecnico' }).length, 1);
  assert.equal(filterNotes(list, { scope: 'archive' })[0].id, 'b'); assert.equal(filterNotes(list, { scope: 'trash' })[0].id, 'c');
});
