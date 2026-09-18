import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function regressionTests({ browser, base, request, ok, qaDir }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const dialog = page.getByRole('dialog');
  const content = dialog.getByRole('textbox', { name: 'Contenido de la nota' });
  const save = () => dialog.getByRole('button', { name: 'Guardar nota', exact: true }).click();
  const create = async title => { await page.getByRole('button', { name: 'Nueva nota', exact: true }).first().click(); await dialog.getByRole('button', { name: 'Markdown', exact: true }).click(); await dialog.getByLabel('Título de la nota').fill(title); };
  const open = async title => { await page.getByRole('textbox', { name: 'Buscar notas' }).fill(title); await page.getByRole('heading', { name: title, exact: true }).click(); await dialog.getByRole('tab', { name: 'Escribir', exact: true }).click(); };
  const discard = async () => { await dialog.getByRole('button', { name: 'Cerrar ventana' }).click(); await dialog.getByRole('button', { name: 'Descartar cambios', exact: true }).click(); await expect(dialog).toHaveCount(0); };
  async function audit(name) {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    writeFileSync(`${qaDir}/accessibility-${name}.json`, JSON.stringify(result.violations, null, 2));
    assert.deepEqual(result.violations.map(v => v.id), [], `Accesibilidad: ${name}`);
  }
  try {
    await page.goto(base);
    await create('Regresión del editor');
    await content.fill('SELECT 1;'); await content.press('Control+a');
    for (let i = 0; i < 4; i++) {
      await dialog.getByRole('button', { name: 'Bloque de código', exact: true }).click();
      await expect(content).toHaveValue(i % 2 ? 'SELECT 1;' : '```sql\nSELECT 1;\n```');
      await expect(dialog.getByRole('button', { name: 'Bloque de código', exact: true })).toHaveAttribute('aria-pressed', String(i % 2 === 0));
    }
    await dialog.getByRole('button', { name: 'Bloque de código', exact: true }).click();
    await dialog.getByRole('tab', { name: 'Vista previa', exact: true }).click();
    await expect(dialog.locator('pre code')).toHaveText('SELECT 1;\n');
    await dialog.getByRole('button', { name: 'Texto simple', exact: true }).click();
    await expect(content).toHaveValue('SELECT 1;');
    await content.press('Control+z'); await expect(content).toHaveValue('```sql\nSELECT 1;\n```');
    await content.press('Control+Shift+z'); await expect(content).toHaveValue('SELECT 1;');
    await dialog.getByRole('button', { name: 'Bloque de código', exact: true }).click();
    await dialog.getByRole('button', { name: 'Continuar debajo del código', exact: true }).click();
    await content.pressSequentially('Texto fuera del codigo.');
    await dialog.getByRole('tab', { name: 'Vista previa', exact: true }).click();
    await expect(dialog.locator('pre')).toHaveText('SELECT 1;\n');
    await expect(dialog.locator('.markdown p')).toHaveText('Texto fuera del codigo.');
    await audit('editor');
    await page.screenshot({ path: `${qaDir}/editor-polished.png`, fullPage: true });
    ok('Editor: alternar código/texto, vista previa, deshacer/rehacer y continuar fuera del bloque');

    await dialog.getByLabel('Nueva tarea').fill('Tarea aún sin pulsar Añadir');
    await dialog.getByRole('button', { name: 'Cerrar ventana' }).click(); await dialog.getByRole('button', { name: 'Seguir editando' }).click();
    await expect(dialog.getByLabel('Nueva tarea')).toHaveValue('Tarea aún sin pulsar Añadir');
    await dialog.getByLabel('Nueva tarea').press('Control+Enter'); await expect(dialog).toHaveCount(0);
    let saved = (await request('/workspace')).data.notes.find(n => n.title === 'Regresión del editor');
    assert.equal(saved.checklist.length, 1); assert.equal(saved.checklist[0].text, 'Tarea aún sin pulsar Añadir');
    ok('Guardar con Ctrl+Enter incluye la tarea pendiente y el cierre protege el borrador');

    await create(''); await content.fill('No debe guardarse sin título'); await content.press('Control+Enter');
    await expect(dialog).toBeVisible();
    assert.equal((await request('/workspace')).data.notes.filter(n => n.content === 'No debe guardarse sin título').length, 0);
    await dialog.getByLabel('Título de la nota').fill('Guardado único');
    let saveRequests = 0, release;
    const gate = new Promise(resolve => { release = resolve; });
    const hold = async route => { if (route.request().method() === 'POST') { saveRequests++; await gate; } await route.continue(); };
    await page.route('**/api/notes', hold);
    await content.press('Control+Enter');
    await expect(dialog.getByRole('button', { name: 'Guardar nota', exact: true })).toBeDisabled();
    await page.keyboard.press('Control+Enter'); await dialog.getByRole('button', { name: 'Cerrar ventana' }).click();
    await expect(dialog).toBeVisible(); assert.equal(saveRequests, 1);
    release(); await expect(dialog).toHaveCount(0); await page.unroute('**/api/notes', hold);
    assert.equal((await request('/workspace')).data.notes.filter(n => n.title === 'Guardado único').length, 1);
    ok('Título requerido, bloqueo de doble guardado y cierre durante la escritura');

    await open('Regresión del editor'); await content.fill('Borrador conservado tras fallo de conexión');
    const endpoint = `**/api/notes/${saved.id}`;
    const offline = route => route.abort('connectionrefused');
    await page.route(endpoint, offline); await save();
    await expect(dialog.getByRole('alert')).toContainText('Sin conexión');
    await expect(content).toHaveValue('Borrador conservado tras fallo de conexión');
    await page.unroute(endpoint, offline); await save(); await expect(dialog).toHaveCount(0);
    saved = (await request(`/notes/${saved.id}`)).data;
    assert.equal(saved.content, 'Borrador conservado tras fallo de conexión');
    ok('Fallo de red mantiene el borrador y el reintento guarda correctamente');

    await open('Regresión del editor'); await content.fill('Versión de la primera ventana');
    await request(`/notes/${saved.id}`, 'PUT', { ...saved, content: 'Versión guardada desde otra ventana' });
    await save(); await expect(dialog.getByRole('alert')).toContainText('cambió en otra ventana');
    await expect(content).toHaveValue('Versión de la primera ventana');
    await dialog.getByRole('button', { name: 'Guardar borrador como copia' }).click(); await expect(dialog).toHaveCount(0);
    let workspace = (await request('/workspace')).data;
    assert.equal(workspace.notes.find(n => n.id === saved.id).content, 'Versión guardada desde otra ventana');
    assert.equal(workspace.notes.find(n => n.title === 'Regresión del editor (copia)').content, 'Versión de la primera ventana');
    await open('Regresión del editor'); await content.fill('Otro borrador');
    saved = (await request(`/notes/${saved.id}`)).data;
    await request(`/notes/${saved.id}`, 'PUT', { ...saved, content: 'Última versión disponible' });
    await save(); await expect(dialog.getByRole('alert')).toContainText('cambió en otra ventana');
    await dialog.getByRole('button', { name: 'Cargar versión actual' }).click(); await dialog.getByRole('button', { name: 'Cargar y descartar' }).click();
    await expect(content).toHaveValue('Última versión disponible');
    await content.fill('Continuación después de recuperar'); await save(); await expect(dialog).toHaveCount(0);
    ok('Conflictos: conservar como copia o cargar la última versión sin sobrescritura silenciosa');

    const cats = (await request('/workspace')).data.categories;
    const reversed = cats.map(c => c.id).reverse();
    assert.equal((await request('/categories/reorder', 'PUT', { ids: reversed })).status, 200);
    assert.deepEqual((await request('/workspace')).data.categories.map(c => c.id), reversed);
    assert.equal((await request('/categories/reorder', 'PUT', { ids: [reversed[0], reversed[0]] })).status, 400);
    assert.equal((await request('/categories/reorder', 'PUT', { ids: reversed.slice(1) })).status, 409);
    assert.deepEqual((await request('/workspace')).data.categories.map(c => c.id), reversed);
    for (const body of [{}, { categories: [null], notes: [] }, { categories: [], notes: [null] }, { categories: [], notes: [{ id: 'abc' }, { id: 'ABC' }] }]) assert.equal((await request('/import', 'POST', body)).status, 400);
    assert.equal((await request(`/notes/${saved.id}`, 'PUT', null)).status, 400);
    ok('API: orden de categorías atómico e importaciones malformadas rechazadas con HTTP 400');

    await page.reload(); await page.getByRole('button', { name: 'Gestionar categorías' }).click();
    await audit('categories');
    await dialog.getByRole('button', { name: `Bajar ${cats.at(-1).name}`, exact: true }).click();
    await expect.poll(async () => (await request('/workspace')).data.categories[1].id).toBe(cats.at(-1).id);
    await dialog.getByLabel('Nombre de categoría').fill('Categoría temporal QA'); await dialog.getByRole('button', { name: 'Crear', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Editar categoría Categoría temporal QA' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cerrar ventana' }).click();
    await page.getByRole('navigation', { name: 'Categorías', exact: true }).getByRole('button', { name: /Categoría temporal QA/ }).click();
    await page.getByRole('button', { name: 'Gestionar categorías' }).click();
    await dialog.getByRole('button', { name: 'Eliminar categoría Categoría temporal QA' }).click();
    await dialog.getByRole('button', { name: 'Mover notas y eliminar categoría' }).click();
    await expect(dialog.getByRole('button', { name: 'Editar categoría Categoría temporal QA' })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Cerrar ventana' }).click();
    await expect(page.locator('.library-title h2')).toHaveText('Todas las notas');
    ok('Categorías: reordenar desde UI y salir del filtro de una categoría eliminada');

    await page.getByRole('button', { name: 'Importar / exportar', exact: true }).first().click(); await audit('backup');
    await dialog.getByRole('tab', { name: 'Importar notas', exact: true }).click();
    await dialog.getByLabel('Archivo de respaldo').setInputFiles(`${qaDir}/test-export.enc.json`);
    await dialog.getByLabel('Contraseña del respaldo', { exact: true }).fill('wrong-password');
    await dialog.getByRole('button', { name: 'Abrir y revisar respaldo' }).click(); await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Respaldo listo para importar' })).toHaveCount(0);
    await dialog.getByLabel('Contraseña del respaldo', { exact: true }).fill('synthetic-export-password');
    await dialog.getByRole('button', { name: 'Abrir y revisar respaldo' }).click(); await expect(dialog.getByRole('heading', { name: 'Respaldo listo para importar' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Elegir otro respaldo' }).click();
    await dialog.getByLabel('Archivo de respaldo').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('invalid json') });
    await dialog.getByLabel('Contraseña del respaldo', { exact: true }).fill('wrong-password'); await dialog.getByRole('button', { name: 'Abrir y revisar respaldo' }).click();
    await expect(dialog.getByRole('alert')).toContainText('JSON válido');
    await dialog.getByRole('button', { name: 'Cerrar ventana' }).click();
    ok('Respaldos: contraseña incorrecta, archivo inválido y cambio de archivo en la vista previa');

    await create('Editor móvil'); await content.fill('SELECT 1;'); await content.press('Control+a');
    await dialog.getByRole('button', { name: 'Bloque de código', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    await dialog.getByRole('button', { name: 'Texto simple', exact: true }).click(); await expect(content).toHaveValue('SELECT 1;');
    await audit('editor-mobile'); await page.screenshot({ path: `${qaDir}/editor-mobile.png`, fullPage: true });
    await discard();
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.deepEqual(errors, []);
    ok('Editor móvil: formato usable, sin desbordamiento, scroll restaurado y accesibilidad en cuatro vistas');
  } catch (error) {
    await page.screenshot({ path: `${qaDir}/regression-failure.png`, fullPage: true }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}
