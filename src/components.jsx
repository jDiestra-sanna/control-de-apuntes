import { useCallback, useRef, lazy, Suspense } from 'react';
import { SaButton, SaCard, SaDialog, SaDrawer, SaDropdown, SaEmptyState, SaMessagebox, SaProgress, SaSelect, SaSkeleton, SaTag, SaTooltip } from '@sanna-ui/react';
import { FileText, Pin, LockKeyhole, CalendarDays, CheckCheck, GripVertical } from 'lucide-react';
import { statuses, dateLabel, dueLabel, localDay, priorities } from './utils.js';
const MarkdownContent = lazy(() => import('./Markdown.jsx'));

export function IconButton({ label, children, className = '', ...props }) {
  return <SaTooltip content={label}><SaButton type="button" variant="terciary" size="sm" iconOnly icon={children} className={`icon-button ${className}`} aria-label={label} {...props}/></SaTooltip>;
}
// Evita reiniciar el gestor de foco de SANNA mientras se escribe.
function useClose(onClose) {
  const close = useRef(onClose); close.current = onClose;
  return useCallback(open => { if (!open) close.current(); }, []);
}
function escapeInsideControl(e) {
  if (e.key === 'Escape' && (e.defaultPrevented || e.target.closest('.sa-select-filter,.sa-combobox,.sa-dropdown,.sa-calendar')?.querySelector('[aria-expanded="true"]'))) e.stopPropagation();
}
function closeCalendarFirst(e) {
  if (e.key !== 'Escape') return;
  const calendar = e.target.closest('.sa-calendar');
  const trigger = calendar?.querySelector('.sa-calendar__trigger[aria-expanded="true"]');
  if (trigger) { e.preventDefault(); e.stopPropagation(); trigger.click(); calendar.querySelector('input')?.focus(); }
}
export function Modal({ title, subtitle, children, onClose, wide = false, open = true, footer }) {
  const close = useClose(onClose);
  return <SaDialog open={open} title={title} description={subtitle} onOpenChange={close} closeLabel="Cerrar ventana" size={wide ? 'lg' : 'md'} className={`notes-modal ${wide ? 'notes-modal-wide' : ''}`} onKeyDownCapture={closeCalendarFirst} onKeyDown={escapeInsideControl} footer={footer}>{children}</SaDialog>;
}
export function Drawer({ title, subtitle, children, onClose, footer }) {
  const close = useClose(onClose);
  return <SaDrawer open title={title} description={subtitle} onOpenChange={close} closeLabel="Cerrar panel" size="lg" className="notes-drawer" footer={footer} onKeyDown={escapeInsideControl}>{children}</SaDrawer>;
}
export function Alert({ children, type = 'error' }) { return <SaMessagebox className="notes-alert" type={type} role={type === 'error' ? 'alert' : 'status'} message={children}/>; }
export function ConfirmContent({ message, confirmLabel = 'Descartar cambios', cancelLabel = 'Seguir editando', onConfirm, onCancel }) {
  return <div className="confirm-body"><SaMessagebox type="warning" message={message}/><div className="confirm-actions"><SaButton label={cancelLabel} variant="secondary" onClick={onCancel} autoFocus/><SaButton label={confirmLabel} variant="danger" onClick={onConfirm}/></div></div>;
}
export function Markdown({ children }) { return <Suspense fallback={<SaSkeleton rows={3} aria-label="Preparando vista previa"/>}><MarkdownContent>{children}</MarkdownContent></Suspense>; }
export const statusType = { inbox: 'gray', todo: 'warning', doing: 'info', review: 'info', done: 'success' };
export function StatusTag({ status }) { return <SaTag type={statusType[status]} size="small" text={statuses.find(s => s.id === status)?.name}/>; }
export function EmptyState({ title, description, children }) { return <div className="notes-empty"><SaEmptyState title={title} description={description} icon={<FileText size={32}/>}/>{children}</div>; }
export function LoadingNotes() { return <div className="notes-grid" role="status" aria-label="Cargando apuntes">{[0, 1, 2, 3, 4, 5].map(i => <SaCard key={i}><SaSkeleton width="45%"/><SaSkeleton rows={3}/><SaSkeleton width="65%"/></SaCard>)}</div>; }

export function NoteCard({ note, category, onOpen, onPin, onStatus, view, onTag, dragging, onDragEnd, onRestore, onAction, busy = false }) {
  const done = note.checklist.filter(c => c.done).length;
  const overdue = note.dueDate && note.dueDate < localDay() && note.status !== 'done';
  const items = [{ value: 'peek', label: 'Vista rápida' }, { value: 'edit', label: 'Editar nota' }, { value: 'history', label: 'Ver historial' }, { value: 'duplicate', label: 'Duplicar nota' }, ...(note.deletedAt ? [{ value: 'restore', label: 'Restaurar nota' }] : [{ value: 'archive', label: note.archived ? 'Desarchivar nota' : 'Archivar nota' }, { value: 'trash', label: 'Mover a papelera' }])].map(item => ({ ...item, disabled: busy }));
  return <SaCard className={`note-card ${view === 'list' ? 'as-row' : ''} ${note.private ? 'is-private' : ''}`} aria-busy={busy} draggable={view === 'board' && !busy} onDragStart={e => { if (e.target.closest('select,button,input')) { e.preventDefault(); return; } e.dataTransfer.setData('text/plain', note.id); e.dataTransfer.effectAllowed = 'move'; dragging?.(note.id); }} onDragEnd={onDragEnd}>
    <div className="card-top"><SaTag className="category-pill" style={{ '--category-color': category?.color || '#6b8e7b' }} size="small" type="light"><span className="color-dot"/>{category?.name || 'General'}</SaTag><div className="card-tools">{view === 'board' && <GripVertical size={14} className="grip"/>}<IconButton disabled={busy} label={note.pinned ? `Desfijar ${note.title}` : `Fijar ${note.title}`} className={`pin ${note.pinned ? 'pinned' : ''}`} onClick={() => onPin(note)}><Pin size={15} fill={note.pinned ? 'currentColor' : 'none'}/></IconButton>{onAction && <SaDropdown className="note-menu" label={`Acciones de ${note.title}`} items={items} onItemClick={item => onAction(note, item.value)}/>}</div></div>
    <button disabled={busy} className="card-body" onClick={() => onOpen(note)}><h3><FileText size={17}/><span>{note.title}</span></h3>{note.private ? <div className="private-preview"><LockKeyhole size={16}/><span>Contenido privado<span>Abre la nota para consultarlo</span></span></div> : <p className="note-excerpt">{(note.plainText ?? note.content) || (note.checklist.length ? `${note.checklist.length} tareas en esta nota` : 'Una idea por desarrollar…')}</p>}</button>
    <div className="card-tags">{!note.private && note.images?.length > 0 && <SaTag type="light" size="small" text={`${note.images.length} imágenes`}/>}{note.tags.slice(0, 3).map(t => <button key={t} onClick={() => onTag(t)}><SaTag type="light" size="small" text={`#${t}`}/></button>)}{note.tags.length > 3 && <span>+{note.tags.length - 3}</span>}</div>
    {note.checklist.length > 0 && <div className="card-progress"><SaProgress value={Math.round(done / note.checklist.length * 100)} aria-label={`Avance de ${note.title}`}/><span><CheckCheck size={13}/>{done}/{note.checklist.length} tareas</span></div>}
    <div className="card-footer"><div className="card-meta">{note.priority !== 'none' && <SaTag type={note.priority === 'high' ? 'danger' : note.priority === 'medium' ? 'warning' : 'info'} size="small" text={priorities[note.priority]}/>}<span className={overdue ? 'overdue' : ''}>{note.dueDate && <CalendarDays size={12}/>} {note.dueDate ? dueLabel(note.dueDate) : dateLabel(note.updatedAt)}</span></div>{view === 'board' ? <SaSelect disabled={busy} label={`Estado de ${note.title}`} hideLabel className="card-status" size="sm" value={note.status} options={statuses} bindValue="id" bindLabel="name" showPlaceholder={false} onValueChange={value => onStatus(note, value)}/> : <StatusTag status={note.status}/>}</div>
    {note.deletedAt && <SaButton className="restore-note" label="Restaurar nota" variant="secondary" size="sm" disabled={busy} onClick={() => onRestore(note)}/>}
  </SaCard>;
}
