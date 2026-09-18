export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'ApiError'; this.status = status; }
}
export async function api(path, options = {}) {
  let response;
  try { response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', 'X-Apuntes-Client': 'local', ...options.headers } }); }
  catch { throw new ApiError('Sin conexión con el servidor. Tu borrador sigue abierto; vuelve a intentar guardar.'); }
  let data;
  try { data = await response.json(); }
  catch { throw new ApiError('El servidor no devolvió una respuesta válida. Conserva tu borrador y comprueba la conexión.', response.status); }
  if (!response.ok) throw new ApiError(data.error || 'No se pudo completar la operación.', response.status);
  return data;
}
export const send = (method, body) => ({ method, body: JSON.stringify(body) });
