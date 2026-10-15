import type { Certificate } from './game';
import { CATEGORY_NAME } from './data';

export const CERT_W = 1080;
export const CERT_H = 1350;

const NAVY = '#111c35';
const CORAL = '#ff7058';
const IVORY = '#f4f0e8';
const STONE = '#bdb6a8';

export function certificateUrl(id: string) {
  return `${location.origin}${location.pathname}#/certificato/${id}`;
}

export function certificateCode(id: string) {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function certificateDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** LinkedIn «Aggiungi licenza o certificazione», prefilled. */
export function linkedInAddUrl(c: Certificate) {
  const d = new Date(c.completed_at);
  const q = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: c.course,
    organizationName: 'THE LOBBY',
    issueYear: String(d.getFullYear()),
    issueMonth: String(d.getMonth() + 1),
    certUrl: certificateUrl(c.id),
    certId: certificateCode(c.id),
  });
  return `https://www.linkedin.com/profile/add?${q.toString()}`;
}

async function fontsReady() {
  const fonts = (document as any).fonts;
  if (!fonts?.load) return;
  const wait = Promise.all([
    fonts.load('700 88px "Barlow Condensed"'),
    fonts.load('600 40px "Barlow Condensed"'),
    fonts.load('italic 500 76px "Fraunces"'),
    fonts.load('italic 400 34px "Fraunces"'),
    fonts.load('600 26px "Inter"'),
    fonts.load('400 28px "Inter"'),
  ]).catch(() => {});
  await Promise.race([wait, new Promise((r) => setTimeout(r, 2500))]);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let lastLine = kept[maxLines - 1];
    while (ctx.measureText(`${lastLine}…`).width > maxWidth && lastLine.includes(' ')) lastLine = lastLine.slice(0, lastLine.lastIndexOf(' '));
    kept[maxLines - 1] = `${lastLine}…`;
    return kept;
  }
  return lines;
}

/** Fits a single line by shrinking the font size. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, start: number, min: number, maxWidth: number) {
  let px = start;
  ctx.font = font(px);
  while (px > min && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = font(px);
  }
  return px;
}

function spaced(ctx: CanvasRenderingContext2D, px: number) {
  try { (ctx as any).letterSpacing = `${px}px`; } catch { /* older browsers */ }
}

/** The certificate as a 1080×1350 PNG (Instagram portrait, fine for LinkedIn too). */
export async function drawCertificate(c: Certificate): Promise<Blob> {
  await fontsReady();
  const canvas = document.createElement('canvas');
  canvas.width = CERT_W;
  canvas.height = CERT_H;
  const ctx = canvas.getContext('2d')!;
  const cx = CERT_W / 2;

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, CERT_W, CERT_H);

  // The doorway: outer and inner arch, open at the bottom edge.
  ctx.lineCap = 'round';
  ctx.strokeStyle = CORAL;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(110, CERT_H + 20);
  ctx.lineTo(110, 760);
  ctx.arc(cx, 760, cx - 110, Math.PI, 0);
  ctx.lineTo(CERT_W - 110, CERT_H + 20);
  ctx.stroke();
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(150, CERT_H + 20);
  ctx.lineTo(150, 760);
  ctx.arc(cx, 760, cx - 150, Math.PI, 0);
  ctx.lineTo(CERT_W - 150, CERT_H + 20);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Brand
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = IVORY;
  spaced(ctx, 6);
  ctx.font = '700 44px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.fillText('THE LOBBY', cx, 120);
  ctx.fillStyle = CORAL;
  spaced(ctx, 5);
  ctx.font = '600 24px "Inter", system-ui, sans-serif';
  ctx.fillText('CERTIFICATO DI COMPLETAMENTO', cx, 172);
  spaced(ctx, 0);

  // Who
  ctx.fillStyle = 'rgba(244,240,232,0.78)';
  ctx.font = 'italic 400 34px "Fraunces", Georgia, serif';
  ctx.fillText('Si certifica che', cx, 470);
  ctx.fillStyle = IVORY;
  const namePx = fit(ctx, c.name, (px) => `italic 500 ${px}px "Fraunces", Georgia, serif`, 80, 46, 720);
  ctx.fillText(c.name, cx, 470 + 30 + namePx);
  let y = 470 + 30 + namePx + 70;
  ctx.fillStyle = 'rgba(244,240,232,0.75)';
  ctx.font = '400 30px "Inter", system-ui, sans-serif';
  ctx.fillText('ha completato il corso', cx, y);

  // What
  y += 40;
  ctx.fillStyle = CORAL;
  ctx.font = '700 86px "Barlow Condensed", "Arial Narrow", sans-serif';
  let lines = wrap(ctx, c.course.toUpperCase(), 740, 3);
  let lh = 82;
  if (lines.length === 3) {
    ctx.font = '700 74px "Barlow Condensed", "Arial Narrow", sans-serif';
    lines = wrap(ctx, c.course.toUpperCase(), 760, 3);
    lh = 72;
  }
  for (const line of lines) {
    y += lh;
    ctx.fillText(line, cx, y);
  }

  // Details
  y += 70;
  ctx.fillStyle = IVORY;
  ctx.font = '600 40px "Barlow Condensed", "Arial Narrow", sans-serif';
  const area = c.category ? CATEGORY_NAME[c.category] : '';
  ctx.fillText([`${c.lessons} lezioni`, `${c.minutes} minuti`, area && `area ${area}`, c.premium ? 'Premium' : ''].filter(Boolean).join('  ·  '), cx, y);
  y += 54;
  ctx.fillStyle = 'rgba(244,240,232,0.78)';
  ctx.font = '400 28px "Inter", system-ui, sans-serif';
  ctx.fillText(`Docente: Andrea Bonazzi  ·  ${certificateDate(c.completed_at)}`, cx, y);

  // Verification
  ctx.fillStyle = STONE;
  ctx.font = '400 22px "Inter", system-ui, sans-serif';
  const host = `${location.host}${location.pathname.replace(/\/$/, '')}`;
  ctx.fillText(`Verifica su ${host} · codice ${certificateCode(c.id)}`, cx, CERT_H - 60);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas'))), 'image/png'));
}
