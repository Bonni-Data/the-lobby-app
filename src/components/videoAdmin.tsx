import React, { useEffect, useRef, useState } from 'react';
import { listVideoCourses, publishLesson, videoApi, VideoCourse, VideoLesson, VideoStatus } from '../lib/data';
import { ApiError } from '../lib/api';
import { Button, ErrorState, Spinner, toast, useAsync, formatMinutes } from './ui';
import { tusUpload } from '../lib/tus';
import { Link } from '../lib/router';
import { LuUpload, LuCircleCheck, LuLoader, LuTriangleAlert, LuPlay, LuVideo, LuFileText } from 'react-icons/lu';

const TUS_ENDPOINT = 'https://video.bunnycdn.com/tusupload';
const SCRIPTS_URL = 'https://claude.ai/code/artifact/37137b6a-b5c7-4227-b500-d2eab6f696a2';

/* ---------- One-time connection ---------- */
function ConnectCard({ onConnected }: { onConnected: () => void }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (key.trim().length < 20) return setError('Incolla la chiave API completa del tuo account Bunny.');
    setBusy(true);
    try {
      await videoApi.connect(key.trim());
      setKey('');
      toast('Bunny collegato: la libreria video è pronta e protetta.');
      onConnected();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      setError(code === 'bad_key'
        ? 'Bunny non ha accettato la chiave. Controlla di aver copiato la chiave API dell’account, non quella di una libreria.'
        : 'Collegamento non riuscito. Riprova tra un minuto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="apply admin-form video-connect" onSubmit={connect} noValidate>
      <h2 className="h-section">Collega Bunny Stream</h2>
      <ol className="video-connect__steps">
        <li>Crea il tuo account su <a href="https://bunny.net" target="_blank" rel="noopener noreferrer">bunny.net</a>.</li>
        <li>Apri le impostazioni del tuo account, sezione API, e copia la chiave API.</li>
        <li>Incollala qui sotto e premi Collega.</li>
      </ol>
      <label className="apply__field">
        <span className="apply__label">Chiave API dell'account Bunny</span>
        <input type="password" autoComplete="off" spellCheck={false} value={key} onChange={(e) => setKey(e.target.value)} placeholder="Incolla la chiave" />
      </label>
      <p className="small muted">La chiave serve una volta sola: l'app crea la libreria THE LOBBY, attiva la protezione dei video e poi non la conserva.</p>
      {error && <div className="alert" role="alert">{error}</div>}
      <Button type="submit" block loading={busy}>Collega</Button>
    </form>
  );
}

/* ---------- One lesson row ---------- */
type Local = { phase: 'idle' | 'uploading' | 'checking'; sent: number; total: number };

const STATUS_LABEL: Record<string, string> = {
  none: 'Nessun video',
  uploading: 'Caricamento',
  processing: 'In elaborazione',
  ready: 'Video pronto',
  error: 'Errore nel video',
};

function LessonRow({ l, onChanged }: { l: VideoLesson; onChanged: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState<Local>({ phase: 'idle', sent: 0, total: 0 });
  const [status, setStatus] = useState<VideoStatus | 'none'>(l.video_ref ? l.video_status : 'none');
  const [busy, setBusy] = useState(false);
  const published = l.status === 'published';

  useEffect(() => { setStatus(l.video_ref ? l.video_status : 'none'); }, [l.video_ref, l.video_status]);

  // While Bunny is encoding, check every 15 seconds.
  useEffect(() => {
    if (local.phase !== 'idle' || (status !== 'processing' && status !== 'uploading') || !l.video_ref) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await videoApi.check(l.id);
        if (alive && r.status !== 'none') {
          setStatus(r.status);
          if (r.status === 'ready') { toast(`Video pronto: ${l.title}`); onChanged(); }
        }
      } catch { /* try again at the next tick */ }
    };
    const t = setInterval(tick, 15000);
    tick();
    return () => { alive = false; clearInterval(t); };
  }, [status, local.phase, l.id, l.video_ref]);

  async function upload(file: File) {
    if (!file.type.startsWith('video/')) return toast('Scegli un file video (per esempio .mp4 o .mov).');
    const leave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', leave);
    setLocal({ phase: 'uploading', sent: 0, total: file.size });
    try {
      const s = await videoApi.createUpload(l.id);
      await tusUpload(file, {
        endpoint: TUS_ENDPOINT,
        headers: { AuthorizationSignature: s.signature, AuthorizationExpire: String(s.expires), VideoId: s.videoId, LibraryId: String(s.libraryId) },
        metadata: { filetype: file.type || 'video/mp4', title: l.title },
        onProgress: (sent, total) => setLocal({ phase: 'uploading', sent, total }),
      });
      setStatus('processing');
      toast('Caricato. Bunny sta preparando il video: di solito bastano pochi minuti.');
      onChanged();
    } catch {
      setStatus('error');
      toast('Caricamento interrotto. Controlla la connessione e riprova.');
    } finally {
      window.removeEventListener('beforeunload', leave);
      setLocal({ phase: 'idle', sent: 0, total: 0 });
      if (input.current) input.current.value = '';
    }
  }

  async function publish() {
    setBusy(true);
    try {
      await publishLesson(l.id);
      toast('Lezione online per tutti i Premium.');
      onChanged();
    } catch {
      toast('Pubblicazione non riuscita. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  const pct = local.total ? Math.round((local.sent / local.total) * 100) : 0;
  const shown = local.phase === 'uploading' ? 'uploading' : status || 'none';

  return (
    <li className={`vlesson vlesson--${published ? 'live' : shown}`}>
      <div className="vlesson__head">
        <strong className="vlesson__title">{l.title}</strong>
        <span className={`vchip vchip--${published ? 'live' : shown}`}>
          {published ? <><LuCircleCheck aria-hidden="true" /> Online</>
            : shown === 'ready' ? <><LuCircleCheck aria-hidden="true" /> {STATUS_LABEL.ready}</>
            : shown === 'processing' ? <><LuLoader className="spin" aria-hidden="true" /> {STATUS_LABEL.processing}</>
            : shown === 'error' ? <><LuTriangleAlert aria-hidden="true" /> {STATUS_LABEL.error}</>
            : shown === 'uploading' ? <><LuUpload aria-hidden="true" /> {local.phase === 'uploading' ? `${pct}%` : STATUS_LABEL.uploading}</>
            : STATUS_LABEL.none}
        </span>
      </div>
      {l.duration_seconds ? <span className="vlesson__meta">{formatMinutes(l.duration_seconds)}</span> : null}
      {local.phase === 'uploading' && (
        <div className="vlesson__progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
          <small>Non chiudere questa pagina finché il caricamento non è completo.</small>
        </div>
      )}
      <div className="vlesson__actions">
        <input ref={input} type="file" accept="video/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <Button variant={status === 'none' ? 'primary' : 'secondary'} onClick={() => input.current?.click()} disabled={local.phase !== 'idle'}>
          <LuUpload aria-hidden="true" /> {status === 'none' ? 'Carica video' : 'Sostituisci'}
        </Button>
        {(status === 'ready' || published) && (
          <Link to={`/lezione/${l.id}`} className="btn btn--ghost"><LuPlay aria-hidden="true" /> Guarda</Link>
        )}
        {status === 'ready' && !published && (
          <Button onClick={publish} loading={busy}>Pubblica</Button>
        )}
      </div>
    </li>
  );
}

/* ---------- The tab ---------- */
export function VideoTab() {
  const conn = useAsync(() => videoApi.status(), []);
  const list = useAsync(() => listVideoCourses(), []);

  if (conn.loading) return <Spinner />;
  if (conn.error) return <ErrorState message="Non riesco a raggiungere il servizio video. Riprova tra poco." onRetry={conn.reload} />;
  if (!conn.data?.connected) return <ConnectCard onConnected={() => { conn.reload(); list.reload(); }} />;

  const courses: VideoCourse[] = list.data || [];
  const all = courses.flatMap((c) => c.course_modules.flatMap((m) => m.lessons));
  const withVideo = all.filter((l) => l.video_ref).length;
  const live = all.filter((l) => l.status === 'published').length;

  return (
    <>
      <p className="muted">Carica il video di ogni lezione Premium. Quando Bunny lo ha preparato, premi Pubblica e la lezione va online per tutti i Premium.</p>
      <div className="video-summary">
        <span><strong>{withVideo}</strong> di {all.length} con video</span>
        <span><strong>{live}</strong> online</span>
        <a href={SCRIPTS_URL} target="_blank" rel="noopener noreferrer" className="link-quiet"><LuFileText aria-hidden="true" /> Apri gli script</a>
      </div>
      <p className="small muted video-tip"><LuVideo aria-hidden="true" /> Consiglio: video orizzontale 16:9, 1080p, un file per lezione. Puoi caricare anche dal telefono.</p>
      {list.loading && <Spinner />}
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {courses.map((c) => (
        <section key={c.id} className="vcourse">
          <h2 className="h-section">{c.title}</h2>
          <ul className="vlessons">
            {c.course_modules.flatMap((m) => m.lessons).map((l) => <LessonRow key={l.id} l={l} onChanged={list.reload} />)}
          </ul>
        </section>
      ))}
    </>
  );
}

/* ---------- Player for a lesson ---------- */
export function BunnyPlayer({ lessonId }: { lessonId: string }) {
  const d = useAsync(() => videoApi.play(lessonId), [lessonId]);
  return (
    <div className="player player--embed" aria-label="Video della lezione">
      {d.loading && <div className="player__placeholder"><span className="spinner" /></div>}
      {d.error && (
        <div className="player__placeholder">
          <span className="player__arch" aria-hidden="true" />
          <span>Il video non è disponibile in questo momento. Riprova tra poco.</span>
        </div>
      )}
      {d.data && (
        <iframe
          src={d.data.url}
          title="Video della lezione"
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      )}
    </div>
  );
}
