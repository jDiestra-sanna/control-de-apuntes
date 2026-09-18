const enc = new TextEncoder();
const b64 = bytes => { const data = new Uint8Array(bytes), chunks = []; for (let i = 0; i < data.length; i += 32768) chunks.push(String.fromCharCode(...data.subarray(i, i + 32768))); return btoa(chunks.join('')); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function keyFor(password, salt, iterations) {
  const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptBackup(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(password, salt, 250000);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
  return { v: 1, alg: 'AES-GCM', kdf: 'PBKDF2', iter: 250000, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}
export async function decryptBackup(data, password) {
  if (!data || data.v !== 1 || data.alg !== 'AES-GCM' || data.kdf !== 'PBKDF2' || !Number.isInteger(data.iter) || data.iter < 100000 || data.iter > 1000000) throw new Error('Este archivo no es un respaldo cifrado compatible.');
  try {
    const key = await keyFor(password, unb64(data.salt), data.iter);
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(data.iv) }, key, unb64(data.ct))));
  } catch { throw new Error('No se pudo abrir el respaldo. Comprueba la contraseña y el archivo.'); }
}
export function download(data, name, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
