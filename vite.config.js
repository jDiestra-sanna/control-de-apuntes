import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// El paquete SANNA importa Google Fonts; servimos la misma fuente localmente
// para que el espacio de notas funcione sin peticiones a terceros.
const localFonts = {
  name: 'apuntes-local-sanna-fonts', enforce: 'pre',
  transform(code, id) {
    if (id.includes('@sanna-ui') && id.endsWith('.css')) return code.replace(/@import\s*(?:url\()?(['"])https:\/\/fonts\.googleapis\.com[^'"]*\1\)?\s*;/g, '');
  }
};
export default defineConfig({ plugins: [localFonts, react()], server: { host: '127.0.0.1' }, build: { sourcemap: false } });
