import React from 'react';

/** Tiny renderer for lesson texts: "## " headings, "- " and "1. " lists (with "  - " sub-items), **bold**, blank-line paragraphs. */
function inline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong> : <React.Fragment key={`${key}-${i}`}>{p}</React.Fragment>,
  );
}

type Item = { text: string; sub: string[] };
type Run = { kind: 'p'; lines: string[] } | { kind: 'ul' | 'ol'; items: Item[] };

const UL = /^- /;
const OL = /^\d+\.\s/;
const SUB = /^\s+- /;

/** Splits a block into paragraphs and lists, keeping their order. */
function runs(lines: string[]): Run[] {
  const out: Run[] = [];
  for (const line of lines) {
    const last = out[out.length - 1];
    if (SUB.test(line) && last && last.kind !== 'p' && last.items.length) {
      last.items[last.items.length - 1].sub.push(line.replace(SUB, ''));
    } else if (UL.test(line) || OL.test(line)) {
      const kind = UL.test(line) ? 'ul' : 'ol';
      const text = line.replace(kind === 'ul' ? UL : OL, '');
      if (last && last.kind === kind) last.items.push({ text, sub: [] });
      else out.push({ kind, items: [{ text, sub: [] }] });
    } else if (last && last.kind === 'p') {
      last.lines.push(line.trim());
    } else {
      out.push({ kind: 'p', lines: [line.trim()] });
    }
  }
  return out;
}

function Block({ lines, k }: { lines: string[]; k: string }) {
  return (
    <>
      {runs(lines).map((r, i) => {
        const key = `${k}-${i}`;
        if (r.kind === 'p') return <p key={key}>{inline(r.lines.join(' '), key)}</p>;
        const List = r.kind;
        return (
          <List key={key}>
            {r.items.map((it, j) => (
              <li key={j}>
                {inline(it.text, `${key}-${j}`)}
                {it.sub.length > 0 && <ul>{it.sub.map((s, n) => <li key={n}>{inline(s, `${key}-${j}-${n}`)}</li>)}</ul>}
              </li>
            ))}
          </List>
        );
      })}
    </>
  );
}

export function Prose({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/).map((b) => b.replace(/^\n+|\s+$/g, '')).filter((b) => b.trim());
  return (
    <div className="prose lesson-text">
      {blocks.map((b, i) => {
        const k = `b${i}`;
        const lines = b.split('\n');
        if (lines[0].startsWith('## ')) {
          const head = lines[0].slice(3).trim();
          return (
            <React.Fragment key={k}>
              <h2 className={head === 'In breve' ? 'lesson-text__brief' : ''}>{inline(head, k)}</h2>
              {lines.length > 1 && <Block lines={lines.slice(1)} k={k} />}
            </React.Fragment>
          );
        }
        return <Block key={k} lines={lines} k={k} />;
      })}
    </div>
  );
}
