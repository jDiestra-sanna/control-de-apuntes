import pg from 'pg';
import sql from 'mssql/msnodesqlv8.js';

const odbcVal = (v) => `{${String(v ?? '').replaceAll('}', '}}')}}`;

// Credenciales y configuraciones operativas extraídas de Solución Médica e Integración SM
const DB_CONFIGS = {
  postgresql: {
    prod: {
      host: process.env.PG_HOST_PROD || '10.6.16.14',
      port: Number(process.env.PG_PORT_PROD || 5432),
      database: process.env.PG_DB_PROD || 'hipocrates',
      user: process.env.PG_USER_PROD || 'Pg_usraplicacion',
      password: process.env.PG_PASSWORD_PROD || '2t543LSikm9075k',
      connectionTimeoutMillis: 10000
    },
    test: {
      host: process.env.PG_HOST_TEST || '10.6.16.18',
      port: Number(process.env.PG_PORT_TEST || 5432),
      database: process.env.PG_DB_TEST || 'hipocrates',
      user: process.env.PG_USER_TEST || 'Pg_usraplicacion',
      password: process.env.PG_PASSWORD_TEST || '2t543LSikm9075k',
      connectionTimeoutMillis: 10000
    }
  },
  sqlserver: {
    server: process.env.SQL_SERVER_HOST || '10.6.16.10',
    port: Number(process.env.SQL_SERVER_PORT || 1433),
    databases: {
      BD_Sanna_ambulatoria: {
        user: process.env.SQL_USER_TABLET_PROD || 'Sql_UsrSannaAmb',
        password: process.env.SQL_PASSWORD_TABLET_PROD || 'e1C@46t$%LaY3LPh?q=8'
      },
      BD_Sanna_Developer: {
        user: process.env.SQL_USER_TABLET_TEST || 'Sql_UsrTest_SannaAmb',
        password: process.env.SQL_PASSWORD_TABLET_TEST || '(4]!?NsI2e8h=1/f!zR3'
      },
      BD_MediSanna: {
        user: process.env.SQL_USER_MDS || 'MediSannaUser',
        password: process.env.SQL_PASSWORD_MDS || 'e1C@46t$%LaY3LPh?q=8'
      },
      HHMMDRMProd: {
        user: process.env.SQL_USER_HHMM_PROD || 'UsrHHMMDRMProd',
        password: process.env.SQL_PASSWORD_HHMM_PROD || 'HHMMDRMProd'
      },
      HHMMDRMTest: {
        user: process.env.SQL_USER_HHMM_TEST || 'UsrHHMMDRMTest',
        password: process.env.SQL_PASSWORD_HHMM_TEST || 'HHMMDRMTest'
      }
    }
  }
};

// Validaciones de seguridad para comandos no permitidos
const BLOCKED_COMMANDS = [
  /\bxp_cmdshell\b/i,
  /\bsp_configure\b/i,
  /\bdrop\s+database\b/i,
  /\bshutdown\b/i,
  /\balter\s+database\b/i
];

/**
 * Ejecuta una consulta sobre PostgreSQL (Solución Médica / hipocrates)
 */
async function executePostgreSql({ query, env = 'prod', database = 'hipocrates' }) {
  const targetEnv = env === 'test' ? 'test' : 'prod';
  const cfg = {
    ...DB_CONFIGS.postgresql[targetEnv],
    database: database || 'hipocrates'
  };

  const client = new pg.Client(cfg);
  const start = Date.now();

  try {
    await client.connect();
    // Configurar encoding compatible con el aplicativo legado
    await client.query("SET client_encoding = 'SQL_ASCII';").catch(() => {});
    
    const result = await client.query(query);
    const durationMs = Date.now() - start;

    let rows = [];
    let fields = [];
    let rowCount = 0;
    let command = result.command || 'SELECT';

    if (Array.isArray(result)) {
      // Si se enviaron múltiples queries separadas por punto y coma
      const last = result[result.length - 1];
      rows = last.rows || [];
      fields = (last.fields || []).map(f => f.name);
      rowCount = last.rowCount || rows.length;
      command = last.command || 'MULTI';
    } else {
      rows = result.rows || [];
      fields = (result.fields || []).map(f => f.name);
      rowCount = result.rowCount !== null && result.rowCount !== undefined ? result.rowCount : rows.length;
    }

    return {
      ok: true,
      engine: 'PostgreSQL',
      server: `${cfg.host}:${cfg.port}`,
      database: cfg.database,
      env: targetEnv.toUpperCase(),
      command,
      rowCount,
      fields,
      rows: rows.slice(0, 100), // Límite de seguridad para vista previa web
      totalRows: rows.length,
      durationMs
    };
  } finally {
    try { await client.end(); } catch {}
  }
}

/**
 * Ejecuta una consulta sobre SQL Server (Tablet, MDS, HHMM)
 */
async function executeSqlServer({ query, database = 'BD_Sanna_ambulatoria', env = 'prod' }) {
  let dbName = database;
  if (database === 'BD_Sanna_ambulatoria' && env === 'test') {
    dbName = 'BD_Sanna_Developer';
  } else if (database === 'HHMMDRMProd' && env === 'test') {
    dbName = 'HHMMDRMTest';
  }

  const dbCredentials = DB_CONFIGS.sqlserver.databases[dbName] || DB_CONFIGS.sqlserver.databases['BD_Sanna_ambulatoria'];

  const sqlConfig = {
    connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${odbcVal(DB_CONFIGS.sqlserver.server)};Database=${odbcVal(dbName)};Trusted_Connection=No;UID=${odbcVal(dbCredentials.user)};PWD=${odbcVal(dbCredentials.password)};Encrypt=Yes;TrustServerCertificate=Yes;`,
    connectionTimeout: 10000,
    requestTimeout: 30000,
    pool: { min: 0, max: 2, idleTimeoutMillis: 10000 }
  };

  const start = Date.now();
  const pool = new sql.ConnectionPool(sqlConfig);
  await pool.connect();

  try {
    const result = await pool.request().query(query);
    const durationMs = Date.now() - start;

    const rows = result.recordset || [];
    const fields = rows.length > 0 ? Object.keys(rows[0]) : [];
    const rowsAffected = result.rowsAffected ? result.rowsAffected.reduce((a, b) => a + b, 0) : 0;
    const rowCount = rows.length > 0 ? rows.length : rowsAffected;

    return {
      ok: true,
      engine: 'SQL Server',
      server: `${DB_CONFIGS.sqlserver.server}:${DB_CONFIGS.sqlserver.port}`,
      database: dbName,
      env: env.toUpperCase(),
      command: 'QUERY',
      rowCount,
      fields,
      rows: rows.slice(0, 100),
      totalRows: rows.length,
      durationMs
    };
  } finally {
    try { await pool.close(); } catch {}
  }
}

/**
 * Controlador principal de ejecución de soluciones
 */
export async function executeSolution({ query, engine, database, env = 'prod' }) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('La consulta SQL no puede estar vacía.');
  }

  for (const blocked of BLOCKED_COMMANDS) {
    if (blocked.test(query)) {
      throw new Error('Comando bloqueado por políticas de seguridad del sistema.');
    }
  }

  const cleanEngine = (engine || '').toLowerCase();
  const cleanDb = (database || '').toLowerCase();

  if (cleanEngine.includes('postgres') || cleanDb.includes('hipocrates')) {
    return await executePostgreSql({ query, env, database: 'hipocrates' });
  }

  if (cleanEngine.includes('sql server') || cleanDb.includes('sanna') || cleanDb.includes('hhmm') || cleanDb.includes('medisanna')) {
    return await executeSqlServer({ query, database, env });
  }

  throw new Error(`El motor de base de datos '${engine}' o base '${database}' no admite ejecución remota directa.`);
}

/**
 * Prueba de conectividad rápida para verificar acceso
 */
export async function testConnection({ engine, database, env = 'prod' }) {
  const cleanEngine = (engine || '').toLowerCase();
  const cleanDb = (database || '').toLowerCase();

  if (cleanEngine.includes('postgres') || cleanDb.includes('hipocrates')) {
    return await executePostgreSql({
      query: 'SELECT current_database() AS db, version() AS version, current_user AS usuario;',
      env,
      database: 'hipocrates'
    });
  }

  if (cleanEngine.includes('sql server') || cleanDb.includes('sanna') || cleanDb.includes('hhmm') || cleanDb.includes('medisanna')) {
    return await executeSqlServer({
      query: 'SELECT DB_NAME() AS db, SUSER_SNAME() AS usuario, @@VERSION AS version;',
      database,
      env
    });
  }

  throw new Error(`Motor '${engine}' no soportado para test de conectividad.`);
}
