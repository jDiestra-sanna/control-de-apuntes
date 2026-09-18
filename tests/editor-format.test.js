import test from 'node:test';
import assert from 'node:assert/strict';
import { codeBlockAt, toggleCode, plainText, exitCode, toggleBold, toggleList } from '../src/editor-format.js';
import { normalizeImport, ImportError, noteSchema } from '../server/model.js';

test('Código es reversible y los clics repetidos no anidan bloques', () => {
  let result = { text: 'SELECT 1;', start: 0, end: 9 };
  for (let i = 0; i < 20; i++) {
    result = toggleCode(result.text, result.start, result.end);
    assert.equal(result.text, i % 2 ? 'SELECT 1;' : '```sql\nSELECT 1;\n```');
  }
});
test('Texto simple conserva contenido, espacios y bloques vecinos', () => {
  const text = 'Antes\n\n```sql\n  SELECT 1;  \n```\n\n```js\nconst a = 2;\n```';
  assert.equal(plainText(text, text.indexOf('SELECT')).text, 'Antes\n\n  SELECT 1;  \n\n```js\nconst a = 2;\n```');
  assert.equal(plainText(text, 0).text, text);
});
test('Selección parcial crea un bloque válido y mantiene el cursor', () => {
  const original = 'Inicio\nSELECT nombre FROM tabla;\nFin';
  const result = toggleCode(original, 14, 20);
  assert.equal(result.text, 'Inicio\n```sql\nSELECT nombre FROM tabla;\n```\nFin');
  assert.equal(result.text.slice(result.start, result.end), original.slice(14, 20));
  assert.equal(toggleCode(result.text, result.start, result.end).text, original);
});
test('Bloques vacíos, saltos iniciales y Windows CRLF se recuperan sin pérdida', () => {
  for (const text of ['', '\n', '\nSELECT 1;', 'SELECT 1;\r\nSELECT 2;\r\n']) {
    const result = toggleCode(text, 0, text.length);
    assert.equal(plainText(result.text, result.start, result.end).text, text);
  }
});
test('Contenido con delimitadores utiliza un cerco más largo', () => {
  const text = 'ejemplo\n```js\nalert(1)\n```\nfin';
  const result = toggleCode(text, 0, text.length);
  assert.ok(result.text.startsWith('````sql\n'));
  assert.equal(plainText(result.text, result.start, result.end).text, text);
});
test('Bloques sin cierre y cercos de virgulillas permiten volver a texto', () => {
  assert.equal(plainText('```sql\nSELECT 1;\n', 12).text, 'SELECT 1;\n');
  assert.equal(plainText('~~~text\na\n~~~', 9).text, 'a');
  assert.equal(codeBlockAt('```sql\na\n```\nFuera', 16), null);
});
test('Continuar debajo mantiene el código y saca el cursor del bloque', () => {
  for (const text of ['```sql\nSELECT 1;\n```', '```sql\nSELECT 1;', '```sql\nSELECT 1;\n```\n\nTexto']) {
    const result = exitCode(text, 12);
    assert.equal(codeBlockAt(result.text, result.start), null);
    assert.ok(result.text.includes('```sql\nSELECT 1;\n```\n\n'));
    assert.equal(result.start, result.end);
    assert.ok(result.end <= result.text.length);
  }
});
test('Negrita y listas también se pueden alternar', () => {
  for (const fn of [toggleBold, toggleList]) {
    const first = fn('uno\ndos', 0, 7);
    assert.equal(fn(first.text, first.start, first.end).text, 'uno\ndos');
  }
});
test('Importaciones malformadas e IDs duplicados sin distinción de mayúsculas se rechazan', () => {
  for (const data of [null, {}, { categories: [null], notes: [] }, { categories: [], notes: [null] }, { categories: [], notes: [{ id: 'a' }, { id: 'A' }] }]) assert.throws(() => normalizeImport(data), ImportError);
});

test('Tareas duplicadas se rechazan para evitar cambios simultáneos involuntarios', () => {
  const item = { id: 'same', text: 'Tarea', done: false };
  assert.equal(noteSchema.safeParse({ title: 'Nota', categoryId: 'cat', checklist: [item, item] }).success, false);
});
