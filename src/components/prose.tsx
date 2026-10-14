import React from 'react';

/** Tiny renderer for lesson texts: "## " headings, "- " lists, **bold**, blank-line paragraphs. */
function inline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong> : <React.Fragment key={`${key}-${i}`}>{p}</React.Fragment>,
  );
}

export function Prose({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="prose lesson-text">
      {blocks.map((b, i) => {
        const k = `b${i}`;
        if (b.startsWith('## ')) {
          const [head, ...rest] = b.split('\n');
          return (
            <React.Fragment key={k}>
              <h2 className={head.slice(3).trim() === 'In breve' ? 'lesson-text__brief' : ''}>{inline(head.slice(3), k)}</h2>
              {rest.length > 0 && <Prose text={rest.join('\n')} />}
            </React.Fragment>
          );
        }
        const lines = b.split('\n');
        if (lines.every((l) => l.startsWith('- '))) {
          return <ul key={k}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2), `${k}-${j}`)}</li>)}</ul>;
        }
        if (lines.some((l) => l.startsWith('- '))) {
          const intro = lines.filter((l) => !l.startsWith('- '));
          const items = lines.filter((l) => l.startsWith('- '));
          return (
            <React.Fragment key={k}>
              {intro.length > 0 && <p>{inline(intro.join(' '), k)}</p>}
              <ul>{items.map((l, j) => <li key={j}>{inline(l.slice(2), `${k}-${j}`)}</li>)}</ul>
            </React.Fragment>
          );
        }
        return <p key={k}>{inline(lines.join(' '), k)}</p>;
      })}
    </div>
  );
}
