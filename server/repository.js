import { randomUUID, createHash } from 'node:crypto';
import { sql } from './db.js';
import { encrypt, decrypt } from './crypto.js';
import { noteSchema, categorySchema, normalizeImport } from './model.js';
import { prepareImages, MAX_NOTE_IMAGE_BYTES, ImageError } from './images.js';
import { prepareContent } from './content.js';

export class AppError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export function repository(pool, key) {
  const readPayload = payload => prepareContent({ format: 'markdown', images: [], ...decrypt(payload, key) });
  const unpack = r => ({ ...readPayload(r.Payload), id: r.Id, categoryId: r.CategoryId, revision: r.Revision, createdAt: r.CreatedAt.toISOString(), updatedAt: r.UpdatedAt.toISOString(), deletedAt: r.DeletedAt?.toISOString() || null });
  const categories = async (db = pool) => (await db.request().query('SELECT Id AS id, Name AS name, Color AS color, SortOrder AS [order] FROM dbo.Categories ORDER BY SortOrder,Name')).recordset;
  const notes = async () => (await pool.request().query('SELECT * FROM dbo.Notes ORDER BY UpdatedAt DESC')).recordset.map(unpack);
  async function getNote(id) {
    const result = await pool.request().input('id', sql.NVarChar(128), id).query('SELECT * FROM dbo.Notes WHERE Id=@id');
    if (!result.recordset.length) throw new AppError('No se encontró la nota.', 404);
    return unpack(result.recordset[0]);
  }
  async function transaction(fn) {
    const tx = new sql.Transaction(pool); await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try { const result = await fn(tx); await tx.commit(); return result; } catch (e) { try { await tx.rollback(); } catch {} throw e; }
  }
  async function writeNote(db, note, creating = false) {
    note = prepareContent({ ...note, images: await storeImages(db, note.images || []) });
    const req = db.request().input('id', sql.NVarChar(128), note.id).input('cat', sql.NVarChar(128), note.categoryId)
      .input('payload', sql.NVarChar(sql.MAX), encrypt(note, key)).input('revision', sql.Int, note.revision)
      .input('created', sql.DateTime2(3), new Date(note.createdAt)).input('updated', sql.DateTime2(3), new Date(note.updatedAt))
      .input('deleted', sql.DateTime2(3), note.deletedAt ? new Date(note.deletedAt) : null);
    await req.query(creating
      ? 'INSERT INTO dbo.Notes (Id,CategoryId,Payload,Revision,CreatedAt,UpdatedAt,DeletedAt) VALUES (@id,@cat,@payload,@revision,@created,@updated,@deleted)'
      : 'UPDATE dbo.Notes SET CategoryId=@cat,Payload=@payload,Revision=@revision,UpdatedAt=@updated,DeletedAt=@deleted WHERE Id=@id');
    await db.request().input('id', sql.NVarChar(128), note.id).input('revision', sql.Int, note.revision)
      .input('payload', sql.NVarChar(sql.MAX), encrypt(note, key)).input('saved', sql.DateTime2(3), new Date(note.updatedAt))
      .query('INSERT INTO dbo.NoteVersions (NoteId,Revision,Payload,SavedAt) VALUES (@id,@revision,@payload,@saved)');
    return note;
  }
  async function ensureCategory(db, id) {
    const r = await db.request().input('id', sql.NVarChar(128), id).query('SELECT Id FROM dbo.Categories WHERE Id=@id');
    if (!r.recordset.length) throw new AppError('La categoría ya no existe. Actualiza la página.');
  }
  async function createNote(raw) {
    const parsed = noteSchema.parse(raw); const now = new Date().toISOString();
    parsed.images = await prepareImages(parsed.images);
    return transaction(async tx => { await ensureCategory(tx, parsed.categoryId); return writeNote(tx, { ...parsed, id: randomUUID(), revision: 1, createdAt: now, updatedAt: now, deletedAt: null }, true); });
  }
  async function updateNote(id, raw, action = 'update') {
    if (!Number.isInteger(raw?.revision)) throw new AppError('Falta la versión de la nota.');
    const parsed = action === 'update' ? noteSchema.parse(raw) : null;
    if (parsed) parsed.images = await prepareImages(parsed.images);
    return transaction(async tx => {
      const result = await tx.request().input('id', sql.NVarChar(128), id).query('SELECT * FROM dbo.Notes WITH (UPDLOCK) WHERE Id=@id');
      if (!result.recordset.length) throw new AppError('No se encontró la nota.', 404);
      const old = unpack(result.recordset[0]);
      if (old.revision !== raw.revision) throw new AppError('Esta nota cambió en otra ventana. Tu borrador se conserva: puedes guardarlo como copia o cargar la versión actual.', 409);
      const content = parsed || noteSchema.parse(old);
      await ensureCategory(tx, content.categoryId);
      const note = { ...old, ...content, revision: old.revision + 1, updatedAt: new Date().toISOString(), deletedAt: action === 'trash' ? new Date().toISOString() : action === 'restore' ? null : old.deletedAt };
      return writeNote(tx, note);
    });
  }
  async function saveCategory(raw, id) {
    const data = categorySchema.parse(raw);
    return transaction(async tx => {
      const list = await categories(tx);
      if (id && !list.some(c => c.id === id)) throw new AppError('No se encontró la categoría.', 404);
      if (list.some(c => c.id !== id && c.name.toLocaleLowerCase('es') === data.name.toLocaleLowerCase('es'))) throw new AppError('Ya existe una categoría con ese nombre.');
      const catId = id || randomUUID();
      const req = tx.request().input('id', sql.NVarChar(128), catId).input('name', sql.NVarChar(80), data.name).input('color', sql.Char(7), data.color).input('order', sql.Int, data.order);
      await req.query(id ? 'UPDATE dbo.Categories SET Name=@name,Color=@color,SortOrder=@order WHERE Id=@id' : 'INSERT INTO dbo.Categories (Id,Name,Color,SortOrder) VALUES (@id,@name,@color,@order)');
      return { ...data, id: catId };
    });
  }
  async function reorderCategories(ids) {
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new AppError('El orden de las categorías no es válido.');
    return transaction(async tx => {
      const list = await categories(tx);
      if (list.length !== ids.length || ids.some(id => !list.some(c => c.id === id))) throw new AppError('Las categorías cambiaron. Actualiza la lista y vuelve a intentarlo.', 409);
      for (const [order, id] of ids.entries()) await tx.request().input('id', sql.NVarChar(128), id).input('order', sql.Int, order).query('UPDATE dbo.Categories SET SortOrder=@order WHERE Id=@id');
      return categories(tx);
    });
  }
  async function deleteCategory(id, target) {
    return transaction(async tx => {
      const list = await categories(tx);
      if (!list.some(c => c.id === id)) throw new AppError('No se encontró la categoría.', 404);
      if (list.length <= 1 || target === id || !list.some(c => c.id === target)) throw new AppError('Selecciona otra categoría para conservar sus notas.');
      const rows = await tx.request().input('id', sql.NVarChar(128), id).query('SELECT * FROM dbo.Notes WITH (UPDLOCK) WHERE CategoryId=@id');
      for (const row of rows.recordset) { const note = unpack(row); await writeNote(tx, { ...note, categoryId: target, revision: note.revision + 1, updatedAt: new Date().toISOString() }); }
      await tx.request().input('id', sql.NVarChar(128), id).query('DELETE FROM dbo.Categories WHERE Id=@id');
      return { moved: rows.recordset.length };
    });
  }
  async function importData(data) {
    const normalized = normalizeImport(data); // validar todo antes de comenzar
    for (const note of normalized.notes) note.images = await prepareImages(note.images);
    const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return transaction(async tx => {
      const previous = await tx.request().input('hash', sql.Char(64), hash).query('SELECT Added,Skipped FROM dbo.Imports WITH (UPDLOCK) WHERE Hash=@hash');
      if (previous.recordset.length) return { added: 0, skipped: normalized.notes.length, alreadyImported: true };
      const existingCats = await categories(tx); const catMap = new Map();
      for (const c of normalized.categories) {
        const existing = existingCats.find(e => e.name.toLocaleLowerCase('es') === c.name.toLocaleLowerCase('es'));
        catMap.set(c.id, existing?.id || c.id);
        if (!existing) {
          await tx.request().input('id', sql.NVarChar(128), c.id).input('name', sql.NVarChar(80), c.name).input('color', sql.Char(7), c.color).input('order', sql.Int, existingCats.length)
            .query('INSERT INTO dbo.Categories (Id,Name,Color,SortOrder) VALUES (@id,@name,@color,@order)');
          existingCats.push(c);
        }
      }
      const ids = new Set((await tx.request().query('SELECT Id FROM dbo.Notes')).recordset.map(r => r.Id.toLocaleLowerCase('es')));
      let added = 0, skipped = 0;
      for (const n of normalized.notes) {
        if (ids.has(n.id.toLocaleLowerCase('es'))) { skipped++; continue; }
        await writeNote(tx, { ...n, categoryId: catMap.get(n.categoryId), revision: 1 }, true); added++;
      }
      await tx.request().input('hash', sql.Char(64), hash).input('added', sql.Int, added).input('skipped', sql.Int, skipped)
        .query('INSERT INTO dbo.Imports (Hash,Added,Skipped) VALUES (@hash,@added,@skipped)');
      return { added, skipped, alreadyImported: false };
    });
  }
  async function history(id) {
    const rows = await pool.request().input('id', sql.NVarChar(128), id).query('SELECT TOP (100) Revision,Payload,SavedAt FROM dbo.NoteVersions WHERE NoteId=@id ORDER BY Revision DESC');
    return rows.recordset.map(r => ({ ...readPayload(r.Payload), revision: r.Revision, savedAt: r.SavedAt.toISOString() }));
  }
  async function getImage(id, db = pool) {
    const row = (await db.request().input('id', sql.NVarChar(128), id).query('SELECT Payload FROM dbo.NoteImages WHERE Id=@id')).recordset[0];
    if (!row) throw new AppError('No se encontró la imagen. Conserva el respaldo original.', 404);
    return decrypt(row.Payload, key);
  }
  async function storeImages(db, images) {
    const refs = []; let total = 0;
    for (const image of images) {
      let id = image.id, asset;
      if (image.data) {
        const existing = (await db.request().input('hash', sql.Char(64), image.hash).query('SELECT Id FROM dbo.NoteImages WITH (UPDLOCK,HOLDLOCK) WHERE Hash=@hash')).recordset[0];
        asset = { data: image.data, mime: image.mime, width: image.width, height: image.height, size: image.size, hash: image.hash };
        id = existing?.Id || randomUUID();
        if (!existing) await db.request().input('id', sql.NVarChar(128), id).input('hash', sql.Char(64), image.hash).input('payload', sql.NVarChar(sql.MAX), encrypt(asset, key)).query('INSERT INTO dbo.NoteImages (Id,Hash,Payload) VALUES (@id,@hash,@payload)');
      } else asset = await getImage(id, db);
      total += asset.size;
      if (total > MAX_NOTE_IMAGE_BYTES) throw new ImageError('La nota supera el límite de 12 MB de imágenes.');
      refs.push({ id, name: image.name, caption: image.caption, addedAt: image.addedAt || new Date().toISOString(), mime: asset.mime, size: asset.size, width: asset.width, height: asset.height, sha256: asset.hash });
    }
    return refs;
  }
  async function exportData() {
    const data = { categories: await categories(), notes: await notes() };
    let bytes = 0;
    const cache = new Map();
    for (const note of data.notes) {
      bytes += Buffer.byteLength(JSON.stringify(note));
      for (const image of note.images) {
        if (!cache.has(image.id)) cache.set(image.id, await getImage(image.id));
        image.data = cache.get(image.id).data; bytes += image.data.length;
      }
      if (bytes > 60 * 1024 * 1024) throw new AppError('El respaldo portátil supera 60 MB. Usa el respaldo completo SQL Server para trasladar esta biblioteca.');
    }
    return data;
  }
  return { categories, notes, getNote, createNote, updateNote, saveCategory, reorderCategories, deleteCategory, importData, history, getImage, exportData };
}
