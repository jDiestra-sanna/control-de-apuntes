import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserPlus,
  Users,
  Key,
  ShieldCheck,
  Ambulance,
  FlaskConical,
  Truck,
  FileCheck,
  Zap,
  RefreshCw,
  Search,
  Check,
  CheckSquare,
  Square,
  Trash2,
  AlertTriangle,
  Info,
  Calendar,
  ArrowRight,
  Lock,
  Unlock,
  Copy,
  ChevronRight,
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { SaButton, SaDialog, SaInput } from '@sanna-ui/react';
import { api, send } from './api.js';

export default function IntegratedModules({ notify }) {
  // Pestaña principal de módulos
  const [activeModule, setActiveModule] = useState('users'); // 'users' | 'ambulance' | 'lab' | 'delivery' | 'hyg' | 'special'

  // Subpestañas para Módulo de Usuarios
  const [userTab, setUserTab] = useState('create'); // 'create' | 'list' | 'permissions'

  // Entorno de ejecución
  const [env, setEnv] = useState('prod'); // 'prod' | 'test'

  // Estados de carga generales
  const [loading, setLoading] = useState(false);

  // Modal de confirmación genérico
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm, destructive }

  // ============================================================================
  // 1. ESTADOS: USUARIO SM
  // ============================================================================
  // Formulario Crear Usuario
  const [newUser, setNewUser] = useState({
    cod_usu: '',
    nom_usu: '',
    nom_per: '',
    doc_identidad: '',
    pas_usu: 'Abc123xyz',
    perfil: '*OPE'
  });
  const [usernameCheck, setUsernameCheck] = useState({ checking: false, available: null, checkedUser: '' });
  const [profiles, setProfiles] = useState([]);

  // Directorio de usuarios
  const [userSearch, setUserSearch] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState('all');
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Gestión de Permisos
  const [targetUser, setTargetUser] = useState('');
  const [targetPermissions, setTargetPermissions] = useState([]);
  const [permSourceMode, setPermSourceMode] = useState('reference'); // 'reference' | 'catalog'
  const [referenceUser, setReferenceUser] = useState('PCASTILLO');
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [selectedPermCodes, setSelectedPermCodes] = useState(new Set());
  const [loadingPerms, setLoadingPerms] = useState(false);

  // ============================================================================
  // 2. ESTADOS: CAMBIO DE FECHA AMBULANCIA
  // ============================================================================
  const [ambAtenciones, setAmbAtenciones] = useState('');
  const [ambDate, setAmbDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ambResults, setAmbResults] = useState(null);
  const [ambLoading, setAmbLoading] = useState(false);

  // ============================================================================
  // 3. ESTADOS: MODIFICAR ÓRDENES (LABORATORIO)
  // ============================================================================
  const [labOrdersInput, setLabOrdersInput] = useState('');
  const [labAction, setLabAction] = useState('cancel'); // 'cancel' | 'change_status'
  const [labNewStatus, setLabNewStatus] = useState('0');
  const [labResults, setLabResults] = useState(null);
  const [labLoading, setLabLoading] = useState(false);

  // ============================================================================
  // 4. ESTADOS: MODIFICAR PEDIDOS (DELIVERY / FARMACIA)
  // ============================================================================
  const [deliveryInput, setDeliveryInput] = useState('');
  const [deliveryAction, setDeliveryAction] = useState('cancel'); // 'cancel' | 'change_status'
  const [deliveryNewStatus, setDeliveryNewStatus] = useState(0);
  const [deliveryResults, setDeliveryResults] = useState(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  // ============================================================================
  // 5. ESTADOS: CAMBIO ESTADO H Y G (FACTURACIÓN)
  // ============================================================================
  const [hygInput, setHygInput] = useState('');
  const [hygMode, setHygMode] = useState('atencion'); // 'atencion' | 'expediente'
  const [hygStatus, setHygStatus] = useState('H'); // 'H' | 'G'
  const [hygUser, setHygUser] = useState('SISTEMAS');
  const [hygResults, setHygResults] = useState(null);
  const [hygLoading, setHygLoading] = useState(false);

  // ============================================================================
  // 6. ESTADOS: OPERACIONES ESPECIALES TI
  // ============================================================================
  const [subzonaAtes, setSubzonaAtes] = useState('');
  const [subzonaVal, setSubzonaVal] = useState('LIMA');
  const [mposAtes, setMposAtes] = useState('');
  const [gdhNombre, setGdhNombre] = useState('');
  const [gdhResults, setGdhResults] = useState(null);
  const [specialLoading, setSpecialLoading] = useState(false);

  // ----------------------------------------------------------------------------
  // CARGA INICIAL: Siguiente código de usuario y perfiles
  // ----------------------------------------------------------------------------
  const loadNextCode = useCallback(async () => {
    try {
      const data = await api(`/modules/users/next-code?env=${env}`);
      if (data?.nextCode) {
        setNewUser(prev => ({ ...prev, cod_usu: data.nextCode }));
      }
    } catch (err) {
      console.warn('Error cargando código de usuario:', err.message);
    }
  }, [env]);

  const loadProfiles = useCallback(async () => {
    try {
      const data = await api(`/modules/users/profiles?env=${env}`);
      if (Array.isArray(data)) {
        setProfiles(data);
      }
    } catch (err) {
      console.warn('Error cargando perfiles:', err.message);
    }
  }, [env]);

  useEffect(() => {
    loadNextCode();
    loadProfiles();
  }, [loadNextCode, loadProfiles]);

  // Sugerencia automática de login cuando se escribe el nombre del trabajador
  const handleNameChange = (name) => {
    setNewUser(prev => {
      const trimmed = name.trim();
      let autoUser = prev.nom_usu;
      // Si el usuario no ha editado manualmente su usuario o está vacío, auto-sugerir
      if (trimmed.length > 3) {
        const parts = trimmed.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
          // Inicial del primer nombre + primer apellido (convención SM)
          const firstName = parts[parts.length - 1]; // Muchas veces se ingresa APELLIDO NOMBRE
          const lastName = parts[0];
          autoUser = (firstName.charAt(0) + lastName).toUpperCase().slice(0, 15);
        }
      }
      return { ...prev, nom_per: name, nom_usu: autoUser };
    });
  };

  // Verificación en vivo de nombre de usuario
  useEffect(() => {
    const u = newUser.nom_usu.trim();
    if (!u || u.length < 3) {
      setUsernameCheck({ checking: false, available: null, checkedUser: '' });
      return;
    }
    const timer = setTimeout(async () => {
      setUsernameCheck(prev => ({ ...prev, checking: true }));
      try {
        const res = await api(`/modules/users/check-username?username=${encodeURIComponent(u)}&env=${env}`);
        setUsernameCheck({ checking: false, available: res.available, checkedUser: u });
      } catch {
        setUsernameCheck({ checking: false, available: null, checkedUser: '' });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [newUser.nom_usu, env]);

  // Crear Usuario
  const handleCreateUser = async () => {
    if (!newUser.cod_usu || !newUser.nom_usu || !newUser.nom_per) {
      notify?.('Por favor complete los campos obligatorios.', undefined, 'error');
      return;
    }
    setConfirmDialog({
      title: 'Crear Nuevo Usuario en Solución Médica',
      message: `¿Desea crear el usuario '${newUser.nom_usu.toUpperCase()}' para el trabajador '${newUser.nom_per.toUpperCase()}' con código ${newUser.cod_usu}?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await api('/modules/users/create', send('POST', { ...newUser, env }));
          notify?.(res.message || '¡Usuario creado con éxito!');
          // Recargar código y limpiar
          setNewUser(prev => ({
            ...prev,
            nom_usu: '',
            nom_per: '',
            doc_identidad: ''
          }));
          await loadNextCode();
        } catch (err) {
          notify?.(err.message, undefined, 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Consultar Directorio de Usuarios
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await api(`/modules/users/list?search=${encodeURIComponent(userSearch)}&filterStatus=${userFilterStatus}&env=${env}`);
      setUsersList(res.users || []);
    } catch (err) {
      notify?.(err.message, undefined, 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, userFilterStatus, env, notify]);

  useEffect(() => {
    if (activeModule === 'users' && userTab === 'list') {
      fetchUsers();
    }
  }, [activeModule, userTab, fetchUsers]);

  // Activar / Desactivar Usuario
  const handleToggleUser = async (user) => {
    const nextStatus = !user.activo;
    const actionLabel = nextStatus ? 'activar' : 'desactivar';
    setConfirmDialog({
      title: `¿Desea ${actionLabel} este usuario?`,
      message: `El usuario '${user.usuario}' (${user.codigo}) quedará marcado como ${nextStatus ? 'ACTIVO' : 'INACTIVO'}.`,
      onConfirm: async () => {
        try {
          await api('/modules/users/toggle-status', send('POST', { cod_usu: user.codigo, activo: nextStatus, env }));
          notify?.(`Usuario ${user.usuario} ${nextStatus ? 'activado' : 'desactivado'} con éxito.`);
          fetchUsers();
        } catch (err) {
          notify?.(err.message, undefined, 'error');
        }
      }
    });
  };

  // Resetear Contraseña
  const handleResetPassword = (user) => {
    setConfirmDialog({
      title: 'Resetear Contraseña de Usuario',
      message: `¿Desea restablecer la contraseña del usuario '${user.usuario}' a 'Abc123xyz' y forzar cambio en próximo inicio de sesión?`,
      onConfirm: async () => {
        try {
          const res = await api('/modules/users/reset-password', send('POST', { nom_usu: user.usuario, newPassword: 'Abc123xyz', env }));
          notify?.(res.message);
          fetchUsers();
        } catch (err) {
          notify?.(err.message, undefined, 'error');
        }
      }
    });
  };

  // Cargar Permisos de Usuario Destino
  const loadTargetPermissions = useCallback(async (username) => {
    if (!username?.trim()) return;
    setLoadingPerms(true);
    try {
      const res = await api(`/modules/users/permissions?username=${encodeURIComponent(username.trim())}&env=${env}`);
      setTargetPermissions(res.permissions || []);
    } catch (err) {
      notify?.(err.message, undefined, 'error');
    } finally {
      setLoadingPerms(false);
    }
  }, [env, notify]);

  // Cargar Permisos Disponibles (desde Catálogo o Usuario de Referencia)
  const loadAvailablePermissions = useCallback(async () => {
    setLoadingPerms(true);
    try {
      const refParam = permSourceMode === 'reference' ? referenceUser.trim() : '';
      const res = await api(`/modules/users/available-permissions?referenceUser=${encodeURIComponent(refParam)}&env=${env}`);
      setAvailablePermissions(res.permissions || []);
      setSelectedPermCodes(new Set()); // Reset selección
    } catch (err) {
      notify?.(err.message, undefined, 'error');
    } finally {
      setLoadingPerms(false);
    }
  }, [permSourceMode, referenceUser, env, notify]);

  // Asignar Permisos Seleccionados
  const handleAssignPermissions = async () => {
    if (!targetUser.trim()) {
      notify?.('Debe especificar el usuario destino.', undefined, 'error');
      return;
    }
    if (selectedPermCodes.size === 0) {
      notify?.('Seleccione al menos un permiso para asignar.', undefined, 'error');
      return;
    }

    setConfirmDialog({
      title: 'Asignar Permisos a Usuario',
      message: `¿Desea asignar los ${selectedPermCodes.size} permisos seleccionados al usuario '${targetUser.toUpperCase()}'?`,
      onConfirm: async () => {
        setLoadingPerms(true);
        try {
          await api('/modules/users/assign-permissions', send('POST', {
            targetUser: targetUser.trim(),
            permissionCodes: Array.from(selectedPermCodes),
            env
          }));
          notify?.(`¡${selectedPermCodes.size} permisos asignados correctamente!`);
          loadTargetPermissions(targetUser);
          setSelectedPermCodes(new Set());
        } catch (err) {
          notify?.(err.message, undefined, 'error');
        } finally {
          setLoadingPerms(false);
        }
      }
    });
  };

  // Eliminar Permiso de Usuario
  const handleRemovePermission = (perm) => {
    setConfirmDialog({
      title: 'Quitar Permiso de Usuario',
      message: `¿Desea retirar el permiso #${perm.cod_permiso} (${perm.des_permiso}) del usuario '${targetUser.toUpperCase()}'?`,
      destructive: true,
      onConfirm: async () => {
        setLoadingPerms(true);
        try {
          await api('/modules/users/remove-permission', send('POST', {
            targetUser: targetUser.trim(),
            cod_permiso: perm.cod_permiso,
            env
          }));
          notify?.(`Permiso #${perm.cod_permiso} eliminado.`);
          loadTargetPermissions(targetUser);
        } catch (err) {
          notify?.(err.message, undefined, 'error');
        } finally {
          setLoadingPerms(false);
        }
      }
    });
  };

  // Toggle selección de permiso
  const togglePermSelection = (code) => {
    setSelectedPermCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // Seleccionar / Deseleccionar todos
  const toggleSelectAllPerms = () => {
    if (selectedPermCodes.size === availablePermissions.length) {
      setSelectedPermCodes(new Set());
    } else {
      setSelectedPermCodes(new Set(availablePermissions.map(p => p.cod_permiso)));
    }
  };

  // ============================================================================
  // 2. MÓDULO CAMBIO DE FECHA AMBULANCIA
  // ============================================================================
  const handleQueryAmbulance = async () => {
    if (!ambAtenciones.trim()) {
      notify?.('Ingrese al menos un número de atención.', undefined, 'error');
      return;
    }
    setAmbLoading(true);
    try {
      const res = await api('/modules/ambulance/query', send('POST', { atenciones: ambAtenciones, env }));
      setAmbResults(res);
      notify?.(`Consulta realizada: ${res.tmpllamadas.length} en temporales, ${res.llamadas.length} en consolidadas.`);
    } catch (err) {
      notify?.(err.message, undefined, 'error');
    } finally {
      setAmbLoading(false);
    }
  };

  const handleUpdateAmbulanceDate = () => {
    if (!ambAtenciones.trim() || !ambDate) {
      notify?.('Especifique las atenciones y la nueva fecha.', undefined, 'error');
      return;
    }
    setConfirmDialog({
      title: 'Cambio de Fecha de Atención (Ambulancia)',
      message: `¿Desea cambiar la fecha de atención a '${ambDate}' para las atenciones: ${ambAtenciones}? Esta acción modificará 't_tmpllamadas' y 't_llamadas'.`,
      onConfirm: async () => {
        setAmbLoading(true);
        try {
          const res = await api('/modules/ambulance/update-date', send('POST', { atenciones: ambAtenciones, newDate: ambDate, env }));
          notify?.(`¡Fecha actualizada con éxito para ${res.updatedCount} atención(es)!`);
          handleQueryAmbulance();
        } catch (err) {
          notify?.(err.message, undefined, 'error');
        } finally {
          setAmbLoading(false);
        }
      }
    });
  };

  // ============================================================================
  // 3. MÓDULO MODIFICAR ÓRDENES (LABORATORIO)
  // ============================================================================
  const handleQueryLab = async () => {
    if (!labOrdersInput.trim()) {
      notify?.('Ingrese el número de orden de laboratorio.', undefined, 'error');
      return;
    }
    setLabLoading(true);
    try {
      const res = await api('/modules/laboratory/query', send('POST', { ordenes: labOrdersInput, env }));
      setLabResults(res.orders || []);
      notify?.(`Se encontraron ${res.orders.length} orden(es).`);
    } catch (err) {
      notify?.(err.message, undefined, 'error');
    } finally {
      setLabLoading(false);
    }
  };

  const handleUpdateLab = () => {
    if (!labOrdersInput.trim()) {
      notify?.('Ingrese el número de orden.', undefined, 'error');
      return;
    }
    const actionText = labAction === 'cancel' ? 'ANULAR' : `CAMBIAR ESTADO a '${labNewStatus}'`;
    setConfirmDialog({
      title: `Modificar Orden de Laboratorio`,
      message: `¿Desea ${actionText} para la(s) orden(es): ${labOrdersInput}? Se actualizará 't_cab_lab_serv_laboratorio' y se depurarán tablas temporales.`,
      destructive: labAction === 'cancel',
      onConfirm: async () => {
        setLabLoading(true);
        try {
          await api('/modules/laboratory/update', send('POST', {
            ordenes: labOrdersInput,
            action: labAction,
            newStatus: labNewStatus,
            env
          }));
          notify?.(`¡Orden(es) modificada(s) con éxito!`);
          handleQueryLab();
        } catch (err) {
          notify?.(err.message, undefined, 'error');
        } finally {
          setLabLoading(false);
        }
      }
    });
  };

  // ============================================================================
  // 4. MÓDULO MODIFICAR PEDIDOS (DELIVERY)
  // ============================================================================
  const handleQueryDelivery = async () => {
    if (!deliveryInput.trim()) {
      notify?.('Ingrese el número de pedido de delivery.', undefined, 'error');
      return;
    }
    setDeliveryLoading(true);
    try {
      const res = await api('/modules/delivery/query', send('POST', { pedidos: deliveryInput, env }));
      setDeliveryResults(res.orders || []);
      notify?.(`Se encontraron ${res.orders.length} pedido(s).`);
    } catch (err) {
      notify?.(err.message, undefined, 'error');
    } finally {
      setDeliveryLoading(false);
    }
  };

  const handleUpdateDelivery = () => {
    if (!deliveryInput.trim()) {
      notify?.('Ingrese el número de pedido.', undefined, 'error');
      return;
    }
    const actionText = deliveryAction === 'cancel' ? 'ANULAR' : `CAMBIAR ESTADO a '${deliveryNewStatus}'`;
    setConfirmDialog({
      title: `Modificar Pedido de Delivery`,
      message: `¿Desea ${actionText} para el/los pedido(s): ${deliveryInput}? Se actualizará 't_tmppedidomed' y 't_pedidomed'.`,
      destructive: deliveryAction === 'cancel',
      onConfirm: async () => {
        setDeliveryLoading(true);
        try {
          await api('/modules/delivery/update', send('POST', {
            pedidos: deliveryInput,
            action: deliveryAction,
            newStatus: deliveryNewStatus,
            env
          }));
          notify?.(`¡Pedido(s) modificado(s) con éxito!`);
          handleQueryDelivery();
        } catch (err) {
          notify?.(err.message, undefined, 'error');
        } finally {
          setDeliveryLoading(false);
        }
      }
    });
  };

  // ============================================================================
  // 5. MÓDULO CAMBIO ESTADO H Y G (FACTURACIÓN)
  // ============================================================================
  const handleQueryHyg = async () => {
    if (!hygInput.trim()) {
      notify?.('Ingrese los números a consultar.', undefined, 'error');
      return;
    }
    setHygLoading(true);
    try {
      const res = await api('/modules/facturacion-hyg/query', send('POST', {
        items: hygInput,
        mode: hygMode,
        env
      }));
      setHygResults(res.records || []);
      notify?.(`Se encontraron ${res.records.length} registro(s) en facturación.`);
    } catch (err) {
      notify?.(err.message, undefined, 'error');
    } finally {
      setHygLoading(false);
    }
  };

  const handleUpdateHyg = () => {
    if (!hygInput.trim()) {
      notify?.('Ingrese los números a modificar.', undefined, 'error');
      return;
    }
    setConfirmDialog({
      title: `Cambio Estado Facturación (${hygStatus})`,
      message: `¿Desea actualizar a estado '${hygStatus}' por ${hygMode === 'atencion' ? 'Atención' : 'Expediente'} para: ${hygInput}? Se registrará como usuario auditor '${hygUser}'.`,
      onConfirm: async () => {
        setHygLoading(true);
        try {
          await api('/modules/facturacion-hyg/update', send('POST', {
            items: hygInput,
            mode: hygMode,
            newStatus: hygStatus,
            usuario: hygUser,
            env
          }));
          notify?.(`¡Facturación actualizada con éxito a estado '${hygStatus}'!`);
          handleQueryHyg();
        } catch (err) {
          notify?.(err.message, undefined, 'error');
        } finally {
          setHygLoading(false);
        }
      }
    });
  };

  // ============================================================================
  // 6. OPERACIONES ESPECIALES TI
  // ============================================================================
  const handleUpdateSubzona = async () => {
    if (!subzonaAtes.trim() || !subzonaVal.trim()) {
      notify?.('Complete la atención y subzona.', undefined, 'error');
      return;
    }
    setSpecialLoading(true);
    try {
      await api('/modules/special/subzona', send('POST', { atenciones: subzonaAtes, subZona: subzonaVal, env }));
      notify?.(`¡Subzona actualizada a '${subzonaVal}' para las atenciones!`);
      setSubzonaAtes('');
    } catch (err) {
      notify?.(err.message, undefined, 'error');
    } finally {
      setSpecialLoading(false);
    }
  };

  const handleUpdateMpos = async () => {
    if (!mposAtes.trim()) {
      notify?.('Ingrese las atenciones para MPOS.', undefined, 'error');
      return;
    }
    setSpecialLoading(true);
    try {
      await api('/modules/special/mpos', send('POST', { atenciones: mposAtes, env }));
      notify?.(`¡Medio de pago actualizado a MPOS ('M') con éxito!`);
      setMposAtes('');
    } catch (err) {
      notify?.(err.message, undefined, 'error');
    } finally {
      setSpecialLoading(false);
    }
  };

  const handleQueryGdh = async () => {
    if (!gdhNombre.trim()) {
      notify?.('Ingrese un nombre para buscar en GDH.', undefined, 'error');
      return;
    }
    setSpecialLoading(true);
    try {
      const res = await api('/modules/special/descuento', send('POST', { nombre: gdhNombre, env }));
      setGdhResults(res.workers || []);
      notify?.(`Se encontraron ${res.workers.length} coincidencia(s) en GDH.`);
    } catch (err) {
      notify?.(err.message, undefined, 'error');
    } finally {
      setSpecialLoading(false);
    }
  };

  return (
    <div className="integrated-modules-container">
      {/* Barra superior de herramientas y selección de módulo */}
      <div className="modules-ribbon-card">
        <div className="modules-ribbon-header">
          <div className="modules-ribbon-title">
            <div className="ribbon-badge">SISTEMA INTEGRADO DE TI</div>
            <h3>Centro Operativo de Módulos TI</h3>
            <p>Módulos operativos extraídos de la aplicación de escritorio corporativa (v2.1.8.39). Acceso y ejecución web directa.</p>
          </div>

          <div className="modules-env-selector">
            <span className="env-label">Entorno Activo:</span>
            <div className="env-toggle">
              <button
                className={`env-btn ${env === 'prod' ? 'active' : ''}`}
                onClick={() => setEnv('prod')}
              >
                PRODUCCIÓN
              </button>
              <button
                className={`env-btn ${env === 'test' ? 'active' : ''}`}
                onClick={() => setEnv('test')}
              >
                HOMOLOGACIÓN
              </button>
            </div>
          </div>
        </div>

        {/* Barra de pestañas de módulos principales */}
        <div className="modules-tabs-nav" role="tablist">
          <button
            className={`module-tab-btn ${activeModule === 'users' ? 'active' : ''}`}
            onClick={() => setActiveModule('users')}
          >
            <Users size={17} />
            <span>Usuario SM & Permisos</span>
          </button>

          <button
            className={`module-tab-btn ${activeModule === 'ambulance' ? 'active' : ''}`}
            onClick={() => setActiveModule('ambulance')}
          >
            <Ambulance size={17} />
            <span>Cambio Fecha Ambulancia</span>
          </button>

          <button
            className={`module-tab-btn ${activeModule === 'lab' ? 'active' : ''}`}
            onClick={() => setActiveModule('lab')}
          >
            <FlaskConical size={17} />
            <span>Modificar Orden Lab</span>
          </button>

          <button
            className={`module-tab-btn ${activeModule === 'delivery' ? 'active' : ''}`}
            onClick={() => setActiveModule('delivery')}
          >
            <Truck size={17} />
            <span>Modificar Pedido Delivery</span>
          </button>

          <button
            className={`module-tab-btn ${activeModule === 'hyg' ? 'active' : ''}`}
            onClick={() => setActiveModule('hyg')}
          >
            <FileCheck size={17} />
            <span>Cambio Estado HYG</span>
          </button>

          <button
            className={`module-tab-btn ${activeModule === 'special' ? 'active' : ''}`}
            onClick={() => setActiveModule('special')}
          >
            <Zap size={17} />
            <span>Operaciones Especiales</span>
          </button>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* 1. MÓDULO: USUARIOS SM & PERMISOS */}
      {/* ============================================================================ */}
      {activeModule === 'users' && (
        <div className="module-content-card">
          <div className="subtabs-bar">
            <button
              className={`subtab-btn ${userTab === 'create' ? 'active' : ''}`}
              onClick={() => setUserTab('create')}
            >
              <UserPlus size={15} />
              <span>Crear Usuario</span>
            </button>
            <button
              className={`subtab-btn ${userTab === 'list' ? 'active' : ''}`}
              onClick={() => setUserTab('list')}
            >
              <Users size={15} />
              <span>Directorio de Usuarios</span>
            </button>
            <button
              className={`subtab-btn ${userTab === 'permissions' ? 'active' : ''}`}
              onClick={() => setUserTab('permissions')}
            >
              <ShieldCheck size={15} />
              <span>Réplica & Asignación de Permisos</span>
            </button>
          </div>

          {/* Subpestaña: Crear Usuario */}
          {userTab === 'create' && (
            <div className="module-form-grid">
              <div className="form-panel">
                <div className="panel-header">
                  <h4>Datos del Nuevo Usuario</h4>
                  <span className="panel-badge">Solución Médica (m_usuarios)</span>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: '0 0 160px' }}>
                    <label>Código Usuario</label>
                    <div className="input-with-action">
                      <input
                        type="text"
                        className="sa-native-input"
                        value={newUser.cod_usu}
                        readOnly
                        placeholder="U..."
                      />
                      <button className="icon-btn-inline" title="Recargar siguiente código correlativo" onClick={loadNextCode}>
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Nombres y Apellidos Completos *</label>
                    <input
                      type="text"
                      className="sa-native-input"
                      placeholder="Ej: ALVAREZ RUIZ JUAN CARLOS"
                      value={newUser.nom_per}
                      onChange={e => handleNameChange(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Login de Usuario (nom_usu) *</label>
                    <div className="input-with-indicator">
                      <input
                        type="text"
                        className="sa-native-input"
                        placeholder="Ej: JALVAREZ"
                        value={newUser.nom_usu}
                        onChange={e => setNewUser({ ...newUser, nom_usu: e.target.value.toUpperCase() })}
                      />
                      {usernameCheck.checking && <span className="indicator-loading"><RefreshCw size={13} className="spin" /></span>}
                      {!usernameCheck.checking && usernameCheck.available === true && (
                        <span className="indicator-success" title="Usuario disponible para crear">
                          <CheckCircle2 size={16} /> Disponible
                        </span>
                      )}
                      {!usernameCheck.checking && usernameCheck.available === false && (
                        <span className="indicator-danger" title="El usuario ya existe en Solución Médica">
                          <AlertCircle size={16} /> Ya registrado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="form-group" style={{ flex: '0 0 200px' }}>
                    <label>Documento de Identidad (DNI)</label>
                    <input
                      type="text"
                      className="sa-native-input"
                      placeholder="8 dígitos"
                      maxLength={12}
                      value={newUser.doc_identidad}
                      onChange={e => setNewUser({ ...newUser, doc_identidad: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Perfil SM Inicial</label>
                    <select
                      className="sa-native-select"
                      value={newUser.perfil}
                      onChange={e => setNewUser({ ...newUser, perfil: e.target.value })}
                    >
                      {profiles.map(p => (
                        <option key={p.id_perfil || p.nom_per} value={p.nom_per}>
                          {p.nom_per} {p.nom_per === 'PACF' ? '(Asegurabilidad)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Contraseña Inicial</label>
                    <input
                      type="text"
                      className="sa-native-input"
                      value={newUser.pas_usu}
                      onChange={e => setNewUser({ ...newUser, pas_usu: e.target.value })}
                    />
                    <small className="help-text">Predeterminada corporativa: Abc123xyz</small>
                  </div>
                </div>

                <div className="form-actions-row">
                  <SaButton
                    variant="primary"
                    size="md"
                    label={loading ? 'Creando Usuario…' : 'Crear Usuario SM'}
                    icon={<UserPlus size={16} />}
                    disabled={loading || !newUser.nom_usu || !newUser.nom_per || usernameCheck.available === false}
                    onClick={handleCreateUser}
                  />
                </div>
              </div>

              <div className="info-side-panel">
                <h4><Info size={16} /> Parámetros Automáticos</h4>
                <ul className="info-bullets">
                  <li><strong>Caducidad:</strong> 2 meses a partir de la fecha de alta.</li>
                  <li><strong>Estado inicial:</strong> Activo (true) en Solución Médica.</li>
                  <li><strong>Contador de ingresos:</strong> Inicializado en 10 intentos.</li>
                  <li><strong>Primer acceso:</strong> <code>ult_ingreso = NULL</code>, lo que forza el cambio de contraseña al ingresar por primera vez.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Subpestaña: Directorio de Usuarios */}
          {userTab === 'list' && (
            <div className="users-directory-section">
              <div className="filter-controls-row">
                <div className="search-field" style={{ flex: 1 }}>
                  <Search size={16} />
                  <input
                    type="text"
                    className="sa-native-input"
                    placeholder="Buscar por login, nombre, DNI o código..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchUsers()}
                  />
                </div>

                <div className="status-filter-buttons">
                  <button
                    className={`filter-pill ${userFilterStatus === 'all' ? 'active' : ''}`}
                    onClick={() => setUserFilterStatus('all')}
                  >
                    Todos
                  </button>
                  <button
                    className={`filter-pill ${userFilterStatus === 'active' ? 'active' : ''}`}
                    onClick={() => setUserFilterStatus('active')}
                  >
                    Activos
                  </button>
                  <button
                    className={`filter-pill ${userFilterStatus === 'inactive' ? 'active' : ''}`}
                    onClick={() => setUserFilterStatus('inactive')}
                  >
                    Inactivos
                  </button>
                </div>

                <SaButton
                  variant="secondary"
                  size="sm"
                  label="Buscar"
                  icon={<Search size={14} />}
                  onClick={fetchUsers}
                />
              </div>

              {/* Tabla de usuarios */}
              <div className="table-responsive-box">
                <table className="modern-data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Usuario (Login)</th>
                      <th>Nombres y Apellidos</th>
                      <th>DNI</th>
                      <th>Estado</th>
                      <th>Último Ingreso</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      <tr>
                        <td colSpan={7} className="td-loading">
                          <RefreshCw size={18} className="spin" /> Cargando usuarios de Solución Médica...
                        </td>
                      </tr>
                    ) : usersList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="td-empty">
                          No se encontraron usuarios que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      usersList.map(u => (
                        <tr key={u.codigo}>
                          <td><strong>{u.codigo}</strong></td>
                          <td><code>{u.usuario}</code></td>
                          <td>{u.nombres}</td>
                          <td>{u.dni || '-'}</td>
                          <td>
                            <span className={`status-badge ${u.activo ? 'badge-active' : 'badge-inactive'}`}>
                              {u.activo ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', color: '#666' }}>
                            {u.ult_ingreso ? new Date(u.ult_ingreso).toLocaleString() : 'Pendiente primer login'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-actions-group">
                              <button
                                className="action-btn-small"
                                title="Resetear contraseña a Abc123xyz"
                                onClick={() => handleResetPassword(u)}
                              >
                                <Key size={13} /> Reset Clave
                              </button>

                              <button
                                className={`action-btn-small ${u.activo ? 'btn-warn' : 'btn-success'}`}
                                title={u.activo ? 'Desactivar usuario' : 'Activar usuario'}
                                onClick={() => handleToggleUser(u)}
                              >
                                {u.activo ? <Lock size={13} /> : <Unlock size={13} />}
                                {u.activo ? 'Desactivar' : 'Activar'}
                              </button>

                              <button
                                className="action-btn-small"
                                title="Gestionar y ver permisos de este usuario"
                                onClick={() => {
                                  setTargetUser(u.usuario);
                                  setUserTab('permissions');
                                  loadTargetPermissions(u.usuario);
                                }}
                              >
                                <ShieldCheck size={13} /> Permisos
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subpestaña: Réplica y Gestión de Permisos */}
          {userTab === 'permissions' && (
            <div className="permissions-manager-layout">
              {/* Barra superior de selección de usuario destino */}
              <div className="target-user-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <label style={{ fontWeight: 600, fontSize: '13px', color: '#1f3d2b', whiteSpace: 'nowrap' }}>
                    Usuario Destino:
                  </label>
                  <input
                    type="text"
                    className="sa-native-input"
                    placeholder="Ej: LCACERESG"
                    value={targetUser}
                    onChange={e => setTargetUser(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && loadTargetPermissions(targetUser)}
                    style={{ maxWidth: '240px' }}
                  />
                  <SaButton
                    variant="secondary"
                    size="sm"
                    label="Cargar Permisos"
                    icon={<Search size={14} />}
                    onClick={() => loadTargetPermissions(targetUser)}
                  />
                </div>

                {targetUser && (
                  <div className="target-user-stats">
                    <span>Permisos asignados: <strong>{targetPermissions.length}</strong></span>
                  </div>
                )}
              </div>

              {/* Contenedor de dos columnas: Actuales vs Fuente a replicar */}
              <div className="permissions-dual-grid">
                {/* Columna 1: Permisos actuales del usuario destino */}
                <div className="perm-column-card">
                  <div className="perm-col-header">
                    <h4>Permisos Actuales ({targetUser || 'Sin usuario'})</h4>
                    <span className="count-tag">{targetPermissions.length}</span>
                  </div>

                  <div className="perm-list-box">
                    {loadingPerms ? (
                      <div className="perm-empty"><RefreshCw size={16} className="spin" /> Cargando...</div>
                    ) : targetPermissions.length === 0 ? (
                      <div className="perm-empty">El usuario no tiene permisos asignados o no ha sido consultado.</div>
                    ) : (
                      targetPermissions.map(p => (
                        <div key={p.cod_permiso} className="perm-item-row">
                          <span className="perm-code">#{p.cod_permiso}</span>
                          <span className="perm-desc">{p.des_permiso}</span>
                          <button
                            className="perm-del-btn"
                            title="Eliminar este permiso"
                            onClick={() => handleRemovePermission(p)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Columna 2: Fuente de permisos (Clonar por usuario de referencia o catálogo) */}
                <div className="perm-column-card">
                  <div className="perm-col-header">
                    <div className="source-toggle">
                      <button
                        className={`source-btn ${permSourceMode === 'reference' ? 'active' : ''}`}
                        onClick={() => setPermSourceMode('reference')}
                      >
                        Usuario de Referencia
                      </button>
                      <button
                        className={`source-btn ${permSourceMode === 'catalog' ? 'active' : ''}`}
                        onClick={() => setPermSourceMode('catalog')}
                      >
                        Catálogo Completo
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="select-all-btn"
                        onClick={toggleSelectAllPerms}
                        disabled={availablePermissions.length === 0}
                      >
                        {selectedPermCodes.size === availablePermissions.length && availablePermissions.length > 0
                          ? 'Deseleccionar todos'
                          : 'Seleccionar todos'}
                      </button>
                    </div>
                  </div>

                  {permSourceMode === 'reference' && (
                    <div className="reference-user-bar">
                      <span>Usuario Modelo:</span>
                      <input
                        type="text"
                        className="sa-native-input"
                        placeholder="Ej: PCASTILLO"
                        value={referenceUser}
                        onChange={e => setReferenceUser(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && loadAvailablePermissions()}
                      />
                      <SaButton
                        variant="secondary"
                        size="xs"
                        label="Cargar"
                        onClick={loadAvailablePermissions}
                      />
                    </div>
                  )}

                  {permSourceMode === 'catalog' && (
                    <div className="reference-user-bar">
                      <span>Todos los permisos activos en el sistema Solución Médica</span>
                      <SaButton
                        variant="secondary"
                        size="xs"
                        label="Cargar Catálogo"
                        onClick={loadAvailablePermissions}
                      />
                    </div>
                  )}

                  <div className="perm-list-box selectable">
                    {availablePermissions.length === 0 ? (
                      <div className="perm-empty">
                        Haga clic en 'Cargar' para ver los permisos del usuario modelo o catálogo.
                      </div>
                    ) : (
                      availablePermissions.map(p => {
                        const isSelected = selectedPermCodes.has(p.cod_permiso);
                        const alreadyHas = targetPermissions.some(tp => tp.cod_permiso === p.cod_permiso);
                        return (
                          <div
                            key={p.cod_permiso}
                            className={`perm-item-row selectable ${isSelected ? 'selected' : ''} ${alreadyHas ? 'already-owned' : ''}`}
                            onClick={() => !alreadyHas && togglePermSelection(p.cod_permiso)}
                          >
                            <span className="checkbox-icon">
                              {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </span>
                            <span className="perm-code">#{p.cod_permiso}</span>
                            <span className="perm-desc">{p.des_permiso}</span>
                            {alreadyHas && <span className="owned-tag">Ya asignado</span>}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="perm-assign-footer">
                    <span>Seleccionados: <strong>{selectedPermCodes.size}</strong></span>
                    <SaButton
                      variant="primary"
                      size="sm"
                      label={`Asignar ${selectedPermCodes.size} Permisos Seleccionados`}
                      icon={<ShieldCheck size={16} />}
                      disabled={selectedPermCodes.size === 0 || !targetUser.trim() || loadingPerms}
                      onClick={handleAssignPermissions}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================ */}
      {/* 2. MÓDULO: CAMBIO DE FECHA AMBULANCIA */}
      {/* ============================================================================ */}
      {activeModule === 'ambulance' && (
        <div className="module-content-card">
          <div className="module-section-heading">
            <Ambulance size={20} style={{ color: '#2d6a4f' }} />
            <div>
              <h4>Cambio de Fecha de Atención en Ambulancia</h4>
              <p>Actualiza la fecha de atención en <code>t_tmpllamadas</code> (fec_ate, feclla_ate, amb_fecha_ini) y <code>t_llamadas</code> (feclla, fecfin).</p>
            </div>
          </div>

          <div className="single-module-form-box">
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>N° Atención o Lista de Atenciones *</label>
                <input
                  type="text"
                  className="sa-native-input"
                  placeholder="Ej: 6902896, 6902897 (admite varias separadas por coma)"
                  value={ambAtenciones}
                  onChange={e => setAmbAtenciones(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Nueva Fecha de Atención *</label>
                <input
                  type="date"
                  className="sa-native-input"
                  value={ambDate}
                  onChange={e => setAmbDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <SaButton
                  variant="secondary"
                  size="md"
                  label="Consultar"
                  icon={<Search size={16} />}
                  disabled={ambLoading || !ambAtenciones.trim()}
                  onClick={handleQueryAmbulance}
                />
                <SaButton
                  variant="primary"
                  size="md"
                  label="Actualizar Fecha"
                  icon={<Calendar size={16} />}
                  disabled={ambLoading || !ambAtenciones.trim() || !ambDate}
                  onClick={handleUpdateAmbulanceDate}
                />
              </div>
            </div>

            {/* Resultados de la consulta */}
            {ambResults && (
              <div className="results-duo-container">
                <div className="result-half-table">
                  <h5>t_tmpllamadas (Llamadas Temporales)</h5>
                  <div className="table-responsive-box">
                    <table className="modern-data-table">
                      <thead>
                        <tr>
                          <th>N° Atención</th>
                          <th>Fecha Ate</th>
                          <th>Fecha Llamada</th>
                          <th>Inicio Ambulancia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ambResults.tmpllamadas.length === 0 ? (
                          <tr><td colSpan={4} className="td-empty">Sin registros en t_tmpllamadas</td></tr>
                        ) : (
                          ambResults.tmpllamadas.map(r => (
                            <tr key={r.cod_ate}>
                              <td><strong>{r.cod_ate}</strong></td>
                              <td>{r.fec_ate ? r.fec_ate.slice(0, 10) : '-'}</td>
                              <td>{r.feclla_ate ? r.feclla_ate.slice(0, 10) : '-'}</td>
                              <td>{r.amb_fecha_ini ? r.amb_fecha_ini.slice(0, 10) : '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="result-half-table">
                  <h5>t_llamadas (Llamadas Consolidadas)</h5>
                  <div className="table-responsive-box">
                    <table className="modern-data-table">
                      <thead>
                        <tr>
                          <th>N° Atención</th>
                          <th>Fecha Llamada</th>
                          <th>Fecha Fin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ambResults.llamadas.length === 0 ? (
                          <tr><td colSpan={3} className="td-empty">Sin registros en t_llamadas</td></tr>
                        ) : (
                          ambResults.llamadas.map(r => (
                            <tr key={r.cod_ate}>
                              <td><strong>{r.cod_ate}</strong></td>
                              <td>{r.feclla ? r.feclla.slice(0, 10) : '-'}</td>
                              <td>{r.fecfin ? r.fecfin.slice(0, 10) : '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 3. MÓDULO: MODIFICAR ÓRDENES (LABORATORIO) */}
      {/* ============================================================================ */}
      {activeModule === 'lab' && (
        <div className="module-content-card">
          <div className="module-section-heading">
            <FlaskConical size={20} style={{ color: '#2d6a4f' }} />
            <div>
              <h4>Modificar u Anular Órdenes de Laboratorio</h4>
              <p>Cambio de estado o anulación completa de órdenes en <code>t_cab_lab_serv_laboratorio</code> y purga de temporales de atención.</p>
            </div>
          </div>

          <div className="single-module-form-box">
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>N° Orden(es) de Laboratorio *</label>
                <input
                  type="text"
                  className="sa-native-input"
                  placeholder="Ej: 937477, 937478 (admite varias separadas por coma)"
                  value={labOrdersInput}
                  onChange={e => setLabOrdersInput(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Operación a Realizar</label>
                <div className="radio-group-horizontal">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="labAction"
                      checked={labAction === 'cancel'}
                      onChange={() => setLabAction('cancel')}
                    />
                    <span>Anular Orden (C)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="labAction"
                      checked={labAction === 'change_status'}
                      onChange={() => setLabAction('change_status')}
                    />
                    <span>Cambiar Estado</span>
                  </label>
                </div>
              </div>

              {labAction === 'change_status' && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Nuevo Estado</label>
                  <select
                    className="sa-native-select"
                    value={labNewStatus}
                    onChange={e => setLabNewStatus(e.target.value)}
                  >
                    <option value="0">0 - Creado / Pendiente</option>
                    <option value="1">1 - En Proceso</option>
                    <option value="2">2 - Muestra Tomada</option>
                    <option value="3">3 - En Laboratorio</option>
                    <option value="4">4 - Validado</option>
                    <option value="5">5 - Finalizado / Entregado</option>
                  </select>
                </div>
              )}

              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <SaButton
                  variant="secondary"
                  size="md"
                  label="Consultar"
                  icon={<Search size={16} />}
                  disabled={labLoading || !labOrdersInput.trim()}
                  onClick={handleQueryLab}
                />
                <SaButton
                  variant={labAction === 'cancel' ? 'danger' : 'primary'}
                  size="md"
                  label={labAction === 'cancel' ? 'Anular Orden' : 'Aplicar Estado'}
                  disabled={labLoading || !labOrdersInput.trim()}
                  onClick={handleUpdateLab}
                />
              </div>
            </div>

            {/* Resultados de órdenes */}
            {labResults && (
              <div className="table-responsive-box" style={{ marginTop: '16px' }}>
                <table className="modern-data-table">
                  <thead>
                    <tr>
                      <th>N° Orden Laboratorio</th>
                      <th>Estado Actual</th>
                      <th>Descripción / Significado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labResults.length === 0 ? (
                      <tr><td colSpan={3} className="td-empty">No se encontró ninguna orden con el número proporcionado.</td></tr>
                    ) : (
                      labResults.map(o => (
                        <tr key={o.cod_serv_laboratorio}>
                          <td><strong>{o.cod_serv_laboratorio}</strong></td>
                          <td><code>{o.estado}</code></td>
                          <td>
                            {o.estado?.trim() === 'C' ? (
                              <span className="badge-inactive">ANULADO / CANCELADO</span>
                            ) : (
                              `Estado ${o.estado?.trim()}`
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 4. MÓDULO: MODIFICAR PEDIDOS (DELIVERY / FARMACIA) */}
      {/* ============================================================================ */}
      {activeModule === 'delivery' && (
        <div className="module-content-card">
          <div className="module-section-heading">
            <Truck size={20} style={{ color: '#2d6a4f' }} />
            <div>
              <h4>Modificar u Anular Pedidos de Delivery (Farmacia)</h4>
              <p>Cambio de estado o anulación de pedidos en <code>t_tmppedidomed</code> y tablas detalle de pedidos.</p>
            </div>
          </div>

          <div className="single-module-form-box">
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>N° Pedido(s) de Delivery *</label>
                <input
                  type="text"
                  className="sa-native-input"
                  placeholder="Ej: 4754336, 4754337 (admite varios separados por coma)"
                  value={deliveryInput}
                  onChange={e => setDeliveryInput(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Operación a Realizar</label>
                <div className="radio-group-horizontal">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="deliveryAction"
                      checked={deliveryAction === 'cancel'}
                      onChange={() => setDeliveryAction('cancel')}
                    />
                    <span>Anular Pedido</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="deliveryAction"
                      checked={deliveryAction === 'change_status'}
                      onChange={() => setDeliveryAction('change_status')}
                    />
                    <span>Cambiar Estado</span>
                  </label>
                </div>
              </div>

              {deliveryAction === 'change_status' && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Nuevo Estado</label>
                  <select
                    className="sa-native-select"
                    value={deliveryNewStatus}
                    onChange={e => setDeliveryNewStatus(Number(e.target.value))}
                  >
                    <option value={0}>0 - Recibido / Pendiente</option>
                    <option value={1}>1 - En Preparación</option>
                    <option value={2}>2 - Despachado</option>
                    <option value={3}>3 - En Ruta / Motorizado</option>
                    <option value={4}>4 - Entregado</option>
                  </select>
                </div>
              )}

              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <SaButton
                  variant="secondary"
                  size="md"
                  label="Consultar"
                  icon={<Search size={16} />}
                  disabled={deliveryLoading || !deliveryInput.trim()}
                  onClick={handleQueryDelivery}
                />
                <SaButton
                  variant={deliveryAction === 'cancel' ? 'danger' : 'primary'}
                  size="md"
                  label={deliveryAction === 'cancel' ? 'Anular Pedido' : 'Aplicar Estado'}
                  disabled={deliveryLoading || !deliveryInput.trim()}
                  onClick={handleUpdateDelivery}
                />
              </div>
            </div>

            {/* Resultados de pedidos */}
            {deliveryResults && (
              <div className="table-responsive-box" style={{ marginTop: '16px' }}>
                <table className="modern-data-table">
                  <thead>
                    <tr>
                      <th>N° Pedido</th>
                      <th>Estado</th>
                      <th>Canc Ped</th>
                      <th>Observación del Pedido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryResults.length === 0 ? (
                      <tr><td colSpan={4} className="td-empty">No se encontró ningún pedido con el número proporcionado.</td></tr>
                    ) : (
                      deliveryResults.map(p => (
                        <tr key={p.cod_ped}>
                          <td><strong>{p.cod_ped}</strong></td>
                          <td><code>{p.estado}</code></td>
                          <td><code>{p.canc_ped || '-'}</code></td>
                          <td>{p.obs_ped || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 5. MÓDULO: CAMBIO ESTADO H Y G (FACTURACIÓN) */}
      {/* ============================================================================ */}
      {activeModule === 'hyg' && (
        <div className="module-content-card">
          <div className="module-section-heading">
            <FileCheck size={20} style={{ color: '#2d6a4f' }} />
            <div>
              <h4>Cambio de Estado H y G en Facturación</h4>
              <p>Actualización de estado en <code>t_tmpexp</code> y depuración de registros en <code>t_det_listado_pacifico</code>.</p>
            </div>
          </div>

          <div className="single-module-form-box">
            <div className="form-row">
              <div className="form-group" style={{ flex: '0 0 220px' }}>
                <label>Tipo de Búsqueda</label>
                <div className="radio-group-horizontal">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="hygMode"
                      checked={hygMode === 'atencion'}
                      onChange={() => setHygMode('atencion')}
                    />
                    <span>N° Atención</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="hygMode"
                      checked={hygMode === 'expediente'}
                      onChange={() => setHygMode('expediente')}
                    />
                    <span>N° Expediente</span>
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ flex: 2 }}>
                <label>{hygMode === 'atencion' ? 'N° Atención(es) *' : 'N° Expediente(s) *'}</label>
                <input
                  type="text"
                  className="sa-native-input"
                  placeholder="Ej: 937146, 937147 (admite varios separados por coma)"
                  value={hygInput}
                  onChange={e => setHygInput(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ flex: '0 0 140px' }}>
                <label>Estado Destino</label>
                <select
                  className="sa-native-select"
                  value={hygStatus}
                  onChange={e => setHygStatus(e.target.value)}
                >
                  <option value="H">H - Hospitalaria</option>
                  <option value="G">G - Gastos / Otros</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Usuario Auditor</label>
                <input
                  type="text"
                  className="sa-native-input"
                  value={hygUser}
                  onChange={e => setHygUser(e.target.value.toUpperCase())}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <SaButton
                  variant="secondary"
                  size="md"
                  label="Consultar"
                  icon={<Search size={16} />}
                  disabled={hygLoading || !hygInput.trim()}
                  onClick={handleQueryHyg}
                />
                <SaButton
                  variant="primary"
                  size="md"
                  label="Actualizar Estado"
                  icon={<FileCheck size={16} />}
                  disabled={hygLoading || !hygInput.trim()}
                  onClick={handleUpdateHyg}
                />
              </div>
            </div>

            {/* Resultados de facturación */}
            {hygResults && (
              <div className="table-responsive-box" style={{ marginTop: '16px' }}>
                <table className="modern-data-table">
                  <thead>
                    <tr>
                      <th>Identificador ({hygMode === 'atencion' ? 'codate_exp' : 'cod_exp'})</th>
                      <th>Estado Expediente</th>
                      <th>Fecha Fin Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hygResults.length === 0 ? (
                      <tr><td colSpan={3} className="td-empty">No se encontraron expedientes en t_tmpexp.</td></tr>
                    ) : (
                      hygResults.map(r => (
                        <tr key={r.codate}>
                          <td><strong>{r.codate}</strong></td>
                          <td><code>{r.estado_exp}</code></td>
                          <td>{r.fec_estado_fin ? new Date(r.fec_estado_fin).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 6. OPERACIONES ESPECIALES TI */}
      {/* ============================================================================ */}
      {activeModule === 'special' && (
        <div className="module-content-card">
          <div className="special-modules-grid">
            {/* Tarjeta: Cambio de Subzona */}
            <div className="special-card">
              <h5>Cambio de Subzona (Ambulancias)</h5>
              <p>Actualiza la subzona asignada (<code>descrp_zona</code>) en <code>t_tmpllamadas</code> para reclasificar atenciones.</p>

              <div className="form-group">
                <label>Atenciones (separadas por coma)</label>
                <input
                  type="text"
                  className="sa-native-input"
                  placeholder="Ej: 6902896, 6902897"
                  value={subzonaAtes}
                  onChange={e => setSubzonaAtes(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Nueva Subzona</label>
                <input
                  type="text"
                  className="sa-native-input"
                  placeholder="Ej: LIMA CENTRO, CALLAO, SURCO"
                  value={subzonaVal}
                  onChange={e => setSubzonaVal(e.target.value.toUpperCase())}
                />
              </div>

              <SaButton
                variant="primary"
                size="sm"
                label="Actualizar Subzona"
                disabled={specialLoading || !subzonaAtes.trim()}
                onClick={handleUpdateSubzona}
              />
            </div>

            {/* Tarjeta: Cambio a MPOS */}
            <div className="special-card">
              <h5>Cambiar Medio de Pago a MPOS ('M')</h5>
              <p>Actualiza <code>FOR_ATE = 'M'</code> en <code>t_llamadas</code> y <code>t_tmpllamadas</code> para habilitar cobro con datáfono móvil.</p>

              <div className="form-group">
                <label>Atenciones (separadas por coma)</label>
                <input
                  type="text"
                  className="sa-native-input"
                  placeholder="Ej: 6902896, 6902897"
                  value={mposAtes}
                  onChange={e => setMposAtes(e.target.value)}
                />
              </div>

              <SaButton
                variant="primary"
                size="sm"
                label="Actualizar a MPOS"
                disabled={specialLoading || !mposAtes.trim()}
                onClick={handleUpdateMpos}
              />
            </div>

            {/* Tarjeta: Descuento Personal GDH */}
            <div className="special-card">
              <h5>Consulta Descuento de Personal (GDH)</h5>
              <p>Consulta el estado y retenciones de personal en <code>vw_gdh_descuento_trabajador</code>.</p>

              <div className="form-group">
                <label>Nombre o Apellido del Trabajador</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="sa-native-input"
                    placeholder="Ej: GARCIA"
                    value={gdhNombre}
                    onChange={e => setGdhNombre(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleQueryGdh()}
                  />
                  <SaButton
                    variant="secondary"
                    size="sm"
                    label="Buscar"
                    disabled={specialLoading || !gdhNombre.trim()}
                    onClick={handleQueryGdh}
                  />
                </div>
              </div>

              {gdhResults && (
                <div className="table-responsive-box" style={{ maxHeight: '180px', marginTop: '10px' }}>
                  <table className="modern-data-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>DNI</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gdhResults.map((w, idx) => (
                        <tr key={idx}>
                          <td>{w.nombre}</td>
                          <td>{w.dni || w.doc_identidad || '-'}</td>
                          <td>{w.estado || 'Activo'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Seguridad */}
      {confirmDialog && (
        <SaDialog
          open={true}
          title={confirmDialog.title}
          variant={confirmDialog.destructive ? 'danger' : 'primary'}
          confirmLabel={confirmDialog.destructive ? 'Confirmar y Aplicar' : 'Confirmar'}
          cancelLabel="Cancelar"
          onClose={() => setConfirmDialog(null)}
          onConfirm={async () => {
            const fn = confirmDialog.onConfirm;
            setConfirmDialog(null);
            if (fn) await fn();
          }}
        >
          <div style={{ padding: '8px 0', fontSize: '14px', lineHeight: 1.5, color: '#2d3748' }}>
            <p>{confirmDialog.message}</p>
          </div>
        </SaDialog>
      )}
    </div>
  );
}
