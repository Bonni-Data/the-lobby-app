import React, { useState } from 'react';
import { Course, draftCount, lessonCount, publishCourse } from '../lib/data';
import { Button, ButtonLink, toast } from './ui';
import { LuEyeOff, LuSend } from 'react-icons/lu';

/** Founder-only box: course is a draft, review it and publish in two taps. */
export function DraftPanel({ course, onPublished, compact }: { course: Course; onPublished: () => void; compact?: boolean }) {
  const drafts = draftCount(course);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (drafts === 0) return null;
  if (course.access_level === 'premium') {
    return (
      <section className={`draft-panel ${compact ? 'draft-panel--compact' : ''}`} aria-label="Video da caricare">
        <span className="draft-panel__kicker"><LuEyeOff aria-hidden="true" /> In preparazione · visibile solo a te</span>
        <p className="draft-panel__text">Le lezioni Premium vanno online una alla volta: carichi il video, Bunny lo prepara e tu premi Pubblica.</p>
        <ButtonLink to="/admin?sezione=video" block={!compact}>Vai ai video</ButtonLink>
      </section>
    );
  }

  async function publish() {
    setBusy(true);
    try {
      const n = await publishCourse(course.slug);
      toast(n === 1 ? 'Pubblicato: 1 lezione ora visibile a tutti.' : `Pubblicato: ${n} lezioni ora visibili a tutti.`);
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
