import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { SaButton, SaInput } from '@sanna-ui/react';
import { ImagePlus, Download, Expand, X } from 'lucide-react';
import { IconButton } from './components.jsx';
import { fullDate } from './utils.js';

function ImageItem({ image, index, editable, onChange, onRemove }) {
  const [source, setSource] = useState(''), [error, setError] = useState(''), [attempt, retry] = useState(0), [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); let url;
    setError(''); setSource('');
    if (image.data) { setSource(`data:${image.mime || 'image/webp'};base64,${image.data}`); return; }
    fetch(`/api/images/${encodeURIComponent(image.id)}`, { headers: { 'X-Apuntes-Client': 'local' }, signal: controller.signal })
      .then(async res => { if (!res.ok) throw new Error('No se pudo cargar la imagen.'); return res.blob(); })
      .then(blob => { if (!controller.signal.aborted) { url = URL.createObjectURL(blob); setSource(url); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [image.id, image.data, image.mime, attempt]);
  const name = image.name.replace(/\.[^.]+$/, '');
  return <figure className={`note-image ${expanded ? 'image-expanded' : ''}`}>
    <div className="image-stage">{source ? <img src={source} alt={image.caption || image.name} onError={() => setError('No se pudo visualizar la imagen.')}/> : !error && <span role="status">Cargando imagen…</span>}{error && <div role="alert">{error}<SaButton type="button" label="Reintentar imagen" size="sm" onClick={() => retry(n => n + 1)}/></div>}</div>
    <figcaption><div className="image-caption-top"><strong title={image.name}>{image.name}</strong><div><IconButton label={expanded ? `Reducir imagen ${index + 1}` : `Ampliar imagen ${index + 1}`} onClick={() => setExpanded(v => !v)}><Expand size={16}/></IconButton>{source && <a className="image-download" aria-label={`Descargar imagen ${index + 1}`} href={source} download={`${name}.${image.mime === 'image/jpeg' ? 'jpg' : image.mime === 'image/png' ? 'png' : 'webp'}`}><Download size={16}/></a>}{editable && <IconButton label={`Quitar imagen ${index + 1}`} onClick={onRemove}><X size={16}/></IconButton>}</div></div>
    {editable ? <SaInput uppercase={false} size="sm" label={`Descripción de imagen ${index + 1}`} placeholder="Qué muestra esta evidencia…" maxLength={1000} value={image.caption || ''} onValueChange={caption => onChange({ ...image, caption })}/> : image.caption && <p>{image.caption}</p>}
    <small>{image.addedAt ? `Adjuntada ${fullDate(image.addedAt)}` : 'Se guardará junto con la nota'}{image.width ? ` · ${image.width} × ${image.height}` : ''}</small></figcaption>
  </figure>;
}

const NoteImages = forwardRef(function NoteImages({ images = [], onChange, onError, onBusy, disabled = false }, ref) {
  const input = useRef(), pending = useRef(false);
  const editable = Boolean(onChange);
  async function addFiles(files) {
    if (!editable || disabled || pending.current || !files.length) return;
    pending.current = true; onBusy?.(true);
    try {
      if (images.length + files.length > 8) throw new Error('Puedes adjuntar hasta 8 imágenes por nota.');
      let total = images.reduce((sum, img) => sum + (img.size || 0), 0);
      const additions = [];
      for (const file of files) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Selecciona imágenes PNG, JPG o WebP sin animación.');
        if (file.size > 4 * 1024 * 1024) throw new Error('Cada imagen puede pesar hasta 4 MB.');
        total += file.size; if (total > 12 * 1024 * 1024) throw new Error('Las imágenes de una nota pueden sumar hasta 12 MB.');
        const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('No se pudo leer el archivo.')); reader.readAsDataURL(file); });
        additions.push({ name: (file.name || 'Imagen pegada.png').slice(0, 200), caption: '', data: dataUrl.split(',')[1], mime: file.type, size: file.size });
      }
      onChange([...images, ...additions]); onError?.('');
    } catch (e) { onError?.(e.message); } finally { pending.current = false; onBusy?.(false); if (input.current) input.current.value = ''; }
  }
  useImperativeHandle(ref, () => ({ addFiles, choose: () => input.current?.click() }));
  if (!editable && !images.length) return null;
  return <section className="note-images" aria-label="Imágenes de la nota">
    <div className="images-heading"><div><h4>Imágenes y evidencia <span>{images.length}{editable ? '/8' : ''}</span></h4>{editable && <p>Adjunta, arrastra o pega con Ctrl + V. PNG, JPG y WebP · 4 MB por imagen · 12 MB en total.</p>}</div>{editable && <SaButton type="button" size="sm" variant="secondary" label="Adjuntar imágenes" icon={<ImagePlus size={16}/>} disabled={disabled || images.length >= 8} onClick={() => input.current?.click()}/>}</div>
    {editable && <input ref={input} type="file" className="image-file-input" aria-label="Seleccionar imágenes" accept="image/png,image/jpeg,image/webp" multiple disabled={disabled} onChange={e => addFiles([...e.target.files])}/>}
    <div className="image-grid">{images.map((img, index) => <ImageItem key={`${index}-${img.id || img.name}`} image={img} index={index} editable={editable} onChange={value => onChange(images.map((old, i) => i === index ? value : old))} onRemove={() => onChange(images.filter((_, i) => i !== index))}/>)}</div>
    {editable && images.length > 0 && <p className="images-footnote">Al guardar se registra una nueva versión. Las imágenes retiradas siguen disponibles en versiones anteriores.</p>}
  </section>;
});
export default NoteImages;
