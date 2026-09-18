import { useRef, useState } from 'react';
import { SaButton, SaInput, SaSelect, SaTabs, SaFileUpload, SaSpinner, SaTag } from '@sanna-ui/react';
import { ArrowDown, ArrowUp, Download, FileUp, Folder, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { Modal, IconButton, Alert } from './components.jsx';
import { api, send } from './api.js';
import { decryptBackup, encryptBackup, download } from './backup.js';

export function Categories({ categories, notes, onClose, onRefresh, notify }) {
  const [editing, setEditing] = useState(null), [name, setName] = useState(''), [color, setColor] = useState('#6b8e7b');
  const [removing, setRemoving] = useState(null), [target, setTarget] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  async function save(e) { e.preventDefault(); if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(''); try { await api(editing ? `/categories/${editing.id}` : '/categories', send(editing ? 'PUT' : 'POST', { name, color, order: editing?.order ?? categories.length })); await onRefresh(); setName(''); setEditing(null); notify(editing ? 'Categoría actualizada' : 'Categoría creada'); } catch (e) { setError(e instanceof SyntaxError ? 'El archivo no es un respaldo JSON válido.' : e.message); } finally { busyRef.current = false; setBusy(false); } }
  async function remove() { if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(''); try { await api(`/categories/${removing.id}`, send('DELETE', { targetId: target })); await onRefresh(); if (editing?.id === removing.id) { setEditing(null); setName(''); } setRemoving(null); notify('Categoría eliminada. Todas sus notas se conservaron.'); } catch (e) { setError(e instanceof SyntaxError ? 'El archivo no es un respaldo JSON válido.' : e.message); } finally { busyRef.current = false; setBusy(false); } }
  async function move(c, direction) {
    if (busyRef.current) return;
    const list = [...categories], index = list.findIndex(x => x.id === c.id), destination = index + direction;
    if (destination < 0 || destination >= list.length) return;
    [list[index], list[destination]] = [list[destination], list[index]]; busyRef.current = true; setBusy(true); setError('');
    try { await api('/categories/reorder', send('PUT', { ids: list.map(c => c.id) })); await onRefresh(); } catch (e) { setError(e instanceof SyntaxError ? 'El archivo no es un respaldo JSON válido.' : e.message); } finally { busyRef.current = false; setBusy(false); }
  }
  return <Modal title="Un lugar para cada tema" subtitle="Organiza tus categorías. Tus notas siempre se conservan." onClose={() => { if (!busyRef.current) onClose(); }}>
    <div className="manager-body"><fieldset className="manager-fields" disabled={busy}>
      {error && <Alert>{error}</Alert>}
      <form className="category-form" onSubmit={save}><input type="color" aria-label="Color de categoría" value={color} onChange={e => setColor(e.target.value)}/><SaInput uppercase={false} size="sm" required maxLength={80} label="Nombre de categoría" hideLabel placeholder="Nombre de la categoría" value={name} onValueChange={setName}/><SaButton size="sm" type="submit" disabled={busy} label={editing ? 'Guardar' : 'Crear'}/></form>
      {editing && <SaButton size="sm" variant="terciary" label="Cancelar edición" onClick={() => { setEditing(null); setName(''); }}/>}
      <div className="category-rows">{categories.map((c, i) => <div key={c.id} className="category-row"><Folder size={18} style={{ color: c.color }}/><span>{c.name}<small>{notes.filter(n => n.categoryId === c.id).length} notas, incluidas archivadas y papelera</small></span><IconButton disabled={busy || i === 0} label={`Subir ${c.name}`} onClick={() => move(c, -1)}><ArrowUp size={14}/></IconButton><IconButton disabled={busy || i === categories.length - 1} label={`Bajar ${c.name}`} onClick={() => move(c, 1)}><ArrowDown size={14}/></IconButton><IconButton disabled={busy} label={`Editar categoría ${c.name}`} onClick={() => { setEditing(c); setName(c.name); setColor(c.color); }}><Pencil size={15}/></IconButton><IconButton disabled={busy || categories.length < 2} label={`Eliminar categoría ${c.name}`} onClick={() => { setRemoving(c); setTarget(categories.find(x => x.id !== c.id)?.id || ''); }}><Trash2 size={15}/></IconButton></div>)}</div>
      {removing && <div className="reassign"><strong>Eliminar “{removing.name}”</strong><p>Sus notas, incluidas las archivadas y las de la papelera, se moverán a:</p><SaSelect label="Categoría de destino" value={target} onValueChange={setTarget} options={categories.filter(c => c.id !== removing.id)} bindValue="id" bindLabel="name" showPlaceholder={false}/><div><SaButton size="sm" variant="secondary" label="Cancelar" disabled={busy} onClick={() => setRemoving(null)}/><SaButton size="sm" label="Mover notas y eliminar categoría" disabled={busy} onClick={remove}/></div></div>}
    </fieldset></div>
  </Modal>;
}

export function Backup({ onClose, onRefresh, notify }) {
  const [tab, setTab] = useState('export'), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [file, setFile] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [preview, setPreview] = useState(null), [result, setResult] = useState(null), [uploadKey, setUploadKey] = useState(0);
  const busyRef = useRef(false);
  function switchTab(next) { setTab(next); setError(''); setPreview(null); setResult(null); setPassword(''); setConfirm(''); setFile(null); setUploadKey(key => key + 1); }
  async function submit(e) {
    e.preventDefault(); if (busyRef.current) return; busyRef.current = true; setError(''); setBusy(true);
    try {
      if (tab === 'export') {
        if (password.length < 8) throw new Error('Usa una contraseña de al menos 8 caracteres.');
        if (password !== confirm) throw new Error('Las contraseñas no coinciden.');
        const data = await api('/export');
        const payload = { _meta: { v: 4, exportedAt: new Date().toISOString() }, ...data, notes: data.notes.map(n => ({ ...n, category: data.categories.find(c => c.id === n.categoryId)?.name })) };
        download(await encryptBackup(payload, password), `apuntes_${new Date().toISOString().replace(/[:.]/g, '-')}.enc.json`);
        setPassword(''); setConfirm(''); notify('Respaldo cifrado descargado'); onClose();
      } else {
        if (!file) throw new Error('Selecciona un respaldo .enc.json.');
        if (file.size > 90 * 1024 * 1024) throw new Error('El respaldo supera los 90 MB.');
        const data = await decryptBackup(JSON.parse(await file.text()), password);
        if (!data || !Array.isArray(data.notes) || !Array.isArray(data.categories)) throw new Error('El respaldo no contiene notas y categorías válidas.');
        setPreview(data); setPassword('');
      }
    } catch (e) { setError(e instanceof SyntaxError ? 'El archivo no es un respaldo JSON válido.' : e.message); } finally { busyRef.current = false; setBusy(false); }
  }
  async function importData() { if (busyRef.current || !preview) return; busyRef.current = true; setBusy(true); setError(''); try { const result = await api('/import', send('POST', preview)); setResult(result); setPreview(null); await onRefresh(); notify(`${result.added} notas importadas; ${result.skipped} ya existentes.`); } catch (e) { setError(e instanceof SyntaxError ? 'El archivo no es un respaldo JSON válido.' : e.message); } finally { busyRef.current = false; setBusy(false); } }
  const panel = <>
    <div className="backup-info"><ShieldCheck size={24}/><p>{tab === 'export' ? 'Incluye todas tus notas, categorías, etiquetas, tareas e imágenes, también las archivadas y la papelera. El historial se conserva en SQL Server y en su respaldo completo. El respaldo portátil admite hasta 60 MB de contenido.' : 'Compatible con los respaldos cifrados de tu versión anterior. Las notas con el mismo identificador se omiten; no se sobrescribe ninguna.'}</p></div>
    {error && <Alert>{error}</Alert>}{result && <Alert type="success">Importación completada: {result.added} nuevas, {result.skipped} omitidas.</Alert>}
    {busy && <div className="operation-progress" role="status"><SaSpinner size="sm"/>Procesando respaldo…</div>}
    {preview ? <div className="import-preview"><h3>Respaldo listo para importar</h3><div className="quick-meta"><SaTag text={`${preview.notes.length} notas`} type="info"/><SaTag text={`${preview.categories.length} categorías`} type="light"/></div><p>Se añadirán las notas nuevas y se conservarán las que ya tienes.</p><SaButton label={busy ? 'Importando…' : 'Importar y conservar mis notas'} disabled={busy} onClick={importData}/><SaButton variant="secondary" label="Elegir otro respaldo" disabled={busy} onClick={() => { setPreview(null); setError(''); setFile(null); setUploadKey(key => key + 1); }}/></div> : <form className="backup-form" onSubmit={submit}>
      {tab === 'import' && <SaFileUpload className="backup-upload" key={uploadKey} inputId="backup-file" label="Archivo de respaldo" helperText="Archivo .enc.json · Hasta 90 MB" accept=".json" maxSize={90} autoConvertToBase64={false} onFileChange={value => { if (!busyRef.current) { setFile(value); setResult(null); setError(''); } }}/>}
      {tab === 'import' && !file && <SaButton size="sm" variant="secondary" label="Elegir archivo" onClick={() => document.getElementById('backup-file')?.click()}/>}
      <SaInput uppercase={false} label={tab === 'export' ? 'Contraseña del nuevo respaldo' : 'Contraseña del respaldo'} aria-label={tab === 'export' ? 'Contraseña del nuevo respaldo' : 'Contraseña del respaldo'} type="password" required minLength={tab === 'export' ? 8 : 1} autoComplete="new-password" value={password} onValueChange={setPassword}/>
      {tab === 'export' && <SaInput uppercase={false} label="Confirmar contraseña" type="password" required autoComplete="new-password" value={confirm} onValueChange={setConfirm}/>}
      <SaButton fullWidth type="submit" disabled={busy} label={busy ? 'Procesando…' : tab === 'export' ? 'Descargar respaldo cifrado' : 'Abrir y revisar respaldo'} icon={tab === 'export' ? <Download size={16}/> : <FileUp size={16}/>}/>
    </form>}
  </>;
  return <Modal title="Tus ideas, siempre contigo" subtitle="Respalda o recupera tu espacio con un archivo cifrado." onClose={() => { if (!busyRef.current) onClose(); }}><div className="manager-body"><fieldset className="manager-fields" disabled={busy}><SaTabs tabListAriaLabel="Respaldos" activeIndex={tab === 'export' ? 0 : 1} onActiveIndexChange={index => switchTab(index === 0 ? 'export' : 'import')} tabs={[{ label: 'Exportar respaldo', content: panel, disabled: busy }, { label: 'Importar notas', content: panel, disabled: busy }]}/></fieldset></div></Modal>;
}
