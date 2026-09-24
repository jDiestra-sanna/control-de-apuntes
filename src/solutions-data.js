/**
 * Base de Conocimiento y Soluciones Operativas de TI
 * Consolidación técnica de:
 * - Tickets Recurrentes (Sistemas SM, Tablet, MDS, Prog. Médica)
 * - Documentación Completa de Funciones y Vistas SQL
 * - Fijas de Soporte Técnico y Procedimientos de Producción (Fijas del Papu)
 * - Módulos de Solución Médica (VB6) e Integración SM (VB.NET)
 */

export const SYSTEMS_LIST = [
  { id: 'all', name: 'Todos los sistemas' },
  { id: 'sm', name: 'Solución Médica (SM)' },
  { id: 'tablet', name: 'Tablet Médica' },
  { id: 'mds', name: 'Médicos Asociados (MDS)' },
  { id: 'amb', name: 'Ambulancias' },
  { id: 'sap', name: 'Facturación & SAP' },
  { id: 'prog_med', name: 'Programación Médica / IM' },
  { id: 'dronline', name: 'Dr. Online' },
  { id: 'reclamos', name: 'Reclamos' }
];

export const ENGINES_LIST = [
  { id: 'all', name: 'Todos los motores' },
  { id: 'PostgreSQL', name: 'PostgreSQL (hipocrates)' },
  { id: 'SQL Server', name: 'SQL Server (10.6.16.10)' },
  { id: 'SAP HANA', name: 'SAP HANA (B1H_DOCT_PROD)' }
];

export const CATEGORIES_LIST = [
  { id: 'all', name: 'Todas las categorías' },
  { id: 'atenciones', name: 'Atenciones & Flujos' },
  { id: 'pagos', name: 'Pagos, Deducibles & Facturación' },
  { id: 'permisos', name: 'Permisos & Seguridad' },
  { id: 'mfa', name: 'MFA & Autenticación' },
  { id: 'pacientes', name: 'Pacientes & Filiación' },
  { id: 'medicos_asoc', name: 'Médicos Asociados' },
  { id: 'sap_fact', name: 'SAP HANA & Comprobantes' },
  { id: 'botiquines', name: 'Botiquines, Flota & Maestros' },
  { id: 'turnos', name: 'Turnos & Programación' }
];

export const SERVERS_DATA = [
  {
    name: 'PostgreSQL Producción (Solución Médica / IM)',
    ip: '10.6.16.14',
    port: 5432,
    engine: 'PostgreSQL',
    database: 'hipocrates',
    userRef: 'Pg_usraplicacion',
    description: 'Base principal de Solución Médica (SM), llamadas, atenciones, pacientes, farmacias, botiquines y autorizaciones SITEDS.',
    env: 'PRODUCCIÓN',
    system: 'Solución Médica, IM, Web Prog. Médica'
  },
  {
    name: 'PostgreSQL Pruebas / Desarrollo',
    ip: '10.6.16.18',
    port: 5432,
    engine: 'PostgreSQL',
    database: 'hipocrates',
    userRef: 'Pg_usraplicacion',
    description: 'Entorno de homologación y pruebas para procedimientos de Solución Médica.',
    env: 'PRUEBAS',
    system: 'Solución Médica'
  },
  {
    name: 'SQL Server Tablet Médica (MAD)',
    ip: '10.6.16.10',
    port: 1433,
    engine: 'SQL Server',
    database: 'BD_Sanna_ambulatoria',
    userRef: 'Sql_UsrSannaAmb / applications_user',
    description: 'Base de datos para la aplicación móvil Tablet de Médico a Domicilio (MAD). Maneja estados de atención, finalización y MFA.',
    env: 'PRODUCCIÓN',
    system: 'Tablet Médica'
  },
  {
    name: 'SQL Server Tablet Pruebas',
    ip: '10.6.16.10',
    port: 1433,
    engine: 'SQL Server',
    database: 'BD_Sanna_Developer',
    userRef: 'Sql_UsrTest_SannaAmb',
    description: 'Base de datos de pruebas para desarrollo y QA de aplicaciones móviles Tablet.',
    env: 'PRUEBAS',
    system: 'Tablet Médica'
  },
  {
    name: 'SQL Server Médicos Asociados (MDS)',
    ip: '10.6.16.10',
    port: 1433,
    engine: 'SQL Server',
    database: 'BD_MediSanna',
    userRef: 'MediSannaUser',
    description: 'Web de Médicos Asociados. Control de solicitudes, servicios, estados de médicos y asignaciones externas.',
    env: 'PRODUCCIÓN',
    system: 'Médicos Asociados (MDS)'
  },
  {
    name: 'SQL Server Historias y Honorarios Médicos (HHMM)',
    ip: '10.6.16.10',
    port: 1433,
    engine: 'SQL Server',
    database: 'HHMMDRMProd',
    userRef: 'UsrHHMMDRMProd',
    description: 'Historias clínicas digitalizadas y liquidación de honorarios médicos de doctores y especialistas.',
    env: 'PRODUCCIÓN',
    system: 'HHMM / Liquidación Médica'
  },
  {
    name: 'SAP Business One (HANA)',
    ip: '10.6.16.28',
    port: 30015,
    engine: 'SAP HANA',
    database: 'B1H_DOCT_PROD',
    userRef: 'B1ADMIN',
    description: 'ERP institucional. Facturación contable, comprobantes electrónicos, guías de remisión y socios de negocio (SN).',
    env: 'PRODUCCIÓN',
    system: 'SAP B1'
  },
  {
    name: 'Servicios Web TCI & Guías de Remisión',
    ip: '10.6.16.9',
    port: 80,
    engine: 'IIS / SOAP Web Services',
    database: 'WS_TCI / WS_GuiaRemisionRemitente',
    userRef: 'Endpoints ASMX',
    description: 'Servicios web para emisión de comprobantes electrónicos (WSComprobanteSoap) y guías de remisión electrónicas (GRE).',
    env: 'PRODUCCIÓN',
    system: 'Integración CE & TCI'
  }
];

export const SQL_VIEWS_DATA = [
  {
    name: 'vw_seguimiento_atencion_ibt',
    system: 'Solución Médica / IBT',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    description: 'Seguimiento y trazabilidad de atenciones de traslado asistido IBT, citas, traslados y retorno.',
    exampleSql: `SELECT * FROM vw_seguimiento_atencion_ibt WHERE nro_solicitud = '6454070';`
  },
  {
    name: 'vw_permiso_usuario',
    system: 'Solución Médica / IM',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    description: 'Lista completa de todos los permisos asignados a los usuarios en SM, IM y Web de Programación Médica.',
    exampleSql: `SELECT * FROM vw_permiso_usuario WHERE nom_usu = 'USUARIO_LOGIN' ORDER BY id_permiso;`
  },
  {
    name: 'ingreso_ambulancia_prog_medico',
    system: 'Programación Médica',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    description: 'Vista del módulo de turnos para el ingreso y programación de ambulancias en Programación Médica.',
    exampleSql: `SELECT * FROM ingreso_ambulancia_prog_medico ORDER BY fecha DESC LIMIT 50;`
  },
  {
    name: 'PROV_MOTO_PROG_MEDICA_PREFACTURACION',
    system: 'Programación Médica / Delivery',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    description: 'Listado de proveedores motorizados habilitados para la opción y liquidación de prefacturación en Programación Médica.',
    exampleSql: `SELECT * FROM PROV_MOTO_PROG_MEDICA_PREFACTURACION;`
  },
  {
    name: 'lista_clasi',
    system: 'Solución Médica',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    description: 'Catálogo de clasificaciones de atenciones médicas (ej. Agudos, Crónicos, Telemedicina, Melchorita, etc.).',
    exampleSql: `SELECT * FROM lista_clasi ORDER BY cod_clasif;`
  },
  {
    name: 'VW_CONFIRMACION_RECOJO_COMPLETO_PROG_MEDICA',
    system: 'Programación Médica / Farmacia',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    description: 'Confirma recojo de medicamentos y pedidos que cuentan con todos los datos y documentación completa.',
    exampleSql: `SELECT * FROM VW_CONFIRMACION_RECOJO_COMPLETO_PROG_MEDICA WHERE cod_ped = 4246624;`
  },
  {
    name: 'VW_CONFIRMACION_RECOJO_INCOMPLETO_PROG_MEDICA',
    system: 'Programación Médica / Farmacia',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    description: 'Identifica pedidos de recojo de farmacia con datos incompletos o inconsistentes pendientes de regularización.',
    exampleSql: `SELECT * FROM VW_CONFIRMACION_RECOJO_INCOMPLETO_PROG_MEDICA ORDER BY fec_ped DESC;`
  },
  {
    name: 'vw_atenciones_fusionadas',
    system: 'Solución Médica',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    description: 'Muestra las atenciones médicas que han sido fusionadas por pertenecer al mismo paciente o evento asistencial.',
    exampleSql: `SELECT * FROM vw_atenciones_fusionadas WHERE cod_ate = 5893660;`
  },
  {
    name: 'auditoria_ate_fusion',
    system: 'Solución Médica',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    description: 'Tabla y vista de auditoría histórica que registra quién, cuándo y cómo se ejecutó la fusión de atenciones.',
    exampleSql: `SELECT * FROM auditoria_ate_fusion ORDER BY fecha DESC LIMIT 50;`
  },
  {
    name: 'vw_medicos_asociados_con_solicitud',
    system: 'Médicos Asociados (MDS)',
    engine: 'SQL Server',
    database: 'BD_MediSanna',
    description: 'Cruza los médicos asociados registrados con sus solicitudes activas, estado y tipo de servicio.',
    exampleSql: `SELECT * FROM vw_medicos_asociados_con_solicitud WHERE nro_solicitud = '42673';`
  }
];

export const BEST_PRACTICES_DATA = [
  {
    rule: '1. SELECT previo obligatorio',
    detail: 'Antes de ejecutar cualquier UPDATE, DELETE o cambio de estado masivo, ejecuta siempre un SELECT de prueba para validar que los IDs coincidan y confirmar la cantidad exacta de filas afectadas.'
  },
  {
    rule: '2. Uso de Transacciones en Modificaciones Manuales',
    detail: 'En operaciones directas sobre PostgreSQL o SQL Server, envuelve las sentencias en BEGIN TRANSACTION / COMMIT para poder revertir con ROLLBACK ante cualquier discrepancia.'
  },
  {
    rule: '3. Manejo y Cuidado con Disparadores (Triggers)',
    detail: 'Al realizar depuraciones o barridos masivos de atenciones fusionadas (flg_ate_fusion), recuerda deshabilitar temporalmente trg_auditar_ate_fusion y reactivarlo obligatoriamente al finalizar.'
  },
  {
    rule: '4. Confidencialidad y Funciones Sensibles',
    detail: 'Funciones como get_contra devuelven credenciales encriptadas de usuarios. Su uso está estrictamente restringido al equipo de TI en entornos autorizados y jamás deben registrarse en logs abiertos.'
  },
  {
    rule: '5. Sincronización entre Tablet y Solución Médica',
    detail: 'Si una atención figura pegada en la Tablet, verifica en t_tmpllamadas de SM que no se encuentre ya provisionada o liquidada antes de ejecutar EXEC atencion_pegada o forzar estado 9.'
  },
  {
    rule: '6. Reintentos de Integración SAP Business One',
    detail: 'Cuando un pedido queda atascado con sap_docentry_sn = -1 en h_gre_socio_negocio, nuléalo (SET sap_docentry_sn = NULL) para que el servicio desatendido intente nuevamente el alta en SAP sin duplicar registros.'
  }
];

export const SOLUTIONS_DATA = [
  // --- ATENCIONES & ESTADOS ---
  {
    id: 'sm-retiro-provision',
    title: 'Retirar atención de la provisión',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'atenciones',
    summary: 'Retira la provisión de una atención médica para permitir rectificaciones de deducible, coaseguro, clasificación o anulación antes de facturar.',
    sql: `SELECT retiro_provision({cod_ate});`,
    verificationSql: `SELECT cod_ate, cm_estado, exp, cod_exp, servicio_provisionado_hhmm, servicio_provisionado_sap\nFROM t_tmpllamadas\nWHERE cod_ate = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '5893660', defaultValue: '5893660' }
    ],
    notes: 'Ejecutar cuando la atención se encuentra provisionada pero requiere correcciones operativas. Valida previamente con el SELECT de verificación.',
    tags: ['provision', 'atencion', 'retiro', 'sm', 'postgre', 'desprovisionar']
  },
  {
    id: 'sm-anular-atencion',
    title: 'Anular atención médica',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'atenciones',
    summary: 'Anula por completo una atención médica liberando citas, pedidos y expedientes vinculados en Solución Médica.',
    sql: `SELECT anular_atencion({cod_ate});`,
    verificationSql: `-- 1. Validación previa del estado:\nSELECT canc_ate, obs_ate, exp, cod_exp, cm_estado\nFROM t_tmpllamadas WHERE cod_ate = {cod_ate};\n\nSELECT canc_ate, obs_ate, exp, cod_exp\nFROM t_llamadas WHERE cod_ate = {cod_ate};\n\n-- 2. Si se requiere anulación manual forzada:\n-- UPDATE t_tmpllamadas SET canc_ate = 'C', obs_ate = 'ANULADO', exp = false, cod_exp = null, cm_estado = 'C' WHERE cod_ate = {cod_ate};\n-- UPDATE t_llamadas SET canc_ate = 'C', obs_ate = 'ANULADO', exp = false, cod_exp = null WHERE cod_ate = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '5751631', defaultValue: '5751631' }
    ],
    notes: 'Cambia canc_ate a "C", obs_ate a "ANULADO", exp a false y cm_estado a "C". Desvincula cualquier expediente abierto.',
    tags: ['anular', 'cancelar', 'atencion', 'sm', 'postgre', 'tmpllamadas', 'query-funciones']
  },
  {
    id: 'sm-retornar-estado2',
    title: 'Retornar atención a Estado 2 (Pendiente / Asignación)',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'atenciones',
    summary: 'Regresa una atención médica a su estado 2 (disponible para asignación médica inmediata o reasignación de turno).',
    sql: `SELECT retornar_estado2({cod_ate});`,
    verificationSql: `SELECT cod_ate, cod_estado, cm_estado, fec_ate, hra_ate\nFROM t_tmpllamadas\nWHERE cod_ate = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '5233956', defaultValue: '5233956' }
    ],
    notes: 'Utilizado con frecuencia cuando una llamada quedó en un estado intermedio erróneo y los coordinadores no pueden asignarla.',
    tags: ['estado', 'retornar', 'estado2', 'asignacion', 'sm', 'postgre', 'query-funciones']
  },
  {
    id: 'sm-actualizar-modo-medico',
    title: 'Actualizar modalidad de atención médico (Función)',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'atenciones',
    summary: 'Cambia formalmente la modalidad de atención (VIRTUAL / PRESENCIAL) soportando un arreglo de múltiples códigos de atención.',
    sql: `SELECT actualizar_modo_medico(ARRAY[{cod_ate}], '{modalidad}');`,
    verificationSql: `SELECT cod_ate, modo_atencion_medico, atencion_referencial\nFROM t_tmpllamadas\nWHERE cod_ate = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código(s) de Atención', placeholder: '5555191', defaultValue: '5555191' },
      { name: 'modalidad', label: 'Modalidad', placeholder: 'VIRTUAL', defaultValue: 'VIRTUAL' }
    ],
    notes: 'Valores admitidos para modalidad: "VIRTUAL" y "PRESENCIAL". Para múltiples atenciones separar por comas: ARRAY[11111, 22222].',
    tags: ['modalidad', 'virtual', 'presencial', 'telemedicina', 'sm', 'postgre', 'query-funciones']
  },
  {
    id: 'sm-update-modo-medico-directo',
    title: 'Cambiar modo médico directo (0: Presencial, 1: Virtual, 2: Seguimiento)',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'atenciones',
    summary: 'Actualiza de forma precisa la columna modo_atencion_medico en la tabla temporal de llamadas.',
    sql: `UPDATE t_tmpllamadas\nSET modo_atencion_medico = {modo}\nWHERE cod_ate = {cod_ate};`,
    verificationSql: `SELECT cod_ate, modo_atencion_medico\nFROM t_tmpllamadas\nWHERE cod_ate = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '5555191', defaultValue: '5555191' },
      { name: 'modo', label: 'Modo (0=Presencial, 1=Virtual, 2=Seguimiento)', placeholder: '1', defaultValue: '1' }
    ],
    notes: '0 = Presencial (MAD), 1 = Virtual (DrOnline / Telemedicina), 2 = Llamada de seguimiento.',
    tags: ['modo', 'virtual', 'presencial', 'seguimiento', 'tmpllamadas', 'sm']
  },
  {
    id: 'sm-cambiar-vnr',
    title: 'Cambiar atención a VNR (Visita No Realizada)',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'atenciones',
    summary: 'Consulta y cambia una atención médica hacia estado VNR cuando el paciente estuvo ausente o no se concretó la visita.',
    sql: `SELECT cod_listgen, cm_estado, cod_estado, flg_reingresar_tablet, fec_ate, cod_exp, exp, numero_ce, servicio_provisionado_hhmm, servicio_provisionado_sap, tipo_doc_pago, obs_ate, canc_ate\nFROM t_tmpllamadas\nWHERE cm_estado = 'V' AND cod_listgen = {cod_listgen};`,
    verificationSql: `UPDATE t_tmpllamadas\nSET cm_estado = 'V', obs_ate = 'VNR - VISITA NO REALIZADA'\nWHERE cod_ate = {cod_ate};`,
    parameters: [
      { name: 'cod_listgen', label: 'Código Lista General', placeholder: '1234', defaultValue: '1234' },
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '5193403', defaultValue: '5193403' }
    ],
    notes: 'cm_estado = "V" corresponde a VNR. Asegurarse de que no genere cobro de honorario ni medicamento.',
    tags: ['vnr', 'visita no realizada', 'atencion', 'sm', 'postgre']
  },
  {
    id: 'sm-quitar-siteds',
    title: 'Desvincular / Quitar SITEDS trabado de la atención',
    system: 'Solución Médica (SM) / SITEDS',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'atenciones',
    summary: 'Desvincula una autorización SITEDS errónea o atascada para que la atención pueda volver a acreditarse.',
    sql: `UPDATE t_tmpllamadas\nSET cod_aut_prestacion = 'DR' || cod_ate\nWHERE cod_ate = {cod_ate};\n\nUPDATE h_siteds_documento_autorizacion\nSET cod_ate = NULL\nWHERE cod_ate = {cod_ate} AND codigoautorizacion = '{cod_autorizacion}';`,
    verificationSql: `SELECT cod_ate, cod_aut_prestacion FROM t_tmpllamadas WHERE cod_ate = {cod_ate};\nSELECT cod_ate, codigoautorizacion FROM h_siteds_documento_autorizacion WHERE codigoautorizacion = '{cod_autorizacion}';`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '4567017', defaultValue: '4567017' },
      { name: 'cod_autorizacion', label: 'Código de Autorización SITEDS', placeholder: '0012152805', defaultValue: '0012152805' }
    ],
    notes: 'Al concatenar DR al código de atención se restablece el correlativo interno y se libera la autorización en el historial SITEDS.',
    tags: ['siteds', 'autorizacion', 'acreditacion', 'aseguradora', 'sm']
  },
  {
    id: 'sm-auditoria-ate-fusionadas',
    title: 'Auditoría y barrido de atenciones fusionadas',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'atenciones',
    summary: 'Limpia flags inconsistentes de atenciones fusionadas que no cumplen los requisitos de la vista oficial.',
    sql: `-- Limpiar flags de atenciones fusionadas inconsistentes:\nUPDATE t_tmpllamadas\nSET flg_ate_fusion = false\nWHERE flg_ate_fusion = true AND cod_ate NOT IN (SELECT cod_ate FROM vw_atenciones_fusionadas);`,
    verificationSql: `SELECT * FROM vw_atenciones_fusionadas;\nSELECT * FROM auditoria_ate_fusion ORDER BY fecha DESC LIMIT 30;`,
    parameters: [],
    notes: 'Ejecutar después de procesos de combinación o descarte de duplicados de llamadas para mantener coherencia contable.',
    tags: ['fusion', 'atenciones fusionadas', 'auditoria', 'trigger', 'sm', 'query-funciones']
  },
  {
    id: 'sm-trigger-fusion-mantenimiento',
    title: 'Desactivar / Activar Trigger de Atenciones Fusionadas',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'atenciones',
    summary: 'Deshabilita temporalmente el trigger trg_auditar_ate_fusion para mantenimientos masivos y lo vuelve a habilitar.',
    sql: `-- 1. Desactivar disparador antes del mantenimiento:\nALTER TABLE t_tmpllamadas DISABLE TRIGGER trg_auditar_ate_fusion;\n\n-- 2. Ejecutar sentencias de corrección...\n\n-- 3. Activar disparador obligatoriamente al finalizar:\nALTER TABLE t_tmpllamadas ENABLE TRIGGER trg_auditar_ate_fusion;`,
    verificationSql: `SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'trg_auditar_ate_fusion';`,
    parameters: [],
    notes: '¡IMPORTANTE! Jamás dejar el disparador deshabilitado en producción. Siempre verificar que tgenabled vuelva a "O" (Origin).',
    tags: ['trigger', 'mantenimiento', 'fusion', 'disparador', 'postgre', 'query-funciones']
  },

  // --- PAGOS, DEDUCIBLES & FACTURACIÓN ---
  {
    id: 'sm-modifica-deducible',
    title: 'Modificar deducible de la atención',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'pagos',
    summary: 'Ajusta el monto del deducible copago fijo de la atención médica.',
    sql: `SELECT modifica_ded({cod_ate}, {monto_deducible});`,
    verificationSql: `SELECT cod_ate, deducible, coaseguro, tar_ate, cm_opcion_cambio, cm_motivo_cambio_ded\nFROM t_tmpllamadas\nWHERE cod_ate = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '5061914', defaultValue: '5061914' },
      { name: 'monto_deducible', label: 'Nuevo Deducible', placeholder: '20', defaultValue: '20' }
    ],
    notes: 'Asegurarse de que la atención no esté provisionada antes de modificar el deducible.',
    tags: ['deducible', 'pago', 'copago', 'tarifa', 'sm', 'postgre', 'query-funciones']
  },
  {
    id: 'sm-modifica-coaseguro',
    title: 'Modificar coaseguro de la atención',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'pagos',
    summary: 'Ajusta el porcentaje de coaseguro copago variable que asume el asegurado.',
    sql: `SELECT modifica_coa({cod_ate}, {porcentaje_coaseguro});`,
    verificationSql: `SELECT cod_ate, coaseguro, deducible, tar_ate\nFROM t_tmpllamadas\nWHERE cod_ate = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '5061914', defaultValue: '5061914' },
      { name: 'porcentaje_coaseguro', label: 'Porcentaje Coaseguro', placeholder: '20', defaultValue: '20' }
    ],
    notes: 'Ingresar valor numérico entero o decimal según la cobertura del plan.',
    tags: ['coaseguro', 'porcentaje', 'pago', 'tarifa', 'sm', 'postgre', 'query-funciones']
  },
  {
    id: 'sm-modifica-tipo-pago',
    title: 'Modificar tipo de documento de pago (B: Boleta / F: Factura)',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'pagos',
    summary: 'Cambia el tipo de comprobante que se generará para la atención médica.',
    sql: `SELECT modifica_tpago({cod_ate}, '{tipo_pago}');`,
    verificationSql: `SELECT cod_ate, tipo_doc_pago, forma_pago\nFROM t_tmpllamadas\nWHERE cod_ate = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '5061914', defaultValue: '5061914' },
      { name: 'tipo_pago', label: 'Tipo de Pago (B / F)', placeholder: 'B', defaultValue: 'B' }
    ],
    notes: 'Valores estándar: "B" = Boleta de Venta, "F" = Factura.',
    tags: ['boleta', 'factura', 'tipo_pago', 'comprobante', 'sm', 'postgre', 'query-funciones']
  },
  {
    id: 'sm-modifica-forma-pago',
    title: 'Modificar forma de pago (T: Tarjeta / E: Efectivo / etc.)',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'pagos',
    summary: 'Ajusta la modalidad o canal de pago registrado en la atención.',
    sql: `SELECT modifica_fpago({cod_ate}, '{forma_pago}');`,
    verificationSql: `SELECT cod_ate, forma_pago, tipo_doc_pago\nFROM t_tmpllamadas\nWHERE cod_ate = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '5061914', defaultValue: '5061914' },
      { name: 'forma_pago', label: 'Forma de Pago (T / E)', placeholder: 'T', defaultValue: 'T' }
    ],
    notes: '"T" = Tarjeta (POS/Pasarela), "E" = Efectivo.',
    tags: ['forma_pago', 'tarjeta', 'efectivo', 'pago', 'sm', 'postgre', 'query-funciones']
  },
  {
    id: 'sm-modifica-clasificacion',
    title: 'Modificar clasificación de atención',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'pagos',
    summary: 'Reclasifica la atención médica para ajustar tarifas, ruteo y lógica de facturación.',
    sql: `SELECT modi_clasi({cod_ate}, {cod_clasif});`,
    verificationSql: `-- Consultar clasificaciones disponibles:\nSELECT * FROM lista_clasi;\n\nSELECT cod_ate, cod_clasif, des_clasif\nFROM t_tmpllamadas\nWHERE cod_ate = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '5061914', defaultValue: '5061914' },
      { name: 'cod_clasif', label: 'Código Clasificación', placeholder: '33', defaultValue: '33' }
    ],
    notes: 'Verifica la lista de clasificaciones activas con SELECT * FROM lista_clasi.',
    tags: ['clasificacion', 'lista_clasi', 'categoria', 'tarifa', 'sm', 'query-funciones']
  },
  {
    id: 'sm-cambiar-aseguradora-empresa',
    title: 'Cambiar Aseguradora / Empresa en Llamada y Expediente',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'pagos',
    summary: 'Reasigna el grupo y empresa aseguradora tanto en t_tmpllamadas como en t_tmpexp.',
    sql: `UPDATE t_tmpllamadas\nSET cod_gru = '{cod_gru}', nom_gru = '{nom_gru}', cod_emp = '{cod_emp}', nom_emp = '{nom_emp}'\nWHERE cod_ate IN ({cod_ate});\n\nUPDATE t_tmpexp\nSET cod_gru = '{cod_gru}', nom_gru = '{nom_gru}', cod_emp = '{cod_emp}', nom_emp = '{nom_emp}'\nWHERE codate_exp IN ({cod_ate});`,
    verificationSql: `SELECT cod_gru, nom_gru, cod_emp, nom_emp FROM m_empresas WHERE nom_emp LIKE '%DOCTORMAS%' LIMIT 20;`,
    parameters: [
      { name: 'cod_ate', label: 'Código(s) de Atención', placeholder: '5893660', defaultValue: '5893660' },
      { name: 'cod_gru', label: 'Código de Grupo', placeholder: '002', defaultValue: '002' },
      { name: 'nom_gru', label: 'Nombre de Grupo', placeholder: 'DOCTORMAS+', defaultValue: 'DOCTORMAS+' },
      { name: 'cod_emp', label: 'Código de Empresa', placeholder: '011858', defaultValue: '011858' },
      { name: 'nom_emp', label: 'Nombre de Empresa', placeholder: 'DOCTORMAS+', defaultValue: 'DOCTORMAS+' }
    ],
    notes: 'Imprescindible para corregir atenciones asignadas a aseguradoras equivocadas antes de la emisión del expediente contable.',
    tags: ['aseguradora', 'empresa', 'expediente', 'doctormas', 'sm', 'postgre', 'query-funciones']
  },
  {
    id: 'sm-cambiar-totpag-pedido',
    title: 'Cambiar total a pagar (totpag_ate) en pedido de medicamentos',
    system: 'Solución Médica (SM) / Farmacia',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'pagos',
    summary: 'Ajusta el monto total de copago asignado al pedido de delivery de farmacia.',
    sql: `UPDATE t_tmppedidomed\nSET totpag_ate = {monto}\nWHERE cod_ped = {cod_ped};`,
    verificationSql: `SELECT cod_ped, cod_ate, totpag_ate, tot_ped, cod_camfar\nFROM t_tmppedidomed\nWHERE cod_ped = {cod_ped};`,
    parameters: [
      { name: 'cod_ped', label: 'Código de Pedido', placeholder: '3909797', defaultValue: '3909797' },
      { name: 'monto', label: 'Nuevo Monto a Pagar', placeholder: '47.50', defaultValue: '47.50' }
    ],
    notes: 'Utilizar cuando el delivery cobró un monto diferente al cálculo inicial por cambio de ítems o receta.',
    tags: ['pedido', 'farmacia', 'monto', 'totpag_ate', 'medicamentos', 'sm']
  },
  {
    id: 'sm-corregir-boleta-observacion',
    title: 'Corregir observación / boleta en m_segatenciones',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'pagos',
    summary: 'Corrige la glosa u observación del comprobante de pago en el seguimiento de atenciones.',
    sql: `UPDATE m_segatenciones\nSET obs_ser = '{nueva_observacion}'\nWHERE cod_ate = {cod_ate};`,
    verificationSql: `SELECT cod_ate, fec_ser, hra_ser, obs_ser\nFROM m_segatenciones\nWHERE cod_ate = {cod_ate}\nORDER BY fec_ser ASC, hra_ser ASC;`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '5061914', defaultValue: '5061914' },
      { name: 'nueva_observacion', label: 'Nueva Observación', placeholder: 'Comprobante emitido correctamente', defaultValue: 'Comprobante emitido correctamente' }
    ],
    notes: 'Permite regularizar referencias de pagos o número de operación ingresado con error tipográfico.',
    tags: ['boleta', 'comprobante', 'observacion', 'segatenciones', 'sm']
  },

  // --- TABLET MÉDICA (MAD) ---
  {
    id: 'tab-remover-atencion-pegada',
    title: 'Remover atención pegada en Tablet Médica',
    system: 'Tablet Médica',
    systemCode: 'tablet',
    engine: 'SQL Server',
    database: 'BD_Sanna_ambulatoria',
    server: '10.6.16.10:1433',
    category: 'mfa',
    summary: 'Libera atenciones bloqueadas o congeladas en el dispositivo móvil del médico para permitir nuevo ingreso o cierre.',
    sql: `EXEC atencion_pegada @cod_atencion = {cod_ate};`,
    verificationSql: `SELECT cod_atencion, cod_estado, finalizado_tablet\nFROM atencion\nWHERE cod_atencion = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '6256229', defaultValue: '6256229' }
    ],
    notes: 'Procedimiento almacenado en SQL Server (BD_Sanna_ambulatoria). Resuelve cuando el médico reporta "Atención no responde" o "En proceso por otro usuario".',
    tags: ['tablet', 'pegada', 'bloqueada', 'atencion', 'sqlserver', 'mad', 'query-funciones']
  },
  {
    id: 'tab-reiniciar-mfa-sp',
    title: 'Reiniciar MFA de usuario Tablet (Stored Procedure)',
    system: 'Tablet Médica',
    systemCode: 'tablet',
    engine: 'SQL Server',
    database: 'BD_Sanna_ambulatoria',
    server: '10.6.16.10:1433',
    category: 'mfa',
    summary: 'Ejecuta el SP oficial para resetear la clave y el registro del segundo factor de autenticación (Google Authenticator) del médico.',
    sql: `EXEC reiniciar_mfa_usuario @login = '{usuario_login}';`,
    verificationSql: `SELECT id, login, nombre, secret_key\nFROM usuario\nWHERE login = '{usuario_login}';`,
    parameters: [
      { name: 'usuario_login', label: 'Login de Usuario', placeholder: 'CM2329', defaultValue: 'CM2329' }
    ],
    notes: 'El usuario debe escanear nuevamente el código QR en su siguiente inicio de sesión en la Tablet.',
    tags: ['mfa', 'tablet', 'qr', 'authenticator', 'sqlserver', 'seguridad', 'query-funciones']
  },
  {
    id: 'tab-reiniciar-mfa-directo',
    title: 'Resetear llave secreta MFA en Tablet (Update directo)',
    system: 'Tablet Médica',
    systemCode: 'tablet',
    engine: 'SQL Server',
    database: 'BD_Sanna_ambulatoria',
    server: '10.6.16.10:1433',
    category: 'mfa',
    summary: 'Coloca secret_key en NULL para desbloquear el login del médico en caso de cambio de teléfono o pérdida de token.',
    sql: `UPDATE usuario\nSET secret_key = NULL\nWHERE login = '{usuario_login}';`,
    verificationSql: `SELECT id, login, nombre, secret_key\nFROM usuario\nWHERE login = '{usuario_login}';`,
    parameters: [
      { name: 'usuario_login', label: 'Login de Usuario', placeholder: 'CM0977', defaultValue: 'CM0977' }
    ],
    notes: 'Equivalente directo al procedimiento almacenado cuando no se dispone de permisos de ejecución sobre el SP.',
    tags: ['mfa', 'secret_key', 'tablet', 'sqlserver', 'login']
  },
  {
    id: 'tab-forzar-estado-9',
    title: 'Forzar paso a Estado 9 (Cancelado) en Tablet',
    system: 'Tablet Médica',
    systemCode: 'tablet',
    engine: 'SQL Server',
    database: 'BD_Sanna_ambulatoria',
    server: '10.6.16.10:1433',
    category: 'mfa',
    summary: 'Fuerza el cierre y cancelación de una atención directamente en la base de la Tablet cuando no pudo finalizarse desde el app.',
    sql: `UPDATE atencion\nSET cod_estado = 9, finalizado_tablet = 1\nWHERE cod_atencion = {cod_ate};`,
    verificationSql: `SELECT cod_atencion, cod_estado, finalizado_tablet\nFROM atencion\nWHERE cod_atencion = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '6010347', defaultValue: '6010347' }
    ],
    notes: 'Estado 9 corresponde a atención cancelada/cerrada administrativamente en el flujo de la Tablet.',
    tags: ['tablet', 'estado 9', 'cancelar', 'sqlserver', 'mad']
  },
  {
    id: 'tab-crear-usuario-manual',
    title: 'Creación manual de médico / usuario en Tablet',
    system: 'Tablet Médica',
    systemCode: 'tablet',
    engine: 'SQL Server',
    database: 'BD_Sanna_ambulatoria',
    server: '10.6.16.10:1433',
    category: 'mfa',
    summary: 'Registra manualmente un médico en la tabla usuario de la Tablet cuando falla la sincronización automática.',
    sql: `INSERT INTO usuario (\n    id,\n    login,\n    password,\n    nombre,\n    telefono,\n    id_perfil,\n    id_usuario_sm,\n    cod_ocupacion,\n    cod_especialidad,\n    flg_activo,\n    id_firma_digital,\n    cmp,\n    flg_culminacion_auto,\n    secret_key\n)\nVALUES (\n    (SELECT MAX(id) + 1 FROM usuario),\n    '{login}',\n    '{md5_hash}',\n    '{nombre_completo}',\n    '{telefono}',\n    1,\n    '{usuario_sm}',\n    1,\n    NULL,\n    1,\n    NULL,\n    NULL,\n    0,\n    NULL\n);`,
    verificationSql: `SELECT * FROM usuario WHERE login = '{login}';`,
    parameters: [
      { name: 'login', label: 'Login (ej. CM2670)', placeholder: 'CM2670', defaultValue: 'CM2670' },
      { name: 'md5_hash', label: 'Hash MD5 Clave', placeholder: '05592aad3020a735bd1a48a1315574ad', defaultValue: '05592aad3020a735bd1a48a1315574ad' },
      { name: 'nombre_completo', label: 'Nombre Completo', placeholder: 'OROZCO SALINAS JAIRO IMPACT', defaultValue: 'OROZCO SALINAS JAIRO IMPACT' },
      { name: 'telefono', label: 'Teléfono', placeholder: '6268888', defaultValue: '6268888' },
      { name: 'usuario_sm', label: 'ID Usuario SM', placeholder: '2671', defaultValue: '2671' }
    ],
    notes: 'Genera el ID con MAX(id) + 1. Deja secret_key en NULL para enrolamiento MFA en el primer inicio de sesión.',
    tags: ['usuario', 'tablet', 'alta', 'crear', 'sqlserver']
  },
  {
    id: 'tab-ubicar-paciente-tablet',
    title: 'Consultar y ubicar paciente en Tablet (atención, paciente, persona)',
    system: 'Tablet Médica',
    systemCode: 'tablet',
    engine: 'SQL Server',
    database: 'BD_Sanna_ambulatoria',
    server: '10.6.16.10:1433',
    category: 'pacientes',
    summary: 'Rastrea el árbol de registros de atención, paciente y persona dentro de la base de la Tablet.',
    sql: `SELECT * FROM atencion WHERE cod_atencion = {cod_ate};\nSELECT * FROM paciente WHERE cod_paciente = {cod_paciente};\nSELECT * FROM persona WHERE cod_persona = {cod_persona};`,
    verificationSql: ``,
    parameters: [
      { name: 'cod_ate', label: 'Código Atención', placeholder: '5140093', defaultValue: '5140093' },
      { name: 'cod_paciente', label: 'Código Paciente', placeholder: '67056', defaultValue: '67056' },
      { name: 'cod_persona', label: 'Código Persona', placeholder: '67056', defaultValue: '67056' }
    ],
    notes: 'Útil para diagnosticar cuando una atención en la Tablet no muestra el nombre del paciente o lanza error de clave foránea.',
    tags: ['paciente', 'persona', 'tablet', 'sqlserver', 'diagnostico']
  },

  // --- MÉDICOS ASOCIADOS (MDS / MediSanna) ---
  {
    id: 'mds-eliminar-solicitud',
    title: 'Eliminar registros y solicitud de médicos asociados',
    system: 'Médicos Asociados (MDS)',
    systemCode: 'mds',
    engine: 'SQL Server',
    database: 'BD_MediSanna',
    server: '10.6.16.10:1433',
    category: 'medicos_asoc',
    summary: 'Elimina de forma segura una solicitud de médico asociado duplicada o errada mediante Stored Procedure.',
    sql: `EXEC eliminar_solicitud_por_numero @nro_solicitud = {nro_solicitud};`,
    verificationSql: `SELECT * FROM medicos_asociados_solicitud WHERE nro_solicitud = '{nro_solicitud}';`,
    parameters: [
      { name: 'nro_solicitud', label: 'Número de Solicitud', placeholder: '42673', defaultValue: '42673' }
    ],
    notes: 'Ejecutar en la base BD_MediSanna de SQL Server 10.6.16.10.',
    tags: ['medicos asociados', 'solicitud', 'eliminar', 'mds', 'sqlserver']
  },
  {
    id: 'mds-cambiar-servicio-solicitud',
    title: 'Cambiar servicio de solicitud médica',
    system: 'Médicos Asociados (MDS)',
    systemCode: 'mds',
    engine: 'SQL Server',
    database: 'BD_MediSanna',
    server: '10.6.16.10:1433',
    category: 'medicos_asoc',
    summary: 'Reubica el servicio asignado a una solicitud médica de asociados (ej. CONSULTA EXTERNA, HOSPITALIZACIÓN, etc.).',
    sql: `EXEC actualizar_servicio_solicitud @nro_solicitud = {nro_solicitud}, @servicio = '{servicio}';`,
    verificationSql: `SELECT id, nro_solicitud, servicio, activo FROM medicos_asociados_solicitud WHERE nro_solicitud = '{nro_solicitud}';`,
    parameters: [
      { name: 'nro_solicitud', label: 'Número de Solicitud', placeholder: '12345', defaultValue: '12345' },
      { name: 'servicio', label: 'Nombre del Servicio', placeholder: 'CONSULTA EXTERNA', defaultValue: 'CONSULTA EXTERNA' }
    ],
    notes: 'Permite corregir solicitudes emitidas hacia un servicio asistencial incorrecto en la web de médicos asociados.',
    tags: ['servicio', 'medicos asociados', 'solicitud', 'mds', 'sqlserver', 'query-funciones']
  },
  {
    id: 'mds-actualizar-estado-solicitud',
    title: 'Actualizar estado de solicitud médica',
    system: 'Médicos Asociados (MDS)',
    systemCode: 'mds',
    engine: 'SQL Server',
    database: 'BD_MediSanna',
    server: '10.6.16.10:1433',
    category: 'medicos_asoc',
    summary: 'Actualiza el estado operativo o activo de una solicitud de médico asociado.',
    sql: `EXEC actualizar_estado_solicitud @p_activo = {nuevo_estado}, @p_nro_solicitud = {nro_solicitud};`,
    verificationSql: `-- O cambio directo por ID:\n-- UPDATE medicos_asociados_solicitud SET activo = {nuevo_estado} WHERE id = {id_solicitud};\nSELECT id, nro_solicitud, activo FROM medicos_asociados_solicitud WHERE nro_solicitud = '{nro_solicitud}';`,
    parameters: [
      { name: 'nro_solicitud', label: 'Número de Solicitud', placeholder: '42673', defaultValue: '42673' },
      { name: 'nuevo_estado', label: 'Nuevo Estado (ej. 20)', placeholder: '20', defaultValue: '20' }
    ],
    notes: 'Utilizado para avanzar estados atascados o reactivar solicitudes en la plataforma MediSanna.',
    tags: ['estado', 'solicitud', 'medicos asociados', 'mds', 'sqlserver', 'query-funciones']
  },
  {
    id: 'mds-depurar-medico-duplicado',
    title: 'Depurar médico asociado o solicitud duplicada (MDS)',
    system: 'Médicos Asociados (MDS)',
    systemCode: 'mds',
    engine: 'SQL Server',
    database: 'BD_MediSanna',
    server: '10.6.16.10:1433',
    category: 'medicos_asoc',
    summary: 'Rastrea y limpia registros duplicados de doctores y solicitudes en MediSanna.',
    sql: `-- 1. Buscar médico por email o documento:\nSELECT * FROM medicos_asociados_medico WHERE email = '{email}' OR nrodocumento = '{nro_doc}';\n\n-- 2. Consultar solicitudes ligadas al médico:\nSELECT * FROM medicos_asociados_solicitud WHERE id_medico = {id_medico};\n\n-- 3. Si procede eliminar el duplicado:\n-- DELETE FROM medicos_asociados_solicitud WHERE id_medico = {id_medico};\n-- DELETE FROM medicos_asociados_medico WHERE id = {id_medico};`,
    verificationSql: `SELECT * FROM vw_medicos_asociados_con_solicitud WHERE id_medico = {id_medico};`,
    parameters: [
      { name: 'email', label: 'Correo del Médico', placeholder: 'kcuzcanomoreyra@gmail.com', defaultValue: 'kcuzcanomoreyra@gmail.com' },
      { name: 'nro_doc', label: 'N° Documento', placeholder: '42101000', defaultValue: '42101000' },
      { name: 'id_medico', label: 'ID del Médico', placeholder: '829', defaultValue: '829' }
    ],
    notes: 'Verificar siempre con el equipo asistencial antes de ejecutar el DELETE físico.',
    tags: ['medicos asociados', 'duplicado', 'depurar', 'limpieza', 'sqlserver']
  },

  // --- PERMISOS & SEGURIDAD ---
  {
    id: 'sec-agregar-permiso',
    title: 'Solicitud de permisos en general (SM, IM y Web Prog. Médica)',
    system: 'Solución Médica / IM / Prog. Médica',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'permisos',
    summary: 'Concede un permiso de acceso a un usuario específico en Solución Médica, IM y Web de Programación Médica.',
    sql: `SELECT agrega_permiso({id_permiso}, '{usuario_login}');`,
    verificationSql: `SELECT * FROM vw_permiso_usuario WHERE nom_usu = '{usuario_login}' AND id_permiso = {id_permiso};`,
    parameters: [
      { name: 'id_permiso', label: 'ID de Permiso', placeholder: '36', defaultValue: '36' },
      { name: 'usuario_login', label: 'Login de Usuario', placeholder: 'APALACIOS', defaultValue: 'APALACIOS' }
    ],
    notes: 'El usuario debe cerrar y volver a abrir la aplicación para que los nuevos permisos tomen efecto.',
    tags: ['permisos', 'accesos', 'seguridad', 'agrega_permiso', 'sm', 'postgre', 'query-funciones']
  },
  {
    id: 'sec-remover-permiso',
    title: 'Solicitud de remover permisos en general (SM, IM y Web Prog. Médica)',
    system: 'Solución Médica / IM / Prog. Médica',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'permisos',
    summary: 'Revoca un permiso de acceso de un usuario específico en PostgreSQL.',
    sql: `SELECT quita_permiso({id_permiso}, '{usuario_login}');`,
    verificationSql: `SELECT * FROM vw_permiso_usuario WHERE nom_usu = '{usuario_login}';`,
    parameters: [
      { name: 'id_permiso', label: 'ID de Permiso', placeholder: '160', defaultValue: '160' },
      { name: 'usuario_login', label: 'Login de Usuario', placeholder: 'APALACIOS', defaultValue: 'APALACIOS' }
    ],
    notes: 'Utilizado en tickets de retiro de accesos por cambio de área o baja de personal.',
    tags: ['permisos', 'revocar', 'quita_permiso', 'seguridad', 'sm', 'postgre', 'query-funciones']
  },
  {
    id: 'sec-obtener-contrasena-encriptada',
    title: 'Obtener contraseña encriptada de un usuario',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'permisos',
    summary: 'Recupera el hash o contraseña encriptada de un usuario para validaciones o soporte técnico.',
    sql: `SELECT get_contra('{usuario_login}');`,
    verificationSql: `SELECT nom_usu, des_usu FROM m_usuarios WHERE nom_usu = '{usuario_login}';`,
    parameters: [
      { name: 'usuario_login', label: 'Login de Usuario', placeholder: 'SISTEMAS', defaultValue: 'SISTEMAS' }
    ],
    notes: '¡ADVERTENCIA DE SEGURIDAD! Devuelve información sensible. Restringido exclusivamente al equipo de desarrollo y administración.',
    tags: ['contrasena', 'get_contra', 'hash', 'credencial', 'seguridad', 'sm', 'query-funciones']
  },

  // --- AMBULANCIAS, BOTIQUINES & MAESTROS ---
  {
    id: 'amb-liberar-ambulancia-pegada',
    title: 'Liberar atención pegada en Ambulancia',
    system: 'Ambulancias',
    systemCode: 'amb',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'botiquines',
    summary: 'Libera una unidad de ambulancia que quedó retenida con estado ocupado o vinculada a una llamada anterior.',
    sql: `UPDATE t_amb_estado_amb\nSET estado_amb = 'LIBRE', cod_ate = NULL\nWHERE cod_amb = '{cod_amb}';`,
    verificationSql: `SELECT * FROM t_amb_estado_amb WHERE cod_amb = '{cod_amb}';\nSELECT cod_amb, nom_amb FROM m_amb_ambulancia ORDER BY nom_amb;`,
    parameters: [
      { name: 'cod_amb', label: 'Código de Ambulancia', placeholder: 'A04', defaultValue: 'A04' }
    ],
    notes: 'Permite que la ambulancia vuelva a estar disponible en el tablero de despacho de emergencias.',
    tags: ['ambulancia', 'flota', 'pegada', 'libre', 'despacho', 'sm']
  },
  {
    id: 'amb-crear-unidad-ambulancia',
    title: 'Registrar nueva unidad de ambulancia',
    system: 'Ambulancias',
    systemCode: 'amb',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'botiquines',
    summary: 'Registra una nueva ambulancia en la flota operativa.',
    sql: `SELECT insertar_ambulancia('{nombre_ambulancia}');`,
    verificationSql: `SELECT * FROM m_amb_ambulancia WHERE nom_amb = '{nombre_ambulancia}';`,
    parameters: [
      { name: 'nombre_ambulancia', label: 'Nombre de la Unidad', placeholder: 'AMB-10', defaultValue: 'AMB-10' }
    ],
    notes: 'Alternativa: SELECT crear_ambulancia("NOMBRE");',
    tags: ['ambulancia', 'flota', 'unidad', 'crear', 'alta', 'sm', 'query-funciones']
  },
  {
    id: 'bot-asignar-especialidad',
    title: 'Asignar especialidad a un botiquín MAD',
    system: 'Solución Médica (SM) / Botiquines',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'botiquines',
    summary: 'Asocia el stock de medicamentos de un botiquín con una especialidad médica determinada (ej. Pediatría, Medicina General).',
    sql: `SELECT asignar_especialidad_botiquin({id_botiquin}, '{cod_especialidad}');`,
    verificationSql: `SELECT * FROM mae_almacen WHERE cod_almacen = {id_botiquin};\nSELECT cod_esp, nom_esp FROM m_especialidades WHERE cod_esp = '{cod_especialidad}';`,
    parameters: [
      { name: 'id_botiquin', label: 'ID Botiquín / Almacén', placeholder: '258', defaultValue: '258' },
      { name: 'cod_especialidad', label: 'Código de Especialidad', placeholder: '028', defaultValue: '028' }
    ],
    notes: 'Para consultar especialidad de un médico: SELECT esp.cod_esp, esp.nom_esp FROM m_espcxdoctor doc JOIN m_especialidades esp ON doc.cod_esp = esp.cod_esp WHERE cod_doc = "6848";',
    tags: ['botiquin', 'especialidad', 'almacen', 'mad', 'pediatria', 'sm', 'query-funciones']
  },
  {
    id: 'bot-ingresar-botiquin',
    title: 'Crear o actualizar botiquín',
    system: 'Solución Médica (SM) / Botiquines',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'botiquines',
    summary: 'Da de alta un botiquín móvil o actualiza su nombre en mae_almacen.',
    sql: `SELECT ingresar_botiquin({id_botiquin}, '{nombre_botiquin}');`,
    verificationSql: `-- O inserción directa en mae_almacen:\n-- INSERT INTO mae_almacen VALUES ({id_botiquin}, '{nombre_botiquin}', true);\nSELECT * FROM mae_almacen WHERE cod_almacen = {id_botiquin};`,
    parameters: [
      { name: 'id_botiquin', label: 'ID Botiquín', placeholder: '183', defaultValue: '183' },
      { name: 'nombre_botiquin', label: 'Nombre de Botiquín', placeholder: 'BOTIQUIN PEDIATRIA REMISSE CASA', defaultValue: 'BOTIQUIN PEDIATRIA REMISSE CASA' }
    ],
    notes: 'El almacén queda registrado como activo para abastecimiento de fármacos de emergencia.',
    tags: ['botiquin', 'almacen', 'mae_almacen', 'mad', 'farmacia', 'query-funciones']
  },
  {
    id: 'cat-insertar-farmacia',
    title: 'Registrar nueva farmacia en el sistema',
    system: 'Solución Médica (SM) / Farmacia',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'botiquines',
    summary: 'Agrega una farmacia proveedora o sucursal al catálogo maestro de farmacias.',
    sql: `SELECT insertar_farmacias('{nombre_farmacia}');`,
    verificationSql: `SELECT * FROM m_farmacias WHERE nom_far LIKE '%{nombre_farmacia}%';`,
    parameters: [
      { name: 'nombre_farmacia', label: 'Nombre de Farmacia', placeholder: 'FARMACIA SANNA SURCO', defaultValue: 'FARMACIA SANNA SURCO' }
    ],
    notes: 'Registra el local para posterior despacho de recetas y órdenes de medicamentos.',
    tags: ['farmacia', 'catalogo', 'farmacias', 'alta', 'sm', 'query-funciones']
  },
  {
    id: 'cat-insertar-motorizado',
    title: 'Registrar nuevo motorizado de delivery',
    system: 'Solución Médica (SM) / Delivery',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'botiquines',
    summary: 'Registra un repartidor motorizado con su alias y código de flota para entrega de medicamentos.',
    sql: `SELECT insertar_motorizado('{nombre}', '{alias}', '{codigo}');`,
    verificationSql: `SELECT * FROM m_proveedor_motorizado;`,
    parameters: [
      { name: 'nombre', label: 'Nombre Completo', placeholder: 'JUAN PEREZ MENDOZA', defaultValue: 'JUAN PEREZ MENDOZA' },
      { name: 'alias', label: 'Alias', placeholder: 'JP-MOTO1', defaultValue: 'JP-MOTO1' },
      { name: 'codigo', label: 'Código Operativo', placeholder: 'MOTO-042', defaultValue: 'MOTO-042' }
    ],
    notes: 'Habilita al motorizado en el panel de despacho de pedidos de delivery.',
    tags: ['motorizado', 'delivery', 'repartidor', 'flota', 'sm', 'query-funciones']
  },
  {
    id: 'amb-servicios-cliente',
    title: 'Configurar servicios y distritos para cliente de ambulancia',
    system: 'Ambulancias',
    systemCode: 'amb',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'botiquines',
    summary: 'Asocia tipos de servicio, distritos y tarifas de cobertura para convenios de ambulancia.',
    sql: `-- 1. Agregar tipos de servicio al cliente:\nSELECT cliente_agregar_tipo_serv('{cod_cliente}');\n\n-- 2. Asignar distritos de una provincia:\nSELECT inserta_distrito_x_provincia('{cod_grupo}', '{provincia}');\n\n-- 3. Asignar servicio a cliente ambulancia:\nSELECT inserta_t_amb_asegxserv('{cod_cliente}', '{cod_serv}');\n\n-- 4. Registrar tarifa de servicio:\nSELECT insertar_t_amb_tarifa_asegxserv({id_tarifa});`,
    verificationSql: `SELECT * FROM m_grupos WHERE cod_gru = '{cod_grupo}';`,
    parameters: [
      { name: 'cod_cliente', label: 'Código de Cliente', placeholder: '2228', defaultValue: '2228' },
      { name: 'cod_grupo', label: 'Código de Grupo', placeholder: '1400', defaultValue: '1400' },
      { name: 'provincia', label: 'Provincia', placeholder: 'LIMA', defaultValue: 'LIMA' },
      { name: 'cod_serv', label: 'Código Servicio', placeholder: '01', defaultValue: '01' },
      { name: 'id_tarifa', label: 'ID Tarifa', placeholder: '15', defaultValue: '15' }
    ],
    notes: 'Configura la matriz completa de cobertura y zonificación tarifaria para convenios corporativos o EPS.',
    tags: ['ambulancia', 'tarifa', 'distrito', 'cobertura', 'convenio', 'sm', 'query-funciones']
  },

  // --- FACTURACIÓN, SAP HANA & COMPROBANTES ---
  {
    id: 'sap-nullear-docentry-sn',
    title: 'Desbloquear pedidos en SAP (Socio de Negocio con sap_docentry_sn = -1)',
    system: 'Facturación / SAP HANA',
    systemCode: 'sap',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'sap_fact',
    summary: 'Reinicia el estado de socios de negocio atascados en -1 para que la integración vuelva a enviarlos a SAP Business One.',
    sql: `UPDATE h_gre_socio_negocio\nSET sap_docentry_sn = NULL\nWHERE cod_ped IN ({cod_ped});`,
    verificationSql: `SELECT * FROM h_gre_socio_negocio WHERE cod_ped IN ({cod_ped});\nSELECT cod_ped, cod_ate, cm_estado FROM t_tmppedidomed WHERE cod_ped IN ({cod_ped});`,
    parameters: [
      { name: 'cod_ped', label: 'Código(s) de Pedido', placeholder: '4259029, 4258685, 4259502', defaultValue: '4259029, 4258685, 4259502' }
    ],
    notes: 'Cuando SAP devuelve -1 por timeout o error transitorio de red, nuléalo para que el integrador lo reintente limpiamente.',
    tags: ['sap', 'socio de negocio', 'docentry', 'gre', 'sap hana', 'facturacion']
  },
  {
    id: 'sap-comprobantes-acumulados',
    title: 'Monitorear comprobantes pendientes de migración a SAP',
    system: 'Facturación Electrónica / SAP',
    systemCode: 'sap',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'sap_fact',
    summary: 'Audita comprobantes emitidos que aún no han sido registrados con docentry contable en SAP B1.',
    sql: `SELECT serie_comprobante, COUNT(id_comprobante) AS total_pendientes\nFROM h_comprobante\nWHERE fecha_emision >= '{fecha_desde}' AND sap_docentry_ce IS NULL\nGROUP BY serie_comprobante\nORDER BY total_pendientes DESC;`,
    verificationSql: ``,
    parameters: [
      { name: 'fecha_desde', label: 'Fecha Desde (YYYYMMDD)', placeholder: '20260401', defaultValue: '20260401' }
    ],
    notes: 'Permite anticipar descuadres en los cierres contables mensuales de facturación ambulatoria.',
    tags: ['sap', 'comprobante', 'docentry', 'facturacion', 'pendiente']
  },

  // --- PROGRAMACIÓN MÉDICA & TURNOS ---
  {
    id: 'prog-modificar-turnos-doctores',
    title: 'Modificar turnos en Programación Médica',
    system: 'Programación Médica',
    systemCode: 'prog_med',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'turnos',
    summary: 'Corrige estados de turnos asignados a médicos en la grilla mensual de programación.',
    sql: `UPDATE t_prog_doctorxturno\nSET estado_prog = '{nuevo_estado}'\nWHERE estado_prog = '{estado_actual}' AND fecini_asig BETWEEN '{fec_ini}' AND '{fec_fin}';`,
    verificationSql: `SELECT * FROM t_prog_doctorxturno\nWHERE fecini_asig BETWEEN '{fec_ini}' AND '{fec_fin}' AND estado_prog = '{estado_actual}';`,
    parameters: [
      { name: 'nuevo_estado', label: 'Nuevo Estado (ej. 2)', placeholder: '2', defaultValue: '2' },
      { name: 'estado_actual', label: 'Estado Actual (ej. x)', placeholder: 'x', defaultValue: 'x' },
      { name: 'fec_ini', label: 'Fecha Inicio (YYYYMMDD)', placeholder: '20260401', defaultValue: '20260401' },
      { name: 'fec_fin', label: 'Fecha Fin (YYYYMMDD)', placeholder: '20260430', defaultValue: '20260430' }
    ],
    notes: 'Utilizado para destrabar turnos que quedaron marcados con "x" por conflicto en la interfaz web de turnos.',
    tags: ['turnos', 'programacion', 'medicos', 'horarios', 'sm']
  },

  // --- PACIENTES, FILIACIÓN & UBIGEO ---
  {
    id: 'pac-cambiar-nombre-paciente',
    title: 'Modificar nombre o apellidos del paciente',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'pacientes',
    summary: 'Actualiza el Apellido Paterno, Apellido Materno o Nombres del paciente en una atención registrada.',
    sql: `SELECT cambia_nombrespac({cod_ate}, '{tipo}', '{nuevo_nombre}');`,
    verificationSql: `SELECT cod_ate, appat_pac, apmat_pac, nom_pac\nFROM t_tmpllamadas\nWHERE cod_ate = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '10001', defaultValue: '10001' },
      { name: 'tipo', label: 'Tipo (P=Paterno, M=Materno, N=Nombres)', placeholder: 'P', defaultValue: 'P' },
      { name: 'nuevo_nombre', label: 'Nuevo Nombre / Apellido', placeholder: 'QUISPE', defaultValue: 'QUISPE' }
    ],
    notes: 'P = Apellido Paterno, M = Apellido Materno, N = Nombres.',
    tags: ['paciente', 'nombre', 'apellido', 'filiacion', 'sm', 'query-funciones']
  },
  {
    id: 'pac-modificar-distrito-provincia',
    title: 'Modificar provincia y distrito de una atención',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'pacientes',
    summary: 'Corrige los códigos de provincia y distrito asignados a una llamada o servicio médico.',
    sql: `SELECT modifica_dis_prov({cod_ate}, '{cod_prov}', '{cod_dist}');`,
    verificationSql: `SELECT cod_ate, cod_prov, cod_dis, dir_ate\nFROM t_tmpllamadas\nWHERE cod_ate = {cod_ate};`,
    parameters: [
      { name: 'cod_ate', label: 'Código de Atención', placeholder: '5193403', defaultValue: '5193403' },
      { name: 'cod_prov', label: 'Código de Provincia', placeholder: 'L0', defaultValue: 'L0' },
      { name: 'cod_dist', label: 'Código de Distrito', placeholder: 'L01', defaultValue: 'L01' }
    ],
    notes: 'L0 = Lima Provincia. L01 = Miraflores, L02 = San Isidro, etc.',
    tags: ['distrito', 'provincia', 'ubigeo', 'direccion', 'sm', 'query-funciones']
  },
  {
    id: 'pac-verificar-fnac-paciente',
    title: 'Verificar y corregir fecha de nacimiento del paciente',
    system: 'Solución Médica (SM)',
    systemCode: 'sm',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'pacientes',
    summary: 'Consulta la historia y datos maestros del paciente para validar si la fecha de nacimiento está bien grabada.',
    sql: `SELECT cod_hia, nom_pac, appat_pac, apmat_pac, fnac_pac, sex_pac\nFROM m_pacientesdrmas\nWHERE cod_hia = '{cod_hia}';`,
    verificationSql: ``,
    parameters: [
      { name: 'cod_hia', label: 'Código Historia Clínica', placeholder: '11328815', defaultValue: '11328815' }
    ],
    notes: 'Si la fecha está mal escrita, SITEDS o la emisión de recetas electrónicas rechazan la atención.',
    tags: ['nacimiento', 'fnac_pac', 'historia clinica', 'paciente', 'sm']
  },

  // --- RECLAMOS & ATENCIÓN AL CLIENTE ---
  {
    id: 'rec-ruteo-responsables-reclamos',
    title: 'Consultar y rutear responsables de área en Reclamos',
    system: 'Reclamos',
    systemCode: 'reclamos',
    engine: 'PostgreSQL',
    database: 'hipocrates',
    server: '10.6.16.14:5432',
    category: 'turnos',
    summary: 'Mapea las áreas de reclamos y sus responsables asignados para notificación por correo electrónico.',
    sql: `SELECT a.id_area_recl, a.nom_area, b.id_resp, c.descripcion_resp, d.nom_usu\nFROM m_reclamo_area a\nINNER JOIN t_reclamo_areaxresp b ON a.id_area_recl = b.id_area_recl\nINNER JOIN m_reclamo_responsable c ON b.id_resp = c.id_resp\nINNER JOIN m_usuarios d ON c.nom_usu = d.nom_usu\nWHERE d.nom_usu = '{usuario_login}';`,
    verificationSql: `SELECT * FROM t_reclamo WHERE cod_servicio = {cod_servicio};`,
    parameters: [
      { name: 'usuario_login', label: 'Login de Usuario', placeholder: 'APALACIOS', defaultValue: 'APALACIOS' },
      { name: 'cod_servicio', label: 'Código de Servicio Reclamado', placeholder: '5047543', defaultValue: '5047543' }
    ],
    notes: 'Permite auditar por qué un reclamo no le llegó por correo al supervisor del área correspondiente.',
    tags: ['reclamos', 'atencion al cliente', 'correo', 'responsables', 'sm']
  },

  // --- DR. ONLINE WEB ---
  {
    id: 'dro-reporte-mfa-usuarios',
    title: 'Reporte de usuarios, CMP y estado MFA en Dr. Online Web',
    system: 'Dr. Online',
    systemCode: 'dronline',
    engine: 'PostgreSQL',
    database: 'hipocrates / dronline_db',
    server: '10.6.16.14:5432',
    category: 'mfa',
    summary: 'Reporta médicos y administrativos con último acceso, cambio de clave y estado de activación del segundo factor MFA.',
    sql: `SELECT u.nombres, u.email, u.cmp,\n       CASE WHEN u.rol = 1 THEN 'Médico' WHEN u.rol = 2 THEN 'Administrativo' ELSE 'Administrador' END AS rol,\n       CASE WHEN u.status = 1 THEN 'Activo' ELSE 'Inactivo' END AS estado,\n       u.last_login AS fecha_ultima_conexion,\n       u.password_last_change_at AS fecha_ultimo_cambio_clave,\n       CASE WHEN u.validated_email = 1 THEN 'Sí' ELSE 'No' END AS mfa_requerido,\n       CASE WHEN u.code_register = 1 THEN 'Sí' ELSE 'No' END AS mfa_activo\nFROM users u\nORDER BY u.last_login DESC;`,
    verificationSql: ``,
    parameters: [],
    notes: 'Fundamental para resolver incidencias de médicos que no reciben su código de verificación para teleconsultas.',
    tags: ['dronline', 'mfa', 'cmp', 'telemedicina', 'usuarios', 'seguridad']
  }
,
  {
  id: "sec-topicare-quitar-mfa",
  title: "Quitar / Resetear MFA en Topicare (SQL Server)",
  system: "Tablet Médica",
  systemCode: "tablet",
  engine: "SQL Server",
  database: "BD_Sanna_ambulatoria",
  server: "10.6.16.10:1433",
  category: "mfa",
  summary: "Reinicia el estado de doble factor de autenticación (MFA) para un usuario en Topicare (secret_key_approved = 0).",
  sql: "UPDATE [sanna].[users]\nSET secret_key_approved = 0\nWHERE id = {user_id};",
  verificationSql: "SELECT id, name, email, secret_key_approved, created_at\nFROM [sanna].[users]\nWHERE email = '{email}' OR id = {user_id};",
  parameters: [
    {
      name: "user_id",
      label: "ID de Usuario",
      placeholder: "161",
      defaultValue: "161"
    },
    {
      name: "email",
      label: "Email del Usuario",
      placeholder: "jlopez@base4sec.com",
      defaultValue: "jlopez@base4sec.com"
    }
  ],
  notes: "Valor 0 reinicia el enrolamiento MFA para que el usuario vuelva a escanear su QR; 1 indica MFA activo.",
  tags: [
    "mfa",
    "topicare",
    "autenticacion",
    "sql",
    "users",
    "query-funciones"
  ]
},
  {
  id: "sm-telemedicina-agregar-medicamento",
  title: "Habilitar medicamento para Telemedicina (flg_telemedicina)",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Activa la bandera flg_telemedicina = 1 en el maestro m_medicamentos2 para que pueda recetarse en teleconsulta.",
  sql: "UPDATE m_medicamentos2\nSET flg_telemedicina = 1\nWHERE des_med ILIKE '%{nombre_med}%';",
  verificationSql: "SELECT cod_med, des_med, flg_telemedicina, activo\nFROM m_medicamentos2\nWHERE des_med ILIKE '%{nombre_med}%';",
  parameters: [
    {
      name: "nombre_med",
      label: "Nombre o Frase del Medicamento",
      placeholder: "GLIMIDE 4MG TABLE CAJA X30",
      defaultValue: "GLIMIDE 4MG TABLE CAJA X30"
    }
  ],
  notes: "Permite que los médicos virtuales puedan visualizar y prescribir este fármaco en la plataforma de telemedicina.",
  tags: [
    "telemedicina",
    "medicamentos",
    "recetas",
    "sm",
    "postgre",
    "query-funciones"
  ]
},
  {
  id: "sm-retornar-estado3",
  title: "Retornar atención médica a Estado 3 (En Curso)",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Regresa una atención médica a su estado 3 cuando quedó bloqueada o requiere reingreso de evolución.",
  sql: "SELECT retornar_estado('3', {cod_ate});",
  verificationSql: "SELECT cod_ate, cod_estado, cm_estado, fec_ate, hra_ate\nFROM t_tmpllamadas\nWHERE cod_ate = {cod_ate};",
  parameters: [
    {
      name: "cod_ate",
      label: "Código de Atención",
      placeholder: "6402982",
      defaultValue: "6402982"
    }
  ],
  notes: "Ejecuta la función del sistema retornar_estado con parámetro 3.",
  tags: [
    "estado",
    "retornar",
    "estado3",
    "sm",
    "postgre",
    "query-funciones"
  ]
},
  {
  id: "sm-cambio-vnr-estado7",
  title: "Preparación para cambio a VNR (Retorno a Estado 7)",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Para el cambio a VNR (Visita No Realizada), primero se debe pasar la atención al estado 7 para que el usuario operativo pueda completar la gestión.",
  sql: "SELECT retornar_estado('7', {cod_ate});",
  verificationSql: "SELECT cod_ate, cod_estado, cm_estado, obs_ate\nFROM t_tmpllamadas\nWHERE cod_ate = {cod_ate};",
  parameters: [
    {
      name: "cod_ate",
      label: "Código de Atención",
      placeholder: "6540610",
      defaultValue: "6540610"
    }
  ],
  notes: "Procedimiento estándar documentado: pasar primero al estado 7 antes de ejecutar el cambio a VNR en la interfaz.",
  tags: [
    "vnr",
    "estado7",
    "retornar",
    "sm",
    "postgre",
    "query-funciones"
  ]
},
  {
  id: "sm-anular-id-project",
  title: "Anular ID Project (Ingreso Unidad de Negocio)",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Actualiza el estado de un proyecto en h_ingreso_un a 9 (Anulado) para liberar facturación o duplicidad.",
  sql: "UPDATE h_ingreso_un\nSET id_estado_inun = 9\nWHERE id_project = '{id_project}';",
  verificationSql: "SELECT id_project, id_estado_inun, fec_registro, usuario_crea\nFROM h_ingreso_un\nWHERE id_project = '{id_project}';",
  parameters: [
    {
      name: "id_project",
      label: "Código ID Project",
      placeholder: "PO250600011600",
      defaultValue: "PO250600011600"
    }
  ],
  notes: "Estado 9 representa anulación formal en los registros de ingresos de unidad de negocio.",
  tags: [
    "project",
    "ingresos",
    "anulacion",
    "sm",
    "postgre",
    "query-funciones"
  ]
},
  {
  id: "sm-servicio-playa-call-medico",
  title: "Habilitar Servicio Playa en Atención de Call Médico",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Activa las banderas de ambulancia y servicio de playa en t_tmpllamadas y callmed_tmp_ate para coberturas especiales en balnearios.",
  sql: "UPDATE t_tmpllamadas SET amb_servicio_playa = 1 WHERE cod_ate = {cod_ate};\nUPDATE callmed_tmp_ate SET flg_ambulancia_playa = true WHERE cod_ate = {cod_ate};",
  verificationSql: "SELECT cod_ate, amb_servicio_playa FROM t_tmpllamadas WHERE cod_ate = {cod_ate};\nSELECT cod_ate, flg_ambulancia_playa FROM callmed_tmp_ate WHERE cod_ate = {cod_ate};",
  parameters: [
    {
      name: "cod_ate",
      label: "Código de Atención",
      placeholder: "6673832",
      defaultValue: "6673832"
    }
  ],
  notes: "Asegura que el despacho de ambulancia reconozca el recargo y condiciones de servicio en temporada de playa.",
  tags: [
    "playa",
    "callmed",
    "ambulancia",
    "sm",
    "postgre",
    "query-funciones"
  ]
},
  {
  id: "sec-asegurabilidad-mfa",
  title: "Quitar MFA a usuario de Portal Asegurabilidad (SQL Server)",
  system: "Portal Asegurabilidad",
  systemCode: "tablet",
  engine: "SQL Server",
  database: "BD_Sanna_ambulatoria",
  server: "10.6.16.10:1433",
  category: "mfa",
  summary: "Desactiva MFA y limpia el secret del usuario en la base de datos de Asegurabilidad.",
  sql: "UPDATE [dbo].[users]\nSET isMfaEnabled = 0, mfaSecrect = NULL, updateAt = GETDATE()\nWHERE username = '{username}';",
  verificationSql: "SELECT id, username, email, isMfaEnabled, status, updateAt\nFROM [dbo].[users]\nWHERE username LIKE '%{username}%';",
  parameters: [
    {
      name: "username",
      label: "Nombre de Usuario",
      placeholder: "aflores",
      defaultValue: "aflores"
    }
  ],
  notes: "Permite al colaborador volver a configurar su autenticador Microsoft Authenticator o Google Authenticator desde cero.",
  tags: [
    "asegurabilidad",
    "mfa",
    "seguridad",
    "sql",
    "users",
    "query-funciones"
  ]
},
  {
  id: "sec-asegurabilidad-buscar-usuarios",
  title: "Consultar usuarios y estado en Portal Asegurabilidad",
  system: "Portal Asegurabilidad",
  systemCode: "tablet",
  engine: "SQL Server",
  database: "BD_Sanna_ambulatoria",
  server: "10.6.16.10:1433",
  category: "permisos",
  summary: "Consulta la lista de usuarios, perfil, expiración, estado activo y configuración MFA en Asegurabilidad.",
  sql: "SELECT id, username, email, names, patSurname, isMfaEnabled, status, userExpirationDate, createAt\nFROM [dbo].[users]\nWHERE username LIKE '%{search}%' OR email LIKE '%{search}%'\nORDER BY createAt DESC;",
  verificationSql: "",
  parameters: [
    {
      name: "search",
      label: "Filtro (Usuario o Correo)",
      placeholder: "sanna.pe",
      defaultValue: "sanna.pe"
    }
  ],
  notes: "Útil para auditorías de cuentas activas y verificación de vencimiento de credenciales.",
  tags: [
    "asegurabilidad",
    "usuarios",
    "consulta",
    "sql",
    "query-funciones"
  ]
},
  {
  id: "sec-permisos-provision-unegocio",
  title: "Validar permisos de usuario para Provisión (Unidad de Negocio)",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "permisos",
  summary: "Verifica si el usuario tiene asignada una unidad de negocio activa para poder realizar la provisión de atenciones.",
  sql: "SELECT un.id_unegocio, un.des_unegocio, un.activo, unusu.login\nFROM mae_unidad_negocio un\nINNER JOIN i_unegocio_usuario unusu ON un.id_unegocio = unusu.id_unegocio\nWHERE un.activo = true AND unusu.login = '{login}';",
  verificationSql: "SELECT * FROM i_unegocio_usuario WHERE login = '{login}';\nSELECT * FROM mae_unidad_negocio WHERE activo = true;",
  parameters: [
    {
      name: "login",
      label: "Login de Usuario",
      placeholder: "KMUNIOZ",
      defaultValue: "KMUNIOZ"
    }
  ],
  notes: "Si la consulta no devuelve registros, el usuario no podrá provisionar atenciones en SM hasta que se le asocie a una unidad activa.",
  tags: [
    "provision",
    "permisos",
    "unegocio",
    "sm",
    "postgre",
    "query-funciones"
  ]
},
  {
  id: "aud-eliminar-atencion-auditoria",
  title: "Eliminar registro de Auditoría Médica por Atención",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Ejecuta la función eliminar_atencion_auditoria para limpiar la auditoría médica asociada a una atención específica.",
  sql: "SELECT eliminar_atencion_auditoria({cod_ate});",
  verificationSql: "SELECT * FROM h_aud_medica_calidad_atencion WHERE atencion = {cod_ate};\nSELECT * FROM h_aud_medica_detalle WHERE cod_ate = {cod_ate};",
  parameters: [
    {
      name: "cod_ate",
      label: "Código de Atención",
      placeholder: "6225626",
      defaultValue: "6225626"
    }
  ],
  notes: "Limpia la auditoría de la atención permitiendo que sea reevaluada o eliminada del reporte de calidad.",
  tags: [
    "auditoria",
    "calidad",
    "eliminar",
    "sm",
    "postgre",
    "query-funciones"
  ]
},
  {
  id: "aud-eliminar-semana-auditoria",
  title: "Eliminar Semana de Auditoría por Nro Generado",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Elimina la semana de auditoría generada (campo nro_gene) cuando se requiere regenerar o reiniciar la semana.",
  sql: "SELECT eliminar_semana_auditoria_por_nro_gene('{nro_gene}');",
  verificationSql: "SELECT * FROM m_aud_medica_semanas WHERE nro_gene = '{nro_gene}';",
  parameters: [
    {
      name: "nro_gene",
      label: "Nro Generado de Semana",
      placeholder: "I00000176",
      defaultValue: "I00000176"
    }
  ],
  notes: "El campo nro_gene se genera en el módulo de auditoría al abrir una nueva semana de control.",
  tags: [
    "auditoria",
    "semana",
    "nro_gene",
    "sm",
    "postgre",
    "query-funciones"
  ]
},
  {
  id: "aud-limpiar-auditoria-cascada",
  title: "Limpiar tablas de Auditoría Médica de Calidad en Cascada",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Depuración profunda de puntajes, registros y marcas de auditoría médica para una atención que debe ser re-auditada.",
  sql: "DELETE FROM h_aud_medica_calidad_REG_puntaje WHERE ATENCION IN ({cod_ate});\nDELETE FROM h_aud_medica_calidad_ate_puntaje WHERE ATENCION = {cod_ate};\nDELETE FROM H_AUD_MEDICA_CALIDAD_REG WHERE ATENCION = {cod_ate};\nDELETE FROM h_aud_medica_calidad_atencion WHERE ATENCION = {cod_ate};\nUPDATE h_aud_medica_detalle SET FLG_AUDITADA = FALSE WHERE COD_aTE = {cod_ate};",
  verificationSql: "SELECT atencion, puntaje FROM h_aud_medica_calidad_ate_puntaje WHERE atencion = {cod_ate};\nSELECT cod_ate, flg_auditada FROM h_aud_medica_detalle WHERE cod_ate = {cod_ate};",
  parameters: [
    {
      name: "cod_ate",
      label: "Código de Atención",
      placeholder: "6226811",
      defaultValue: "6226811"
    }
  ],
  notes: "Ejecuta el borrado secuencial en 4 tablas de calidad y restablece FLG_AUDITADA a false en h_aud_medica_detalle.",
  tags: [
    "auditoria",
    "calidad",
    "limpieza",
    "puntaje",
    "sm",
    "postgre",
    "query-funciones"
  ]
},
  {
  id: "aud-accesos-perfil-auditoria",
  title: "Consultar perfiles y accesos a Auditoría Médica",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "permisos",
  summary: "Muestra la asignación de perfiles de auditoría por usuario y servicios asistenciales habilitados.",
  sql: "SELECT u.login, u.id_perfil, p.des_perfil\nFROM h_aud_medica_perfilxusuario u\nLEFT JOIN m_aud_medica_perfil p ON u.id_perfil = p.id_perfil\nWHERE u.login ILIKE '%{login}%';",
  verificationSql: "SELECT * FROM m_aud_medica_ate_x_servicio;\nSELECT * FROM m_aud_medica_perfil;",
  parameters: [
    {
      name: "login",
      label: "Usuario a Consultar",
      placeholder: "joseph",
      defaultValue: "joseph"
    }
  ],
  notes: "Cruza h_aud_medica_perfilxusuario con m_aud_medica_perfil.",
  tags: [
    "auditoria",
    "perfil",
    "acceso",
    "permisos",
    "sm",
    "postgre",
    "query-funciones"
  ]
},
  {
  id: "mds-eliminar-registros-medico-id",
  title: "Eliminar Registros de Médico Asociado por ID (Stored Procedure)",
  system: "Médicos Asociados (MDS)",
  systemCode: "mds",
  engine: "SQL Server",
  database: "BD_MediSanna",
  server: "10.6.16.10:1433",
  category: "medicos_asoc",
  summary: "Ejecuta el SP eliminar_registros_medico_por_id para purgar un registro médico inconsistente o duplicado.",
  sql: "EXEC eliminar_registros_medico_por_id @id_medico = {id_medico};",
  verificationSql: "SELECT * FROM medicos_asociados_medico WHERE id = {id_medico};",
  parameters: [
    {
      name: "id_medico",
      label: "ID del Médico",
      placeholder: "3924",
      defaultValue: "3924"
    }
  ],
  notes: "Borra en cascada los registros asociados al ID médico en la plataforma de Médicos Asociados.",
  tags: [
    "mds",
    "medico",
    "eliminar",
    "sp",
    "sql",
    "query-funciones"
  ]
},
  {
  id: "mds-actualizar-apellidos-medico",
  title: "Actualizar apellidos de Médico Asociado por Email",
  system: "Médicos Asociados (MDS)",
  systemCode: "mds",
  engine: "SQL Server",
  database: "BD_MediSanna",
  server: "10.6.16.10:1433",
  category: "medicos_asoc",
  summary: "Busca y actualiza los apellidos correctos del médico en Médicos Asociados filtrando por su correo electrónico.",
  sql: "UPDATE medicos_asociados_medico\nSET apellidos = '{apellidos}'\nWHERE email = '{email}';",
  verificationSql: "SELECT id, nombres, apellidos, email, activo\nFROM medicos_asociados_medico\nWHERE email = '{email}';",
  parameters: [
    {
      name: "email",
      label: "Correo del Médico",
      placeholder: "DRA.ERIKAGAMARRA@GMAIL.COM",
      defaultValue: "DRA.ERIKAGAMARRA@GMAIL.COM"
    },
    {
      name: "apellidos",
      label: "Nuevos Apellidos",
      placeholder: "GAMARRA TONG",
      defaultValue: "GAMARRA TONG"
    }
  ],
  notes: "Corrige discrepancias ortográficas o de colegiatura en el portal de médicos asociados.",
  tags: [
    "mds",
    "medico",
    "apellidos",
    "email",
    "sql",
    "query-funciones"
  ]
},
  {
  id: "mds-cambiar-unidad-solicitud",
  title: "Cambiar unidad / servicio en Solicitud de Médicos Asociados",
  system: "Médicos Asociados (MDS)",
  systemCode: "mds",
  engine: "SQL Server",
  database: "BD_MediSanna",
  server: "10.6.16.10:1433",
  category: "medicos_asoc",
  summary: "Actualiza la columna servicio en medicos_asociados_solicitud (ej. tsana, mo) para canalizar la solicitud correctamente.",
  sql: "UPDATE medicos_asociados_solicitud\nSET servicio = '{servicio}'\nWHERE nro_solicitud = {nro_solicitud};",
  verificationSql: "SELECT nro_solicitud, servicio, id_medico, fec_creacion\nFROM medicos_asociados_solicitud\nWHERE nro_solicitud = {nro_solicitud};\n\nSELECT DISTINCT servicio FROM medicos_asociados_solicitud;",
  parameters: [
    {
      name: "nro_solicitud",
      label: "Nro de Solicitud",
      placeholder: "76892",
      defaultValue: "76892"
    },
    {
      name: "servicio",
      label: "Servicio Destino (ej: tsana, mo)",
      placeholder: "tsana",
      defaultValue: "tsana"
    }
  ],
  notes: "Servicios habituales: tsana (Teleatención Sanna), mo (Médico Online / Ambulatorio).",
  tags: [
    "mds",
    "solicitud",
    "servicio",
    "unidad",
    "tsana",
    "mo",
    "sql",
    "query-funciones"
  ]
},
  {
  id: "ibt-seguimiento-atenciones",
  title: "Fijas IBT: Consulta de Solicitudes y Horarios de Traslado",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Herramienta de diagnóstico rápido para atenciones IBT: cruce de asegurado, historias clínicas y sincronización de horarios de cita.",
  sql: "SELECT fec_cita_ibt, hor_cita_ibt, * FROM public.callmed_tmp_ate WHERE cod_ate = '{cod_ate}';\nSELECT fec_ate, hor_ate, obs_cm, * FROM t_tmpllamadas WHERE cod_ate = '{cod_ate}';",
  verificationSql: "SELECT * FROM public.ibt_m_asegurado WHERE cod_asegurado_ibt = '{cod_asegurado}';\nSELECT * FROM vw_seguimiento_atencion_ibt WHERE nro_solicitud = '{nro_solicitud}';\nSELECT * FROM m_direcciones WHERE cod_tit = '{cod_tit}';",
  parameters: [
    {
      name: "cod_ate",
      label: "Código de Atención",
      placeholder: "6480590",
      defaultValue: "6480590"
    },
    {
      name: "cod_asegurado",
      label: "Código Asegurado IBT",
      placeholder: "88023",
      defaultValue: "88023"
    },
    {
      name: "nro_solicitud",
      label: "Nro Solicitud IBT",
      placeholder: "6454070",
      defaultValue: "6454070"
    },
    {
      name: "cod_tit",
      label: "Código Titular / Historia",
      placeholder: "11696155",
      defaultValue: "11696155"
    }
  ],
  notes: "Cruza llamadas de ida y retorno en atenciones IBT para sincronizar las citas de traslado con Callmed.",
  tags: [
    "ibt",
    "seguimiento",
    "citas",
    "horario",
    "sm",
    "postgre",
    "query-funciones"
  ]
},
  {
  id: "pm-buscar-contrasena-doctor",
  title: "Buscar contraseña de Doctor en Programación Médica (m_doctores)",
  system: "Programación Médica / IM",
  systemCode: "prog_med",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "turnos",
  summary: "Consulta las credenciales y contraseña pas_usu de médicos en la tabla m_doctores para asistencia en inicio de sesión.",
  sql: "SELECT login, pas_usu, nom_doc, cmp, flg_bloqueado, act_doc\nFROM m_doctores\nWHERE login = '{login}' OR nom_doc ILIKE '%{nombre}%';",
  verificationSql: "",
  parameters: [
    {
      name: "login",
      label: "Login del Doctor",
      placeholder: "MM11539",
      defaultValue: "MM11539"
    },
    {
      name: "nombre",
      label: "Nombre o Apellido",
      placeholder: "LUCERO",
      defaultValue: "LUCERO"
    }
  ],
  notes: "Permite identificar si el doctor está activo, bloqueado o tiene la contraseña requerida.",
  tags: [
    "doctor",
    "contrasena",
    "prog_med",
    "doctores",
    "sm",
    "postgre",
    "query-funciones"
  ]
},
  {
  id: "tab-reinicia-mfa-tabla-usuario",
  title: "Resetear MFA Tablet directo (UPDATE usuario secret_key = NULL)",
  system: "Tablet Médica",
  systemCode: "tablet",
  engine: "SQL Server",
  database: "BD_Sanna_ambulatoria",
  server: "10.6.16.10:1433",
  category: "mfa",
  summary: "Limpia la secret_key en la tabla usuario de SQL Server cuando el stored procedure reiniciar_mfa_usuario no surte efecto inmediato.",
  sql: "UPDATE usuario\nSET secret_key = NULL\nWHERE login = '{login}';",
  verificationSql: "SELECT login, nombre, secret_key, estado\nFROM usuario\nWHERE login = '{login}';",
  parameters: [
    {
      name: "login",
      label: "Login de Usuario Tablet",
      placeholder: "usuario",
      defaultValue: "usuario"
    }
  ],
  notes: "Pone secret_key en NULL permitiendo al doctor re-enrolar su autenticador en la tablet.",
  tags: [
    "tablet",
    "mfa",
    "secret_key",
    "usuario",
    "sql",
    "query-funciones"
  ]
},
  {
  id: "cat-laboratorios-proveedores",
  title: "Consultar Proveedores de Laboratorio",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "botiquines",
  summary: "Consulta el catálogo maestro de laboratorios proveedores ordenados por código.",
  sql: "SELECT * FROM m_lab_laboratorios ORDER BY 1 ASC;",
  verificationSql: "",
  parameters: [],
  notes: "Maestro utilizado para derivación y liquidación de órdenes de laboratorio.",
  tags: [
    "laboratorio",
    "proveedores",
    "maestros",
    "sm",
    "postgre",
    "query-funciones"
  ]
},
  {
  id: "sm-cambiar-tipo-doc-pago-directo",
  title: "Cambiar Boleta a Factura o viceversa en Llamadas (B/F)",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "pagos",
  summary: "Modifica directamente la columna tipo_doc_pago en t_tmpllamadas (B: Boleta, F: Factura) cuando el paciente solicita cambio de comprobante.",
  sql: "UPDATE t_tmpllamadas\nSET tipo_doc_pago = '{tipo_doc}'\nWHERE cod_ate IN ({cod_ate});",
  verificationSql: "SELECT cod_ate, tipo_doc_pago, numero_ce, paciente\nFROM t_tmpllamadas\nWHERE cod_ate IN ({cod_ate});",
  parameters: [
    {
      name: "cod_ate",
      label: "Código(s) de Atención",
      placeholder: "7159446",
      defaultValue: "7159446"
    },
    {
      name: "tipo_doc",
      label: "Tipo Doc (B: Boleta / F: Factura)",
      placeholder: "B",
      defaultValue: "B"
    }
  ],
  notes: "Valores válidos: B para Boleta y F para Factura.",
  tags: [
    "boleta",
    "factura",
    "comprobante",
    "pagos",
    "sm",
    "postgre",
    "query-funciones"
  ]
}
,
  {
  id: "tab-diagnostico-no-migra-tablet",
  title: "Diagnóstico: Motivo por el cual una atención no migra a Tablet MAD",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Evalúa ventana de tiempo (±8h), exportación, lote actual y asignación médica para explicar en texto por qué la atención no pasa a la Tablet.",
  sql: "SELECT public.fn_motivo_no_migra_tablet_mad({cod_ate}::bigint) AS motivo_diagnostico;",
  verificationSql: "SELECT cod_ate, cm_estado, fec_ate, hra_ate, cod_doc, cod_esp FROM t_tmpllamadas WHERE cod_ate = {cod_ate};",
  parameters: [
    {
      name: "cod_ate",
      label: "Código de Atención",
      placeholder: "6540610",
      defaultValue: "6540610"
    }
  ],
  notes: "Función nativa de diagnóstico profundo. Si devuelve vacío o texto de bloqueo, indica exactamente qué condición falta (ej. fuera de ventana o sin médico).",
  tags: [
    "tablet",
    "diagnostico",
    "mad",
    "migracion",
    "sm",
    "postgre",
    "auditoria-db"
  ]
},
  {
  id: "tab-validar-lote-atenciones-tablet",
  title: "Validar lote masivo de atenciones para Tablet Médica",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Evalúa un conjunto de atenciones y devuelve el diagnóstico individual de preparación para la Tablet.",
  sql: "SELECT * FROM public.fn_validar_atenciones_tablet(ARRAY[{lista_cod_ate}]);",
  verificationSql: "SELECT cod_ate, cm_estado FROM t_tmpllamadas WHERE cod_ate IN ({lista_cod_ate});",
  parameters: [
    {
      name: "lista_cod_ate",
      label: "Lista de Atenciones (separadas por coma)",
      placeholder: "6540610, 6540611",
      defaultValue: "6540610, 6540611"
    }
  ],
  notes: "Permite pasar múltiples códigos de atención separados por comas para auditar lotes retenidos.",
  tags: [
    "tablet",
    "lote",
    "diagnostico",
    "mad",
    "sm",
    "postgre",
    "auditoria-db"
  ]
},
  {
  id: "tab-reinicializar-atencion-cascada",
  title: "Reinicializar atención corrupta en Tablet Médica (Cascada SP)",
  system: "Tablet Médica",
  systemCode: "tablet",
  engine: "SQL Server",
  database: "BD_Sanna_ambulatoria",
  server: "10.6.16.10:1433",
  category: "atenciones",
  summary: "Purga en cascada 9 tablas de evolución médica (síntomas, recetas, diagnósticos, encuestas) y devuelve el estado a 3 en Tablet para que el médico la cargue limpia.",
  sql: "EXEC [dbo].[REINICIALIZAR_ATENCION] @cod_atencion = {cod_ate};",
  verificationSql: "SELECT cod_atencion, cod_estado, cod_medico, fecha_creacion FROM atencion WHERE cod_atencion = {cod_ate};",
  parameters: [
    {
      name: "cod_ate",
      label: "Código de Atención en Tablet",
      placeholder: "6480574",
      defaultValue: "6480574"
    }
  ],
  notes: "ADVERTENCIA: Ejecutar solo cuando la atención en la Tablet esté corrupta o atascada. Borra estados parciales y devuelve a estado 3.",
  tags: [
    "tablet",
    "reinicializar",
    "cascada",
    "atencion",
    "sql",
    "sp",
    "auditoria-db"
  ]
},
  {
  id: "tab-cancelar-atencion-tablet",
  title: "Cancelar atención en Tablet Médica (Estado 10 SP)",
  system: "Tablet Médica",
  systemCode: "tablet",
  engine: "SQL Server",
  database: "BD_Sanna_ambulatoria",
  server: "10.6.16.10:1433",
  category: "atenciones",
  summary: "Fuerza el estado de la atención a 10 (Cancelada) en la Tablet cuando en Solución Médica ya fue anulada pero sigue abierta en el móvil.",
  sql: "EXEC [dbo].[cancelar_atencion] @cod_atencion = {cod_ate};",
  verificationSql: "SELECT cod_atencion, cod_estado, cod_medico FROM atencion WHERE cod_atencion = {cod_ate};",
  parameters: [
    {
      name: "cod_ate",
      label: "Código de Atención en Tablet",
      placeholder: "6480574",
      defaultValue: "6480574"
    }
  ],
  notes: "Cambia cod_estado a 10 (Cancelada en Tablet).",
  tags: [
    "tablet",
    "cancelar",
    "estado10",
    "anular",
    "sql",
    "sp",
    "auditoria-db"
  ]
},
  {
  id: "sm-retornar-estado-provisionado-sap",
  title: "Retornar estado de atención provisionada a SAP / HHMM",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Desbloquea y retorna el estado de una atención que ya tiene provisión contable hacia SAP o HHMM, reseteando los flags contables con seguridad.",
  sql: "SELECT public.retornar_estado_provisionado_sap('{estado_nuevo}', {cod_ate});",
  verificationSql: "SELECT cod_ate, cm_estado, exp, servicio_provisionado_hhmm, servicio_provisionado_sap FROM t_tmpllamadas WHERE cod_ate = {cod_ate};",
  parameters: [
    {
      name: "estado_nuevo",
      label: "Estado Destino (ej: 2, 3, 7)",
      placeholder: "2",
      defaultValue: "2"
    },
    {
      name: "cod_ate",
      label: "Código de Atención",
      placeholder: "6402982",
      defaultValue: "6402982"
    }
  ],
  notes: "Especialmente diseñada para evitar inconsistencias cuando una atención ya generó flags de provisión contable en SAP o liquidación médica.",
  tags: [
    "sap",
    "provision",
    "retornar",
    "estado",
    "hhmm",
    "sm",
    "postgre",
    "auditoria-db"
  ]
},
  {
  id: "sm-retornar-estado-masivo",
  title: "Retorno masivo de estados de atenciones médicas",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Permite regresar a un estado específico múltiples atenciones en una sola ejecución para contingencias operativas.",
  sql: "SELECT public.retornar_estado_masivo('{estado_nuevo}', ARRAY[{lista_cod_ate}]);",
  verificationSql: "SELECT cod_ate, cm_estado, canc_ate FROM t_tmpllamadas WHERE cod_ate IN ({lista_cod_ate});",
  parameters: [
    {
      name: "estado_nuevo",
      label: "Estado Destino (ej: 2)",
      placeholder: "2",
      defaultValue: "2"
    },
    {
      name: "lista_cod_ate",
      label: "Códigos de Atención (separados por coma)",
      placeholder: "6402982, 6402983",
      defaultValue: "6402982, 6402983"
    }
  ],
  notes: "Ejecuta el retorno por lotes de forma transaccional.",
  tags: [
    "masivo",
    "lote",
    "retornar",
    "estado",
    "sm",
    "postgre",
    "auditoria-db"
  ]
},
  {
  id: "sm-depurar-expedientes-duplicados",
  title: "Verificar y cerrar expedientes duplicados (Últimos 90 días)",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Ejecuta la función f_verif_exp_duplicados para marcar en estado F expedientes duplicados en t_tmpexp y prevenir doble facturación.",
  sql: "SELECT public.f_verif_exp_duplicados() AS depuracion_exitosa;",
  verificationSql: "SELECT a.cod_ate, count(d.cod_exp) AS total_expedientes FROM t_tmpllamadas a JOIN t_tmpexp d ON a.cod_ate = d.codate_exp WHERE a.fec_ate >= current_date - 90 GROUP BY a.cod_ate HAVING count(d.cod_exp) >= 2;",
  parameters: [],
  notes: "Proceso de mantenimiento de integridad referencial. Pone estado_exp = \"F\" en expedientes duplicados abiertos.",
  tags: [
    "expedientes",
    "duplicados",
    "mantenimiento",
    "facturacion",
    "sm",
    "postgre",
    "auditoria-db"
  ]
},
  {
  id: "sm-calcular-tarifa-atencion",
  title: "Simular y calcular tarifa de una atención médica (f_tarifa)",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "pagos",
  summary: "Ejecuta el motor de tarificación institucional calculando el copago según especialidad, cliente, tipo de servicio y condición del paciente.",
  sql: "SELECT public.f_tarifa({cod_ate}) AS tarifa_calculada;",
  verificationSql: "SELECT cod_ate, tar_ate, for_ate, tip_ate, coa_ate, cod_gru FROM t_tmpllamadas WHERE cod_ate = {cod_ate};",
  parameters: [
    {
      name: "cod_ate",
      label: "Código de Atención",
      placeholder: "6480590",
      defaultValue: "6480590"
    }
  ],
  notes: "Permite contrastar lo que el tarifario institucional calcula con el valor grabado en tar_ate de t_tmpllamadas.",
  tags: [
    "tarifa",
    "copago",
    "calculo",
    "pagos",
    "sm",
    "postgre",
    "auditoria-db"
  ]
},
  {
  id: "sm-verificar-tiene-laboratorio",
  title: "Verificar si una atención médica tiene exámenes de Laboratorio",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "atenciones",
  summary: "Diagnóstico rápido de si la atención médica tiene órdenes o muestras de laboratorio asociadas.",
  sql: "SELECT public.f_tiene_laboratorio({cod_ate}) AS tiene_laboratorio;",
  verificationSql: "SELECT cod_ate, tipo_ate, obs_ate FROM t_tmpllamadas WHERE cod_ate = {cod_ate};",
  parameters: [
    {
      name: "cod_ate",
      label: "Código de Atención",
      placeholder: "6480590",
      defaultValue: "6480590"
    }
  ],
  notes: "Devuelve 1 si tiene laboratorio asociado y 0 si no cuenta con órdenes de análisis clínico.",
  tags: [
    "laboratorio",
    "diagnostico",
    "analisis",
    "sm",
    "postgre",
    "auditoria-db"
  ]
},
  {
  id: "sm-asignar-unegocio-usuario",
  title: "Asignar Unidad de Negocio a Usuario para Provisión (Función)",
  system: "Solución Médica (SM)",
  systemCode: "sm",
  engine: "PostgreSQL",
  database: "hipocrates",
  server: "10.6.16.14:5432",
  category: "permisos",
  summary: "Ejecuta insertar_i_unegocio_usuario para asociar formalmente el login del colaborador a una unidad de negocio activa.",
  sql: "SELECT public.insertar_i_unegocio_usuario('{login}', '{id_unegocio}');",
  verificationSql: "SELECT * FROM i_unegocio_usuario WHERE login = '{login}';",
  parameters: [
    {
      name: "login",
      label: "Login del Usuario",
      placeholder: "KMUNIOZ",
      defaultValue: "KMUNIOZ"
    },
    {
      name: "id_unegocio",
      label: "ID Unidad de Negocio",
      placeholder: "1",
      defaultValue: "1"
    }
  ],
  notes: "Habilita al usuario para provisionar atenciones médicas asociadas a esa unidad operativa.",
  tags: [
    "provision",
    "unegocio",
    "permisos",
    "usuario",
    "sm",
    "postgre",
    "auditoria-db"
  ]
},
  {
  id: "tab-extender-caducidad-medico-email",
  title: "Extender caducidad de cuenta de Médico por 2 meses (Email)",
  system: "Tablet Médica",
  systemCode: "tablet",
  engine: "SQL Server",
  database: "BD_Sanna_ambulatoria",
  server: "10.6.16.10:1433",
  category: "permisos",
  summary: "Ejecuta actualizar_fecha_caducidad_por_email sumando automáticamente 2 meses a la fecha de vigencia del doctor en la base de datos.",
  sql: "EXEC [dbo].[actualizar_fecha_caducidad_por_email] @Email = '{email}';",
  verificationSql: "SELECT email, nombres, apellidos, fecha_caducidad FROM medicos_asociados_medico WHERE email = '{email}';",
  parameters: [
    {
      name: "email",
      label: "Correo del Médico",
      placeholder: "doctor@sanna.pe",
      defaultValue: "doctor@sanna.pe"
    }
  ],
  notes: "Ejecuta DATEADD(MONTH, 2, GETDATE()) sobre medicos_asociados_medico.",
  tags: [
    "caducidad",
    "vigencia",
    "medico",
    "email",
    "tablet",
    "sql",
    "sp",
    "auditoria-db"
  ]
},
  {
  id: "tab-enrolar-usuario-medico-conductor",
  title: "Enrolar Médico / Conductor en Tablet (sp_insertar_usuario_MM_CM)",
  system: "Tablet Médica",
  systemCode: "tablet",
  engine: "SQL Server",
  database: "BD_Sanna_ambulatoria",
  server: "10.6.16.10:1433",
  category: "permisos",
  summary: "Da de alta un nuevo médico (MM), conductor de móvil (CM) o ambulancia (CA) sincronizado con su usuario de Solución Médica.",
  sql: "EXEC [dbo].[sp_insertar_usuario_MM_CM]\n     @login = '{login}',\n     @nombre = '{nombre}',\n     @telefono = '{telefono}',\n     @usuario_SM = '{usuario_sm}',\n     @tipo_usuario = '{tipo_usuario}',\n     @cod_especialidad = '{cod_esp}',\n     @cmp_medico = '{cmp}';",
  verificationSql: "SELECT login, nombre, tipo, cmp, usuario_SM, estado FROM usuario WHERE login = '{login}';",
  parameters: [
    {
      name: "login",
      label: "Login Tablet",
      placeholder: "MM12345",
      defaultValue: "MM12345"
    },
    {
      name: "nombre",
      label: "Nombres y Apellidos",
      placeholder: "JUAN PEREZ",
      defaultValue: "JUAN PEREZ"
    },
    {
      name: "telefono",
      label: "Teléfono",
      placeholder: "999888777",
      defaultValue: "999888777"
    },
    {
      name: "usuario_sm",
      label: "Usuario en Solución Médica",
      placeholder: "JPEREZ",
      defaultValue: "JPEREZ"
    },
    {
      name: "tipo_usuario",
      label: "Tipo (MM: Médico / CM: Chofer / CA: Ambulancia)",
      placeholder: "MM",
      defaultValue: "MM"
    },
    {
      name: "cod_esp",
      label: "Código Especialidad",
      placeholder: "ESP01",
      defaultValue: "ESP01"
    },
    {
      name: "cmp",
      label: "Nro Colegiatura CMP",
      placeholder: "12345",
      defaultValue: "12345"
    }
  ],
  notes: "Registra en la tabla usuario de Tablet Médica manteniendo la consistencia de llaves foráneas.",
  tags: [
    "enrolar",
    "medico",
    "conductor",
    "tablet",
    "alta",
    "sql",
    "sp",
    "auditoria-db"
  ]
},
  {
  id: "mds-dar-alta-usuario",
  title: "Dar de Alta a Usuario en Médicos Asociados (SPRMDS_DAR_ALTA_USUARIO)",
  system: "Médicos Asociados (MDS)",
  systemCode: "mds",
  engine: "SQL Server",
  database: "BD_MediSanna",
  server: "10.6.16.10:1433",
  category: "permisos",
  summary: "Activa a un usuario en TBLMDS_USUARIO (FUSR_ESTADO = 1) dejando trazabilidad del ID de usuario modificador.",
  sql: "DECLARE @resp INT;\nEXEC [dbo].[SPRMDS_DAR_ALTA_USUARIO]\n     @CUSR_ID = {usr_id},\n     @NUSR_USUARIO_MODIFICACION = {usr_mod_id},\n     @onRespuesta = @resp OUTPUT;\nSELECT @resp AS codigo_respuesta;",
  verificationSql: "SELECT CUSR_ID, SUSR_LOGIN, FUSR_ESTADO, DUSR_FECHA_MODIFICACION FROM [dbo].[TBLMDS_USUARIO] WHERE CUSR_ID = {usr_id};",
  parameters: [
    {
      name: "usr_id",
      label: "ID Usuario MDS (CUSR_ID)",
      placeholder: "1001",
      defaultValue: "1001"
    },
    {
      name: "usr_mod_id",
      label: "ID Usuario Modificador",
      placeholder: "1",
      defaultValue: "1"
    }
  ],
  notes: "Respuesta 200 indica activación satisfactoria; 500 indica que no se afectaron registros.",
  tags: [
    "mds",
    "alta",
    "usuario",
    "activar",
    "sql",
    "sp",
    "auditoria-db"
  ]
},
  {
  id: "mds-dar-baja-usuario",
  title: "Dar de Baja a Usuario en Médicos Asociados (SPRMDS_DAR_BAJA_USUARIO)",
  system: "Médicos Asociados (MDS)",
  systemCode: "mds",
  engine: "SQL Server",
  database: "BD_MediSanna",
  server: "10.6.16.10:1433",
  category: "permisos",
  summary: "Desactiva a un usuario en TBLMDS_USUARIO (FUSR_ESTADO = 0) por cese o retiro temporal.",
  sql: "DECLARE @resp INT;\nEXEC [dbo].[SPRMDS_DAR_BAJA_USUARIO]\n     @CUSR_ID = {usr_id},\n     @NUSR_USUARIO_MODIFICACION = {usr_mod_id},\n     @onRespuesta = @resp OUTPUT;\nSELECT @resp AS codigo_respuesta;",
  verificationSql: "SELECT CUSR_ID, SUSR_LOGIN, FUSR_ESTADO, DUSR_FECHA_MODIFICACION FROM [dbo].[TBLMDS_USUARIO] WHERE CUSR_ID = {usr_id};",
  parameters: [
    {
      name: "usr_id",
      label: "ID Usuario MDS (CUSR_ID)",
      placeholder: "1001",
      defaultValue: "1001"
    },
    {
      name: "usr_mod_id",
      label: "ID Usuario Modificador",
      placeholder: "1",
      defaultValue: "1"
    }
  ],
  notes: "Pone FUSR_ESTADO en 0 inhabilitando el acceso a la plataforma de Médicos Asociados.",
  tags: [
    "mds",
    "baja",
    "usuario",
    "desactivar",
    "sql",
    "sp",
    "auditoria-db"
  ]
},
  {
  id: "mds-anular-orden-laboratorio",
  title: "Anular Orden de Laboratorio en Médicos Asociados (SP)",
  system: "Médicos Asociados (MDS)",
  systemCode: "mds",
  engine: "SQL Server",
  database: "BD_MediSanna",
  server: "10.6.16.10:1433",
  category: "atenciones",
  summary: "Anula formalmente la orden en TBLMDS_ORDEN_LABORATORIO (SLAB_ESTADO = C) y marca fecha de cierre.",
  sql: "DECLARE @resp INT;\nEXEC [dbo].[SPRMDS_ANULAR_ORDEN_LABORATORIO]\n     @cod_serv_laboratorio = {cod_orden},\n     @usuario_anulacion = '{usuario}',\n     @onRespuesta = @resp OUTPUT;\nSELECT @resp AS codigo_respuesta;",
  verificationSql: "SELECT CLAB_ID, SLAB_ESTADO, DLAB_FECHA_CIERRE FROM [dbo].[TBLMDS_ORDEN_LABORATORIO] WHERE CLAB_ID = {cod_orden};",
  parameters: [
    {
      name: "cod_orden",
      label: "Código Servicio Laboratorio",
      placeholder: "54021",
      defaultValue: "54021"
    },
    {
      name: "usuario",
      label: "Usuario Anulación",
      placeholder: "jdiestra",
      defaultValue: "jdiestra"
    }
  ],
  notes: "Cambia SLAB_ESTADO a \"C\" y registra fecha de cierre en la orden de laboratorio.",
  tags: [
    "mds",
    "laboratorio",
    "orden",
    "anular",
    "sql",
    "sp",
    "auditoria-db"
  ]
},
  {
  id: "hhmm-actualizar-indicador-sap",
  title: "Actualizar Indicador de Envío SAP en Honorarios Médicos (SP)",
  system: "HHMM / Liquidación Médica",
  systemCode: "sap",
  engine: "SQL Server",
  database: "HHMMDRMProd",
  server: "10.6.16.10:1433",
  category: "sap_fact",
  summary: "Actualiza la bandera IndicadorSAP = 1 en ProcesoMedico para permitir que el proceso de liquidación médica se transmita a SAP Business One.",
  sql: "EXEC [dbo].[uspActualizarIndicadorSAP]\n     @Tipo = 'P',\n     @Id = {proceso_id},\n     @Lista = '{lista_medicos}';",
  verificationSql: "SELECT ProcesoId, MedicoEmpresaId, IndicadorSAP FROM ProcesoMedico WHERE ProcesoId = {proceso_id};",
  parameters: [
    {
      name: "proceso_id",
      label: "ID de Proceso Médico",
      placeholder: "120",
      defaultValue: "120"
    },
    {
      name: "lista_medicos",
      label: "Filtro / Lista Médicos (0 para todos)",
      placeholder: "0",
      defaultValue: "0"
    }
  ],
  notes: "Permite reprocesar paquetes de honorarios médicos que quedaron sin transmitir hacia SAP.",
  tags: [
    "hhmm",
    "sap",
    "indicador",
    "liquidacion",
    "honorarios",
    "sql",
    "sp",
    "auditoria-db"
  ]
}
];
