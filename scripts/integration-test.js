import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { regressionTests } from './regression-test.js';
import { sannaTests } from './sanna-test.js';

// Base efímera independiente: nunca ejecutar QA funcional contra notas reales.
// La configuración remota del proyecto no debe enviar la suite al servidor compartido.
process.env.SQL_SERVER = '(localdb)\\ApuntesLocal';
process.env.SQL_USER = '';
process.env.SQL_PASSWORD = '';
process.env.SQL_ENCRYPT = 'false';
process.env.SQL_TRUST_SERVER_CERTIFICATE = 'true';
const dbName = `ControlDeApuntes_QA${randomUUID().replaceAll('-', '').slice(0, 10)}`;
process.env.SQL_DATABASE = dbName;
const { connect, sql, server, database, authentication } = await import('../server/db.js');
assert.equal(server, '(localdb)\\ApuntesLocal', 'La suite solo puede ejecutarse en LocalDB.');
assert.equal(database, dbName, 'La suite requiere su base temporal exclusiva.');
assert.equal(authentication, 'windows', 'La suite no utiliza credenciales del servidor compartido.');
const { loadKey } = await import('../server/crypto.js');
const { repository } = await import('../server/repository.js');
const master = await connect('master');
let pool, child, browser, created = false;
const results = [], errors = [], requests = [];
const ok = name => { results.push(name); console.log(`PASS ${name}`); };
const qaDir = '.local/qa'; mkdirSync(qaDir, { recursive: true });
try {
  const exists = await master.request().input('name', sql.NVarChar(128), dbName).query('SELECT DB_ID(@name) AS id');
  assert.equal(exists.recordset[0].id, null);
  await master.request().query(`CREATE DATABASE [${dbName}]`); created = true;
  pool = await connect();
  await pool.request().batch(readFileSync('database/schema.sql', 'utf8'));
  const repo = repository(pool, loadKey());
  const input = {
    categories: [{ name: 'Ideas', color: '#7aa17b' }, { name: 'Desarrollo', color: '#8e9ebc' }, { name: 'Personal', color: '#c6a767' }, { name: 'Acceso', color: '#a78fbd' }],
    notes: [
      { id: 'fixture-1', title: 'Ideas que merecen un siguiente paso', category: 'Ideas', content: 'Un espacio para conectar ideas, resolver preguntas y construir algo que valga la pena.\n\n- Dibujar el primer boceto\n- Compartir los avances', tags: ['ideas', 'inspiración'], pinned: true, status: 'inbox' },
      { id: 'fixture-2', title: 'Preparar el próximo proyecto', category: 'Desarrollo', content: '## El punto de partida\n\nDefinir el problema, escuchar a las personas y convertir lo aprendido en un primer prototipo.', tags: ['proyecto'], pinned: true, status: 'todo', priority: 'high' },
      { id: 'fixture-3', title: 'Mi pequeña biblioteca de consultas', category: 'Desarrollo', content: '```sql\nSELECT nombre, estado\nFROM proyectos\nWHERE activo = 1;\n```\n\nUna consulta de ejemplo para tener siempre a mano.', tags: ['sql', 'referencia'], status: 'inbox' },
      { id: 'fixture-4', title: 'Una semana con más enfoque', category: 'Personal', content: 'Dejar espacio para lo importante. Menos pendientes abiertos y un poco más de claridad al comenzar cada día.', tags: ['personal'], status: 'doing' },
      { id: 'fixture-5', title: 'Notas de la reunión de equipo', category: 'Desarrollo', content: '## Acuerdos\n\nRevisar el flujo de trabajo y preparar una primera entrega. Compartir lo aprendido durante la semana.', tags: ['reunión'], status: 'todo', priority: 'medium' },
      { id: 'fixture-6', title: 'Acceso de demostración', category: 'Acceso', content: 'VALOR_SINTETICO_PRIVADO', tags: ['referencia'], status: 'inbox' },
      { id: 'fixture-7', title: 'Pequeñas cosas que ya funcionan', category: 'Ideas', content: 'El tablero está listo. La búsqueda encuentra ideas por título, contenido y etiquetas. Cada pequeño avance cuenta.', tags: ['ideas'], status: 'done' },
      { id: 'fixture-8', title: 'Lista para una tarde tranquila', category: 'Personal', content: 'Leer unas páginas, caminar sin prisa y anotar una idea antes de olvidarla.', tags: ['personal'], status: 'todo' },
      { id: 'fixture-9', title: 'Recuerdos del proyecto anterior', category: 'Ideas', content: 'Nota archivada de prueba.', tags: [], archived: true, status: 'done' }
    ].map(n => ({ createdAt: '2026-09-01T15:00:00.000Z', updatedAt: '2026-09-17T15:00:00.000Z', ...n }))
  };
  const imported = await repo.importData(input); assert.equal(imported.added, 9);
  const duplicate = await repo.importData(input); assert.equal(duplicate.added, 0); assert.equal(duplicate.skipped, 9);
  assert.equal((await repo.notes()).length, 9); ok('Importación transaccional e idempotente');
  const before = (await repo.categories()).length;
  await assert.rejects(repo.importData({ categories: ['No persistir'], notes: [{ title: 'Inválida', category: 'No persistir', status: 'unknown' }] }));
  assert.equal((await repo.categories()).length, before); ok('Importación inválida no deja categorías ni notas parciales');
  const raw = await pool.request().query('SELECT Payload FROM dbo.Notes WHERE Id=N\'fixture-6\''); assert.ok(!raw.recordset[0].Payload.includes('VALOR_SINTETICO_PRIVADO')); ok('Contenido cifrado en SQL Server');
  const n = (await repo.notes())[0];
  const concurrent = await Promise.allSettled([repo.updateNote(n.id, { ...n, title: 'Cambio concurrente A' }), repo.updateNote(n.id, { ...n, title: 'Cambio concurrente B' })]);
  assert.equal(concurrent.filter(r => r.status === 'fulfilled').length, 1); assert.equal(concurrent.filter(r => r.status === 'rejected').length, 1); ok('Ediciones simultáneas conservan una versión y rechazan el conflicto');
  const changed = (await repo.notes()).find(x => x.id === n.id); await repo.updateNote(n.id, { ...changed, title: n.title });
  const host = createServer(); host.listen(0, '127.0.0.1'); await once(host, 'listening'); const port = host.address().port; await new Promise(r => host.close(r));
  const base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['server/index.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port) }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', c => { output += c; }); child.stderr.on('data', c => { output += c; });
  await expect.poll(() => output.includes('Apuntes disponible'), { timeout: 15000 }).toBe(true);
  const headers = { 'X-Apuntes-Client': 'local', 'Content-Type': 'application/json' };
  const request = async (path, method = 'GET', body) => { const r = await fetch(`${base}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); const data = await r.json(); return { status: r.status, data }; };
  assert.equal((await fetch(`${base}/api/workspace`)).status, 403);
  assert.equal((await fetch(`${base}/api/workspace`, { headers: { ...headers, Origin: 'https://untrusted.invalid' } })).status, 403);
  assert.equal((await request('/health')).data.database, dbName); ok('API real, SQL Server y bloqueo de solicitudes externas');
  const bad = await request('/notes', 'POST', { title: '', categoryId: 'missing' }); assert.equal(bad.status, 400); ok('Validación HTTP de entradas');
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (!r.url().startsWith(base)) requests.push(r.url()); });
  await page.goto(base); await expect(page.getByRole('heading', { name: 'Un lugar para tus ideas.' })).toBeVisible();
  await expect(page.locator('.note-card')).toHaveCount(8);
  await expect(page.getByText('VALOR_SINTETICO_PRIVADO', { exact: true })).toHaveCount(0);
  assert.ok(await page.locator('.sidebar-new').getAttribute('class').then(c => c.includes('sa-') || c.includes('button')));
  await expect.poll(() => page.locator('.sidebar-new').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 175, 80, 0.12)');
  assert.match(await page.locator('.sidebar-new').evaluate(el => getComputedStyle(el).fontFamily), /Jakarta/); ok('SANNA SaButton con estilos, tipografía local y vista previa privada');
  await page.screenshot({ path: `${qaDir}/desktop.png`, fullPage: true });
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  writeFileSync(`${qaDir}/accessibility.json`, JSON.stringify(audit.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), null, 2));
  assert.deepEqual(audit.violations.map(v => v.id), []); ok('Accesibilidad automática WCAG A/AA en biblioteca');
  await page.getByRole('button', { name: 'Nueva nota', exact: true }).first().click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Título de la nota' }).fill('Nota de verificación');
  await dialog.getByRole('textbox', { name: 'Contenido de la nota' }).fill('## Prueba funcional\n\nContenido guardado y verificable.');
  await dialog.getByLabel('Estado del kanban').selectOption('todo');
  await dialog.getByLabel('Prioridad', { exact: true }).selectOption('high');
  await dialog.getByLabel('Etiquetas', { exact: true }).fill('qa, integración');
  await dialog.getByLabel('Nueva tarea', { exact: true }).fill('Comprobar persistencia'); await dialog.getByLabel('Nueva tarea', { exact: true }).press('Enter');
  await dialog.getByRole('checkbox', { name: 'Comprobar persistencia' }).check();
  await dialog.getByRole('button', { name: 'Guardar nota', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await page.reload(); await expect(page.getByRole('heading', { name: 'Nota de verificación' })).toBeVisible();
  let saved = (await request('/workspace')).data.notes.find(n => n.title === 'Nota de verificación');
  assert.equal(saved.checklist[0].done, true); assert.equal(saved.priority, 'high'); assert.deepEqual(saved.tags, ['qa', 'integración']); ok('Crear nota, etiquetas, checklist y persistencia tras recarga');
  await page.getByRole('button', { name: /Tablero kanban/ }).click(); await page.getByRole('textbox', { name: 'Buscar notas' }).fill('Nota de verificación');
  await page.locator('.note-card').dragTo(page.getByRole('region', { name: 'En progreso', exact: true }));
  await expect.poll(async () => (await request('/workspace')).data.notes.find(n => n.id === saved.id).status).toBe('doing');
  await page.getByLabel('Estado de Nota de verificación').selectOption('done');
  await expect.poll(async () => (await request('/workspace')).data.notes.find(n => n.id === saved.id).status).toBe('done'); ok('Kanban: arrastrar y mover con selector accesible');
  await page.getByRole('heading', { name: 'Nota de verificación', exact: true }).click(); dialog = page.getByRole('dialog');
  await dialog.getByRole('tab', { name: 'Escribir', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Contenido de la nota' }).fill('Contenido segunda versión');
  await dialog.getByRole('button', { name: 'Guardar nota', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('heading', { name: 'Nota de verificación', exact: true }).click(); dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Ver historial', exact: true }).click();
  await dialog.getByRole('button', { name: 'Versión 1', exact: true }).click();
  await dialog.getByRole('button', { name: 'Recuperar como borrador' }).click();
  await expect(dialog.getByRole('textbox', { name: 'Contenido de la nota' })).toHaveValue(/Prueba funcional/);
  await dialog.getByRole('button', { name: 'Guardar nota', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); ok('Historial y recuperación de una versión anterior sin borrar historial');
  await page.getByRole('heading', { name: 'Nota de verificación', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mover a papelera' }).click();
  await expect(page.getByRole('heading', { name: 'Nota de verificación', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^Papelera/ }).click();
  await page.getByRole('button', { name: 'Restaurar nota', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nota de verificación', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^Todas las notas/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Nota de verificación', exact: true })).toBeVisible(); ok('Papelera reversible y restauración desde UI');
  await page.getByRole('textbox', { name: 'Buscar notas' }).fill('#integracion'); await expect(page.locator('.note-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Vista de lista', exact: true }).click(); await expect(page.locator('.as-row')).toHaveCount(1);
  await page.getByRole('button', { name: /Fijar Nota de verificación/ }).click(); await expect(page.locator('.as-row')).toHaveCount(1); ok('Búsqueda sin tildes, etiquetas y filtros persistentes al fijar');
  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click(); await page.getByRole('button', { name: 'Vista de tarjetas' }).click();
  await page.getByRole('button', { name: 'Gestionar categorías' }).click(); dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre de categoría').fill('QA categoría'); await dialog.getByRole('button', { name: 'Crear', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Editar categoría QA categoría', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Editar categoría QA categoría' }).click();
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Editar categoría QA categoría', exact: true })).toBeVisible(); ok('Crear categoría y guardar el mismo nombre sin eliminarla');
  await dialog.getByRole('button', { name: 'Cerrar ventana' }).click();
  const removable = (await request('/workspace')).data.categories.find(c => c.name === 'QA categoría');
  const targetCat = (await request('/workspace')).data.categories.find(c => c.name === 'Ideas');
  const catNote = await request('/notes', 'POST', { title: 'Reasignación segura', categoryId: removable.id, archived: true }); assert.equal(catNote.status, 201);
  await request(`/notes/${catNote.data.id}/trash`, 'POST', { revision: catNote.data.revision });
  assert.equal((await request(`/categories/${removable.id}`, 'DELETE', { targetId: targetCat.id })).status, 200);
  const moved = (await request('/workspace')).data.notes.find(n => n.id === catNote.data.id); assert.equal(moved.categoryId, targetCat.id); assert.ok(moved.deletedAt); assert.ok(moved.archived); ok('Eliminar categoría reasigna también notas archivadas y en papelera');
  await page.reload(); await expect(page.locator('.note-card').first()).toBeVisible();
  await page.getByRole('button', { name: 'Importar / exportar', exact: true }).first().click(); dialog = page.getByRole('dialog');
  await dialog.getByLabel('Contraseña del nuevo respaldo').fill('synthetic-export-password');
  await dialog.getByLabel('Confirmar contraseña').fill('synthetic-export-password');
  const downloadPromise = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'Descargar respaldo cifrado' }).click();
  const download = await downloadPromise; const exportPath = `${qaDir}/test-export.enc.json`; await download.saveAs(exportPath);
  const { decryptBackup } = await import('../server/crypto.js');
  const exported = decryptBackup(JSON.parse(readFileSync(exportPath, 'utf8')), 'synthetic-export-password');
  assert.equal(exported.notes.length, (await repo.notes()).length); assert.equal(exported.categories.length, (await repo.categories()).length); ok('Descarga cifrada completa y descifrado compatible');
  await page.getByRole('button', { name: 'Importar / exportar', exact: true }).first().click(); dialog = page.getByRole('dialog');
  await dialog.getByRole('tab', { name: 'Importar notas', exact: true }).click();
  await dialog.getByLabel('Archivo de respaldo').setInputFiles(exportPath); await dialog.getByLabel('Contraseña del respaldo', { exact: true }).fill('synthetic-export-password');
  await dialog.getByRole('button', { name: 'Abrir y revisar respaldo' }).click(); await expect(dialog.getByRole('heading', { name: 'Respaldo listo para importar' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Importar y conservar mis notas' }).click(); await expect(dialog.getByRole('status')).toContainText('0 nuevas');
  await dialog.getByRole('button', { name: 'Cerrar ventana' }).click(); ok('Importación desde UI con vista previa, sin duplicar datos');
  await page.getByRole('button', { name: /Tablero kanban/ }).click(); await page.screenshot({ path: `${qaDir}/kanban.png`, fullPage: true });
  await page.getByRole('button', { name: /^Todas las notas/ }).first().click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: `${qaDir}/mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Abrir menú' }).click(); await expect(page.getByRole('button', { name: /Tablero kanban/ })).toBeVisible();
  await page.getByRole('button', { name: /Tablero kanban/ }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)); ok('Vista móvil 390 px y kanban sin desbordamiento global');
  assert.deepEqual(errors, []); assert.deepEqual(requests, []); ok('Sin errores de consola ni solicitudes a terceros');
  await regressionTests({ browser, base, request, ok, qaDir });
  await sannaTests({ browser, base, request, ok, qaDir });
  writeFileSync(`${qaDir}/results.json`, JSON.stringify({ timestamp: new Date().toISOString(), database: dbName, checks: results, errors, externalRequests: requests }, null, 2));
  console.log(`${results.length} verificaciones funcionales completadas.`);
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) await page.screenshot({ path: `${qaDir}/failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  if (child && child.exitCode === null) { child.kill(); await once(child, 'exit').catch(() => {}); }
  if (pool) await pool.close();
  // Solo la base aleatoria creada por esta ejecución; nunca la base del usuario.
  if (created && /^ControlDeApuntes_QA[0-9a-f]{10}$/.test(dbName)) await master.request().query(`ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${dbName}];`);
  await master.close();
}
