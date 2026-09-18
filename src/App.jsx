import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SaButton, SaInput, SaSelect, SaSelectFilter, SaDropdown, SaStat, useToast } from '@sanna-ui/react';
import { Archive, ArrowDownToLine, BookOpen, CalendarDays, ChevronDown, ChevronRight, CircleHelp, Columns3, Database, FileText, Folder, Grid2X2, Hash, LayoutGrid, List, Menu, Pin, Plus, RefreshCw, Search, SlidersHorizontal, Sparkles, Trash2, X, Table2 } from 'lucide-react';
import { api, send } from './api.js';
import { Modal, IconButton, NoteCard, Alert, EmptyState, LoadingNotes, ConfirmContent } from './components.jsx';
import Editor from './Editor.jsx';
import { NotesAgenda, NotesTable, QuickNote } from './NoteViews.jsx';
import { Categories, Backup } from './Managers.jsx';
import { filterNotes, localDay, statuses, priorities } from './utils.js';

const empty = { title: '', content: '', tags: [], status: 'inbox', priority: 'none', dueDate: null, pinned: false, archived: false, private: false, checklist: [] };
const names = { all: 'Todas las notas', pinned: 'Notas fijadas', kanban: 'Tablero kanban', today: 'Mi día', archive: 'Archivadas', trash: 'Papelera', category: 'Categoría' };
const descriptions = { all: 'Todo lo que necesitas recordar, en un mismo lugar.', pinned: 'Tus ideas importantes, siempre a mano.', kanban: 'Dale un siguiente paso a cada idea.', today: 'Un poco de enfoque para lo que viene hoy.', archive: 'Un espacio para lo que quieres conservar.', trash: 'Las notas eliminadas se conservan aquí. Puedes restaurarlas.', category: 'Cada tema tiene su propio espacio.' };
function pref(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
function setPref(key, value) { try { localStorage.setItem(key, value); } catch {} }

export default function App() {
  const [data, setData] = useState({ notes: [], categories: [] });
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [connected, setConnected] = useState(false);
  const [scope, setScope] = useState('all'), [category, setCategory] = useState(''), [query, setQuery] = useState(''), [view, setView] = useState(() => pref('apuntes.view', 'grid'));
  const [sort, setSort] = useState('updated'), [status, setStatus] = useState(''), [priority, setPriority] = useState(''), [filters, setFilters] = useState(false);
  const [editor, setEditor] = useState(null), [modal, setModal] = useState(null), [mobile, setMobile] = useState(false), [drag, setDrag] = useState(null), [over, setOver] = useState(null);
  const [page, setPage] = useState(1);
  const search = useRef();
  const { showToast, dismissToast } = useToast();
  const [peek, setPeek] = useState(null), [confirmation, setConfirmation] = useState(null), [actionBusy, setActionBusy] = useState(false), [editorHistory, setEditorHistory] = useState(false);
  const actionLock = useRef(false);
  const updating = useRef(new Set());
  const [pendingIds, setPendingIds] = useState(new Set());
  const notify = useCallback((message, action, type = 'success') => {
    const id = crypto.randomUUID();
    showToast({ id, message, variant: type, dismissLabel: 'Cerrar aviso', duration: action ? 10000 : 5000, action: action ? { label: action.label, onClick: () => { dismissToast(id); Promise.resolve(action.run()).catch(() => {}); } } : undefined });
  }, [showToast, dismissToast]);
  const refresh = useCallback(async () => { try { const data = await api('/workspace'); setData(data); setConnected(true); setError(''); } catch (e) { setConnected(false); setError(e.message); throw e; } finally { setLoading(false); } }, []);
  useEffect(() => { refresh().catch(() => {});  }, [refresh]);
  useEffect(() => { setPage(1); }, [scope, category, query, status, priority, sort, view]);
  const newNote = useCallback((state = 'inbox', template = '', dueDate = null) => {
    const cat = category || data.categories[0]?.id;
    if (!cat) return;
    const draft = { ...empty, categoryId: cat, status: state, dueDate };
    if (template === 'meeting') { draft.title = 'Notas de reunión'; draft.content = '## Objetivo\n\n\n## Temas tratados\n\n- \n\n## Acuerdos\n\n- \n\n## Próximos pasos\n\n'; draft.tags = ['reunión']; }
    if (template === 'sql') { draft.title = 'Nueva consulta SQL'; draft.content = '## Descripción\n\n\n## Consulta\n\n```sql\n-- Escribe tu consulta aquí\nSELECT\n\n```\n\n## Observaciones\n\n'; draft.tags = ['sql']; }
    if (template === 'task') { draft.title = 'Nueva tarea'; draft.status = 'todo'; draft.checklist = [{ id: crypto.randomUUID(), text: 'Definir el primer paso', done: false }]; }
    setEditorHistory(false); setEditor(draft); setMobile(false);
  }, [category, data.categories]);
  useEffect(() => {
    const handle = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!editor && !modal && !peek && !confirmation) search.current?.focus(); }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); if (!editor && !modal && !peek && !confirmation) newNote(); } };
    window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle);
  }, [editor, modal, peek, confirmation, newNote]);
  useEffect(() => { if (!loading && category && !data.categories.some(c => c.id === category)) { setCategory(''); setScope('all'); } }, [data.categories, category, loading]);
  function navigate(next, cat = '') { setScope(next); setCategory(cat); setMobile(false); setQuery(''); setStatus(''); setPriority(''); if (next === 'kanban') setView('board'); else if (scope === 'kanban') setView('grid'); }
  function changeView(v) { setView(v); setPref('apuntes.view', v); }
  function upsert(note) { setData(d => ({ ...d, notes: d.notes.some(n => n.id === note.id) ? d.notes.map(n => n.id === note.id ? note : n) : [note, ...d.notes] })); setConnected(true); }
  async function mutationError(e) {
    if (!e.status || e.status >= 500) setConnected(false);
    if (e.status === 409) await refresh().catch(() => {});
  }
  async function saveNote(note) {
    try { const result = await api(note.id ? `/notes/${encodeURIComponent(note.id)}` : '/notes', send(note.id ? 'PUT' : 'POST', note)); upsert(result); setEditor(null); notify('Nota guardada en tu espacio'); }
    catch (e) { await mutationError(e); throw e; }
  }
  async function patchNote(note, change, message) {
    if (updating.current.has(note.id)) return;
    updating.current.add(note.id); setPendingIds(new Set(updating.current));
    try { const updated = await api(`/notes/${encodeURIComponent(note.id)}`, send('PUT', { ...note, ...change })); upsert(updated); if (message) notify(message); }
    catch (e) { await mutationError(e); notify(e.message, undefined, 'error'); }
    finally { updating.current.delete(note.id); setPendingIds(new Set(updating.current)); }
  }
  async function trashNote(note) { const updated = await api(`/notes/${encodeURIComponent(note.id)}/trash`, send('POST', { revision: note.revision })); upsert(updated); notify('Nota movida a la papelera', { label: 'Deshacer', run: () => restoreNote(updated) }); }
  async function restoreNote(note) { try { const updated = await api(`/notes/${encodeURIComponent(note.id)}/restore`, send('POST', { revision: note.revision })); upsert(updated); notify(updated.archived ? 'Nota restaurada en Archivadas' : 'Nota restaurada'); } catch (e) { await mutationError(e); notify(e.message, undefined, 'error'); throw e; } }
  async function duplicate(note) { const result = await api('/notes', send('POST', { ...note, title: `${note.title.slice(0, 290)} (copia)`, archived: false, pinned: false })); upsert(result); notify('Copia creada'); }
  function openEditor(note, history = false) { setEditorHistory(history); setPeek(null); setEditor(note); }
  async function cardAction(note, action) {
    if (action === 'peek') { setPeek(note); return; }
    if (action === 'edit' || action === 'history') { openEditor(note, action === 'history'); return; }
    if (action === 'archive') { await patchNote(note, { archived: !note.archived }, note.archived ? 'Nota desarchivada' : 'Nota archivada'); return; }
    if (action === 'trash') { setConfirmation(note); return; }
    if (actionLock.current) return;
    actionLock.current = true;
    try { if (action === 'duplicate') await duplicate(note); if (action === 'restore') await restoreNote(note); }
    catch (e) { notify(e.message, undefined, 'error'); } finally { actionLock.current = false; }
  }
  async function confirmTrash() {
    if (actionLock.current) return; actionLock.current = true; setActionBusy(true);
    try { await trashNote(confirmation); setConfirmation(null); } catch (e) { notify(e.message, undefined, 'error'); } finally { actionLock.current = false; setActionBusy(false); }
  }
  const active = data.notes.filter(n => !n.deletedAt && !n.archived), pinned = active.filter(n => n.pinned), archived = data.notes.filter(n => !n.deletedAt && n.archived), trashed = data.notes.filter(n => n.deletedAt);
  const today = active.filter(n => n.dueDate && n.dueDate <= localDay() && n.status !== 'done');
  const selectedCategory = data.categories.find(c => c.id === category);
  const currentView = scope === 'kanban' ? 'board' : ['archive', 'trash'].includes(scope) && view === 'board' ? 'grid' : view;
  const visible = useMemo(() => filterNotes(data.notes, { scope, query, category, status, priority, sort }), [data.notes, scope, query, category, status, priority, sort]);
  const shown = currentView === 'board' ? visible : visible.slice(0, page * 24);
  const tags = [...new Set(active.flatMap(n => n.tags))].sort().slice(0, 14);
  const filtersOn = Boolean(status || priority);
  const title = scope === 'category' ? selectedCategory?.name || 'Categoría' : names[scope];
  const cardProps = { onOpen: openEditor, onAction: cardAction, onPin: n => patchNote(n, { pinned: !n.pinned }, n.pinned ? 'Nota desfijada' : 'Nota fijada'), onStatus: (n, status) => patchNote(n, { status }, 'Estado actualizado'), onTag: tag => setQuery(`#${tag}`), onRestore: n => restoreNote(n).catch(() => {}), dragging: setDrag, onDragEnd: () => { setDrag(null); setOver(null); } };
  const navItems = [{ id: 'all', icon: FileText, label: 'Todas las notas', count: active.length }, { id: 'today', icon: CalendarDays, label: 'Mi día', count: today.length }, { id: 'pinned', icon: Pin, label: 'Fijadas', count: pinned.length }, { id: 'kanban', icon: Columns3, label: 'Tablero kanban', badge: 'NUEVO' }];

  return <div className="app-shell">{mobile && <div className="sidebar-overlay" onClick={() => setMobile(false)}/>}
    <aside className={`sidebar ${mobile ? 'open' : ''}`}><a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('all'); }}><img src="/favicon.svg" alt=""/><span>apuntes<span className="brand-dot">.</span></span></a>
      <div className="workspace-switch"><span className="workspace-icon"><BookOpen size={18}/></span><div><strong>Mi espacio</strong><span>Un lugar para tus ideas</span></div><span className="personal-badge">PERSONAL</span></div>
      <SaButton className="sidebar-new" variant="primary" size="sm" fullWidth label="Nueva nota" icon={<Plus size={17}/>} onClick={() => newNote()} disabled={!connected}/>
      <div className="nav-label">BIBLIOTECA</div><nav aria-label="Navegación principal">{navItems.map(({ id, icon: Icon, label, count, badge }) => <button key={id} className={`nav-item ${scope === id ? 'active' : ''}`} onClick={() => navigate(id)}><Icon size={18}/><span>{label}</span>{badge ? <small className="new-badge">{badge}</small> : <span className="nav-count">{count}</span>}</button>)}</nav>
      <div className="nav-label category-label">CATEGORÍAS<IconButton label="Gestionar categorías" onClick={() => setModal('categories')} disabled={!connected}><Plus size={15}/></IconButton></div>
      <nav className="category-nav" aria-label="Categorías">{data.categories.map(c => <button key={c.id} className={`nav-item ${scope === 'category' && category === c.id ? 'active' : ''}`} onClick={() => navigate('category', c.id)}><Folder size={17} style={{ color: c.color }}/><span>{c.name}</span><span className="nav-count">{active.filter(n => n.categoryId === c.id).length}</span></button>)}</nav>
      {tags.length > 0 && <><div className="nav-label">ETIQUETAS</div><div className="sidebar-tags">{tags.map(t => <button key={t} className={query === `#${t}` ? 'selected' : ''} onClick={() => { navigate('all'); setQuery(`#${t}`); }}><Hash size={11}/>{t}</button>)}</div></>}
      <div className="sidebar-bottom"><nav><button className={`nav-item ${scope === 'archive' ? 'active' : ''}`} onClick={() => navigate('archive')}><Archive size={17}/><span>Archivadas</span><span className="nav-count">{archived.length}</span></button><button className={`nav-item ${scope === 'trash' ? 'active' : ''}`} onClick={() => navigate('trash')}><Trash2 size={17}/><span>Papelera</span><span className="nav-count">{trashed.length}</span></button><button className="nav-item" onClick={() => setModal('backup')} disabled={!connected}><ArrowDownToLine size={17}/><span>Importar / exportar</span></button></nav><div className="storage-card"><span className={`connection-dot ${connected ? '' : 'offline'}`}/><div><strong>{connected ? 'Tu espacio está conectado' : loading ? 'Conectando tu espacio…' : 'Sin conexión'}</strong><span>SQL Server · Almacenamiento local</span></div><Database size={16}/></div><button className="profile" onClick={() => setModal('help')}><span className="avatar">JD</span><span><strong>Mi espacio personal</strong><small>Hecho para pensar con claridad</small></span><CircleHelp size={16}/></button></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><IconButton label="Abrir menú" className="icon-button mobile-menu" onClick={() => setMobile(!mobile)}><Menu size={20}/></IconButton><BookOpen size={16}/><span>Mi espacio</span><ChevronRight size={13}/><strong>{title}</strong></div><div className="topbar-right"><div className="global-search"><Search size={16}/><SaInput uppercase={false} ref={search} label="Buscar notas" hideLabel value={query} onValueChange={setQuery} placeholder="Buscar en tus notas…" size="sm"/>{query ? <IconButton label="Limpiar búsqueda" onClick={() => setQuery('')}><X size={14}/></IconButton> : <kbd>Ctrl K</kbd>}</div><button className="top-avatar" onClick={() => setModal('help')} aria-label="Ayuda de mi espacio">JD</button></div></header>
      <main className="main-content"><div className="page-heading"><div><div className="eyebrow"><span className="tiny-line"/>TU SEGUNDO CEREBRO, UN POCO MÁS ORDENADO</div><h1>{scope === 'all' ? 'Un lugar para tus ideas' : title}<span className="heading-dot">.</span></h1><p>{descriptions[scope]}</p></div><div className="heading-actions"><SaButton variant="secondary" size="sm" label="Importar / exportar" icon={<ArrowDownToLine size={16}/>} onClick={() => setModal('backup')} disabled={!connected}/><SaButton size="sm" label="Nueva nota" icon={<Plus size={17}/>} onClick={() => newNote()} disabled={!connected}/></div></div>
        <div className="stats-grid">{[
          { label: 'Notas en tu espacio', value: active.length, helper: 'ideas guardadas', action: () => navigate('all') },
          { label: 'Notas fijadas', value: pinned.length, helper: 'siempre a mano', action: () => navigate('pinned') },
          { label: 'En progreso', value: active.filter(n => n.status === 'doing').length, helper: 'paso a paso', action: () => { navigate('kanban'); setStatus('doing'); } },
          { label: 'Completadas', value: active.filter(n => n.status === 'done').length, helper: 'un avance más', action: () => { navigate('kanban'); setStatus('done'); } }
        ].map(metric => <button className="metric-action" key={metric.label} onClick={metric.action}><SaStat label={metric.label} value={metric.value} helper={metric.helper}/></button>)}</div>
        <section className="library"><div className="library-heading"><div className="library-title"><h2>{title}</h2><span>{visible.length}</span>{query && <small>para “{query}”</small>}</div><div className="library-heading-actions"><IconButton label="Actualizar notas" onClick={() => refresh().catch(() => {})}><RefreshCw size={15}/></IconButton><div className="view-switch" aria-label="Vista de las notas">{[{ id: 'grid', icon: Grid2X2, label: 'Vista de tarjetas' }, { id: 'list', icon: List, label: 'Vista de lista' }, { id: 'table', icon: Table2, label: 'Vista de tabla' }, { id: 'agenda', icon: CalendarDays, label: 'Vista de agenda' }, ...(['archive', 'trash'].includes(scope) ? [] : [{ id: 'board', icon: Columns3, label: 'Vista kanban' }])].map(({ id, icon: Icon, label }) => <button key={id} title={label} aria-label={label} aria-pressed={currentView === id} className={currentView === id ? 'active' : ''} onClick={() => { if (scope === 'kanban' && id !== 'board') setScope('all'); changeView(id); }}><Icon size={17}/></button>)}</div></div></div>
          <div className="filterbar"><div className="filter-left"><SaSelectFilter label="Filtrar por categoría" className="category-filter" size="sm" value={category} onValueChange={value => { setCategory(value); if (scope === 'category') setScope('all'); }} options={[{ id: '', name: 'Todas las categorías' }, ...data.categories]} bindValue="id" bindLabel="name" filterPlaceholder="Buscar categoría…" noResultsText="Sin categorías coincidentes"/><button className={`secondary filter-button ${filtersOn ? 'selected' : ''}`} onClick={() => setFilters(!filters)} aria-expanded={filters}><SlidersHorizontal size={14}/>Filtros{filtersOn && <span className="filter-badge">{Number(Boolean(status)) + Number(Boolean(priority))}</span>}</button>{(query || category || filtersOn) && <button className="text-button clear-filters" onClick={() => { setQuery(''); setCategory(''); setStatus(''); setPriority(''); if (scope === 'category') setScope('all'); }}>Limpiar</button>}</div><div className="filter-right"><span>Ordenar por</span><SaSelect label="Ordenar notas" hideLabel size="sm" value={sort} onValueChange={setSort} showPlaceholder={false} options={[{ value: 'updated', label: 'Última edición' }, { value: 'oldest', label: 'Más antiguas' }, { value: 'title', label: 'Título A–Z' }, { value: 'priority', label: 'Prioridad' }, { value: 'due', label: 'Fecha objetivo' }]}/><SaDropdown className="templates-menu" label="Desde plantilla" items={[{ value: 'meeting', label: 'Notas de reunión' }, { value: 'sql', label: 'Consulta SQL' }, { value: 'task', label: 'Lista de tareas' }]} onItemClick={item => newNote('inbox', item.value)}/></div></div>
          {filters && <div className="expanded-filters"><SaSelect label="Estado" size="sm" value={status} onValueChange={setStatus} placeholder="Todos los estados" options={statuses} bindValue="id" bindLabel="name"/><SaSelect label="Prioridad" size="sm" value={priority} onValueChange={setPriority} placeholder="Todas las prioridades" options={Object.entries(priorities).map(([value, label]) => ({ value, label }))}/></div>}
          {error && <Alert>{error}<SaButton size="sm" variant="secondary" label="Reintentar" onClick={() => refresh().catch(() => {})}/></Alert>}
          {loading ? <LoadingNotes/> : currentView === 'agenda' ? <NotesAgenda notes={visible} categories={data.categories} onOpen={openEditor} onNew={day => newNote('inbox', '', day)}/> : currentView === 'table' ? <NotesTable key={`${scope}-${category}-${query}-${status}-${priority}`} notes={visible} categories={data.categories} onOpen={openEditor} onPeek={setPeek}/> : currentView === 'board' ? <div className="board">{statuses.map(s => { const items = visible.filter(n => n.status === s.id); return <section key={s.id} className={`board-column ${over === s.id ? 'drag-over' : ''}`} aria-label={s.name} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (drag) setOver(s.id); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); }} onDrop={async e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); setOver(null); setDrag(null); const n = data.notes.find(n => n.id === id); if (n && n.status !== s.id) await patchNote(n, { status: s.id }, `Nota movida a ${s.name.toLowerCase()}`); }}><div className="column-heading"><span style={{ background: s.color }}/><h3>{s.name}</h3><small>{items.length}</small><IconButton label={`Nueva nota en ${s.name}`} onClick={() => newNote(s.id)}><Plus size={15}/></IconButton></div><div className="column-cards">{items.map(n => <NoteCard busy={pendingIds.has(n.id)} key={n.id} note={n} category={data.categories.find(c => c.id === n.categoryId)} view="board" {...cardProps}/>)}{!items.length && <div className="column-empty"><LayoutGrid size={22}/><p>Aquí hay espacio para avanzar</p><span>Arrastra una nota o crea una nueva</span></div>}<button className="add-column-note" onClick={() => newNote(s.id)}><Plus size={15}/>Añadir nota</button></div></section>; })}</div> : shown.length ? <><div className={`notes-grid ${currentView === 'list' ? 'list-view' : ''}`}>{shown.map(n => <NoteCard busy={pendingIds.has(n.id)} key={n.id} note={n} category={data.categories.find(c => c.id === n.categoryId)} view={currentView} {...cardProps}/>)}</div>{shown.length < visible.length && <div className="load-more"><button className="secondary" onClick={() => setPage(page + 1)}>Mostrar más notas <ChevronDown size={15}/></button><span>{shown.length} de {visible.length}</span></div>}</> : <EmptyState title={query || filtersOn || category ? 'No encontramos notas con estos filtros' : scope === 'trash' ? 'Una papelera sin pendientes' : scope === 'today' ? 'Hoy tienes espacio para una nueva idea' : 'Todo empieza con una nota'} description={query || filtersOn || category ? 'Prueba otra búsqueda o limpia los filtros.' : scope === 'trash' ? 'Cuando elimines una nota, podrás recuperarla aquí.' : 'Captura una idea, guarda una consulta o planea tu siguiente paso.'}>{scope !== 'trash' && <SaButton label="Crear una nota" onClick={() => newNote()} disabled={!connected}/>}</EmptyState>}

        </section>
        <footer className="workspace-footer"><span><span className={`connection-dot ${connected ? '' : 'offline'}`}/>{connected ? 'Tus notas se guardan en SQL Server' : 'Servidor desconectado'}</span><span>Un pensamiento a la vez.<Sparkles size={13}/></span></footer>
      </main>
    </div>
    {editor && <Editor key={editor.id || 'new'} note={editor} categories={data.categories} availableTags={[...new Set(data.notes.flatMap(n => n.tags))].sort()} initialHistory={editorHistory} onClose={() => setEditor(null)} onSave={saveNote} onTrash={trashNote} onRestore={restoreNote} onDuplicate={duplicate}/>}
    {modal === 'categories' && <Categories categories={data.categories} notes={data.notes} onClose={() => setModal(null)} onRefresh={refresh} notify={notify}/>}
    {modal === 'backup' && <Backup onClose={() => setModal(null)} onRefresh={refresh} notify={notify}/>}
    {modal === 'help' && <Modal title="Menos ruido. Más ideas." subtitle="Una pequeña guía para aprovechar tu espacio." onClose={() => setModal(null)}><div className="help-body"><div><Columns3/><h3>De una idea a un avance</h3><p>Arrastra tus notas entre las cuatro columnas del kanban. También puedes cambiar su estado desde el selector de cada tarjeta o el editor.</p></div><div><FileText/><h3>Escribe como piensas</h3><p>Usa Markdown, código, etiquetas y listas de tareas. Pulsa Código otra vez o Texto simple para quitar el bloque sin perder el contenido. Usa Continuar debajo del código para seguir escribiendo fuera de él. Cada guardado crea una versión recuperable.</p></div><div><Database/><h3>Tu espacio es local</h3><p>Las notas y su historial se guardan cifrados en SQL Server. Esta aplicación funciona en este equipo. Exporta un respaldo cifrado para llevar tus notas a otro lugar.</p></div><div className="shortcuts"><span>Buscar notas<kbd>Ctrl K</kbd></span><span>Nueva nota<kbd>Ctrl Alt N</kbd></span><span>Guardar nota<kbd>Ctrl Enter</kbd></span><span>Deshacer / rehacer contenido<kbd>Ctrl Z / Ctrl Shift Z</kbd></span><span>Alternar negrita<kbd>Ctrl B</kbd></span></div><p className="muted">La papelera conserva tus notas hasta que decidas restaurarlas. Archivar oculta una nota de las vistas activas.</p></div></Modal>}
    {peek && <QuickNote note={peek} category={data.categories.find(c => c.id === peek.categoryId)} onClose={() => setPeek(null)} onEdit={() => openEditor(peek)} onHistory={() => openEditor(peek, true)}/>}
    {confirmation && <Modal title="Mover nota a la papelera" subtitle={confirmation.title} onClose={() => { if (!actionLock.current) setConfirmation(null); }}><fieldset className="manager-fields" disabled={actionBusy}><ConfirmContent message="La nota se conservará en la papelera y podrás restaurarla cuando quieras." confirmLabel="Mover a papelera" cancelLabel="Conservar nota" onCancel={() => setConfirmation(null)} onConfirm={confirmTrash}/></fieldset></Modal>}
  </div>;
}
