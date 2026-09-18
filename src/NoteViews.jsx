import { useEffect, useMemo, useState } from 'react';
import { SaButton, SaCalendar, SaCard, SaMetricCard, SaProgress, SaTable, SaTabs, SaTag, SaTimeline } from '@sanna-ui/react';
import { Alert, Drawer, EmptyState, Markdown, StatusTag } from './components.jsx';
import { api } from './api.js';
import { calendarDate, calendarDay, calendarLocale, dueLabel, fullDate, localDay, priorities, statuses } from './utils.js';

export function NotesAgenda({ notes, categories, onOpen, onNew }) {
  const [day, setDay] = useState(localDay()), [tab, setTab] = useState(0);
  const unscheduled = notes.filter(n => !n.dueDate), selected = notes.filter(n => n.dueDate === day);
  const scheduledPercent = notes.length ? Math.round((notes.length - unscheduled.length) / notes.length * 100) : 0;
  const unscheduledPercent = notes.length ? 100 - scheduledPercent : 0;
  const list = tab === 0 ? selected : unscheduled;
  const events = notes.filter(n => n.dueDate).map(n => ({ id: n.id, date: calendarDate(n.dueDate), title: n.title, color: statuses.find(s => s.id === n.status)?.color }));
  const listPanel = <div className="agenda-notes">
    <div className="agenda-day-heading"><div><h3>{tab === 0 ? `Apuntes para el ${dueLabel(day)}` : 'Apuntes sin fecha'}</h3><p>{list.length} notas · Se aplican tus filtros de búsqueda</p></div><SaButton size="sm" label={tab === 0 ? 'Crear para este día' : 'Nueva nota sin fecha'} onClick={() => onNew(tab === 0 ? day : null)}/></div>
    {list.length ? list.map(n => <SaCard key={n.id} className="agenda-note"><div className="agenda-note-heading"><button className="text-button" onClick={() => onOpen(n)}>{n.title}</button><StatusTag status={n.status}/></div><p>{categories.find(c => c.id === n.categoryId)?.name} · {priorities[n.priority]}{n.private ? ' · Vista previa privada' : ''}</p>{n.checklist.length > 0 && <SaProgress value={Math.round(n.checklist.filter(t => t.done).length / n.checklist.length * 100)} showLabel aria-label={`Avance de ${n.title}`}/>}</SaCard>) : <EmptyState title={tab === 0 ? "Este día tiene espacio" : "No hay notas sin fecha"} description={tab === 0 ? "Selecciona otra fecha o crea una nota para organizar tu siguiente paso." : "Las notas que coinciden con tus filtros ya tienen una fecha objetivo."}/>}
  </div>;
  return <div className="agenda-layout"><SaCard className="agenda-calendar"><SaCalendar label="Agenda de apuntes" inline showInput={false} value={calendarDate(day)} locale={calendarLocale} events={events} config={{ showTodayButton: true, showClearButton: false, highlightToday: true }} onValueChange={value => { const next = calendarDay(value); if (next) { setDay(next); setTab(0); } }}/><div className="agenda-summary"><SaMetricCard title="Con fecha" value={notes.length - unscheduled.length} progress={scheduledPercent} sublabel={`${scheduledPercent}% de esta vista`}/><SaMetricCard title="Sin fecha" value={unscheduled.length} progress={unscheduledPercent} sublabel={`${unscheduledPercent}% de esta vista`}/></div><p className="calendar-guide">Los puntos indican notas con fecha objetivo. Selecciona un día para consultarlas.</p></SaCard><SaTabs tabListAriaLabel="Notas de la agenda" activeIndex={tab} onActiveIndexChange={setTab} tabs={[{ label: `Día seleccionado (${selected.length})`, content: listPanel }, { label: `Sin fecha (${unscheduled.length})`, content: listPanel }]}/></div>;
}

const columns = [
  { key: 'title', label: 'Título', sortable: true }, { key: 'category', label: 'Categoría', sortable: true },
  { key: 'state', label: 'Estado', sortable: true }, { key: 'priority', label: 'Prioridad', sortable: true, noFilter: true },
  { key: 'dueDate', label: 'Fecha objetivo', sortable: true }, { key: 'updatedAt', label: 'Actualizada', sortable: true, noFilter: true },
  { key: 'privacy', label: 'Vista previa', sortable: true }, { key: 'actions', label: 'Acciones', noFilter: true }
];
export function NotesTable({ notes, categories, onOpen, onPeek }) {
  const byId = new Map(notes.map(n => [n.id, n]));
  const data = useMemo(() => notes.map(n => ({ id: n.id, title: n.title, category: categories.find(c => c.id === n.categoryId)?.name || 'General', state: statuses.find(s => s.id === n.status)?.name, priority: { none: 0, low: 1, medium: 2, high: 3 }[n.priority], dueDate: n.dueDate || '', updatedAt: n.updatedAt, privacy: n.private ? 'Privada' : 'Visible' })), [notes, categories]);
  return <div className="notes-table"><SaTable aria-label="Tabla de apuntes" columns={columns} data={data} showFilters showPagination showItemsPerPage showTotal itemsPerPage={10} minWidth="960px" emptyMessage="No hay notas que coincidan con los filtros de la tabla." renderCell={(row, column) => {
    const note = byId.get(row.id);
    if (column.key === 'title') return <button className="table-note-title" onClick={() => onOpen(note)}>{note.pinned && <span aria-label="Fijada">● </span>}{note.title}</button>;
    if (column.key === 'state') return <StatusTag status={note.status}/>;
    if (column.key === 'priority') return priorities[note.priority];
    if (column.key === 'dueDate') return note.dueDate ? dueLabel(note.dueDate) : 'Sin fecha';
    if (column.key === 'updatedAt') return fullDate(note.updatedAt);
    if (column.key === 'actions') return <SaButton label="Ver" aria-label={`Ver ${note.title}`} variant="secondary" size="sm" onClick={() => onPeek(note)}/>;
    return row[column.key];
  }}/></div>;
}

export function HistoryPanel({ note, onClose, onRecover }) {
  const [versions, setVersions] = useState(null), [selected, setSelected] = useState(null), [error, setError] = useState('');
  useEffect(() => { let alive = true; api(`/notes/${encodeURIComponent(note.id)}/history`).then(items => { if (alive) { setVersions(items); setSelected(items[0] || null); } }).catch(e => { if (alive) setError(e.message); }); return () => { alive = false; }; }, [note.id]);
  return <Drawer title="Historial de la nota" subtitle="Cada guardado conserva una versión. Recuperar prepara un borrador." onClose={onClose} footer={<SaButton label="Volver a la nota" variant="secondary" onClick={onClose}/>}>
    {error && <Alert>{error}</Alert>}
    {!versions && !error && <p role="status">Cargando versiones…</p>}
    {versions && <><SaTimeline className="note-history" items={versions.map(v => ({ id: v.revision, title: <button className="text-button" aria-pressed={v.revision === selected?.revision} onClick={() => setSelected(v)}>{`Versión ${v.revision}`}</button>, time: fullDate(v.savedAt), status: v.revision === selected?.revision ? 'success' : 'pending' }))}/>{selected ? <section className="version-preview"><h3>{selected.title}</h3><Markdown>{selected.content}</Markdown><SaButton label="Recuperar como borrador" onClick={() => onRecover(selected)}/></section> : <EmptyState title="Sin versiones" description="El próximo guardado quedará registrado aquí."/>}</>}
  </Drawer>;
}

export function QuickNote({ note, category, onClose, onEdit, onHistory }) {
  const done = note.checklist.filter(t => t.done).length;
  return <Drawer title={note.title} subtitle={`Actualizada ${fullDate(note.updatedAt)}`} onClose={onClose} footer={<><SaButton label="Ver historial" variant="secondary" onClick={onHistory}/><SaButton label="Editar nota" onClick={onEdit}/></>}>
    <div className="quick-meta"><SaTag text={category?.name} type="light"/><StatusTag status={note.status}/><SaTag text={priorities[note.priority]} type="light"/>{note.dueDate && <SaTag text={dueLabel(note.dueDate)} type="info"/>}</div>
    <Markdown>{note.content}</Markdown>
    {note.checklist.length > 0 && <div className="quick-checklist"><h3>Tareas · {done}/{note.checklist.length}</h3><SaProgress value={Math.round(done / note.checklist.length * 100)} showLabel aria-label="Progreso de tareas"/><ul>{note.checklist.map(t => <li key={t.id} className={t.done ? 'completed' : ''}>{t.done ? '✓ ' : '○ '}{t.text}</li>)}</ul></div>}
    <div className="quick-meta">{note.tags.map(tag => <SaTag key={tag} text={`#${tag}`} type="light"/>)}</div>
  </Drawer>;
}
