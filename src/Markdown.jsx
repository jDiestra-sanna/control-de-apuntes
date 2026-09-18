import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Markdown({ children }) { return <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: props => <a {...props} target="_blank" rel="noreferrer noopener"/>, img: ({ alt }) => <span className="muted">[Imagen externa: {alt || 'sin descripción'}]</span> }}>{children || '*Esta nota todavía no tiene contenido.*'}</ReactMarkdown></div>; }
