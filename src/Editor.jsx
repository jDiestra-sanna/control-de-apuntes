import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SaButton, SaInput, SaTextarea, SaSelect, SaCheckbox, SaSwitch, SaTabs, SaCombobox, SaCalendar, SaProgress } from '@sanna-ui/react';
import { Bold, CheckSquare, Code2, Copy, Eye, FileText, History, List, Save, X, Undo2, Redo2, Pilcrow, CornerDownRight } from 'lucide-react';
import { Modal, IconButton, Markdown, Alert, ConfirmContent } from './components.jsx';
import { statuses, priorities, fullDate, calendarDate, calendarDay, calendarLocale } from './utils.js';
import { api } from './api.js';
import { HistoryPanel } from './NoteViews.jsx';
import { codeBlockAt, toggleCode, plainText, exitCode, toggleBold, toggleList } from './editor-format.js';
import NoteContent from './NoteContent.jsx';
import NoteImages from './NoteImages.jsx';
import { toVisual, toMarkdown, visibleText } from './rich-content.js';
const RichEditor = lazy(() => import('./RichEditor.jsx'));

export default function Editor({ note, categories, onClose, onSave, onTrash, onRestore, onDuplicate, availableTags = [], initialHistory = false }) {
  const [draft, setDraft] = useState(() => ({ ...note }));
  const [baseline, setBaseline] = useState(note);
  const [tags, setTags] = useState(note.tags.join(', '));
  const [tab, setTab] = useState('edit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(initialHistory);
  const [confirmation, setConfirmation] = useState(null);
  const [tagChoice, setTagChoice] = useState(0);
  const [titleError, setTitleError] = useState('');
  const [task, setTask] = useState('');
  const [conflict, setConflict] = useState(false);
  const [cursor, setCursor] = useState({ start: 0, end: 0 });
  const textarea = useRef();
  const tagInput = useRef();
  const form = useRef();
  const images = useRef();
  const busyRef = useRef(false);
  const pendingSelection = useRef(null);
  const edits = useRef({ items: [{ text: note.content, start: 0, end: 0 }], index: 0, typedAt: 0 });
  const change = (name, value) => setDraft(d => ({ ...d, [name]: value }));
  const visual = draft.format === 'richtext';
  function changeFormat(next) {
    if (next === (draft.format || 'markdown')) return;
    const convert = () => {
      const content = next === 'richtext' ? toVisual(draft.content) : toMarkdown(draft.content);
      setDraft(d => ({ ...d, content, format: next })); setTab('edit');
      edits.current = { items: [{ text: content, start: 0, end: 0 }], index: 0, typedAt: 0 };
      pendingSelection.current = null; setCursor({ start: 0, end: 0 });
    };
    if (next === 'markdown' && draft.content) ask('Markdown conserva el texto, enlaces, listas y código. La tipografía, los colores, el subrayado y la alineación se simplificarán. Las imágenes adjuntas se conservan.', 'Convertir a Markdown', convert);
    else convert();
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline) || tags !== baseline.tags.join(', ') || Boolean(task.trim());
  const block = visual ? null : codeBlockAt(draft.content, cursor.start, cursor.end);
  const ask = (message, label, run) => setConfirmation({ message, label, run });
  const close = () => {
    if (busyRef.current) return;
    if (confirmation) { setConfirmation(null); return; }
    if (dirty) ask('Hay cambios sin guardar. Puedes seguir editando o descartar este borrador.', 'Descartar cambios', onClose);
    else onClose();
  };
  const begin = () => { if (busyRef.current) return false; busyRef.current = true; setBusy(true); setError(''); return true; };
  const finish = () => { busyRef.current = false; setBusy(false); };
  useEffect(() => { const handler = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [dirty]);
  useLayoutEffect(() => {
    if (tab !== 'edit' || !pendingSelection.current || !textarea.current) return;
    const { start, end } = pendingSelection.current; pendingSelection.current = null;
    textarea.current.focus(); textarea.current.setSelectionRange(start, end); setCursor({ start, end });
  }, [draft.content, tab, cursor, history, confirmation]);
  function rememberSelection(e) {
    const next = { start: e.target.selectionStart, end: e.target.selectionEnd };
    setCursor(next); Object.assign(edits.current.items[edits.current.index], next);
  }
  function editContent(result, typing = false) {
    const stack = edits.current, now = Date.now();
    if (result.text !== draft.content) {
      const coalesce = typing && stack.typedAt && now - stack.typedAt < 700 && stack.index > 0 && stack.index === stack.items.length - 1;
      stack.items = stack.items.slice(0, stack.index + 1);
      if (coalesce) stack.items[stack.index] = result;
      else { stack.items.push(result); stack.index++; }
      // El historial del borrador vive solo en memoria y tiene un límite de tamaño.
      while (stack.items.length > 50 || (stack.items.length > 2 && stack.items.reduce((sum, item) => sum + item.text.length, 0) > 8000000)) { stack.items.shift(); stack.index--; }
      stack.typedAt = typing ? now : 0;
    }
    change('content', result.text); setCursor({ start: result.start, end: result.end });
    if (!typing) { pendingSelection.current = result; setTab('edit'); }
  }
  function format(fn) { editContent(fn(draft.content, cursor.start, cursor.end)); }
  function undo(direction) {
    const stack = edits.current, index = stack.index + direction;
    if (index < 0 || index >= stack.items.length) return;
    stack.index = index; stack.typedAt = 0;
    const result = stack.items[index]; change('content', result.text); pendingSelection.current = result; setCursor({ start: result.start, end: result.end }); setTab('edit');
  }
  async function save(e, asCopy = false) {
    e?.preventDefault(); if (busyRef.current || !form.current.reportValidity()) return;
    if (!draft.title.trim()) { setTitleError('Escribe un título para guardar la nota.'); form.current.querySelector('[aria-label="Título de la nota"]').focus(); return; }
    if (task.trim() && draft.checklist.length >= 200) { setError('La nota admite hasta 200 tareas.'); return; }
    if (!begin()) return;
    try {
      await onSave({ ...draft, ...(asCopy ? { id: undefined, revision: undefined, title: `${draft.title.trim().slice(0, 292)} (copia)`, deletedAt: null } : { title: draft.title.trim() }),
        checklist: task.trim() ? [...draft.checklist, { id: crypto.randomUUID(), text: task.trim(), done: false }] : draft.checklist,
        tags: [...new Set(tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean))] });
    } catch (e) { setError(e.message); setConflict(e.status === 409); } finally { finish(); }
  }
  async function loadLatest() {
    if (!begin()) return;
    try {
      const latest = await api(`/notes/${encodeURIComponent(note.id)}`);
      setDraft(latest); setBaseline(latest); setTags(latest.tags.join(', ')); setTask(''); setConflict(false);
      edits.current = { items: [{ text: latest.content, start: 0, end: 0 }], index: 0, typedAt: 0 }; setCursor({ start: 0, end: 0 });
    } catch (e) { setError(e.message); } finally { finish(); }
  }
  function loadHistory() { if (!busyRef.current) setHistory(true); }
  function recoverVersion(v) {
    const { id, revision, savedAt, createdAt, updatedAt, deletedAt, ...content } = v;
    editContent({ text: content.content, start: 0, end: 0 });
    setDraft({ ...draft, ...content, categoryId: categories.some(c => c.id === content.categoryId) ? content.categoryId : draft.categoryId });
    setTags((content.tags || []).join(', ')); setHistory(false); setTab('edit');
  }
  function addTask(e) { e.preventDefault(); e.stopPropagation(); if (!busyRef.current && task.trim()) { if (draft.checklist.length >= 200) { setError('La nota admite hasta 200 tareas.'); return; } change('checklist', [...draft.checklist, { id: crypto.randomUUID(), text: task.trim(), done: false }]); setTask(''); } }
  async function performAction(fn) { if (!begin()) return; try { await fn(baseline); onClose(); } catch (e) { setError(e.message); } finally { finish(); } }
  function action(fn) { if (busyRef.current) return; if (dirty) ask('Esta acción usa la versión guardada. Los cambios del borrador se descartarán.', 'Continuar y descartar', () => performAction(fn)); else performAction(fn); }
  const sourceInput = <SaTextarea ref={textarea} label="Contenido de la nota" hideLabel aria-label="Contenido de la nota" className="content-field" placeholder="Escribe sin prisa. Puedes usar Markdown, listas y bloques de código." value={draft.content}
    onSelect={rememberSelection} onChange={e => editContent({ text: e.target.value, start: e.target.selectionStart, end: e.target.selectionEnd }, true)}
    onKeyDown={e => { if (!(e.ctrlKey || e.metaKey) || e.altKey || e.nativeEvent.isComposing) return; const key = e.key.toLowerCase(); if (key === 'z' || key === 'y') { e.preventDefault(); undo(key === 'y' || e.shiftKey ? 1 : -1); } else if (key === 'b' && !block) { e.preventDefault(); format(toggleBold); } }} maxLength={1000000}/>;
  // Keep the visual editor session alive when its content tab is hidden.
  const contentTabs = source => <SaTabs className="editor-content-tabs" tabListAriaLabel="Modo del editor" activeIndex={tab === 'edit' ? 0 : 1} onActiveIndexChange={index => setTab(index === 0 ? 'edit' : 'preview')} tabs={[{ label: <><FileText size={14}/>Escribir</>, content: source, disabled: busy }, { label: <><Eye size={14}/>Vista previa</>, content: <div className="editor-preview"><NoteContent note={draft}/></div>, disabled: busy }]}/>;
  return <>
    <Modal open={!history} title={confirmation ? 'Cambios sin guardar' : note.id ? 'Tu nota, con espacio para más.' : 'Una nueva idea empieza aquí.'} subtitle={confirmation ? 'Tu borrador sigue disponible hasta que decidas.' : note.id ? `Editada el ${fullDate(baseline.updatedAt)} · Versión ${baseline.revision}` : 'Escribe, organiza y dale forma a lo que tienes en mente.'} onClose={close} wide={!confirmation}>
      {confirmation ? <ConfirmContent message={confirmation.message} confirmLabel={confirmation.label} onCancel={() => setConfirmation(null)} onConfirm={() => { const run = confirmation.run; setConfirmation(null); run(); }}/> : <>
      {error && <Alert>{error}{conflict && <div className="conflict-actions"><SaButton size="sm" disabled={busy} label="Guardar borrador como copia" onClick={e => save(e, true)}/><SaButton size="sm" variant="secondary" disabled={busy} label="Cargar versión actual" onClick={() => ask('Al cargar la versión actual se descartará este borrador.', 'Cargar y descartar', loadLatest)}/></div>}</Alert>}
      <form ref={form} onSubmit={save} onPasteCapture={e => { const files = [...(e.clipboardData?.files || [])]; if (files.length) { e.preventDefault(); images.current?.addFiles(files); } }} onDragOver={e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }} onDropCapture={e => { if (e.dataTransfer.files.length) { e.preventDefault(); e.stopPropagation(); images.current?.addFiles([...e.dataTransfer.files]); } }} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save(); } }}>
        <fieldset className="editor-fields" disabled={busy}><div className="editor-layout"><div className="editor-main">
          <SaInput uppercase={false} autoFocus={!note.id} className="note-title-field" label="Título de la nota" hideLabel aria-label="Título de la nota" placeholder="Ponle un título a tu idea…" required maxLength={300} errorText={titleError} value={draft.title} onValueChange={value => { change('title', value); setTitleError(''); }}/>
          <div className="editor-mode"><div className="editor-mode-buttons" role="group" aria-label="Formato de la nota"><SaButton type="button" size="sm" label="Editor visual" variant="primary" aria-pressed={visual} icon={<Bold size={15}/>} onClick={() => { if (visual) setTab('edit'); else changeFormat('richtext'); }}/><SaButton type="button" size="sm" label="Markdown" variant="secondary" aria-pressed={!visual} icon={<Code2 size={15}/>} onClick={() => { if (!visual) setTab('edit'); else changeFormat('markdown'); }}/></div><span>{visual ? 'Selecciona texto y usa las herramientas de formato.' : 'Pulsa Editor visual para usar colores, tipografías, alineación, enlaces y emojis.'}</span></div>
          {!visual && <div className="editor-toolbar"><span className="format-hint">{block ? 'Dentro de un bloque de código' : 'Texto con formato Markdown'}</span><div className="format-actions" role="group" aria-label="Formato del contenido">
            <IconButton label="Deshacer edición" disabled={edits.current.index === 0} onClick={() => undo(-1)}><Undo2 size={16}/></IconButton>
            <IconButton label="Rehacer edición" disabled={edits.current.index === edits.current.items.length - 1} onClick={() => undo(1)}><Redo2 size={16}/></IconButton>
            <IconButton label="Negrita" disabled={Boolean(block)} onClick={() => format(toggleBold)}><Bold size={15}/></IconButton>
            <IconButton label="Bloque de código" aria-pressed={Boolean(block)} onClick={() => format(toggleCode)}><Code2 size={16}/></IconButton>
            <SaButton size="sm" variant="secondary" className="plain-text-button" disabled={!block} label="Texto simple" icon={<Pilcrow size={15}/>} onClick={() => format(plainText)}/>
            <IconButton label="Lista" disabled={Boolean(block)} onClick={() => format(toggleList)}><List size={16}/></IconButton>
          </div></div>}
          {block && <SaButton size="sm" variant="terciary" label="Continuar debajo del código" icon={<CornerDownRight size={14}/>} onClick={() => format(exitCode)}/>}
          {visual ? <Suspense fallback={<p role="status">Preparando editor visual…</p>}><RichEditor value={draft.content} onChange={value => change('content', value)} onImages={() => images.current?.choose()} disabled={busy} render={contentTabs}/></Suspense> : contentTabs(sourceInput)}
          <NoteImages ref={images} images={draft.images || []} disabled={busy} onChange={value => change('images', value)} onError={setError} onBusy={value => { busyRef.current = value; setBusy(value); }}/>
          <div className="checklist"><h4><CheckSquare size={16}/>Lista de tareas <span>{draft.checklist.filter(t => t.done).length}/{draft.checklist.length}</span></h4>
            {draft.checklist.length > 0 && <SaProgress value={Math.round(draft.checklist.filter(t => t.done).length / draft.checklist.length * 100)} aria-label="Avance de tareas de la nota"/>}
            {draft.checklist.map(item => <div className="task-item" key={item.id}><SaCheckbox size="sm" className={item.done ? 'completed' : ''} label={item.text} checked={item.done} onCheckedChange={value => change('checklist', draft.checklist.map(t => t.id === item.id ? { ...t, done: value } : t))}/><IconButton label={`Quitar tarea ${item.text}`} onClick={() => change('checklist', draft.checklist.filter(t => t.id !== item.id))}><X size={14}/></IconButton></div>)}
            <div className="task-add"><SaInput uppercase={false} size="sm" label="Nueva tarea" hideLabel placeholder="Añadir una tarea y presionar Enter" value={task} maxLength={500} onValueChange={setTask} onKeyDown={e => { if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.nativeEvent.isComposing) addTask(e); }}/><SaButton size="sm" variant="terciary" disabled={!task.trim()} onClick={addTask} label="Añadir"/></div>
          </div>
          <div className="editor-footnote">{visual ? 'Edición visual' : 'Markdown compatible'} <span>{visibleText(draft).trim() ? visibleText(draft).trim().split(/\s+/).length : 0} palabras</span></div>
        </div><aside className="editor-properties"><h4>ORGANIZACIÓN</h4>
          <SaSelect label="Categoría" size="sm" value={draft.categoryId} onValueChange={value => change('categoryId', value)} options={categories} bindValue="id" bindLabel="name" showPlaceholder={false}/>
          <SaSelect label="Estado del kanban" size="sm" value={draft.status} onValueChange={value => change('status', value)} options={statuses} bindValue="id" bindLabel="name" showPlaceholder={false}/>
          {draft.status === 'inbox' && <small className="muted">Esta nota se guarda en la biblioteca y no aparece en el kanban.</small>}
          <SaSelect label="Prioridad" size="sm" value={draft.priority} onValueChange={value => change('priority', value)} options={Object.entries(priorities).map(([value, label]) => ({ value, label }))} showPlaceholder={false}/>
          <SaCalendar label="Fecha objetivo" size="sm" value={calendarDate(draft.dueDate)} onValueChange={value => change('dueDate', calendarDay(value))} locale={calendarLocale} config={{ showClearButton: true, showTodayButton: true, closeOnSelect: true }} disabled={busy}/>
          <SaInput uppercase={false} ref={tagInput} label="Etiquetas" size="sm" helperText="Separadas por comas · Hasta 20 etiquetas" value={tags} onValueChange={setTags} placeholder="sql, ideas, trabajo"/>
          <SaCombobox key={tagChoice} label="Añadir etiqueta existente" placeholder="Buscar etiqueta…" noResultsText="Sin etiquetas coincidentes" disabled={busy} options={availableTags.filter(tag => !tags.split(',').map(t => t.trim()).includes(tag)).map(tag => ({ value: tag, label: tag }))} onValueChange={value => { if (value) { setTags(old => [old.trim(), value].filter(Boolean).join(', ')); setTagChoice(old => old + 1); tagInput.current?.focus(); } }}/>
          <div className="property-toggles"><SaSwitch label="Fijar nota" size="sm" value={draft.pinned} onValueChange={value => change('pinned', value)}/><SaSwitch label="Ocultar vista previa" size="sm" value={draft.private} onValueChange={value => change('private', value)}/><SaSwitch label="Archivar" size="sm" value={draft.archived} onValueChange={value => change('archived', value)}/></div>
          {note.id && <div className="editor-extra"><SaButton label="Ver historial" size="sm" variant="terciary" icon={<History size={15}/>} onClick={loadHistory} disabled={busy}/><SaButton label="Duplicar nota" size="sm" variant="terciary" icon={<Copy size={15}/>} onClick={() => action(onDuplicate)} disabled={busy}/></div>}
        </aside></div></fieldset>
        <div className="modal-footer"><div>{note.id && <SaButton size="sm" variant={baseline.deletedAt ? 'secondary' : 'danger-light'} disabled={busy} label={baseline.deletedAt ? 'Restaurar de la papelera' : 'Mover a papelera'} onClick={() => action(baseline.deletedAt ? onRestore : onTrash)}/>}</div><div><span className="save-hint">{dirty ? 'Cambios sin guardar' : note.id ? 'Guardado en SQL Server' : 'Ctrl + Enter para guardar'}</span><SaButton variant="secondary" size="sm" label="Cerrar" disabled={busy} onClick={close}/><SaButton type="submit" variant="primary" size="sm" icon={<Save size={15}/>} label="Guardar nota" aria-label="Guardar nota" aria-busy={busy} loading={busy} disabled={busy || !draft.title.trim()}/></div></div>
      </form></>}
    </Modal>
    {history && <HistoryPanel note={baseline} onClose={() => setHistory(false)} onRecover={recoverVersion}/>}
  </>;
}
