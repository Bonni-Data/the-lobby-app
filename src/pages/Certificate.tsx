import React, { useEffect, useState } from 'react';
import { getCertificate, Certificate as Cert } from '../lib/game';
import { drawCertificate, certificateUrl, certificateCode, certificateDate, linkedInAddUrl } from '../lib/certificate';
import { useAuth } from '../lib/auth';
import { Button, ButtonLink, Empty, ErrorState, Screen, Spinner, TopBar, useAsync, toast } from '../components/ui';
import { Link } from '../lib/router';
import { LuShare2, LuDownload, LuLinkedin, LuCopy, LuBadgeCheck, LuPencil } from 'react-icons/lu';
import { InviteCard } from '../components/invite';

export default function Certificate({ id }: { id: string }) {
  const { session } = useAuth();
  const data = useAsync(() => getCertificate(id), [id, session?.user?.id]);
  return (
    <Screen nav={!!session}>
      <TopBar back={session ? '/traguardi' : undefined} title="Certificato" />
      <main className="page">
        {data.loading && <Spinner />}
        {data.error && <ErrorState message="Non riusciamo a verificare il certificato adesso." onRetry={data.reload} />}
        {!data.loading && !data.error && !data.data && (
          <Empty title="Certificato non trovato" text="Il codice non corrisponde a nessun certificato rilasciato da THE LOBBY." action={<ButtonLink to="/">Scopri THE LOBBY</ButtonLink>} />
        )}
        {data.data && <CertView c={data.data} />}
      </main>
    </Screen>
  );
}

function CertView({ c }: { c: Cert }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url = '';
    let alive = true;
    drawCertificate(c)
      .then((b) => {
        if (!alive) return;
        url = URL.createObjectURL(b);
        setBlob(b);
        setSrc(url);
      })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [c.id, c.name]);

  const file = blob ? new File([blob], `the-lobby-certificato-${c.slug}.png`, { type: 'image/png' }) : null;
  const canShareFile = !!file && typeof navigator !== 'undefined' && !!(navigator as any).canShare?.({ files: [file] });
  const url = certificateUrl(c.id);
  const text = `Ho completato il corso «${c.course}» su THE LOBBY, l’accademia di politica e istituzioni di Andrea Bonazzi.`;

  async function share() {
    try {
      if (canShareFile) await navigator.share({ files: [file!], title: 'Il mio certificato THE LOBBY', text: `${text} ${url}` });
      else if ((navigator as any).share) await navigator.share({ title: 'Il mio certificato THE LOBBY', text, url });
      else copy();
    } catch {
      /* the member closed the share sheet */
    }
  }

  function download() {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `the-lobby-certificato-${c.slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link del certificato copiato.');
    } catch {
      toast(url);
    }
  }

  return (
    <section className="cert">
      {!c.mine && (
        <p className="cert__verified"><LuBadgeCheck aria-hidden="true" /> Certificato autentico, rilasciato da THE LOBBY</p>
      )}
      <div className="cert__frame">
        {src ? <img src={src} alt={`Certificato: ${c.name} ha completato il corso ${c.course} il ${certificateDate(c.completed_at)}`} /> : failed ? null : <Spinner label="Preparo il certificato" />}
        {failed && (
          <div className="cert__fallback">
            <strong>{c.name}</strong>
            <span>ha completato il corso</span>
            <b>{c.course}</b>
          </div>
        )}
      </div>
      <dl className="cert__facts">
        <div><dt>Intestato a</dt><dd>{c.name}</dd></div>
        <div><dt>Corso</dt><dd>{c.course}</dd></div>
        <div><dt>Completato il</dt><dd>{certificateDate(c.completed_at)}</dd></div>
        <div><dt>Codice</dt><dd>{certificateCode(c.id)}</dd></div>
      </dl>

      {c.mine ? (
        <>
          {c.name === 'Membro della Lobby' && (
            <p className="cert__hint"><LuPencil aria-hidden="true" /> Vuoi il tuo nome sul certificato? <Link to="/profilo">Aggiungilo dal Profilo</Link>, poi torna qui.</p>
          )}
          <div className="cert__actions">
            <Button onClick={share} disabled={!blob}><LuShare2 aria-hidden="true" /> {canShareFile ? 'Condividi (Instagram, WhatsApp…)' : 'Condividi'}</Button>
            <Button variant="secondary" onClick={download} disabled={!blob}><LuDownload aria-hidden="true" /> Scarica l’immagine</Button>
            <a className="btn btn--secondary" href={linkedInAddUrl(c)} target="_blank" rel="noopener noreferrer"><LuLinkedin aria-hidden="true" /> Aggiungi al profilo LinkedIn</a>
            <Button variant="ghost" onClick={copy}><LuCopy aria-hidden="true" /> Copia il link di verifica</Button>
          </div>
          <p className="tiny muted center">Chi apre il link vede nome, corso e data, e può verificare che il certificato è autentico.</p>
          <InviteCard moment="certificato" title="Hai finito un corso. Chi porti con te?" text="Manda il tuo link a chi vuole capire come funzionano le istituzioni." />
        </>
      ) : (
        <div className="cert__actions">
          <ButtonLink to="/">Scopri THE LOBBY</ButtonLink>
        </div>
      )}
    </section>
  );
}
