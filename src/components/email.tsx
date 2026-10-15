import React, { useState } from 'react';
import { resendVerification, emailStatus, sendTestEmail } from '../lib/data';
import { useAuth } from '../lib/auth';
import { Button, toast, useAsync } from './ui';
import { LuMailCheck, LuMail, LuSend } from 'react-icons/lu';

function resendError(err: any) {
  const m = String(err?.message || '');
  if (m.includes('too_many')) return 'Ti abbiamo già scritto più volte: controlla anche la cartella spam, o riprova tra un’ora.';
  return 'Invio non riuscito. Riprova tra poco.';
}

/** Members who have not confirmed their email yet: one tap to get the link again. */
export function VerifyBanner({ compact }: { compact?: boolean }) {
  const { session, plan, refreshPlan } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!session || plan.email_verified) return null;

  async function resend() {
    setBusy(true);
    try {
      const r = await resendVerification();
      if (r === 'already') { toast('La tua email è già confermata.'); refreshPlan(); }
      else toast(`Link inviato a ${session!.user.email}. Controlla anche lo spam.`);
    } catch (err) {
      toast(resendError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`verify-banner ${compact ? 'verify-banner--compact' : ''}`} role="status">
      <span className="verify-banner__icon" aria-hidden="true"><LuMailCheck /></span>
      <div className="verify-banner__body">
        <strong>Conferma la tua email</strong>
        <span>
          Ti abbiamo mandato un link a <b>{session.user.email}</b>. Serve per prenotare le live e ricevere data e link per entrare.
        </span>
        <button className="verify-banner__btn" onClick={resend} disabled={busy}>{busy ? 'Invio…' : 'Mandami di nuovo il link'}</button>
      </div>
    </section>
  );
}

/** Area founder: are emails going out? */
export function EmailStatusStrip() {
  const s = useAsync(() => emailStatus(), []);
  const [busy, setBusy] = useState(false);
  if (!s.data) return null;
  const d = s.data;

  async function test() {
    setBusy(true);
    try {
      await sendTestEmail();
      toast(`Email di prova inviata a ${d.admin_email}.`);
      setTimeout(s.reload, 4000);
    } catch {
      toast('Invio non riuscito.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`email-strip ${d.live ? 'is-live' : ''}`} aria-label="Stato delle email">
      <span className="email-strip__icon" aria-hidden="true"><LuMail /></span>
      <div className="email-strip__body">
        <strong>{d.live ? 'Email attive' : 'Email in preparazione'}</strong>
        <span>
          {d.live
            ? `${d.sent_7d} inviate negli ultimi 7 giorni${d.queued ? ` · ${d.queued} in partenza` : ''}${d.errors_7d ? ` · ${d.errors_7d} non consegnate` : ''}`
            : `Partono appena il dominio è collegato${d.queued ? `: ${d.queued} pronte in coda` : ''}.`}
        </span>
      </div>
      <Button variant="ghost" onClick={test} loading={busy}><LuSend aria-hidden="true" /> Prova</Button>
    </section>
  );
}
