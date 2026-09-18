import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseSettings, poolConfig } from '../server/db-config.js';

test('LocalDB mantiene autenticación integrada sin credenciales SQL', () => {
  const config = poolConfig(databaseSettings({}));
  assert.match(config.connectionString, /Trusted_Connection=Yes;/);
  assert.match(config.connectionString, /Encrypt=No;/);
  assert.doesNotMatch(config.connectionString, /(?:UID|PWD)=/);
});
test('SQL remoto requiere cifrado y autentica con usuario y contraseña', () => {
  const settings = databaseSettings({ SQL_SERVER:'sql.example', SQL_USER:'test', SQL_PASSWORD:'synthetic-only' });
  const config = poolConfig(settings);
  assert.equal(settings.authentication, 'sql');
  assert.match(config.connectionString, /Trusted_Connection=No;UID=\{test\};PWD=\{synthetic-only\};Encrypt=Yes;/);
});
test('ODBC conserva caracteres especiales de contraseña sin inyectar opciones', () => {
  const config = poolConfig(databaseSettings({ SQL_USER:'test', SQL_PASSWORD:' x};Encrypt=No;{ñ ' }));
  assert.ok(config.connectionString.includes('PWD={ x}};Encrypt=No;{ñ };'));
  assert.match(config.connectionString, /;Encrypt=No;TrustServerCertificate=Yes;$/);
});
test('Credenciales incompletas fallan sin incluir secretos en el error', () => {
  assert.throws(() => databaseSettings({ SQL_USER:'test' }), /Configura SQL_USER y SQL_PASSWORD/);
  assert.throws(() => databaseSettings({ SQL_PASSWORD:'synthetic-only' }), /Configura SQL_USER y SQL_PASSWORD/);
});
test('Validación impide nombres de base arbitrarios y errores de flags', () => {
  assert.throws(() => databaseSettings({ SQL_DATABASE:'master' }));
  assert.throws(() => poolConfig(databaseSettings({}), 'OtroSistema'));
  assert.throws(() => databaseSettings({ SQL_ENCRYPT:'quizás' }));
  const settings = databaseSettings({ SQL_SERVER:'sql.example', SQL_TRUST_SERVER_CERTIFICATE:'false' });
  assert.match(poolConfig(settings,'master').connectionString, /Database=\{master\}/);
  assert.match(poolConfig(settings).connectionString, /TrustServerCertificate=No;/);
});
