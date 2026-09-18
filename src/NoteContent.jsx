import { Markdown } from './components.jsx';
import { safeHtml } from './rich-content.js';

export default function NoteContent({ note }) {
  return note.format === 'richtext' ? <div className="rich-note" dangerouslySetInnerHTML={{ __html: safeHtml(note.content) }}/>
    : <Markdown>{note.content}</Markdown>;
}
