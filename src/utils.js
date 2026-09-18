export const statuses = [{ id: 'inbox', name: 'Por organizar', color: '#89919f' }, { id: 'todo', name: 'Por hacer', color: '#d6a24c' }, { id: 'doing', name: 'En progreso', color: '#6a8ec7' }, { id: 'done', name: 'Completado', color: '#4c9777' }];
export const priorities = { none: 'Sin prioridad', low: 'Baja', medium: 'Media', high: 'Alta' };
export const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function localDay(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
export const dateLabel = value => new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'America/Lima' }).format(new Date(value));
export const fullDate = value => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(value));
export const dueLabel = value => new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
// Las fechas objetivo son días de calendario, no instantes UTC.
export function calendarDate(day) { if (!day) return null; const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d, 12); }
export function calendarDay(date) { return date instanceof Date && !isNaN(date) ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null; }
// SANNA 0.3.0 espera los encabezados ya ordenados según firstDayOfWeek.
export const calendarLocale = { months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'], monthsShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], weekdays: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], weekdaysMin: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'], today: 'Hoy', clear: 'Quitar fecha', firstDayOfWeek: 1 };
export function filterNotes(notes, { scope = 'all', query = '', category = '', status = '', priority = '', sort = 'updated' }) {
  const term = fold(query.trim());
  const list = notes.filter(n => {
    if (scope === 'trash' ? !n.deletedAt : n.deletedAt) return false;
    if (scope === 'archive' ? !n.archived : scope !== 'trash' && n.archived) return false;
    if (scope === 'pinned' && !n.pinned) return false;
    if (scope === 'today' && (!n.dueDate || n.dueDate > localDay() || n.status === 'done')) return false;
    if (category && n.categoryId !== category) return false;
    if (status && n.status !== status) return false;
    if (priority && n.priority !== priority) return false;
    if (term.startsWith('#')) return n.tags.some(t => fold(t).includes(term.slice(1)));
    return !term || fold([n.title, n.plainText ?? n.content, ...n.tags, ...n.checklist.map(t => t.text), ...(n.images || []).map(i => `${i.name} ${i.caption}`)].join(' ')).includes(term);
  });
  const rank = { high: 3, medium: 2, low: 1, none: 0 };
  return list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || (sort === 'title' ? a.title.localeCompare(b.title, 'es') : sort === 'oldest' ? new Date(a.createdAt) - new Date(b.createdAt) : sort === 'priority' ? rank[b.priority] - rank[a.priority] || new Date(b.updatedAt) - new Date(a.updatedAt) : sort === 'due' ? (a.dueDate || '9999').localeCompare(b.dueDate || '9999') : new Date(b.updatedAt) - new Date(a.updatedAt)));
}
