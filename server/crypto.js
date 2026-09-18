import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function encrypt(value, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), ct: body.toString('base64'), tag: cipher.getAuthTag().toString('base64') });
}
export function decrypt(value, key) {
  const data = JSON.parse(value);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(data.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.ct, 'base64')), decipher.final()]).toString('utf8'));
}
export function loadKey() {
  const key = Buffer.from(readFileSync(resolve('.local/master.key'), 'utf8').trim(), 'base64');
  if (key.length !== 32) throw new Error('La clave local no es válida.');
  return key;
}
export function decryptBackup(data, password) {
  if (data.v !== 1 || data.alg !== 'AES-GCM' || data.kdf !== 'PBKDF2' || !Number.isInteger(data.iter) || data.iter < 100000 || data.iter > 1000000) throw new Error('Formato de respaldo no compatible.');
  const key = pbkdf2Sync(password, Buffer.from(data.salt, 'base64'), data.iter, 32, 'sha256');
  const combined = Buffer.from(data.ct, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(data.iv, 'base64'));
  decipher.setAuthTag(combined.subarray(-16));
  return JSON.parse(Buffer.concat([decipher.update(combined.subarray(0, -16)), decipher.final()]).toString('utf8'));
}
