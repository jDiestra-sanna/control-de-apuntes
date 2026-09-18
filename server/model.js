import { randomUUID } from 'node:crypto';
import { z } from 'zod';
export class ImportError extends Error {}

export const categorySchema = z.object({ name: z.string().trim().min(1).max(80), color: z.string().regex(/^#[0-9a-f]{6}$/i), order: z.number().int().min(0).default(0) });
export const noteSchema = z.object({
  title: z.string().trim().min(1, 'Escribe un título.').max(300), content: z.string().max(1000000).default(''),
  categoryId: z.string().min(1).max(128), status: z.enum(['inbox', 'todo', 'doing', 'done']).default('inbox'),
  priority: z.enum(['none', 'low', 'medium', 'high']).default('none'),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => { const d = new Date(s); return !isNaN(d) && d.toISOString().slice(0,10) === s; }).nullable().default(null),
  pinned: z.boolean().default(false), archived: z.boolean().default(false), private: z.boolean().default(false),
  checklist: z.array(z.object({ id: z.string().min(1).max(100), text: z.string().trim().min(1).max(500), done: z.boolean() })).max(200).refine(items => new Set(items.map(item => item.id)).size === items.length, 'Las tareas deben tener identificadores únicos.').default([])
});
function date(value, fallback) {
  if (value == null) return fallback;
  const parsed = new Date(value);
  if (isNaN(parsed)) throw new ImportError('El respaldo contiene una fecha inválida.');
  return parsed.toISOString();
}
export function normalizeImport(data) {
  if (!data || !Array.isArray(data.categories) || !Array.isArray(data.notes) || data.notes.length > 10000 || data.categories.length > 500) throw new ImportError('El respaldo debe contener categorías y notas válidas (máximo 10 000 notas).');
  const categories = [];
  const byName = new Map();
  const byId = new Map();
  for (const [i, raw] of data.categories.entries()) {
    const source = typeof raw === 'string' ? { name: raw } : raw;
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new ImportError('El respaldo contiene una categoría inválida.');
    const c = categorySchema.parse({ name: source.name, color: source.color || '#6b8e7b', order: i });
    const normalized = c.name.toLocaleLowerCase('es');
    const existing = byName.get(normalized);
    if (existing) { if (source.id) byId.set(source.id, existing); continue; }
    const category = { ...c, id: randomUUID() };
    categories.push(category); byName.set(normalized, category);
    if (source.id) byId.set(source.id, category);
  }
  if (!categories.length) { const c = { id: randomUUID(), name: 'General', color: '#6b8e7b', order: 0 }; categories.push(c); byName.set('general', c); }
  const ids = new Set();
  const now = new Date().toISOString();
  const notes = data.notes.map(raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ImportError('El respaldo contiene una nota inválida.');
    let category = byId.get(raw.categoryId) || byName.get(String(raw.category || '').toLocaleLowerCase('es'));
    if (!category && raw.category) {
      category = { id: randomUUID(), ...categorySchema.parse({ name: raw.category, color: '#6b8e7b', order: categories.length }) };
      categories.push(category); byName.set(category.name.toLocaleLowerCase('es'), category);
    }
    category ||= categories[0];
    const id = raw.id ? String(raw.id) : randomUUID();
    if (id.length > 128 || ids.has(id.toLocaleLowerCase('es'))) throw new ImportError('El respaldo contiene identificadores duplicados o inválidos.');
    ids.add(id.toLocaleLowerCase('es'));
    const content = noteSchema.parse({ ...raw, title: raw.title || 'Sin título', content: raw.content || '', categoryId: category.id, private: raw.private ?? /acceso|credencial|contrase/i.test(category.name) });
    return { ...content, id, createdAt: date(raw.createdAt, now), updatedAt: date(raw.updatedAt, now), deletedAt: raw.deletedAt ? date(raw.deletedAt, null) : null };
  });
  return { categories, notes };
}
