import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import { closeHistory } from '@tiptap/pm/history';
import { SaButton, SaInput, SaSelect } from '@sanna-ui/react';
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, IndentIncrease, IndentDecrease, Quote, Code2, Undo2, Redo2, Eraser, Link, Smile, ImagePlus } from 'lucide-react';
import { IconButton } from './components.jsx';
import { safeHtml } from './rich-content.js';

export default function RichEditor({ value, onChange, onImages, disabled, render = content => content }) {
  const [panel, setPanel] = useState(''), [url, setUrl] = useState(''), [linkError, setLinkError] = useState('');
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, protocols: ['http', 'https', 'mailto'] } }), TextStyleKit, TextAlign.configure({ types: ['heading', 'paragraph'] })],
    content: safeHtml(value), editable: !disabled, immediatelyRender: false, shouldRerenderOnTransaction: true,
    editorProps: { attributes: { class: 'rich-note rich-input', role: 'textbox', 'aria-label': 'Contenido visual de la nota', 'aria-multiline': 'true' }, transformPastedHTML: safeHtml },
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  });
  useEffect(() => { if (editor && !editor.isDestroyed && editor.schema && editor.getHTML() !== value) editor.commands.setContent(safeHtml(value), { emitUpdate: false }); }, [editor, value]);
  useEffect(() => { if (editor && !editor.isDestroyed) editor.setEditable(!disabled, false); }, [editor, disabled]);
  if (!editor || editor.isDestroyed || !editor.schema) return render(<p role="status">Preparando editor visual…</p>);
  const run = fn => fn(editor.chain().focus().command(({ tr }) => { closeHistory(tr); return true; })).run();
  let hasCode = editor.isActive('codeBlock');
  if (!editor.state.selection.empty) editor.state.doc.nodesBetween(editor.state.selection.from, editor.state.selection.to, node => { if (node.type.name === 'codeBlock') hasCode = true; });
  const icon = (label, Icon, action, active, unavailable = false) => <IconButton key={label} label={label} aria-pressed={active} disabled={disabled || unavailable} onMouseDown={e => e.preventDefault()} onClick={action}><Icon size={16}/></IconButton>;
  function saveLink() {
    const href = url.trim();
    if (!/^(https?:\/\/|mailto:)/i.test(href)) { setLinkError('Usa un enlace https://, http:// o mailto:.'); return; }
    if (editor.state.selection.empty && !editor.isActive('link')) editor.chain().focus().insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    setPanel('');
  }
  return render(<div className="visual-editor">
    <div className="rich-toolbar" role="group" aria-label="Formato visual">
      <SaSelect size="sm" label="Tipografía" hideLabel value={editor.getAttributes('textStyle').fontFamily || 'Arial'} options={['Arial', 'Georgia', 'monospace'].map(value => ({ value, label: value === 'monospace' ? 'Monoespaciada' : value }))} showPlaceholder={false} onValueChange={font => run(c => c.setFontFamily(font))}/>
      <SaSelect size="sm" label="Tamaño de texto" hideLabel value={editor.getAttributes('textStyle').fontSize || '16px'} options={[12,14,16,18,24,32].map(n => ({ value: `${n}px`, label: `${n} px` }))} showPlaceholder={false} onValueChange={size => run(c => c.setFontSize(size))}/>
      {icon('Negrita', Bold, () => run(c => c.toggleBold()), editor.isActive('bold'))}
      {icon('Cursiva', Italic, () => run(c => c.toggleItalic()), editor.isActive('italic'))}
      {icon('Subrayado', Underline, () => run(c => c.toggleUnderline()), editor.isActive('underline'))}
      {icon('Tachado', Strikethrough, () => run(c => c.toggleStrike()), editor.isActive('strike'))}
      <input type="color" className="text-color" aria-label="Color de texto" title="Color de texto" value={editor.getAttributes('textStyle').color || '#243b2e'} onChange={e => run(c => c.setColor(e.target.value))}/>
      {icon('Alinear a la izquierda', AlignLeft, () => run(c => c.setTextAlign('left')), editor.isActive({ textAlign: 'left' }))}
      {icon('Centrar texto', AlignCenter, () => run(c => c.setTextAlign('center')), editor.isActive({ textAlign: 'center' }))}
      {icon('Alinear a la derecha', AlignRight, () => run(c => c.setTextAlign('right')), editor.isActive({ textAlign: 'right' }))}
      {icon('Lista con viñetas', List, () => run(c => c.toggleBulletList()), editor.isActive('bulletList'))}
      {icon('Lista numerada', ListOrdered, () => run(c => c.toggleOrderedList()), editor.isActive('orderedList'))}
      {icon('Aumentar sangría de lista', IndentIncrease, () => run(c => c.sinkListItem('listItem')), undefined, !editor.can().sinkListItem('listItem'))}
      {icon('Reducir sangría de lista', IndentDecrease, () => run(c => c.liftListItem('listItem')), undefined, !editor.can().liftListItem('listItem'))}
      {icon('Cita', Quote, () => run(c => c.toggleBlockquote()), editor.isActive('blockquote'))}
      {icon('Bloque de código', Code2, () => run(c => hasCode ? c.setParagraph() : c.toggleCodeBlock()), hasCode)}
      {icon('Quitar formato', Eraser, () => run(c => c.unsetAllMarks().clearNodes().unsetTextAlign()))}
      {icon('Deshacer edición', Undo2, () => run(c => c.undo()), undefined, !editor.can().undo())}
      {icon('Rehacer edición', Redo2, () => run(c => c.redo()), undefined, !editor.can().redo())}
      {icon('Insertar enlace', Link, () => { setPanel(panel === 'link' ? '' : 'link'); setUrl(editor.getAttributes('link').href || ''); setLinkError(''); }, panel === 'link' || editor.isActive('link'))}
      {icon('Insertar emoji', Smile, () => setPanel(panel === 'emoji' ? '' : 'emoji'), panel === 'emoji')}
      {icon('Añadir imagen', ImagePlus, onImages)}
    </div>
    {panel === 'link' && <div className="link-tools" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); saveLink(); } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setPanel(''); editor.commands.focus(); } }}><SaInput uppercase={false} size="sm" label="Dirección del enlace" placeholder="https://…" value={url} onValueChange={setUrl} errorText={linkError}/><SaButton type="button" size="sm" label="Aplicar enlace" onClick={saveLink}/><SaButton type="button" size="sm" variant="secondary" label="Quitar enlace" onClick={() => { run(c => c.extendMarkRange('link').unsetLink()); setPanel(''); }}/><SaButton type="button" size="sm" variant="terciary" label="Cancelar enlace" onClick={() => setPanel('')}/></div>}
    {panel === 'emoji' && <div className="emoji-picker" role="group" aria-label="Emojis">{['😀','👍','✅','📌','💡','⚠️','🎯','🚀','📝','🔍','❤️','🎉'].map(emoji => <SaButton type="button" key={emoji} size="sm" variant="terciary" aria-label={`Insertar ${emoji}`} label={emoji} onClick={() => { run(c => c.insertContent({ type: 'text', text: emoji })); setPanel(''); }}/>)}</div>}
    <EditorContent editor={editor}/>
    <p className="rich-editor-help">Selecciona texto para darle formato. El botón de código también permite volver a párrafo.</p>
  </div>);
}
