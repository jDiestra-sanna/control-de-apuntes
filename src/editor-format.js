// Operaciones de texto puras: no interpretan ni ejecutan el contenido de una nota.
function lines(text) {
  let start = 0;
  return text.split('\n').map(value => {
    const line = { start, end: start + value.length, after: Math.min(text.length, start + value.length + 1), value: value.replace(/\r$/, '') };
    start += value.length + 1;
    return line;
  });
}

export function codeBlockAt(text, start, end = start) {
  let block = null;
  for (const line of lines(text)) {
    if (!block) {
      const match = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/.exec(line.value);
      if (match && !(match[1][0] === '`' && match[2].includes('`'))) {
        block = { start: line.start, bodyStart: line.after, fence: match[1], language: match[2].trim() };
      }
    } else if (new RegExp(`^ {0,3}${block.fence[0]}{${block.fence.length},}\\s*$`).test(line.value)) {
      const complete = { ...block, bodyEnd: line.start, end: line.end - (text[line.end - 1] === '\r' ? 1 : 0), closed: true };
      if (start >= complete.start && end <= complete.end) return complete;
      block = null;
    }
  }
  return block && start >= block.start && end <= text.length ? { ...block, bodyEnd: text.length, end: text.length, closed: false } : null;
}

function selection(text, start, end) {
  return [Math.max(0, Math.min(text.length, start)), Math.max(start, Math.min(text.length, end))];
}

export function plainText(text, start, end = start) {
  const block = codeBlockAt(text, start, end);
  if (!block) return { text, start, end };
  const body = text.slice(block.bodyStart, block.bodyEnd).replace(block.closed ? /\r?\n$/ : /$^/, '');
  const result = text.slice(0, block.start) + body + text.slice(block.end);
  const map = pos => block.start + Math.max(0, Math.min(body.length, pos - block.bodyStart));
  return { text: result, start: map(start), end: map(end) };
}

function lineSelection(text, start, end) {
  const from = start === 0 ? 0 : text.lastIndexOf('\n', start - 1) + 1;
  // A selection ending at the next line's start belongs to the preceding line.
  const boundary = end > start && text[end - 1] === '\n' ? end - 1 : end;
  const newline = text.indexOf('\n', boundary);
  let to = newline === -1 ? text.length : newline;
  if (text[to - 1] === '\r') to--;
  return [from, to];
}

export function toggleCode(text, start, end = start, language = 'sql') {
  [start, end] = selection(text, start, end);
  if (codeBlockAt(text, start, end)) return plainText(text, start, end);
  const [from, to] = lineSelection(text, start, end);
  const body = text.slice(from, to);
  const fence = '`'.repeat(Math.max(3, ...[...body.matchAll(/`+/g)].map(m => m[0].length + 1)));
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const before = `${fence}${language}${newline}`;
  return { text: text.slice(0, from) + before + body + newline + fence + text.slice(to), start: start + before.length, end: Math.min(end, to) + before.length };
}

export function exitCode(text, start, end = start) {
  const block = codeBlockAt(text, start, end);
  if (!block) return { text, start, end };
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const ending = block.closed ? '' : `${text.endsWith('\n') ? '' : newline}${block.fence}`;
  const suffix = text.slice(block.end);
  const spacing = suffix.startsWith(newline + newline) ? '' : suffix.startsWith(newline) ? newline : newline + newline;
  const result = text.slice(0, block.end) + ending + spacing + suffix;
  const caret = block.end + ending.length + newline.length * 2;
  return { text: result, start: caret, end: caret };
}

export function toggleBold(text, start, end = start) {
  if (text.slice(start - 2, start) === '**' && text.slice(end, end + 2) === '**') return { text: text.slice(0, start - 2) + text.slice(start, end) + text.slice(end + 2), start: start - 2, end: end - 2 };
  if (end - start >= 4 && text.slice(start, start + 2) === '**' && text.slice(end - 2, end) === '**') return { text: text.slice(0, start) + text.slice(start + 2, end - 2) + text.slice(end), start, end: end - 4 };
  return { text: text.slice(0, start) + '**' + text.slice(start, end) + '**' + text.slice(end), start: start + 2, end: end + 2 };
}

export function toggleList(text, start, end = start) {
  const [from, to] = lineSelection(text, start, end);
  const body = text.slice(from, to).split('\n');
  const remove = body.every(line => /^\s*- /.test(line));
  const result = body.map(line => remove ? line.replace(/^(\s*)- /, '$1') : '- ' + line).join('\n');
  return { text: text.slice(0, from) + result + text.slice(to), start: from, end: from + result.length };
}
