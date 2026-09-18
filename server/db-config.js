// ODBC values use braces so punctuation in a password cannot add connection options.
export const odbcValue = value => `{${String(value).replaceAll('}', '}}')}}`;

function flag(value, fallback, name) {
  if (value == null || value === '') return fallback;
  if (/^(true|1|yes)$/i.test(value)) return true;
  if (/^(false|0|no)$/i.test(value)) return false;
  throw new Error(`${name} debe ser true o false.`);
}

export function databaseSettings(env = process.env) {
  const server = (env.SQL_SERVER ?? '(localdb)\\ApuntesLocal').trim();
  const database = env.SQL_DATABASE ?? 'ControlDeApuntes';
  if (!server || /[\r\n\0]/.test(server)) throw new Error('SQL_SERVER no es válido.');
  if (!/^ControlDeApuntes(?:_[A-Za-z0-9]+)?$/.test(database)) throw new Error('El nombre de la base debe ser ControlDeApuntes o ControlDeApuntes_<entorno>.');
  const user = env.SQL_USER?.trim() || '';
  const password = env.SQL_PASSWORD ?? '';
  if (Boolean(user) !== Boolean(password)) throw new Error('Configura SQL_USER y SQL_PASSWORD juntos, o deja ambos vacíos para autenticación Windows.');
  const local = server.toLowerCase().startsWith('(localdb)\\');
  return { server, database, user, password, local, authentication: user ? 'sql' : 'windows',
    encrypt: flag(env.SQL_ENCRYPT, !local, 'SQL_ENCRYPT'),
    trustServerCertificate: flag(env.SQL_TRUST_SERVER_CERTIFICATE, true, 'SQL_TRUST_SERVER_CERTIFICATE') };
}

export function poolConfig(settings, database = settings.database) {
  if (database !== 'master' && !/^ControlDeApuntes(?:_[A-Za-z0-9]+)?$/.test(database)) throw new Error('Base de conexión no permitida.');
  const auth = settings.authentication === 'sql'
    ? `Trusted_Connection=No;UID=${odbcValue(settings.user)};PWD=${odbcValue(settings.password)};`
    : 'Trusted_Connection=Yes;';
  return {
    connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${odbcValue(settings.server)};Database=${odbcValue(database)};${auth}Encrypt=${settings.encrypt ? 'Yes' : 'No'};TrustServerCertificate=${settings.trustServerCertificate ? 'Yes' : 'No'};`,
    connectionTimeout: 10000, requestTimeout: 30000, pool: { min: 0, max: 5, idleTimeoutMillis: 30000 }
  };
}
