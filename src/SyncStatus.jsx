import { useState } from 'react';
import { SaButton } from '@sanna-ui/react';
import { CloudCheck, CloudOff, RefreshCw, HardDrive } from 'lucide-react';
import { api, send } from './api.js';

export default function SyncStatus({ status, onRefresh }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function request(path) {
    setBusy(true); setError('');
    try { await api(path, send('POST', {})); await onRefresh(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const Icon = status.syncing ? RefreshCw : status.remoteOnline ? CloudCheck : CloudOff;
  const title = !status.initialized ? 'Primera copia local pendiente' : status.pending ? `Guardado localmente · ${status.pending} cambios pendientes` : status.remoteOnline ? 'Guardado localmente y sincronizado' : 'Copia local disponible · Sin conexión al servidor';
  return <section className="sync-status" aria-label="Estado de sincronización">
    <div className="sync-status-main"><HardDrive size={20}/><div><strong role="status">{title}</strong><p>{status.syncing ? 'Sincronizando con SQL Server… Puedes seguir trabajando.' : status.message || 'La sincronización se intenta automáticamente cada minuto.'}</p><small>{status.lastSync ? `Última sincronización: ${new Date(status.lastSync).toLocaleString('es-PE')}` : 'La primera descarga necesita conexión VPN.'}</small></div><SaButton variant="secondary" size="sm" label={status.syncing ? 'Sincronizando…' : 'Sincronizar ahora'} icon={<Icon size={16}/>} disabled={busy || status.syncing} onClick={() => request('/sync')}/></div>
    {status.notices?.length > 0 && <div className="sync-notices"><p>{status.notices.at(-1).message}</p><SaButton variant="terciary" size="sm" label="Entendido" disabled={busy} onClick={() => request('/sync/dismiss')}/></div>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
