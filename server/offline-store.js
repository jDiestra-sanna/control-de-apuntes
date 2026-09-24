import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, openSync, writeSync, fsyncSync, closeSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { encrypt, decrypt } from './crypto.js';

export function offlineDirectory(server, database, root = '.local/offline') {
  return resolve(root, createHash('sha256').update(`${server.toLowerCase()}\n${database.toLowerCase()}`).digest('hex').slice(0, 24));
}

// Flush before replacement: an interrupted write never replaces the last committed file.
export function atomicWrite(path, value, replace = renameSync) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = openSync(temporary, 'wx', 0o600);
    const data = Buffer.from(value);
    for (let offset = 0; offset < data.length;) offset += writeSync(fd, data, offset);
    fsyncSync(fd); closeSync(fd); fd = undefined;
    // Windows scanners can briefly hold the destination open. Retry without ever
    // deleting the committed file, so even a permanent failure preserves it.
    const waits = [10, 20, 40, 80, 160, 250];
    for (let attempt = 0;; attempt++) {
      try { replace(temporary, path); break; }
      catch (error) {
        if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt === waits.length) throw error;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waits[attempt]);
      }
    }
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export function diskStore({ directory, key, target }) {
  const path = join(directory, 'workspace.enc.json');
  const blank = () => ({ v: 1, target, initialized: false, categories: [], notes: {}, histories: {}, images: {}, imports: {}, links: {}, pending: [], notices: [], lastSync: null });
  function read() {
    if (!existsSync(path)) return blank();
    const state = decrypt(readFileSync(path, 'utf8'), key);
    if (state.v !== 1 || state.target !== target || !Array.isArray(state.pending) || !Array.isArray(state.categories) || !state.notes || !state.images || !state.histories) throw new Error('La copia local no es válida o pertenece a otra base. Conserva sus archivos y la clave original.');
    return state;
  }
  function assetPath(hash) {
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Huella de imagen inválida.');
    return join(directory, 'images', `${hash}.enc.json`);
  }
  function putImage(asset) {
    const file = assetPath(asset.hash);
    mkdirSync(join(directory, 'images'), { recursive: true });
    if (!existsSync(file)) atomicWrite(file, encrypt(asset, key));
  }
  function getImage(state, id) {
    const hash = state.images[id];
    if (!hash) throw new Error('La imagen no está disponible en la copia local.');
    const asset = decrypt(readFileSync(assetPath(hash), 'utf8'), key);
    if (asset.hash !== hash || createHash('sha256').update(Buffer.from(asset.data, 'base64')).digest('hex') !== hash) throw new Error('La imagen local no supera la comprobación de integridad.');
    return asset;
  }
  // Shared by both Windows profiles. A live owner is never evicted on a timeout.
  async function lock(name, wait = true) {
    mkdirSync(directory, { recursive: true });
    const lockPath = join(directory, `${name}.lock`), token = randomUUID();
    const deadline = Date.now() + (wait ? 10000 : 0);
    do {
      try {
        writeFileSync(lockPath, JSON.stringify({ pid: process.pid, token }), { flag: 'wx', mode: 0o600 });
        return () => { if (JSON.parse(readFileSync(lockPath, 'utf8')).token === token) unlinkSync(lockPath); };
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        let recovery;
        const recoveryPath = `${lockPath}.recovery`;
        try {
          // Serialize stale-owner recovery too: two profiles must not unlink a new owner's lock.
          recovery = openSync(recoveryPath, 'wx', 0o600);
          const owner = JSON.parse(readFileSync(lockPath, 'utf8'));
          if (Number.isInteger(owner.pid) && owner.pid > 0) {
            try { process.kill(owner.pid, 0); }
            catch (error) { if (error.code === 'ESRCH') { unlinkSync(lockPath); continue; } }
          }
        } catch (error) { if (error.code === 'ENOENT') continue; }
        finally { if (recovery !== undefined) { closeSync(recovery); unlinkSync(recoveryPath); } }
        if (!wait) return null;
        if (Date.now() >= deadline) throw new Error('Otra instancia está guardando. Vuelve a intentar; tu borrador se conserva.');
        await new Promise(r => setTimeout(r, 50));
      }
    } while (true);
  }
  async function change(fn) {
    const release = await lock('write');
    try {
      const state = read(), result = await fn(state);
      atomicWrite(path, encrypt(state, key));
      return result;
    } finally { release(); }
  }
  return { read, change, lock, putImage, getImage, directory, path };
}
