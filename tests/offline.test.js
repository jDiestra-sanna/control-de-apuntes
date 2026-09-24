import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { diskStore, atomicWrite, offlineDirectory } from '../server/offline-store.js';
import { offlineRepository } from '../server/offline-repository.js';

async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'apuntes-offline-test-')), key = randomBytes(32), target = 'synthetic/test';
  const store = diskStore({ directory, key, target });
  await store.change(state => { state.initialized = true; state.categories = [{ id: 'general', name: 'General', color: '#668877', order: 0 }]; });
  return { store, directory, key, target, repo: offlineRepository(store) };
}
test('offline save survives reopening and ciphertext does not expose note content', async () => {
  const f = await fixture();
  const n = await f.repo.createNote({ title: 'SECRETO_SINTETICO', content: 'Persistente tras reinicio', categoryId: 'general' });
  assert.doesNotMatch(readFileSync(f.store.path, 'utf8'), /SECRETO_SINTETICO|Persistente/);
  const reopened = offlineRepository(diskStore(f));
  assert.equal((await reopened.getNote(n.id)).content, 'Persistente tras reinicio');
  assert.equal(f.store.read().pending.length, 1);
  assert.equal((await reopened.history(n.id)).length, 1);
});
test('two local writers serialize; stale revisions cannot overwrite a saved note', async () => {
  const f = await fixture(), second = offlineRepository(diskStore(f));
  const n = await f.repo.createNote({ title: 'Concurrente', categoryId: 'general' });
  const results = await Promise.allSettled([f.repo.updateNote(n.id, { ...n, content: 'A' }), second.updateNote(n.id, { ...n, content: 'B' })]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.status, 409);
  assert.equal(f.store.read().pending.length, 2);
});
test('failed transaction, invalid import and interrupted temporary write preserve the committed file', async () => {
  const f = await fixture(), before = readFileSync(f.store.path, 'utf8');
  await assert.rejects(f.store.change(state => { state.categories = []; throw new Error('simulated disk failure'); }));
  await assert.rejects(f.repo.importData({ categories: ['Invalid'], notes: [{ title: 'X', status: 'invalid' }] }));
  writeFileSync(`${f.store.path}.interrupted.tmp`, 'incomplete encrypted write');
  assert.equal(readFileSync(f.store.path, 'utf8'), before);
  assert.equal(diskStore(f).read().categories.length, 1);
  const path = join(f.directory, 'not-a-file'); mkdirSync(path);
  assert.throws(() => atomicWrite(path, 'cannot replace a directory'));
});
test('wrong key, damaged ciphertext and another target fail closed', async () => {
  const f = await fixture();
  assert.throws(() => diskStore({ ...f, key: randomBytes(32) }).read());
  assert.throws(() => diskStore({ ...f, target: 'another/server' }).read());
  writeFileSync(f.store.path, '{damaged');
  assert.throws(() => f.store.read());
  assert.equal(readFileSync(f.store.path, 'utf8'), '{damaged');
  assert.notEqual(offlineDirectory('a', 'db'), offlineDirectory('b', 'db'));
});
test('a live synchronization owner is not evicted by a second process profile', async () => {
  const f = await fixture();
  const release = await f.store.lock('sync', false);
  assert.equal(await diskStore(f).lock('sync', false), null);
  release(); const again = await f.store.lock('sync', false); assert.equal(typeof again, 'function'); again();
});
test('first launch offline does not pretend to be an empty synchronized library', async () => {
  const f = await fixture();
  const store = diskStore({ ...f, directory: join(f.directory, 'new') });
  assert.equal(store.read().initialized, false);
  await assert.rejects(offlineRepository(store).createNote({ title: 'No descargar todavía', categoryId: 'general' }), /primera copia/);
});
test('restart recovers a dead process lock on the first synchronization attempt', async () => {
  const f = await fixture();
  const ended = spawnSync(process.execPath, ['-e', ''], { windowsHide: true });
  assert.equal(ended.status, 0);
  writeFileSync(join(f.directory, 'sync.lock'), JSON.stringify({ pid: ended.pid, token: 'previous-process' }));
  const release = await f.store.lock('sync', false);
  assert.equal(typeof release, 'function'); release();
});
test('transient Windows file locks retry; permanent replacement failures preserve the last save', async () => {
  const f = await fixture(), file = join(f.directory, 'replacement-test');
  atomicWrite(file, 'previous'); let attempts = 0;
  atomicWrite(file, 'new', (from, to) => { if (++attempts < 3) throw Object.assign(new Error('Scanner temporarily holds the file'), { code: 'EPERM' }); renameSync(from, to); });
  assert.equal(attempts, 3); assert.equal(readFileSync(file, 'utf8'), 'new');
  assert.throws(() => atomicWrite(file, 'not committed', () => { throw Object.assign(new Error('disk failure'), { code: 'ENOSPC' }); }));
  assert.equal(readFileSync(file, 'utf8'), 'new');
});
