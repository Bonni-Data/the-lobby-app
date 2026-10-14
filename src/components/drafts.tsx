import React, { useState } from 'react';
import { Course, draftCount, lessonCount, publishCourse } from '../lib/data';
import { Button, toast } from './ui';
import { LuEyeOff, LuSend } from 'react-icons/lu';

/** Founder-only box: course is a draft, review it and publish in two taps. */
export function DraftPanel({ course, onPublished, compact }: { course: Course; onPublished: () => void; compact?: boolean }) {
  const drafts = draftCount(course);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (drafts === 0) return null;

  async function publish() {
    setBusy(true);
    try {
      const n = await publishCourse(course.slug);
      toast(`Pubblicato: ${n} lezioni ora visibili a tutti.`);
      setConfirm(false);
      onPublished();
    } catch {
      toast('Pubblicazione non riuscita. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`draft-panel ${compact ? 'draft-panel--compact' : ''}`} aria-label="Bozza da validare">
      <span className="draft-panel__kicker"><LuEyeOff aria-hidden="true" /> Bozza · visibile solo a te</span>
      {!compact && (
        <p className="draft-panel__text">
          {drafts} {drafts === 1 ? 'lezione da validare' : 'lezioni da validare'} su {lessonCount(course)}, con i quiz.
          Rileggi testi e domande: quando sei soddisfatto, pubblica e il corso diventa visibile a tutti.
        </p>
      )}
      {confirm ? (
        <div className="draft-panel__confirm">
          <span>Pubblico «{course.title}» per tutti?</span>
          <div className="draft-panel__btns">
            <Button onClick={publish} loading={busy}><LuSend aria-hidden="true" /> Sì, pubblica</Button>
            <Button variant="ghost" onClick={() => setConfirm(false)} disabled={busy}>Annulla</Button>
          </div>
        </div>
      ) : (
        <Button variant={compact ? 'secondary' : 'primary'} block={!compact} onClick={() => setConfirm(true)}>Pubblica il corso</Button>
      )}
    </section>
  );
}
