import React from 'react';

// Small, safe markdown renderer (headings, bold, code, lists, tables). Builds React elements, never raw HTML.
const inline = (text: string, key: string): React.ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((t, i) => {
    if (t.length > 4 && t.startsWith('**') && t.endsWith('**')) return <strong key={key + i}>{t.slice(2, -2)}</strong>;
    if (t.length > 2 && t.startsWith('`') && t.endsWith('`')) return <code key={key + i} className="rounded bg-[#EAF0D8] px-1.5 py-0.5 text-[.92em] text-[#3A4A1B]">{t.slice(1, -1)}</code>;
    return <React.Fragment key={key + i}>{t}</React.Fragment>;
  });

const LIST = /^\s*([-*•]|\d+[.)])\s+/;
const isSep = (cells: string[]) => cells.every((c) => /^:?-{2,}:?$/.test(c));

export default function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const out: React.ReactNode[] = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.trim().startsWith('```')) {
      const buf: string[] = []; i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) buf.push(lines[i++]);
      i++;
      out.push(<pre key={k++} className="overflow-x-auto rounded-xl bg-[#1B2512] p-4 text-sm leading-relaxed text-[#E8ECDD]"><code>{buf.join('\n')}</code></pre>);
      continue;
    }
    const h = /^#{1,4}\s+(.*)$/.exec(line);
    if (h) { out.push(<p key={k++} className="text-lg font-bold">{inline(h[1], 'h' + k)}</p>); i++; continue; }

    if (LIST.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line); const items: string[] = [];
      while (i < lines.length && LIST.test(lines[i])) items.push(lines[i++].replace(LIST, ''));
      const Tag = ordered ? 'ol' : 'ul';
      out.push(<Tag key={k++} className={`space-y-1 pl-6 ${ordered ? 'list-decimal' : 'list-disc'}`}>{items.map((t, n) => <li key={n}>{inline(t, `l${k}${n}`)}</li>)}</Tag>);
      continue;
    }

    if (line.trim().startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      const body = rows.filter((r, n) => !(n === 1 && isSep(r)));
      const [head, ...rest] = body;
      out.push(
        <div key={k++} className="overflow-x-auto rounded-xl border border-[#E4EBD0]">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F6E8] text-left text-[#4A5D23]"><tr>{head.map((c, n) => <th key={n} className="px-3 py-2">{inline(c, `th${k}${n}`)}</th>)}</tr></thead>
            <tbody>{rest.map((r, n) => <tr key={n} className="border-t border-[#E5E7EB]">{r.map((c, m) => <td key={m} className="px-3 py-2">{inline(c, `td${k}${n}${m}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>);
      continue;
    }

    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !LIST.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) && !lines[i].trim().startsWith('```') && !lines[i].trim().startsWith('|')) buf.push(lines[i++]);
    out.push(<p key={k++} className="whitespace-pre-wrap break-words">{inline(buf.join('\n'), 'p' + k)}</p>);
  }
  return <div className="space-y-3 text-base leading-relaxed">{out}</div>;
}
