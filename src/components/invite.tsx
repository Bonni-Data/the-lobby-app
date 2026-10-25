import React, { useState } from 'react';
import { myInvite, inviteLink, track } from '../lib/data';
import { Button, toast, useAsync } from './ui';
import { LuUserPlus, LuShare2, LuCopy, LuDownload } from 'react-icons/lu';

/** Friends who finished at least one lesson needed to jump the Premium queue (decided by Andrea, 25/10/2026). */
export const PRIORITY_FRIENDS = 3;

const INVITE_TEXT = 'Sto usando THE LOBBY per capire come funzionano davvero Comune, Parlamento ed Europa, e trovare opportunità gratis. Entra anche tu:';

/**
 * Invite a friend: personal link, native share sheet or copy, how many joined and how many are active.
 * `moment` = where it is shown (profile, after a perfect quiz, after a certificate): it changes the title and is tracked.
 */
export function InviteCard({ moment = 'profilo', title, text }: { moment?: string; title?: string; text?: string }) {
  const inv = useAsync(() => myInvite(), []);
  const code = inv.data?.code;
  const link = code ? inviteLink(code) : '';
  const active = inv.data?.active ?? 0;
  const left = Math.max(0, PRIORITY_FRIENDS - active);

  async function share() {
    if (!link) return;
    track('invite_share', { moment });
    try {
      if (navigator.share) { await navigator.share({ title: 'THE LOBBY', text: INVITE_TEXT, url: link }); return; }
      await navigator.clipboard.writeText(`${INVITE_TEXT} ${link}`);
      toast('Link copiato: mandalo a chi vuoi.');
    } catch { /* closed */ }
  }
  async function copy() {
    if (!link) return;
    track('invite_copy', { moment });
    try { await navigator.clipboard.writeText(link); toast('Link copiato.'); } catch { toast('Copia non riuscita: tieni premuto sul link.'); }
  }

  return (
    <section className="invite" aria-label="Invita un amico">
      <span className="invite__arch" aria-hidden="true" />
      <span className="invite__kicker"><LuUserPlus aria-hidden="true" /> Invita un amico</span>
      <h2 className="invite__title">{title || 'La Lobby è più forte in compagnia.'}</h2>
      <p className="invite__text">
        {text || 'Manda il tuo link a chi vuole capire come funzionano le istituzioni.'}{' '}
        {left > 0
          ? `Porta ${PRIORITY_FRIENDS} amici che completano almeno una lezione e la tua candidatura al Premium passa in cima alla lista.`
          : 'Hai portato almeno 3 amici attivi: la tua candidatura al Premium è in cima alla lista.'}
      </p>
      {link && <p className="invite__link"><span>{link.replace('https://', '')}</span><button className="iconbtn" onClick={copy} aria-label="Copia il link"><LuCopy aria-hidden="true" /></button></p>}
      <div className="invite__row">
        <Button onClick={share} disabled={!link}><LuShare2 aria-hidden="true" /> Condividi il link</Button>
        <span className="invite__count">
          <strong>{inv.data ? inv.data.joined : '–'}</strong> {inv.data?.joined === 1 ? 'persona portata' : 'persone portate'}
          {inv.data && inv.data.joined > 0 && <> · <strong>{active}</strong> {active === 1 ? 'attiva' : 'attive'}</>}
        </span>
      </div>
    </section>
  );
}

const NAVY = '#111c35';
const CORAL = '#ff7058';
const IVORY = '#f4f0e8';

function wrapLines(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** A 1080×1920 story image of a quiz result: «Ho fatto 3 su 3 su …. Tu quanto fai?». */
export async function drawQuizResult(score: number, max: number, quizTitle: string): Promise<Blob> {
  try { await (document as any).fonts?.load?.('700 120px "Barlow Condensed"'); } catch { /* fallback fonts */ }
  const W = 1080, H = 1920, cx = W / 2;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  // the arch
  ctx.strokeStyle = CORAL;
  ctx.lineCap = 'round';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(150, H - 360);
  ctx.lineTo(150, 900);
  ctx.arc(cx, 900, cx - 150, Math.PI, 0);
  ctx.lineTo(W - 150, H - 360);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = IVORY;
  ctx.font = '700 56px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.fillText('THE LOBBY', cx, 200);
  ctx.fillStyle = CORAL;
  ctx.font = '600 34px "Inter", system-ui, sans-serif';
  ctx.fillText('QUIZ', cx, 600);
  ctx.fillStyle = IVORY;
  ctx.font = '700 260px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.fillText(`${score}/${max}`, cx, 900);
  ctx.font = '600 52px "Inter", system-ui, sans-serif';
  const lines = wrapLines(ctx, quizTitle, 720).slice(0, 3);
  lines.forEach((l, i) => ctx.fillText(l, cx, 1030 + i * 66));
  ctx.fillStyle = CORAL;
  ctx.font = '700 84px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.fillText('E tu quanto fai?', cx, 1030 + lines.length * 66 + 120);
  ctx.fillStyle = 'rgba(244,240,232,0.82)';
  ctx.font = '500 40px "Inter", system-ui, sans-serif';
  ctx.fillText('Lezioni da 5 minuti, quiz e certificato. Gratis.', cx, H - 250);
  ctx.fillStyle = IVORY;
  ctx.font = '700 48px "Inter", system-ui, sans-serif';
  ctx.fillText('thelobbyitalia.it', cx, H - 170);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('canvas'))), 'image/png'));
}

/** «Sfida un amico» after a quiz: share the result image (stories, WhatsApp) with the personal invite link. */
export function ChallengeCard({ score, max, quizTitle }: { score: number; max: number; quizTitle: string }) {
  const inv = useAsync(() => myInvite(), []);
  const [busy, setBusy] = useState(false);
  const link = inv.data?.code ? inviteLink(inv.data.code) : 'https://thelobbyitalia.it/';
  const text = `Ho fatto ${score} su ${max} al quiz «${quizTitle}» su THE LOBBY. Tu quanto fai?`;

  async function share() {
    setBusy(true);
    track('quiz_share', { score, max });
    try {
      const blob = await drawQuizResult(score, max, quizTitle);
      const file = new File([blob], 'the-lobby-quiz.png', { type: 'image/png' });
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], text: `${text} ${link}` });
      } else if (navigator.share) {
        await navigator.share({ title: 'THE LOBBY', text, url: link });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'the-lobby-quiz.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        try { await navigator.clipboard.writeText(`${text} ${link}`); toast('Immagine scaricata e testo copiato: pubblicala nella storia.'); } catch { toast('Immagine scaricata.'); }
      }
    } catch { /* closed */ } finally { setBusy(false); }
  }

  return (
    <section className="invite invite--challenge" aria-label="Sfida un amico">
      <span className="invite__arch" aria-hidden="true" />
      <span className="invite__kicker"><LuUserPlus aria-hidden="true" /> Sfida un amico</span>
      <h2 className="invite__title">{score === max ? `${score} su ${max}. Chi ti batte?` : `${score} su ${max}. Chi fa meglio?`}</h2>
      <p className="invite__text">Pubblica il risultato nella storia o mandalo su WhatsApp: chi entra dal tuo link conta tra i tuoi inviti.</p>
      <div className="invite__row">
        <Button onClick={share} loading={busy}><LuShare2 aria-hidden="true" /> Condividi il risultato</Button>
        <span className="invite__count"><LuDownload aria-hidden="true" /> immagine per le storie</span>
      </div>
    </section>
  );
}
