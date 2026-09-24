const stamp = () => new Date().toISOString();

export function synchronizer({ store, connectRemote, interval = 60000 }) {
  let active = null, timer, stopped = false, remoteOnline = false, message = '', session;
  function status() {
    const state = store.read();
    return { mode: 'files', initialized: state.initialized, syncing: Boolean(active), remoteOnline, pending: state.pending.length, lastSync: state.lastSync, notices: state.notices.slice(-10), message };
  }
  function addHistory(state, note) {
    const list = state.histories[note.id] ||= [];
    if (!list.some(n => n.historyKey === note.historyKey)) list.push(note);
  }
  function notice(state, text) { state.notices.push({ at: stamp(), message: text }); state.notices = state.notices.slice(-30); }
  function acknowledge(state, op, result) {
    if (result.note) {
      const note = result.note, oldId = op.note.id, id = note.id;
      for (const image of note.images || []) state.images[image.id] = image.sha256;
      if (id !== oldId) {
        // The remote original remains intact. Retarget later edits to the preserved copy.
        state.notes[id] = { ...state.notes[oldId], id, title: note.title, revision: state.notes[oldId].revision + 1 };
        if (result.originalNote) {
          state.notes[oldId] = { ...result.originalNote, revision: state.notes[oldId].revision + 1 };
          state.links[oldId] = { revision: result.originalNote.revision };
        } else { delete state.notes[oldId]; delete state.links[oldId]; }
        const localHistory = (state.histories[oldId] || []).filter(n => n.historyKey.startsWith('local:'));
        state.histories[id] = localHistory.map(n => ({ ...n, id }));
        state.histories[oldId] = (state.histories[oldId] || []).filter(n => !n.historyKey.startsWith('local:'));
        for (const pending of state.pending) if (pending.type === 'note' && pending.note.id === oldId) { pending.note.id = id; pending.note.title = `${pending.note.title.replace(/ \(copia por conflicto\)$/, '').slice(0, 264)} (copia por conflicto)`; }
        notice(state, 'Una nota cambió también en el servidor. Se conservaron la original y una copia con tus cambios locales.');
      }
      state.links[id] = { revision: note.revision };
      state.histories[id] = (state.histories[id] || []).filter(n => n.historyKey !== `local:${op.id}`);
      addHistory(state, { ...note, savedAt: note.updatedAt, historyKey: `remote:${id}:${note.revision}` });
      // If there are newer local edits their contents must remain untouched.
      if (!state.pending.some(p => p.id !== op.id && p.type === 'note' && p.note.id === id)) {
        const local = state.notes[id];
        state.notes[id] = { ...note, revision: local.revision + (local.categoryId !== note.categoryId ? 1 : 0) };
      }
    }
    if (result.category) {
      const oldId = op.category.id, cat = result.category;
      if (cat.id !== oldId) {
        state.categories = state.categories.filter(c => c.id !== oldId && c.id !== cat.id); state.categories.push(cat);
        for (const note of Object.values(state.notes)) if (note.categoryId === oldId && state.pending.some(p => p.type === 'note' && p.note.id === note.id)) { note.categoryId = cat.id; note.revision++; }
        for (const p of state.pending) {
          if (p.note?.categoryId === oldId) p.note.categoryId = cat.id;
          if (p.category?.id === oldId) p.category.id = cat.id;
          if (p.base?.id === oldId) p.base = { ...p.base, id: cat.id, name: cat.name, color: cat.color };
          if (p.ids) p.ids = [...new Set(p.ids.map(id => id === oldId ? cat.id : id))];
        }
        if (result.conflict) notice(state, 'Se conservó una copia de una categoría modificada también en el servidor.');
      }
    }
    if (result.retained) notice(state, 'Una categoría recibió cambios en el servidor y se conservó para proteger sus notas.');
    state.pending = state.pending.filter(p => p.id !== op.id);
  }
  async function pull(remote) {
    const before = store.read();
    const snapshot = await remote.syncSnapshot(Object.values(before.images));
    // Binary files are immutable; publish their references only after every file is durable.
    for (const image of snapshot.images) if (image.asset) store.putImage(image.asset);
    await store.change(state => {
      for (const image of snapshot.images) state.images[image.id] = image.hash;
      const dirty = new Set(state.pending.filter(p => p.type === 'note').map(p => p.note.id));
      for (const note of snapshot.notes) {
        if (dirty.has(note.id)) continue;
        const old = state.notes[note.id], link = state.links[note.id];
        if (!old || link?.revision !== note.revision) state.notes[note.id] = { ...note, revision: old ? old.revision + 1 : note.revision };
        state.links[note.id] = { revision: note.revision };
      }
      // Overlay pending category operations on the remote state; no local save is discarded.
      let categories = snapshot.categories;
      for (const op of state.pending) {
        if (op.type === 'category') categories = [...categories.filter(c => c.id !== op.category.id), op.category];
        if (op.type === 'deleteCategory') categories = categories.filter(c => c.id !== op.category.id);
        if (op.type === 'reorder') categories = categories.map(c => ({ ...c, order: op.ids.includes(c.id) ? op.ids.indexOf(c.id) : c.order }));
      }
      // A category may have been deleted remotely while a local note still refers to it.
      for (const note of Object.values(state.notes)) if (!categories.some(c => c.id === note.categoryId)) {
        const localCategory = state.categories.find(c => c.id === note.categoryId);
        if (localCategory) categories.push(localCategory);
      }
      state.categories = categories.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
      for (const version of snapshot.versions) addHistory(state, version);
      for (const hash of snapshot.imports) state.imports[hash] = true;
      state.initialized = true; state.lastSync = stamp();
    });
  }
  async function run() {
    const release = await store.lock('sync', false);
    if (!release) return;
    try {
      session = await connectRemote();
      if (!store.read().initialized) await pull(session.repo);
      // Bound one pass so a continuously edited workspace can still receive remote changes.
      const count = store.read().pending.length;
      for (let i = 0; i < count && !stopped; i++) {
        const state = store.read(), op = state.pending[0];
        if (!op) break;
        const request = structuredClone(op);
        if (request.note) request.note.images = (request.note.images || []).map(image => ({ ...image, data: store.getImage(state, image.id).data }));
        const result = await session.repo.applySyncOperation(request);
        await store.change(current => acknowledge(current, structuredClone(op), result));
      }
      if (!stopped) await pull(session.repo);
      remoteOnline = true; message = '';
    } catch (error) {
      remoteOnline = false;
      message = error.number === 208 ? 'Falta actualizar el esquema de sincronización del servidor.' : 'Sin conexión de sincronización. Tus guardados locales se conservan; comprueba la VPN y reintenta.';
      // Report only an error code, never SQL parameters or note contents.
      console.error('Sincronización pendiente', error.code || error.name);
    } finally {
      try { await session?.close(); } finally { session = null; release(); }
    }
  }
  function sync() {
    if (stopped) return Promise.resolve();
    if (!active) active = run().finally(() => { active = null; });
    return active;
  }
  return { status, sync, start() { stopped = false; sync().catch(() => {}); timer = setInterval(() => sync().catch(() => {}), interval); timer.unref(); },
    async stop() { stopped = true; clearInterval(timer); await active; }, async dismissNotices() { await store.change(state => { state.notices = []; }); } };
}
