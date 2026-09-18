import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { calendarDate, calendarDay, localDay } from '../src/utils.js';

// Se ejecuta únicamente contra la base efímera creada por integration-test.js.
export async function sannaTests({ browser, base, request, ok, qaDir }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, timezoneId: 'America/Lima' });
  const page = await context.newPage(), errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (!r.url().startsWith(base)) external.push(r.url()); });
  const dialog = page.locator('[aria-modal="true"]');
  const search = page.getByRole('textbox', { name: 'Buscar notas' });
  const today = localDay(), next = calendarDate(today); next.setDate(next.getDate() + 1);
  const tomorrow = calendarDay(next);
  async function audit(name) {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    writeFileSync(`${qaDir}/accessibility-${name}.json`, JSON.stringify(result.violations, null, 2));
    assert.deepEqual(result.violations.map(v => v.id), [], `Accesibilidad: ${name}`);
  }
  async function cardMenu(title, action) {
    await search.fill(title);
    await page.getByRole('button', { name: `Acciones de ${title}`, exact: false }).click();
    await page.getByRole('menuitem', { name: action, exact: true }).click();
  }
  try {
    const cat = (await request('/workspace')).data.categories[0];
    for (let i = 1; i <= 12; i++) {
      const result = await request('/notes', 'POST', {
        title: `SANNA tabla ${String(i).padStart(2, '0')}`, categoryId: cat.id,
        content: i === 1 ? 'CONTENIDO_PRIVADO_SANNA' : 'Contenido sintético para comprobar la vista rápida.',
        dueDate: i === 1 ? today : i === 2 ? tomorrow : null,
        private: i === 1, tags: ['sanna', 'MiEtiqueta'], status: i % 2 ? 'todo' : 'doing',
        priority: i === 1 ? 'high' : 'none',
        checklist: [{ id: `done-${i}`, text: 'Primera tarea', done: true }, { id: `next-${i}`, text: 'Segunda tarea', done: false }]
      });
      assert.equal(result.status, 201);
    }
    await page.goto(base); await search.fill('SANNA tabla');
    await page.getByRole('button', { name: 'Vista de tabla', exact: true }).click();
    const table = page.locator('.notes-table');
    await expect(table.locator('tbody tr')).toHaveCount(10);
    await table.getByRole('button', { name: 'Ordenar por Título', exact: true }).click();
    await expect(table.locator('tbody tr').first()).toContainText('SANNA tabla 01');
    await table.getByRole('button', { name: 'Pagina siguiente', exact: true }).click();
    await expect(table.locator('tbody tr')).toHaveCount(2);
    await table.getByRole('button', { name: 'Ver SANNA tabla 11', exact: true }).click();
    await expect(dialog).toContainText('Contenido sintético');
    await audit('quick-note');
    await page.screenshot({ path: `${qaDir}/quick-note.png` });
    await dialog.getByRole('button', { name: 'Cerrar panel', exact: true }).click();
    await expect(table.locator('tbody tr')).toHaveCount(2);
    await expect(table).toContainText('Pagina 2');
    await table.getByRole('textbox', { name: 'Filtrar Título', exact: true }).fill('tabla 01');
    await expect(table.locator('tbody tr')).toHaveCount(1);
    await expect(table).toContainText('Privada');
    await expect(page.getByText('CONTENIDO_PRIVADO_SANNA', { exact: true })).toHaveCount(0);
    await table.getByRole('textbox', { name: 'Filtrar Título', exact: true }).fill('');
    await audit('table'); await page.screenshot({ path: `${qaDir}/table.png` });
    ok('Tabla SANNA: filtros, orden, paginación, privacidad y retorno de vista rápida conservando la página');

    await page.getByRole('button', { name: 'Vista de agenda', exact: true }).click();
    await expect(page.locator('.agenda-summary')).toContainText('17% de esta vista');
    await expect(page.locator('.agenda-summary')).toContainText('83% de esta vista');
    await expect(page.getByText('Actualizado hace 5 min', { exact: true })).toHaveCount(0);
    await expect(page.locator('.agenda-notes').getByRole('button', { name: 'SANNA tabla 01', exact: true })).toBeVisible();
    await expect(page.getByText('CONTENIDO_PRIVADO_SANNA', { exact: true })).toHaveCount(0);
    await expect(page.locator('.sa-calendar__weekday').first()).toHaveText('Lu');
    const firstLabel = await page.locator('.sa-calendar__day').first().getAttribute('aria-label');
    const firstDay = calendarDate(today); firstDay.setDate(1); firstDay.setDate(1 - (firstDay.getDay() + 6) % 7);
    assert.ok(firstLabel.startsWith(`${firstDay.getDate()} `), 'La primera columna del calendario corresponde al lunes');
    await page.locator('.agenda-calendar').getByRole('button', { name: /SANNA tabla 02/ }).click();
    await expect(page.locator('.agenda-notes').getByRole('button', { name: 'SANNA tabla 02', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Crear para este día', exact: true }).click();
    const title = dialog.getByLabel('Título de la nota');
    await title.fill(''); await title.pressSequentially('Mi nota SANNA', { delay: 20 });
    await expect(title).toHaveValue('Mi nota SANNA'); await expect(title).toBeFocused();
    const date = dialog.getByRole('textbox', { name: 'Fecha objetivo', exact: true });
    await expect(date).toHaveValue(`${tomorrow.slice(8)}/${tomorrow.slice(5, 7)}/${tomorrow.slice(0, 4)}`);
    await date.press('ArrowDown');
    await expect(dialog.getByRole('dialog', { name: 'Fecha objetivo', exact: true })).toBeVisible();
    await audit('calendar-editor');
    await date.press('Escape');
    await expect(dialog.getByRole('dialog', { name: 'Fecha objetivo', exact: true })).toHaveCount(0);
    await expect(dialog.getByLabel('Título de la nota')).toBeVisible();
    await date.press('ArrowDown');
    await dialog.locator('.sa-calendar__day').first().focus();
    await page.keyboard.press('Escape');
    await expect(dialog.getByRole('dialog', { name: 'Fecha objetivo', exact: true })).toHaveCount(0);
    await expect(date).toBeFocused();
    const combo = dialog.getByRole('combobox', { name: 'Añadir etiqueta existente', exact: true });
    await combo.fill('MiEtiqueta'); await combo.press('Escape');
    await expect(dialog.getByLabel('Título de la nota')).toBeVisible();
    await combo.fill('MiEtiqueta'); await combo.press('ArrowDown'); await combo.press('Enter');
    await expect(dialog.getByLabel('Etiquetas', { exact: true })).toHaveValue('MiEtiqueta');
    await dialog.getByRole('switch', { name: 'Fijar nota', exact: true }).check();
    await dialog.getByRole('button', { name: 'Guardar nota', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const created = (await request('/workspace')).data.notes.find(n => n.title === 'Mi nota SANNA');
    assert.equal(created.dueDate, tomorrow); assert.equal(created.pinned, true); assert.deepEqual(created.tags, ['MiEtiqueta']);
    await page.getByRole('tab', { name: /^Sin fecha/ }).click();
    await expect(page.locator('.agenda-note')).toHaveCount(10);
    await audit('agenda'); await page.screenshot({ path: `${qaDir}/agenda.png` });
    ok('Agenda: fechas y semana correctas, creación por día, notas sin fecha y filtros; calendario, etiquetas y foco del editor');

    await page.getByRole('button', { name: 'Vista de tarjetas', exact: true }).click();
    await cardMenu('SANNA tabla 01', 'Vista rápida');
    await expect(dialog.getByText('CONTENIDO_PRIVADO_SANNA', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Ver historial', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Historial de la nota' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Versión 1', exact: true })).toBeVisible();
    await audit('history'); await page.screenshot({ path: `${qaDir}/history.png` });
    await dialog.getByRole('button', { name: 'Volver a la nota', exact: true }).click();
    await dialog.getByRole('button', { name: 'Cerrar ventana', exact: true }).click();
    await cardMenu('SANNA tabla 01', 'Archivar nota');
    await expect.poll(async () => (await request('/workspace')).data.notes.find(n => n.title === 'SANNA tabla 01').archived).toBe(true);
    await page.getByRole('button', { name: /^Archivadas/ }).click();
    await cardMenu('SANNA tabla 01', 'Desarchivar nota');
    await page.getByRole('button', { name: /^Todas las notas/ }).first().click();
    await cardMenu('SANNA tabla 01', 'Mover a papelera');
    await audit('confirmation');
    await dialog.getByRole('button', { name: 'Mover a papelera', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole('region', { name: 'Notificaciones' }).getByRole('button', { name: 'Deshacer', exact: true }).click();
    await expect.poll(async () => (await request('/workspace')).data.notes.find(n => n.title === 'SANNA tabla 01').deletedAt).toBe(null);
    await expect(page.getByRole('heading', { name: 'SANNA tabla 01', exact: true })).toBeVisible();
    ok('Acciones SANNA: consulta privada explícita, historial, archivar/desarchivar, papelera confirmada y deshacer');

    await search.fill('');
    await page.getByRole('button', { name: 'Filtrar por categoría', exact: true }).click();
    await page.getByPlaceholder('Buscar categoría…').fill(cat.name);
    await page.getByRole('option', { name: cat.name, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Filtrar por categoría', exact: true })).toContainText(cat.name);
    await page.getByRole('button', { name: 'Desde plantilla', exact: false }).click();
    await page.getByRole('menuitem', { name: /Consulta SQL/ }).click();
    await expect(dialog.getByLabel('Título de la nota')).toHaveValue('Nueva consulta SQL');
    await expect(dialog.getByRole('textbox', { name: 'Contenido de la nota' })).toContainText('SELECT');
    await dialog.getByRole('button', { name: 'Cerrar ventana', exact: true }).click();
    ok('Selector de categorías con búsqueda y plantillas desde menú SANNA');

    while (await page.getByRole('button', { name: 'Cerrar aviso', exact: true }).count()) await page.getByRole('button', { name: 'Cerrar aviso', exact: true }).first().click();
    await search.fill('SANNA tabla'); await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Vista de agenda', exact: true }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await audit('agenda-mobile'); await page.screenshot({ path: `${qaDir}/agenda-mobile.png`, fullPage: true });
    await page.getByRole('button', { name: 'Vista de tabla', exact: true }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await audit('table-mobile'); await page.screenshot({ path: `${qaDir}/table-mobile.png`, fullPage: true });
    await expect(page.getByRole('button', { name: 'Abrir menú', exact: true })).toBeVisible();
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    ok('Vistas SANNA a 390 px sin desbordamiento global, sin errores JS ni peticiones externas y accesibilidad en ocho vistas');
  } catch (error) {
    await page.screenshot({ path: `${qaDir}/sanna-failure.png`, fullPage: true }).catch(() => {});
    writeFileSync(`${qaDir}/sanna-failure.html`, await page.content());
    throw error;
  } finally { await context.close(); }
}
