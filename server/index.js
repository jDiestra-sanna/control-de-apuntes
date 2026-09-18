import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { connect, database, server, authentication } from './db.js';
import { loadKey } from './crypto.js';
import { repository, AppError } from './repository.js';
import { ImportError } from './model.js';

const dev = process.argv.includes('--dev');
const port = Number(process.env.PORT || 3188);
const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
const pool = await connect();
const repo = repository(pool, loadKey());
const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: dev ? false : { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:', 'blob:'], connectSrc: ["'self'"], upgradeInsecureRequests: null } }, crossOriginEmbedderPolicy: false, strictTransportSecurity: false }));
app.use((req, res, next) => {
  if (!allowedHosts.has(req.headers.host)) return res.status(403).json({ error: 'Host no autorizado.' });
  if (req.headers.origin && ![...allowedHosts].some(host => req.headers.origin === `http://${host}`)) return res.status(403).json({ error: 'Origen no autorizado.' });
  if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({ error: 'Solicitud externa bloqueada.' });
  if (req.path.startsWith('/api')) {
    res.set('Cache-Control', 'no-store');
    if (req.headers['x-apuntes-client'] !== 'local') return res.status(403).json({ error: 'Cliente no autorizado.' });
  }
  next();
});
app.use(express.json({ limit: '15mb' }));
app.get('/api/health', async (req, res) => { await pool.request().query('SELECT 1 AS ready'); res.json({ ok: true, database, server, authentication, engine: 'SQL Server', localOnly: true }); });
app.get('/api/workspace', async (req, res) => { const [categories, notes] = await Promise.all([repo.categories(), repo.notes()]); res.json({ categories, notes }); });
app.post('/api/notes', async (req, res) => res.status(201).json(await repo.createNote(req.body)));
app.get('/api/notes/:id', async (req, res) => res.json(await repo.getNote(req.params.id)));
app.put('/api/notes/:id', async (req, res) => res.json(await repo.updateNote(req.params.id, req.body)));
app.post('/api/notes/:id/trash', async (req, res) => res.json(await repo.updateNote(req.params.id, req.body, 'trash')));
app.post('/api/notes/:id/restore', async (req, res) => res.json(await repo.updateNote(req.params.id, req.body, 'restore')));
app.get('/api/notes/:id/history', async (req, res) => res.json(await repo.history(req.params.id)));
app.post('/api/categories', async (req, res) => res.status(201).json(await repo.saveCategory(req.body)));
app.put('/api/categories/reorder', async (req, res) => res.json(await repo.reorderCategories(req.body?.ids)));
app.put('/api/categories/:id', async (req, res) => res.json(await repo.saveCategory(req.body, req.params.id)));
app.delete('/api/categories/:id', async (req, res) => res.json(await repo.deleteCategory(req.params.id, req.body?.targetId)));
app.post('/api/import', async (req, res) => res.json(await repo.importData(req.body)));
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
if (dev) {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  if (!existsSync('dist/index.html')) throw new Error('Ejecuta npm run build antes de npm start.');
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (req, res) => res.sendFile(resolve('dist/index.html')));
}
app.use((error, req, res, next) => {
  if (error.name === 'ZodError') return res.status(400).json({ error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(' · ') });
  if (error instanceof AppError) return res.status(error.status).json({ error: error.message });
  if (error instanceof ImportError) return res.status(400).json({ error: error.message });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'El archivo supera el límite de 15 MB.' });
  if (error instanceof SyntaxError) return res.status(400).json({ error: 'El formato JSON no es válido.' });
  // No registrar contenido de notas, parámetros SQL ni contraseñas.
  console.error('Error de operación', error.code || error.name);
  res.status(500).json({ error: 'No se pudo completar la operación. Tus cambios siguen en el editor. Comprueba la conexión con SQL Server.' });
});
const http = app.listen(port, '127.0.0.1', () => console.log(`Apuntes disponible en http://127.0.0.1:${port} · ${database}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => http.close(async () => { await pool.close(); process.exit(0); }));
