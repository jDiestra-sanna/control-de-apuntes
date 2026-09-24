import { executeSolution } from './solutions-executor.js';

/**
 * Sanitiza y extrae una lista limpia de IDs enteros positivos a partir de
 * texto separado por comas, saltos de línea o espacios.
 * Evita cualquier posibilidad de inyección SQL en cláusulas IN (...).
 */
export function parseIntegerList(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return [...new Set(input.map(n => Number(n)).filter(n => Number.isInteger(n) && n > 0))];
  }
  const matches = String(input).match(/\d+/g) || [];
  const numbers = matches.map(n => Number(n)).filter(n => Number.isInteger(n) && n > 0);
  return [...new Set(numbers)];
}

/**
 * ============================================================================
 * 1. MÓDULO USUARIO SM (CREAR USUARIOS, DIRECTORIO Y GESTIÓN DE PERMISOS)
 * ============================================================================
 */

/**
 * Obtiene el siguiente código autogenerado correlativo de usuario (ej: U11351)
 */
export async function getNextUserCode(env = 'prod') {
  const query = `
    SELECT COALESCE(MAX(CAST(SUBSTRING(cod_usu FROM '[0-9]+') AS INTEGER)), 0) AS max_id 
    FROM m_usuarios 
    WHERE cod_usu ~ 'U[0-9]+';
  `;
  const res = await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  const maxId = Number(res.rows[0]?.max_id || 0);
  return { nextCode: `U${maxId + 1}` };
}

/**
 * Verifica en tiempo real si un nombre de usuario (login) ya está registrado
 */
export async function checkUsernameAvailability(username, env = 'prod') {
  const clean = String(username || '').trim().toUpperCase();
  if (!clean) return { available: false, count: 0, username: '' };
  
  // Escapar comillas simples
  const safe = clean.replace(/'/g, "''");
  const query = `SELECT COUNT(nom_usu) AS count FROM m_usuarios WHERE UPPER(TRIM(nom_usu)) = '${safe}';`;
  const res = await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  const count = Number(res.rows[0]?.count || 0);
  return { available: count === 0, count, username: clean };
}

/**
 * Obtiene la lista de perfiles SM para asignación inicial (desde SQL Server BD_TI2 o catálogo estándar)
 */
export async function getProfiles(env = 'prod') {
  try {
    const res = await executeSolution({
      query: `SELECT id_perfil, RTRIM(nom_per) AS nom_per FROM m_perfil_sm ORDER BY nom_per ASC;`,
      engine: 'SQL Server',
      database: 'BD_TI2',
      env
    });
    if (res.rows && res.rows.length > 0) {
      return res.rows;
    }
  } catch (err) {
    console.warn('Advertencia: no se pudo cargar m_perfil_sm de SQL Server BD_TI2, usando catálogo fallback:', err.message);
  }

  // Fallback con los 8 perfiles estándar verificados en producción
  return [
    { id_perfil: 1, nom_per: '*ADM' },
    { id_perfil: 7, nom_per: '*OPE' },
    { id_perfil: 2, nom_per: 'ALMC' },
    { id_perfil: 3, nom_per: 'AMB' },
    { id_perfil: 4, nom_per: 'CLLM' },
    { id_perfil: 5, nom_per: 'DRON' },
    { id_perfil: 6, nom_per: 'FACT' },
    { id_perfil: 8, nom_per: 'PACF' }
  ];
}

/**
 * Crea un nuevo usuario en Solución Médica (m_usuarios)
 */
export async function createUser({ cod_usu, nom_usu, nom_per, des_usu, pas_usu, doc_identidad, env = 'prod' }) {
  const cleanCode = String(cod_usu || '').trim().toUpperCase();
  const cleanUser = String(nom_usu || '').trim().toUpperCase();
  const cleanName = String(nom_per || des_usu || '').trim().toUpperCase();
  const cleanPass = String(pas_usu || 'Abc123xyz').trim();
  const cleanDni = String(doc_identidad || '').trim();

  if (!cleanCode) throw new Error('El código de usuario es obligatorio (ej. U11351).');
  if (!cleanUser) throw new Error('El login de usuario es obligatorio.');
  if (!cleanName) throw new Error('El nombre del trabajador es obligatorio.');

  // Validar si ya existe
  const check = await checkUsernameAvailability(cleanUser, env);
  if (!check.available) {
    throw new Error(`El login de usuario '${cleanUser}' ya existe en el sistema.`);
  }

  // Inserción idéntica a Cnx.Crear_usuario()
  const safeCode = cleanCode.replace(/'/g, "''");
  const safeUser = cleanUser.replace(/'/g, "''");
  const safeName = cleanName.replace(/'/g, "''");
  const safePass = cleanPass.replace(/'/g, "''");
  const safeDni = cleanDni.replace(/'/g, "''");

  const query = `
    INSERT INTO m_usuarios (
      cod_usu, nom_usu, nom_per, pas_usu, des_usu, cod_permiso, cod_tip_usuario,
      activo, cont_ingreso, ult_ingreso, cod_puestos, cod_area, fecha_caducidad,
      id_area_recl, doc_identidad
    ) VALUES (
      '${safeCode}', '${safeUser}', '${safeName}', '${safePass}', '${safeName}', 'b', 1010,
      true, 10, null, 23, 14, CURRENT_DATE + INTERVAL '2 months',
      null, '${safeDni}'
    );
  `;

  await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { ok: true, cod_usu: cleanCode, nom_usu: cleanUser, message: 'Usuario creado con éxito en Solución Médica.' };
}

/**
 * Consulta y lista usuarios con filtros de búsqueda y estado
 */
export async function listUsers({ search = '', filterStatus = 'all', env = 'prod', limit = 100 }) {
  let whereClauses = [];
  const cleanSearch = String(search || '').trim().toUpperCase().replace(/'/g, "''");

  if (cleanSearch) {
    whereClauses.push(`(
      UPPER(nom_usu) LIKE '%${cleanSearch}%' OR 
      UPPER(des_usu) LIKE '%${cleanSearch}%' OR 
      UPPER(cod_usu) LIKE '%${cleanSearch}%' OR
      COALESCE(doc_identidad, '') LIKE '%${cleanSearch}%'
    )`);
  }

  if (filterStatus === 'active') {
    whereClauses.push('activo = true');
  } else if (filterStatus === 'inactive') {
    whereClauses.push('activo = false');
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 300);

  const query = `
    SELECT 
      TRIM(cod_usu) AS codigo,
      TRIM(nom_usu) AS usuario,
      TRIM(des_usu) AS nombres,
      TRIM(COALESCE(doc_identidad, '')) AS dni,
      activo,
      ult_ingreso,
      TRIM(COALESCE(pas_usu, '')) AS clave
    FROM m_usuarios
    ${whereSql}
    ORDER BY activo DESC, des_usu ASC
    LIMIT ${safeLimit};
  `;

  const res = await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { users: res.rows || [], total: res.rowCount };
}

/**
 * Activa o desactiva un usuario (activo = true/false)
 */
export async function toggleUserStatus({ cod_usu, activo, env = 'prod' }) {
  const cleanCode = String(cod_usu || '').trim().replace(/'/g, "''");
  if (!cleanCode) throw new Error('Código de usuario no especificado.');

  const boolVal = Boolean(activo);
  const query = `UPDATE m_usuarios SET activo = ${boolVal} WHERE TRIM(cod_usu) = '${cleanCode}';`;
  await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { ok: true, cod_usu: cleanCode, activo: boolVal };
}

/**
 * Restablece la contraseña de un usuario y fuerza cambio en próximo ingreso (ult_ingreso = NULL)
 */
export async function resetUserPassword({ nom_usu, newPassword = 'Abc123xyz', env = 'prod' }) {
  const cleanUser = String(nom_usu || '').trim().replace(/'/g, "''");
  const cleanPass = String(newPassword || 'Abc123xyz').trim().replace(/'/g, "''");

  if (!cleanUser) throw new Error('Usuario no especificado.');

  const query = `UPDATE m_usuarios SET ult_ingreso = NULL, pas_usu = '${cleanPass}' WHERE TRIM(nom_usu) = '${cleanUser}';`;
  await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { ok: true, nom_usu: cleanUser, message: `Contraseña restablecida a '${cleanPass}'.` };
}

/**
 * Obtiene los permisos asignados actualmente a un usuario
 */
export async function getUserPermissions({ nom_usu, env = 'prod' }) {
  const cleanUser = String(nom_usu || '').trim().replace(/'/g, "''");
  if (!cleanUser) throw new Error('Usuario no especificado.');

  const query = `
    SELECT mpu.cod_permiso, mp.des_permiso 
    FROM m_permisoxusuario mpu 
    INNER JOIN m_permiso mp ON mp.cod_permiso = mpu.cod_permiso 
    WHERE TRIM(mpu.nom_usu) = '${cleanUser}' 
    ORDER BY 1 ASC;
  `;

  const res = await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { permissions: res.rows || [], count: res.rowCount };
}

/**
 * Obtiene catálogo de permisos disponibles:
 * - Si referenceUser viene especificado: obtiene los permisos que dicho usuario tiene asignados (para replicar/clonar).
 * - Si referenceUser es nulo o vacío: obtiene todo el catálogo de permisos activos en el sistema (m_permiso).
 */
export async function getAvailablePermissions({ referenceUser = null, env = 'prod' }) {
  let query;
  if (referenceUser && String(referenceUser).trim()) {
    const cleanRef = String(referenceUser).trim().replace(/'/g, "''");
    query = `
      SELECT mpu.cod_permiso, mp.des_permiso 
      FROM m_permisoxusuario mpu 
      INNER JOIN m_permiso mp ON mp.cod_permiso = mpu.cod_permiso 
      WHERE TRIM(mpu.nom_usu) = '${cleanRef}' 
      ORDER BY 1 ASC;
    `;
  } else {
    query = `
      SELECT cod_permiso, des_permiso 
      FROM m_permiso 
      WHERE activo = true 
      ORDER BY 1 ASC;
    `;
  }

  const res = await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { permissions: res.rows || [], count: res.rowCount, source: referenceUser ? `Usuario ${referenceUser}` : 'Catálogo Completo' };
}

/**
 * Asigna una lista de permisos a un usuario destino (insertando únicamente los que aún no posea)
 */
export async function assignPermissions({ targetUser, permissionCodes, env = 'prod' }) {
  const cleanUser = String(targetUser || '').trim().replace(/'/g, "''");
  const codes = parseIntegerList(permissionCodes);

  if (!cleanUser) throw new Error('Usuario destino no especificado.');
  if (codes.length === 0) throw new Error('No se seleccionó ningún permiso para asignar.');

  // Inserción segura para cada permiso evitando duplicados
  const queries = codes.map(code => `
    INSERT INTO m_permisoxusuario (cod_permiso, nom_usu)
    SELECT ${code}, '${cleanUser}'
    WHERE NOT EXISTS (
      SELECT 1 FROM m_permisoxusuario WHERE cod_permiso = ${code} AND TRIM(nom_usu) = '${cleanUser}'
    );
  `);

  const fullSql = queries.join('\n');
  await executeSolution({ query: fullSql, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { ok: true, targetUser: cleanUser, assignedCount: codes.length };
}

/**
 * Elimina un permiso específico de un usuario destino
 */
export async function removePermission({ targetUser, cod_permiso, env = 'prod' }) {
  const cleanUser = String(targetUser || '').trim().replace(/'/g, "''");
  const code = Number(cod_permiso);

  if (!cleanUser || !code) throw new Error('Usuario o código de permiso inválido.');

  const query = `DELETE FROM m_permisoxusuario WHERE cod_permiso = ${code} AND TRIM(nom_usu) = '${cleanUser}';`;
  await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { ok: true, targetUser: cleanUser, removedPermission: code };
}

/**
 * ============================================================================
 * 2. MÓDULO CAMBIO DE FECHA (AMBULANCIA)
 * ============================================================================
 */

/**
 * Consulta las fechas de atenciones de ambulancia en t_tmpllamadas y t_llamadas
 */
export async function queryAmbulance({ atenciones, env = 'prod' }) {
  const ids = parseIntegerList(atenciones);
  if (ids.length === 0) throw new Error('Debe ingresar al menos un número de atención válido.');

  const inClause = ids.join(', ');
  const qTmp = `
    SELECT cod_ate, fec_ate, fecoplla_ate, feclla_ate, fecdia_ate, amb_fecha_ini 
    FROM t_tmpllamadas 
    WHERE cod_ate IN (${inClause}) 
    ORDER BY 1 ASC;
  `;
  const qLla = `
    SELECT cod_ate, feclla, fecfin 
    FROM t_llamadas 
    WHERE cod_ate IN (${inClause}) 
    ORDER BY 1 ASC;
  `;

  const [resTmp, resLla] = await Promise.all([
    executeSolution({ query: qTmp, engine: 'PostgreSQL', database: 'hipocrates', env }),
    executeSolution({ query: qLla, engine: 'PostgreSQL', database: 'hipocrates', env })
  ]);

  return {
    tmpllamadas: resTmp.rows || [],
    llamadas: resLla.rows || [],
    totalSearched: ids.length
  };
}

/**
 * Actualiza la fecha de atención en ambulancias en t_tmpllamadas y t_llamadas
 */
export async function updateAmbulanceDate({ atenciones, newDate, env = 'prod' }) {
  const ids = parseIntegerList(atenciones);
  if (ids.length === 0) throw new Error('Debe ingresar al menos un número de atención válido.');

  const cleanDate = String(newDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    throw new Error('La fecha debe tener el formato YYYY-MM-DD (ej: 2026-09-24).');
  }

  const inClause = ids.join(', ');
  const query = `
    UPDATE t_tmpllamadas 
    SET fec_ate = '${cleanDate}', fecoplla_ate = '${cleanDate}', feclla_ate = '${cleanDate}', 
        fecdia_ate = '${cleanDate}', amb_fecha_ini = '${cleanDate}' 
    WHERE cod_ate IN (${inClause});

    UPDATE t_llamadas 
    SET feclla = '${cleanDate}', fecfin = '${cleanDate}' 
    WHERE cod_ate IN (${inClause});
  `;

  await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { ok: true, atenciones: ids, newDate: cleanDate, updatedCount: ids.length };
}

/**
 * ============================================================================
 * 3. MÓDULO MODIFICAR ÓRDENES (LABORATORIO)
 * ============================================================================
 */

/**
 * Consulta órdenes de laboratorio en t_cab_lab_serv_laboratorio
 */
export async function queryLabOrders({ ordenes, env = 'prod' }) {
  const ids = parseIntegerList(ordenes);
  if (ids.length === 0) throw new Error('Debe ingresar al menos un número de orden válido.');

  const inClause = ids.join(', ');
  const query = `
    SELECT cod_serv_laboratorio, estado 
    FROM t_cab_lab_serv_laboratorio 
    WHERE cod_serv_laboratorio IN (${inClause}) 
    ORDER BY 1 ASC;
  `;

  const res = await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { orders: res.rows || [], totalSearched: ids.length };
}

/**
 * Modifica o anula órdenes de laboratorio
 */
export async function updateLabOrders({ ordenes, action, newStatus = '0', env = 'prod' }) {
  const ids = parseIntegerList(ordenes);
  if (ids.length === 0) throw new Error('Debe ingresar al menos un número de orden válido.');

  const inClause = ids.join(', ');
  let query = '';

  if (action === 'cancel') {
    // Opción Anular del ejecutable: estado = 'C', id_estado = 99 y borrado de tablas temporales
    query = `
      UPDATE t_cab_lab_serv_laboratorio SET estado = 'C' WHERE cod_serv_laboratorio IN (${inClause});
      UPDATE t_det_lab_serv_laboratorio SET id_estado = 99 WHERE cod_serv_laboratorio IN (${inClause});
      DELETE FROM t_atencionlabo WHERE cod_atelab IN (${inClause});
      DELETE FROM t_tmplaboratorios WHERE cod_atelab IN (${inClause});
    `;
  } else if (action === 'change_status') {
    // Opción Camb. estado: actualiza estado y limpia tablas temporales
    const safeStatus = String(newStatus).trim().replace(/'/g, "''");
    query = `
      UPDATE t_cab_lab_serv_laboratorio SET estado = '${safeStatus}' WHERE cod_serv_laboratorio IN (${inClause});
      DELETE FROM t_atencionlabo WHERE cod_atelab IN (${inClause});
      DELETE FROM t_tmplaboratorios WHERE cod_atelab IN (${inClause});
    `;
  } else {
    throw new Error("Acción no válida. Debe ser 'cancel' o 'change_status'.");
  }

  await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { ok: true, ordenes: ids, action, newStatus, count: ids.length };
}

/**
 * ============================================================================
 * 4. MÓDULO MODIFICAR PEDIDOS (DELIVERY / FARMACIA)
 * ============================================================================
 */

/**
 * Consulta pedidos de delivery en t_tmppedidomed
 */
export async function queryDeliveryOrders({ pedidos, env = 'prod' }) {
  const ids = parseIntegerList(pedidos);
  if (ids.length === 0) throw new Error('Debe ingresar al menos un número de pedido válido.');

  const inClause = ids.join(', ');
  const query = `
    SELECT cod_ped, estado, canc_ped, obs_ped 
    FROM t_tmppedidomed 
    WHERE cod_ped IN (${inClause}) 
    ORDER BY 1 ASC;
  `;

  const res = await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { orders: res.rows || [], totalSearched: ids.length };
}

/**
 * Modifica o anula pedidos de delivery
 */
export async function updateDeliveryOrders({ pedidos, action, newStatus = 0, env = 'prod' }) {
  const ids = parseIntegerList(pedidos);
  if (ids.length === 0) throw new Error('Debe ingresar al menos un número de pedido válido.');

  const inClause = ids.join(', ');
  let query = '';

  if (action === 'cancel') {
    // Opción Anular del ejecutable: canc_ped='C', obs_ped='ANULADO', estado=5 en temporales y consolidados
    query = `
      UPDATE t_tmppedidomed SET canc_ped = 'C', obs_ped = 'ANULADO', estado = 5 WHERE cod_ped IN (${inClause});
      UPDATE t_pedidomed SET canc_ped = 'C', obs_ped = 'ANULADO' WHERE cod_ped IN (${inClause});
    `;
  } else if (action === 'change_status') {
    // Opción Camb. estado: actualiza estado, limpia canc_ped y purga tablas detalle consolidadas
    const safeStatus = Number(newStatus);
    query = `
      UPDATE t_tmppedidomed SET estado = ${safeStatus}, canc_ped = NULL WHERE cod_ped IN (${inClause});
      DELETE FROM t_pedidomed WHERE cod_ped IN (${inClause});
      DELETE FROM t_detpedmed WHERE cod_ped IN (${inClause});
    `;
  } else {
    throw new Error("Acción no válida. Debe ser 'cancel' o 'change_status'.");
  }

  await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { ok: true, pedidos: ids, action, newStatus, count: ids.length };
}

/**
 * ============================================================================
 * 5. MÓDULO CAMBIO ESTADO H Y G (FACTURACIÓN)
 * ============================================================================
 */

/**
 * Consulta expedientes o atenciones en t_tmpexp
 */
export async function queryFacturacionHYG({ items, mode = 'atencion', env = 'prod' }) {
  const ids = parseIntegerList(items);
  if (ids.length === 0) throw new Error('Debe ingresar al menos un identificador válido.');

  const inClause = ids.join(', ');
  const col = mode === 'expediente' ? 'cod_exp' : 'codate_exp';

  const query = `
    SELECT ${col} AS codate, estado_exp, fec_estado_fin 
    FROM t_tmpexp 
    WHERE ${col} IN (${inClause}) 
    ORDER BY 1 ASC;
  `;

  const res = await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { records: res.rows || [], totalSearched: ids.length, mode };
}

/**
 * Actualiza el estado a 'H' o 'G' en facturación (t_tmpexp)
 */
export async function updateFacturacionHYG({ items, mode = 'atencion', newStatus = 'H', usuario = 'SISTEMAS', env = 'prod' }) {
  const ids = parseIntegerList(items);
  if (ids.length === 0) throw new Error('Debe ingresar al menos un identificador válido.');

  const cleanStatus = String(newStatus || 'H').trim().toUpperCase();
  if (cleanStatus !== 'H' && cleanStatus !== 'G') {
    throw new Error("El estado debe ser 'H' o 'G'.");
  }

  const cleanUser = String(usuario || 'SISTEMAS').trim().replace(/'/g, "''");
  const inClause = ids.join(', ');
  const today = new Date().toISOString().slice(0, 10);

  let query = '';
  if (mode === 'expediente') {
    query = `
      UPDATE t_tmpexp 
      SET estado_exp = '${cleanStatus}', fec_estado_fin = '${today}', usu_estado_fin = '${cleanUser}' 
      WHERE estado_exp <> 'F' AND cod_exp IN (${inClause});

      DELETE FROM t_det_listado_pacifico WHERE cod_exp IN (${inClause});
    `;
  } else {
    query = `
      UPDATE t_tmpexp 
      SET estado_exp = '${cleanStatus}', fec_estado_fin = '${today}', usu_estado_fin = '${cleanUser}' 
      WHERE estado_exp <> 'F' AND codate_exp IN (${inClause});

      DELETE FROM t_det_listado_pacifico WHERE cod_ate IN (${inClause});
    `;
  }

  await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { ok: true, items: ids, mode, newStatus: cleanStatus, count: ids.length };
}

/**
 * ============================================================================
 * 6. MÓDULOS OPERATIVOS COMPLEMENTARIOS
 * ============================================================================
 */

/**
 * Actualiza la subzona de ambulancia en t_tmpllamadas
 */
export async function updateSubzona({ atenciones, subZona, env = 'prod' }) {
  const ids = parseIntegerList(atenciones);
  if (ids.length === 0) throw new Error('Debe ingresar al menos un número de atención válido.');

  const cleanSubzona = String(subZona || '').trim().replace(/'/g, "''");
  if (!cleanSubzona) throw new Error('Debe especificar la nueva subzona.');

  const inClause = ids.join(', ');
  const query = `UPDATE t_tmpllamadas SET descrp_zona = '${cleanSubzona}' WHERE cod_ate IN (${inClause});`;
  await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { ok: true, atenciones: ids, subZona: cleanSubzona, count: ids.length };
}

/**
 * Actualiza la forma de pago a MPOS ('M') en t_llamadas y t_tmpllamadas
 */
export async function updateMedioPagoMPOS({ atenciones, env = 'prod' }) {
  const ids = parseIntegerList(atenciones);
  if (ids.length === 0) throw new Error('Debe ingresar al menos un número de atención válido.');

  const inClause = ids.join(', ');
  const query = `
    UPDATE t_llamadas SET FOR_ATE = 'M' WHERE cod_ate IN (${inClause});
    UPDATE t_tmpllamadas SET FOR_ATE = 'M' WHERE cod_ate IN (${inClause});
  `;

  await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { ok: true, atenciones: ids, count: ids.length };
}

/**
 * Consulta descuentos de personal en vw_gdh_descuento_trabajador
 */
export async function queryDescuentoTrabajador({ nombre, env = 'prod' }) {
  const cleanName = String(nombre || '').trim().toUpperCase().replace(/'/g, "''");
  if (!cleanName) throw new Error('Debe ingresar un nombre o apellido para buscar.');

  const query = `SELECT * FROM vw_gdh_descuento_trabajador WHERE UPPER(nombre) LIKE '%${cleanName}%' LIMIT 50;`;
  const res = await executeSolution({ query, engine: 'PostgreSQL', database: 'hipocrates', env });
  return { workers: res.rows || [], count: res.rowCount };
}
