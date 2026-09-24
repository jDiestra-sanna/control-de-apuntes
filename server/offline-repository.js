import { randomUUID, createHash } from 'node:crypto';
import { AppError } from './errors.js';
import { noteSchema, categorySchema, normalizeImport } from './model.js';
import { prepareImages, MAX_NOTE_IMAGE_BYTES, ImageError } from './images.js';
import { prepareContent } from './content.js';

const now = () => new Date().toISOString();
const clone = value => structuredClone(value);
const fold = value => value.toLocaleLowerCase('es');
export function offlineRepository(store) {
  const ready = state => { if (!state.initialized) throw new AppError('Conecta la VPN para completar la primera copia local. Después podrás trabajar sin conexión.', 503); };
  function category(state, id) { if (!state.categories.some(c => c.id === id)) throw new AppError('La categoría ya no existe. Actualiza la página.'); }
  function find(state, id) { const note = state.notes[id]; if (!note) throw new AppError('No se encontró la nota.', 404); return note; }
  function saveImages(state, images) {
    let total = 0;
    return images.map(image => {
      let id = image.id, asset;
      if (image.data) {
        asset = { data: image.data, mime: image.mime, width: image.width, height: image.height, size: image.size, hash: image.hash };
        id = Object.keys(state.images).find(id => state.images[id] === asset.hash) || randomUUID();
        store.putImage(asset); state.images[id] = asset.hash;
      } else asset = store.getImage(state, id);
      total += asset.size;
      if (total > MAX_NOTE_IMAGE_BYTES) throw new ImageError('La nota supera el límite de 12 MB de imágenes.');
      return { id, name: image.name, caption: image.caption, addedAt: image.addedAt || now(), mime: asset.mime, size: asset.size, width: asset.width, height: asset.height, sha256: asset.hash };
    });
  }
  function queueNote(state, value) {
    const note = prepareContent({ ...value, images: saveImages(state, value.images || []) });
    const previous = state.pending.findLast(op => op.type === 'note' && op.note.id === note.id);
    const op = { id: randomUUID(), type: 'note', note: clone(note), base: previous ? { after: previous.id } : { revision: state.links[note.id]?.revision ?? null }, conflictId: randomUUID() };
    state.notes[note.id] = note;
    state.pending.push(op);
    (state.histories[note.id] ||= []).push({ ...clone(note), savedAt: note.updatedAt, historyKey: `local:${op.id}` });
    return clone(note);
  }
  async function createNote(raw) {
    const parsed = noteSchema.parse(raw); parsed.images = await prepareImages(parsed.images);
    return store.change(state => { ready(state); category(state, parsed.categoryId); const date = now(); return queueNote(state, { ...parsed, id: randomUUID(), revision: 1, createdAt: date, updatedAt: date, deletedAt: null }); });
  }
  async function updateNote(id, raw, action = 'update') {
    if (!Number.isInteger(raw?.revision)) throw new AppError('Falta la versión de la nota.');
    const parsed = action === 'update' ? noteSchema.parse(raw) : null;
    if (parsed) parsed.images = await prepareImages(parsed.images);
    return store.change(state => {
      ready(state); const old = find(state, id);
      if (raw.revision !== old.revision) throw new AppError('Esta nota cambió en otra ventana. Tu borrador se conserva: puedes guardarlo como copia o cargar la versión actual.', 409);
      const data = parsed || noteSchema.parse(old); category(state, data.categoryId);
      return queueNote(state, { ...old, ...data, revision: old.revision + 1, updatedAt: now(), deletedAt: action === 'trash' ? now() : action === 'restore' ? null : old.deletedAt });
    });
  }
  async function saveCategory(raw, id) {
    const data = categorySchema.parse(raw);
    return store.change(state => {
      ready(state); const old = state.categories.find(c => c.id === id);
      if (id && !old) throw new AppError('No se encontró la categoría.', 404);
      if (state.categories.some(c => c.id !== id && fold(c.name) === fold(data.name))) throw new AppError('Ya existe una categoría con ese nombre.');
      const cat = { ...data, id: id || randomUUID() };
      state.categories = [...state.categories.filter(c => c.id !== id), cat].sort((a, b) => a.order - b.order);
      state.pending.push({ id: randomUUID(), type: 'category', category: cat, base: old || null, conflictId: randomUUID() }); return cat;
    });
  }
  async function reorderCategories(ids) {
    return store.change(state => {
      ready(state);
      if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.length !== state.categories.length || ids.some(id => !state.categories.some(c => c.id === id))) throw new AppError('Las categorías cambiaron. Actualiza la lista y vuelve a intentarlo.', 409);
      state.categories = ids.map((id, order) => ({ ...state.categories.find(c => c.id === id), order }));
      state.pending.push({ id: randomUUID(), type: 'reorder', ids }); return state.categories;
    });
  }
  async function deleteCategory(id, target) {
    return store.change(state => {
      ready(state); category(state, id);
      if (state.categories.length <= 1 || id === target || !state.categories.some(c => c.id === target)) throw new AppError('Selecciona otra categoría para conservar sus notas.');
      const affected = Object.values(state.notes).filter(n => n.categoryId === id);
      for (const old of affected) queueNote(state, { ...old, categoryId: target, revision: old.revision + 1, updatedAt: now() });
      state.pending.push({ id: randomUUID(), type: 'deleteCategory', category: state.categories.find(c => c.id === id) });
      state.categories = state.categories.filter(c => c.id !== id); return { moved: affected.length };
    });
  }
  async function importData(data) {
    const normalized = normalizeImport(data), hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    for (const note of normalized.notes) note.images = await prepareImages(note.images);
    return store.change(state => {
      ready(state);
      if (state.imports[hash]) return { added: 0, skipped: normalized.notes.length, alreadyImported: true };
      const catMap = new Map();
      for (const input of normalized.categories) {
        const existing = state.categories.find(c => fold(c.name) === fold(input.name));
        catMap.set(input.id, existing?.id || input.id);
        if (!existing) { const cat = { ...input, order: state.categories.length }; state.categories.push(cat); state.pending.push({ id: randomUUID(), type: 'category', category: cat, base: null, conflictId: randomUUID() }); }
      }
      const ids = new Set(Object.keys(state.notes).map(fold)); let added = 0, skipped = 0;
      for (const note of normalized.notes) {
        if (ids.has(fold(note.id))) { skipped++; continue; }
        queueNote(state, { ...note, categoryId: catMap.get(note.categoryId), revision: 1 }); ids.add(fold(note.id)); added++;
      }
      state.imports[hash] = true; return { added, skipped, alreadyImported: false };
    });
  }
  async function exportData() {
    const state = store.read(); ready(state); const data = { categories: state.categories, notes: Object.values(state.notes) }; let bytes = 0;
    for (const note of data.notes) { bytes += Buffer.byteLength(JSON.stringify(note)); for (const image of note.images || []) { image.data = store.getImage(state, image.id).data; bytes += image.data.length; } if (bytes > 60 * 1024 * 1024) throw new AppError('El respaldo portátil supera 60 MB. Conserva una copia completa de .local/offline y la clave original.'); }
    return data;
  }
  return { categories: async () => store.read().categories, notes: async () => Object.values(store.read().notes).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), getNote: async id => clone(find(store.read(), id)), createNote, updateNote, saveCategory, reorderCategories, deleteCategory, importData, exportData,
    history: async id => (store.read().histories[id] || []).slice().reverse().sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, 100), getImage: async id => store.getImage(store.read(), id) };
}
