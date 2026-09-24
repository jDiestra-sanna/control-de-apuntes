import { useState, useMemo, useCallback } from 'react';
import {
  Wrench,
  Search,
  Copy,
  Check,
  Database,
  Server,
  Layers,
  Terminal,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  ShieldCheck,
  Eye,
  Plus,
  Play,
  Zap,
  RotateCw,
  X,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { SaDialog, SaButton } from '@sanna-ui/react';
import { api, send } from './api.js';
import {
  SOLUTIONS_DATA,
  SQL_VIEWS_DATA,
  SERVERS_DATA,
  BEST_PRACTICES_DATA,
  SYSTEMS_LIST,
  ENGINES_LIST,
  CATEGORIES_LIST
} from './solutions-data.js';
import IntegratedModules from './IntegratedModules.jsx';

export default function SolutionsView({ onNewNote, notify }) {
  const [activeTab, setActiveTab] = useState('tickets');
  const [search, setSearch] = useState('');
  const [selectedSystem, setSelectedSystem] = useState('all');
  const [selectedEngine, setSelectedEngine] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTag, setActiveTag] = useState('');
  const [globalEnv, setGlobalEnv] = useState('prod'); // 'prod' | 'test'

  // Parámetros interactivos por solución: { [solId]: { paramName: value } }
  const [customParams, setCustomParams] = useState(() => {
    const initial = {};
    for (const sol of SOLUTIONS_DATA) {
      if (sol.parameters?.length) {
        initial[sol.id] = {};
        for (const p of sol.parameters) {
          initial[sol.id][p.name] = p.defaultValue || '';
        }
      }
    }
    return initial;
  });

  // Estado de detalles expandidos
  const [expandedDetails, setExpandedDetails] = useState(new Set());
  // Estado de copiado temporal: ID de la solución o vista copiada
  const [copiedId, setCopiedId] = useState(null);

  // Estados de ejecución en vivo:
  // executingId: qué solución, verificación o vista se está ejecutando actualmente
  const [executingId, setExecutingId] = useState(null);
  // executionResults: mapa { [id]: { ok, rows, fields, rowCount, durationMs, error, engine, server, database, env } }
  const [executionResults, setExecutionResults] = useState({});
  // Modal de confirmación para sentencias de modificación (UPDATE/DELETE/EXEC)
  const [confirmModal, setConfirmModal] = useState(null);
  // Estado de pruebas de conexión en servidores
  const [serverTestStatus, setServerTestStatus] = useState({});

  const toggleDetails = useCallback((id) => {
    setExpandedDetails(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleParamChange = useCallback((solId, paramName, value) => {
    setCustomParams(prev => ({
      ...prev,
      [solId]: {
        ...(prev[solId] || {}),
        [paramName]: value
      }
    }));
  }, []);

  // Función para computar el SQL con los parámetros aplicados
  const getRenderedSql = useCallback((solution) => {
    let sql = solution.sql;
    const solParams = customParams[solution.id] || {};
    for (const p of solution.parameters || []) {
      const val = solParams[p.name] !== undefined ? solParams[p.name] : p.defaultValue;
      const regex = new RegExp(`\\{${p.name}\\}`, 'g');
      sql = sql.replace(regex, val);
    }
    return sql;
  }, [customParams]);

  // Función para computar el query de verificación con parámetros
  const getRenderedVerificationSql = useCallback((solution) => {
    if (!solution.verificationSql) return '';
    let sql = solution.verificationSql;
    const solParams = customParams[solution.id] || {};
    for (const p of solution.parameters || []) {
      const val = solParams[p.name] !== undefined ? solParams[p.name] : p.defaultValue;
      const regex = new RegExp(`\\{${p.name}\\}`, 'g');
      sql = sql.replace(regex, val);
    }
    return sql;
  }, [customParams]);

  // Función para copiar al portapapeles
  const copyToClipboard = useCallback((text, id, label = 'Comando SQL') => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2500);
        notify?.(`¡${label} copiado al portapapeles!`);
      }).catch(() => {});
    }
  }, [notify]);

  // Ejecución directa de consultas a través del backend
  const executeQuery = useCallback(async ({ id, query, engine, database, env = globalEnv, isVerification = false }) => {
    setExecutingId(id);
    try {
      const response = await api('/solutions/execute', send('POST', {
        solutionId: id,
        query,
        engine,
        database,
        env
      }));

      setExecutionResults(prev => ({
        ...prev,
        [id]: response
      }));

      notify?.(
        isVerification
          ? `Verificación completada (${response.durationMs}ms)`
          : `¡Solución ejecutada con éxito! (${response.durationMs}ms)`
      );
    } catch (err) {
      setExecutionResults(prev => ({
        ...prev,
        [id]: {
          ok: false,
          error: err.message,
          engine,
          database,
          env: env.toUpperCase()
        }
      }));
      notify?.(`Error de ejecución: ${err.message}`, undefined, 'error');
    } finally {
      setExecutingId(null);
    }
  }, [globalEnv, notify]);

  // Manejador para solicitar ejecución con o sin modal de confirmación
  const handleRequestExecute = useCallback((solution) => {
    const renderedSql = getRenderedSql(solution);
    const isWrite = /\b(update|delete|insert|alter|drop|exec|truncate)\b/i.test(renderedSql);

    if (isWrite) {
      // Mostrar confirmación de seguridad para modificaciones
      setConfirmModal({
        solution,
        query: renderedSql,
        env: globalEnv,
        type: 'solution'
      });
    } else {
      // Sentencias de lectura / select se ejecutan de inmediato
      executeQuery({
        id: solution.id,
        query: renderedSql,
        engine: solution.engine,
        database: solution.database,
        env: globalEnv
      });
    }
  }, [getRenderedSql, globalEnv, executeQuery]);

  // Confirmar ejecución desde el modal
  const handleConfirmExecute = useCallback(() => {
    if (!confirmModal) return;
    const { solution, query, env } = confirmModal;
    setConfirmModal(null);
    executeQuery({
      id: solution.id,
      query,
      engine: solution.engine,
      database: solution.database,
      env
    });
  }, [confirmModal, executeQuery]);

  // Test de conexión para tarjeta de servidor
  const handleTestServer = useCallback(async (srv) => {
    const targetEnv = srv.env === 'PRUEBAS' ? 'test' : 'prod';
    setServerTestStatus(prev => ({
      ...prev,
      [srv.name]: { loading: true }
    }));

    try {
      const response = await api('/solutions/test-connection', send('POST', {
        engine: srv.engine,
        database: srv.database,
        env: targetEnv
      }));

      setServerTestStatus(prev => ({
        ...prev,
        [srv.name]: {
          loading: false,
          ok: true,
          result: response
        }
      }));
      notify?.(`Conexión exitosa con ${srv.name}`);
    } catch (err) {
      setServerTestStatus(prev => ({
        ...prev,
        [srv.name]: {
          loading: false,
          ok: false,
          error: err.message
        }
      }));
      notify?.(`Error al conectar con ${srv.name}: ${err.message}`, undefined, 'error');
    }
  }, [notify]);

  // Filtro de soluciones
  const filteredSolutions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SOLUTIONS_DATA.filter(sol => {
      if (activeTab === 'query_funciones' && !sol.tags.includes('query-funciones')) return false;
      if (selectedSystem !== 'all' && sol.systemCode !== selectedSystem) return false;
      if (selectedEngine !== 'all' && sol.engine !== selectedEngine) return false;
      if (selectedCategory !== 'all' && sol.category !== selectedCategory) return false;
      if (activeTag && !sol.tags.includes(activeTag)) return false;
      if (q) {
        const matchesTitle = sol.title.toLowerCase().includes(q);
        const matchesSummary = sol.summary.toLowerCase().includes(q);
        const matchesSql = sol.sql.toLowerCase().includes(q);
        const matchesSystem = sol.system.toLowerCase().includes(q);
        const matchesDatabase = sol.database.toLowerCase().includes(q);
        const matchesTags = sol.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSummary && !matchesSql && !matchesSystem && !matchesDatabase && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [search, selectedSystem, selectedEngine, selectedCategory, activeTag, activeTab]);

  // Crear apunte directo desde la solución
  const createNoteFromSolution = useCallback((sol) => {
    const renderedSql = getRenderedSql(sol);
    const result = executionResults[sol.id];

    let resultSection = '';
    if (result) {
      if (result.ok) {
        resultSection = `\n## Resultado de Ejecución en Vivo\n- **Estado:** Ejecutado con éxito (${result.durationMs}ms)\n- **Entorno:** ${result.env} (${result.server} / ${result.database})\n- **Filas afectadas/devueltas:** ${result.rowCount}\n`;
        if (result.rows?.length > 0) {
          resultSection += `\n\`\`\`json\n${JSON.stringify(result.rows.slice(0, 5), null, 2)}\n\`\`\`\n`;
        }
      } else {
        resultSection = `\n## Error Registrado en Ejecución\n- **Error:** ${result.error}\n`;
      }
    }

    const content = `## Descripción del Ticket / Operación
${sol.summary}

### Entorno y Base de Datos
- **Sistema:** ${sol.system}
- **Motor:** ${sol.engine}
- **Base de Datos:** \`${sol.database}\` (${sol.server})
- **Categoría:** ${sol.category}

## Sentencia SQL
\`\`\`sql
-- ${sol.title}
-- Generado desde el Centro de Soluciones de Apuntes
${renderedSql}
\`\`\`
${resultSection}
${sol.verificationSql ? `## Query de Validación Previa / Posterior
\`\`\`sql
${getRenderedVerificationSql(sol)}
\`\`\`
` : ''}

${sol.notes ? `> [!NOTE] Notas de Seguridad
> ${sol.notes}
` : ''}

### Historial de Incidencia
- **Ticket Relacionado:** 
- **Usuario que reportó:** 
- **Fecha de Atención:** ${new Date().toLocaleDateString('es-PE')}
- **Resultado:** Validado en ${globalEnv === 'prod' ? 'PRODUCCIÓN' : 'PRUEBAS'}.
`;

    const draft = {
      title: `[Solución] ${sol.title}`,
      content,
      format: 'markdown',
      tags: ['solucion', 'ti', sol.systemCode, ...sol.tags.slice(0, 3)],
      status: 'done',
      priority: 'medium'
    };

    onNewNote?.(draft);
  }, [getRenderedSql, getRenderedVerificationSql, executionResults, globalEnv, onNewNote]);

  const counts = useMemo(() => ({
    total: SOLUTIONS_DATA.length,
    pg: SOLUTIONS_DATA.filter(s => s.engine === 'PostgreSQL').length,
    sqlserver: SOLUTIONS_DATA.filter(s => s.engine === 'SQL Server').length,
    sap: SOLUTIONS_DATA.filter(s => s.systemCode === 'sap' || s.engine === 'SAP HANA').length,
    views: SQL_VIEWS_DATA.length,
    queryFunciones: SOLUTIONS_DATA.filter(s => s.tags?.includes('query-funciones')).length
  }), []);

  const quickChips = [
    'query-funciones', 'auditoria-db', 'tablet', 'anular', 'mfa', 'atencion', 'pegada', 'deducible', 'coaseguro',
    'siteds', 'botiquin', 'permisos', 'sap', 'turnos'
  ];

  const clearFilters = () => {
    setSearch('');
    setSelectedSystem('all');
    setSelectedEngine('all');
    setSelectedCategory('all');
    setActiveTag('');
  };

  const isFiltered = Boolean(search || selectedSystem !== 'all' || selectedEngine !== 'all' || selectedCategory !== 'all' || activeTag);

  return (
    <div className="solutions-view">
      {/* Tarjeta de encabezado con resumen, entorno y métricas */}
      <div className="solutions-header-card">
        <div className="solutions-header-top">
          <div className="solutions-title-group">
            <h2>
              <Wrench size={24} style={{ color: '#31765c' }} />
              Centro de Soluciones TI & Soporte Operativo
            </h2>
            <p>
              Ejecución y resolución directa de incidencias para 
              <strong> Solución Médica (PostgreSQL)</strong>, <strong>Tablet Médica (SQL Server)</strong>, 
              <strong> Médicos Asociados</strong> y <strong>Programación Médica</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            {/* Selector Global de Entorno */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #d5e4d8', padding: '4px 10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#4d6955' }}>Entorno de Ejecución:</span>
              <button
                className={`sol-chip-btn ${globalEnv === 'prod' ? 'selected' : ''}`}
                style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700 }}
                onClick={() => setGlobalEnv('prod')}
              >
                PRODUCCIÓN
              </button>
              <button
                className={`sol-chip-btn ${globalEnv === 'test' ? 'selected' : ''}`}
                style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700 }}
                onClick={() => setGlobalEnv('test')}
              >
                PRUEBAS / HOMOLOGACIÓN
              </button>
            </div>

            <div className="solutions-stats-row">
              <div className="sol-stat-pill">
                <Database size={15} />
                <span><strong>{counts.total}</strong> soluciones</span>
              </div>
              <div className="sol-stat-pill">
                <Terminal size={15} />
                <span><strong>{counts.pg}</strong> PostgreSQL</span>
              </div>
              <div className="sol-stat-pill">
                <Server size={15} />
                <span><strong>{counts.sqlserver}</strong> SQL Server</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div className="solutions-nav-tabs" role="tablist">
          <button
            className={`sol-tab-btn ${activeTab === 'integrated_modules' ? 'active' : ''}`}
            onClick={() => { setActiveTab('integrated_modules'); setActiveTag(''); }}
            role="tab"
            aria-selected={activeTab === 'integrated_modules'}
            style={activeTab === 'integrated_modules' ? { borderColor: '#0f4c81', color: '#0f4c81' } : {}}
          >
            <Layers size={16} style={{ color: '#0f4c81' }} />
            <span>Módulos Operativos (Sistema TI)</span>
            <span className="sol-tab-badge" style={{ background: '#0f4c81', color: '#fff' }}>6 MÓDULOS</span>
          </button>

          <button
            className={`sol-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => { setActiveTab('tickets'); setActiveTag(''); }}
            role="tab"
            aria-selected={activeTab === 'tickets'}
          >
            <Terminal size={16} />
            <span>Tickets Recurrentes & Ejecución SQL</span>
            <span className="sol-tab-badge">{counts.total}</span>
          </button>

          <button
            className={`sol-tab-btn ${activeTab === 'query_funciones' ? 'active' : ''}`}
            onClick={() => { setActiveTab('query_funciones'); setActiveTag('query-funciones'); }}
            role="tab"
            aria-selected={activeTab === 'query_funciones'}
            style={activeTab === 'query_funciones' ? { borderColor: '#7f00ff', color: '#7f00ff' } : {}}
          >
            <Zap size={16} style={{ color: '#7f00ff' }} />
            <span>Query + Funciones</span>
            <span className="sol-tab-badge" style={{ background: '#7f00ff', color: '#fff' }}>{counts.queryFunciones}</span>
          </button>

          <button
            className={`sol-tab-btn ${activeTab === 'views' ? 'active' : ''}`}
            onClick={() => setActiveTab('views')}
            role="tab"
            aria-selected={activeTab === 'views'}
          >
            <Eye size={16} />
            <span>Diccionario de Vistas SQL</span>
            <span className="sol-tab-badge">{counts.views}</span>
          </button>

          <button
            className={`sol-tab-btn ${activeTab === 'servers' ? 'active' : ''}`}
            onClick={() => setActiveTab('servers')}
            role="tab"
            aria-selected={activeTab === 'servers'}
          >
            <Server size={16} />
            <span>Matriz de Conexiones & Servidores</span>
          </button>

          <button
            className={`sol-tab-btn ${activeTab === 'practices' ? 'active' : ''}`}
            onClick={() => setActiveTab('practices')}
            role="tab"
            aria-selected={activeTab === 'practices'}
          >
            <ShieldCheck size={16} />
            <span>Buenas Prácticas & Seguridad</span>
          </button>
        </div>
      </div>

      {/* PESTAÑA: MÓDULOS OPERATIVOS DEL SISTEMA INTEGRADO DE TI */}
      {activeTab === 'integrated_modules' && (
        <IntegratedModules notify={notify} />
      )}

      {/* PESTAÑA 1 & 2: TICKETS RECURRENTES & QUERY + FUNCIONES */}
      {(activeTab === 'tickets' || activeTab === 'query_funciones') && (
        <>
          {activeTab === 'query_funciones' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(127, 0, 255, 0.08), rgba(49, 118, 92, 0.06))',
              border: '1px solid rgba(127, 0, 255, 0.25)',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ background: '#7f00ff', color: 'white', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#27402f' }}>
                  Colección Absorbida: Query + Funciones ({counts.queryFunciones} disponibles)
                </div>
                <div style={{ fontSize: '12px', color: '#55695c', marginTop: '2px' }}>
                  Consultas y funciones operativas extraídas directamente de tus notas de soporte para PostgreSQL (<code>hipocrates</code>) y SQL Server (<code>10.6.16.10</code>). Todas parametrizables y ejecutables en vivo.
                </div>
              </div>
            </div>
          )}
          {/* Barra de Filtros y Búsqueda */}
          <div className="solutions-filterbar">
            <div className="sol-filter-controls">
              <div className="sol-search-wrap">
                <Search size={16} className="sol-search-icon" />
                <input
                  type="text"
                  className="sol-search-input"
                  placeholder="Buscar solución por nombre, función, ticket, IP o tabla..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, cursor: 'pointer', color: '#888' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="sol-select-group">
                <select
                  className="sol-select-field"
                  value={selectedSystem}
                  onChange={e => setSelectedSystem(e.target.value)}
                  aria-label="Filtrar por sistema"
                >
                  {SYSTEMS_LIST.map(sys => (
                    <option key={sys.id} value={sys.id}>{sys.name}</option>
                  ))}
                </select>

                <select
                  className="sol-select-field"
                  value={selectedEngine}
                  onChange={e => setSelectedEngine(e.target.value)}
                  aria-label="Filtrar por motor de base de datos"
                >
                  {ENGINES_LIST.map(eng => (
                    <option key={eng.id} value={eng.id}>{eng.name}</option>
                  ))}
                </select>

                <select
                  className="sol-select-field"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  aria-label="Filtrar por categoría"
                >
                  {CATEGORIES_LIST.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                {isFiltered && (
                  <button
                    className="text-button"
                    onClick={clearFilters}
                    style={{ fontSize: '11px', color: '#31765c', cursor: 'pointer' }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Chips rápidos de etiquetas */}
            <div className="sol-tags-bar">
              <span className="sol-tags-label">Filtros rápidos:</span>
              {quickChips.map(chip => (
                <button
                  key={chip}
                  className={`sol-chip-btn ${activeTag === chip ? 'selected' : ''}`}
                  style={chip === 'query-funciones' ? {
                    borderColor: '#7f00ff',
                    color: activeTag === chip ? '#fff' : '#7f00ff',
                    background: activeTag === chip ? '#7f00ff' : 'rgba(127, 0, 255, 0.08)',
                    fontWeight: 600
                  } : chip === 'auditoria-db' ? {
                    borderColor: '#0284c7',
                    color: activeTag === chip ? '#fff' : '#0284c7',
                    background: activeTag === chip ? '#0284c7' : 'rgba(2, 132, 199, 0.08)',
                    fontWeight: 600
                  } : {}}
                  onClick={() => setActiveTag(prev => prev === chip ? '' : chip)}
                >
                  #{chip}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de Soluciones */}
          <div className="solutions-grid">
            {filteredSolutions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', background: '#fff', borderRadius: '10px', border: '1px solid #e1e9e2' }}>
                <Search size={32} style={{ color: '#8fa293', margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '16px', color: '#27402f', fontWeight: 600 }}>No se encontraron soluciones</h3>
                <p style={{ fontSize: '12px', color: '#6e8073', marginTop: '6px' }}>
                  Prueba modificando los términos de búsqueda o limpiando los filtros seleccionados.
                </p>
                <button className="primary" style={{ marginTop: '16px', fontSize: '12px' }} onClick={clearFilters}>
                  Ver todas las soluciones
                </button>
              </div>
            ) : (
              filteredSolutions.map(sol => {
                const isExpanded = expandedDetails.has(sol.id);
                const renderedSql = getRenderedSql(sol);
                const renderedVerificationSql = getRenderedVerificationSql(sol);
                const isCopied = copiedId === sol.id;
                const isExecuting = executingId === sol.id;
                const isExecutingVerif = executingId === `${sol.id}-verif`;
                const result = executionResults[sol.id];
                const verifResult = executionResults[`${sol.id}-verif`];
                const engineClass = sol.engine === 'PostgreSQL' ? 'postgresql' : sol.engine === 'SQL Server' ? 'sqlserver' : 'saphana';

                return (
                  <article key={sol.id} className="solution-card">
                    {/* Barra superior con metadatos del sistema y motor */}
                    <div className="solution-top">
                      <div className="solution-meta-tags">
                        <span className={`badge-engine ${engineClass}`}>
                          <Database size={12} />
                          {sol.engine}
                        </span>
                        <span className="badge-system">{sol.system}</span>
                        <span className="badge-server-info">{sol.database} · {sol.server}</span>
                        <span className={`env-badge ${globalEnv === 'prod' ? 'prod' : 'test'}`}>
                          {globalEnv.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Título y Resumen */}
                    <div className="solution-title-row">
                      <div>
                        <h3>{sol.title}</h3>
                        <p className="solution-summary">{sol.summary}</p>
                      </div>
                    </div>

                    {/* Generador Interactivo de Parámetros */}
                    {sol.parameters?.length > 0 && (
                      <div className="sol-params-builder">
                        <div className="sol-params-title">
                          <SlidersHorizontal size={13} />
                          <span>Parámetros de ejecución interactivos:</span>
                        </div>
                        <div className="sol-params-grid">
                          {sol.parameters.map(param => (
                            <div key={param.name} className="sol-param-item">
                              <label htmlFor={`param-${sol.id}-${param.name}`}>{param.label}:</label>
                              <input
                                id={`param-${sol.id}-${param.name}`}
                                type="text"
                                className="sol-param-input"
                                placeholder={param.placeholder}
                                value={customParams[sol.id]?.[param.name] ?? param.defaultValue}
                                onChange={e => handleParamChange(sol.id, param.name, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Caja de Código SQL Formateado */}
                    <div className="sol-code-box">
                      <div className="sol-code-header">
                        <div className="sol-code-header-left">
                          <Terminal size={13} />
                          <span>Instrucción SQL</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="sol-copy-btn"
                            onClick={() => copyToClipboard(renderedSql, sol.id, 'SQL')}
                            title="Copiar código SQL listo para ejecutar"
                          >
                            {isCopied ? <Check size={13} style={{ color: '#79df9a' }} /> : <Copy size={13} />}
                            <span>{isCopied ? '¡Copiado!' : 'Copiar SQL'}</span>
                          </button>
                        </div>
                      </div>
                      <pre className="sol-code-content">
                        <code>{renderedSql}</code>
                      </pre>
                    </div>

                    {/* Panel de Resultado de Ejecución en Vivo */}
                    {result && (
                      <div className="sol-result-panel">
                        <div className={`sol-result-header ${result.ok ? 'success' : 'error'}`}>
                          <div className="sol-result-status">
                            {result.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                            <span>
                              {result.ok
                                ? `Ejecución exitosa en ${result.env} (${result.durationMs}ms)`
                                : `Error de Base de Datos (${result.env})`}
                            </span>
                          </div>
                          <div className="sol-result-meta">
                            {result.ok && <span>Filas/Afectadas: <strong>{result.rowCount}</strong></span>}
                            <button
                              onClick={() => setExecutionResults(prev => { const n = { ...prev }; delete n[sol.id]; return n; })}
                              style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit' }}
                              title="Cerrar resultado"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        {result.ok ? (
                          result.rows && result.rows.length > 0 ? (
                            <div className="sol-result-table-wrap">
                              <table className="sol-result-table">
                                <thead>
                                  <tr>
                                    {result.fields.map(f => (
                                      <th key={f}>{f}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {result.rows.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                      {result.fields.map(f => (
                                        <td key={f}>{row[f] !== null && row[f] !== undefined ? String(row[f]) : <em style={{ color: '#999' }}>null</em>}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="sol-result-empty">
                              Instrucción ejecutada correctamente. No se devolvieron filas ({result.rowCount} registros afectados).
                            </div>
                          )
                        ) : (
                          <div className="sol-result-error-body">
                            {result.error}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Acordeón de Verificación y Notas de Seguridad */}
                    {(sol.verificationSql || sol.notes) && (
                      <div className="sol-details-accordion">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="sol-toggle-details-btn"
                            onClick={() => toggleDetails(sol.id)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <span>{isExpanded ? 'Ocultar verificación y notas' : 'Ver query de comprobación y notas'}</span>
                          </button>

                          {sol.verificationSql && (
                            <button
                              type="button"
                              className="sol-exec-btn secondary"
                              style={{ fontSize: '10.5px', padding: '3px 8px' }}
                              disabled={isExecutingVerif}
                              onClick={() => executeQuery({
                                id: `${sol.id}-verif`,
                                query: renderedVerificationSql,
                                engine: sol.engine,
                                database: sol.database,
                                env: globalEnv,
                                isVerification: true
                              })}
                            >
                              <RotateCw size={11} className={isExecutingVerif ? 'spin' : ''} />
                              <span>{isExecutingVerif ? 'Consultando...' : 'Ejecutar Verificación'}</span>
                            </button>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="sol-expanded-content">
                            {sol.verificationSql && (
                              <div>
                                <div className="sol-verification-title" style={{ marginBottom: '6px' }}>
                                  <Info size={13} />
                                  <span>Consulta previa / posterior:</span>
                                </div>
                                <pre className="sol-verification-code">
                                  <code>{renderedVerificationSql}</code>
                                </pre>

                                {/* Resultado de Verificación */}
                                {verifResult && (
                                  <div className="sol-result-panel" style={{ marginTop: '8px' }}>
                                    <div className={`sol-result-header ${verifResult.ok ? 'success' : 'error'}`}>
                                      <div className="sol-result-status">
                                        {verifResult.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                                        <span>{verifResult.ok ? `Resultado de Verificación (${verifResult.durationMs}ms)` : 'Error en consulta'}</span>
                                      </div>
                                      <button
                                        onClick={() => setExecutionResults(prev => { const n = { ...prev }; delete n[`${sol.id}-verif`]; return n; })}
                                        style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit' }}
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                    {verifResult.ok && verifResult.rows && verifResult.rows.length > 0 && (
                                      <div className="sol-result-table-wrap">
                                        <table className="sol-result-table">
                                          <thead>
                                            <tr>{verifResult.fields.map(f => <th key={f}>{f}</th>)}</tr>
                                          </thead>
                                          <tbody>
                                            {verifResult.rows.map((row, rIdx) => (
                                              <tr key={rIdx}>
                                                {verifResult.fields.map(f => <td key={f}>{String(row[f] ?? 'null')}</td>)}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {sol.notes && (
                              <div className="sol-notes-alert">
                                <AlertTriangle size={15} />
                                <div>
                                  <strong>Nota operativa:</strong> {sol.notes}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pie de tarjeta con tags y botones de acción */}
                    <div className="solution-footer">
                      <div className="solution-tags-list">
                        {sol.tags.map(t => (
                          <span key={t} className="solution-tag-pill">#{t}</span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="sol-create-note-btn"
                          onClick={() => createNoteFromSolution(sol)}
                          title="Crear una nota en Apuntes con esta solución para documentar el ticket"
                        >
                          <Plus size={14} />
                          <span>Crear apunte de ticket</span>
                        </button>

                        <button
                          type="button"
                          className="sol-exec-btn"
                          disabled={isExecuting}
                          onClick={() => handleRequestExecute(sol)}
                          title={`Ejecutar esta solución directamente en la base de datos (${globalEnv.toUpperCase()})`}
                        >
                          <Zap size={14} className={isExecuting ? 'spin' : ''} />
                          <span>{isExecuting ? 'Ejecutando...' : 'Ejecutar Solución'}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}

      {/* PESTAÑA 2: DICCIONARIO DE VISTAS SQL CON EJECUCIÓN EN VIVO */}
      {activeTab === 'views' && (
        <div className="views-catalog-grid">
          {SQL_VIEWS_DATA.map(vw => {
            const isExecuting = executingId === vw.name;
            const viewResult = executionResults[vw.name];

            return (
              <div key={vw.name} className="view-card">
                <div className="view-card-top">
                  <span className="badge-system">{vw.system}</span>
                  <span className="badge-server-info">{vw.engine} · {vw.database}</span>
                </div>
                <h4 className="view-name">{vw.name}</h4>
                <p className="view-desc">{vw.description}</p>

                <div className="view-query-box">
                  <div style={{ display: 'flex', gap: '6px', position: 'absolute', right: '8px', top: '8px' }}>
                    <button
                      className="view-query-copy-btn"
                      onClick={() => copyToClipboard(vw.exampleSql, vw.name, 'Consulta')}
                    >
                      <Copy size={11} /> Copiar
                    </button>
                    <button
                      className="view-query-copy-btn"
                      style={{ background: '#31765c', color: '#fff' }}
                      disabled={isExecuting}
                      onClick={() => executeQuery({
                        id: vw.name,
                        query: vw.exampleSql,
                        engine: vw.engine,
                        database: vw.database,
                        env: 'prod'
                      })}
                    >
                      <Play size={11} className={isExecuting ? 'spin' : ''} />
                      {isExecuting ? 'Consultando...' : 'Ejecutar'}
                    </button>
                  </div>
                  <code>{vw.exampleSql}</code>
                </div>

                {/* Resultado de la Vista */}
                {viewResult && (
                  <div className="sol-result-panel">
                    <div className={`sol-result-header ${viewResult.ok ? 'success' : 'error'}`}>
                      <div className="sol-result-status">
                        {viewResult.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                        <span>{viewResult.ok ? `Registros devueltos (${viewResult.durationMs}ms)` : 'Error'}</span>
                      </div>
                      <button
                        onClick={() => setExecutionResults(prev => { const n = { ...prev }; delete n[vw.name]; return n; })}
                        style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit' }}
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {viewResult.ok && viewResult.rows && viewResult.rows.length > 0 && (
                      <div className="sol-result-table-wrap">
                        <table className="sol-result-table">
                          <thead>
                            <tr>{viewResult.fields.map(f => <th key={f}>{f}</th>)}</tr>
                          </thead>
                          <tbody>
                            {viewResult.rows.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {viewResult.fields.map(f => <td key={f}>{String(row[f] ?? 'null')}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PESTAÑA 3: MATRIZ DE CONEXIONES & TEST EN VIVO */}
      {activeTab === 'servers' && (
        <div className="servers-cards-grid">
          {SERVERS_DATA.map(srv => {
            const status = serverTestStatus[srv.name];

            return (
              <div key={srv.name} className="server-card">
                <div className="server-card-header">
                  <div>
                    <h4>{srv.name}</h4>
                    <span style={{ fontSize: '11px', color: '#688070' }}>{srv.system}</span>
                  </div>
                  <span className={`env-badge ${srv.env === 'PRODUCCIÓN' ? 'prod' : 'test'}`}>
                    {srv.env}
                  </span>
                </div>

                <div className="server-info-list">
                  <div className="server-info-row">
                    <span>Host IP:</span>
                    <code>{srv.ip}:{srv.port}</code>
                  </div>
                  <div className="server-info-row">
                    <span>Motor:</span>
                    <strong>{srv.engine}</strong>
                  </div>
                  <div className="server-info-row">
                    <span>Base de Datos:</span>
                    <code>{srv.database}</code>
                  </div>
                  <div className="server-info-row">
                    <span>Usuario Referencia:</span>
                    <code style={{ fontSize: '11px' }}>{srv.userRef}</code>
                  </div>
                </div>

                <p className="server-desc">{srv.description}</p>

                {/* Estado del Test de Conexión */}
                {status && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    background: status.ok ? '#eaf7ed' : '#fdf2f0',
                    color: status.ok ? '#1b5a2f' : '#9c2419',
                    border: `1px solid ${status.ok ? '#c4ebd0' : '#f6cfca'}`
                  }}>
                    {status.loading ? (
                      <span>Comprobando conexión...</span>
                    ) : status.ok ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={14} />
                        <span>Conexión exitosa ({status.result.durationMs}ms)</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={14} />
                        <span>Fallo: {status.error}</span>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button
                    className="sol-copy-btn"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => copyToClipboard(`${srv.ip}:${srv.port}`, srv.name, 'Dirección de servidor')}
                  >
                    <Copy size={13} /> Copiar IP
                  </button>

                  <button
                    className="sol-exec-btn"
                    style={{ flex: 1, justifyContent: 'center', padding: '6px 10px' }}
                    disabled={status?.loading}
                    onClick={() => handleTestServer(srv)}
                  >
                    <RotateCw size={13} className={status?.loading ? 'spin' : ''} />
                    <span>{status?.loading ? 'Probando...' : 'Probar Conexión'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PESTAÑA 4: GUÍA DE SEGURIDAD & BUENAS PRÁCTICAS */}
      {activeTab === 'practices' && (
        <div className="practices-list">
          {BEST_PRACTICES_DATA.map(bp => (
            <div key={bp.rule} className="practice-card">
              <h4>
                <ShieldCheck size={18} style={{ color: '#31765c' }} />
                {bp.rule}
              </h4>
              <p>{bp.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmación para Ejecución de Soluciones de Modificación */}
      {confirmModal && (
        <SaDialog
          open={Boolean(confirmModal)}
          onOpenChange={(open) => { if (!open) setConfirmModal(null); }}
          title={`Confirmar ejecución en ${confirmModal.env.toUpperCase()}`}
          description={confirmModal.solution.title}
          size="md"
        >
          <div className="sol-confirm-dialog-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#666' }}>Motor & Servidor Destino:</span>
                <div style={{ fontWeight: 600, color: '#27402f', fontSize: '13px', marginTop: '2px' }}>
                  {confirmModal.solution.engine} · {confirmModal.solution.database}
                </div>
              </div>
              <span className={`sol-confirm-env-badge ${confirmModal.env === 'prod' ? 'prod' : 'test'}`}>
                {confirmModal.env === 'prod' ? '⚠️ PRODUCCIÓN' : 'PRUEBAS'}
              </span>
            </div>

            <div style={{ background: '#fff9e6', border: '1px solid #f6e2a2', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: '#7a5a17' }}>
              <strong>Advertencia de Seguridad:</strong> Esta operación modificará registros directamente en la base de datos de producción. Verifica que los parámetros ingresados correspondan a la atención o solicitud correcta.
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#444', display: 'block', marginBottom: '6px' }}>
                Sentencia SQL a ejecutar:
              </span>
              <pre className="sol-confirm-query-preview">
                <code>{confirmModal.query}</code>
              </pre>
            </div>

            <div className="sol-confirm-actions">
              <SaButton
                variant="secondary"
                label="Cancelar"
                onClick={() => setConfirmModal(null)}
              />
              <SaButton
                variant="primary"
                label="Confirmar y Ejecutar"
                icon={<Zap size={14} />}
                onClick={handleConfirmExecute}
              />
            </div>
          </div>
        </SaDialog>
      )}
    </div>
  );
}
