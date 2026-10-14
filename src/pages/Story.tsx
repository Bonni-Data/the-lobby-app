import React from 'react';
import { useAuth } from '../lib/auth';
import { ButtonLink, Screen, TopBar } from '../components/ui';
import { FounderAvatar } from '../components/founder';
import { LuLandmark, LuFlag, LuGlobe, LuExternalLink } from 'react-icons/lu';

const STATS = [
  { n: '10', label: 'anni di impegno civico' },
  { n: '2', label: 'mandati da consigliere comunale' },
  { n: '1', label: 'candidatura a sindaco' },
  { n: '3', label: 'livelli di istituzioni: Comune, Stato, Europa' },
];

const TIMELINE = [
  { when: 'Gli inizi', title: 'Dai banchi di scuola alla politica', text: 'A Rozzano, giovanissimo, comincia dieci anni di impegno civico e politico: assemblee, banchetti, consigli comunali seguiti dal pubblico.' },
  { when: '2022', title: 'Ambasciatore della Lombardia per l’Anno europeo dei giovani', text: 'A 21 anni l’Agenzia Italiana per la Gioventù lo nomina ambasciatore: porta Erasmus+ e il Corpo europeo di solidarietà in scuole e università.' },
  { when: 'In consiglio', title: 'Consigliere comunale a Rozzano', text: 'Dai banchi dell’opposizione impara come si decide davvero in un Comune: bilancio, mozioni, commissioni, rapporto con i cittadini.' },
  { when: '2024', title: 'Candidato sindaco a 23 anni', text: 'Si candida a guidare la sua città con un programma su lavoro, ambiente e innovazione: “serve un cambiamento”.' },
  { when: 'Secondo mandato', title: 'Di nuovo in consiglio, capogruppo', text: 'Rieletto consigliere comunale, diventa capogruppo in consiglio e lavora sui temi che contano per il futuro della città.' },
  { when: 'Oggi', title: 'Fonda THE LOBBY', text: 'Mette dieci anni di esperienza al servizio di tutti: un’academy per capire le istituzioni e trovare le opportunità che offrono.' },
];

const LEARNED = [
  { icon: <LuLandmark />, title: 'La macchina comunale', text: 'Bilancio, mozioni, commissioni, servizi: come si decide davvero in un Comune, visto dai banchi del consiglio.' },
  { icon: <LuFlag />, title: 'La macchina nazionale', text: 'Come lavorano partiti, Parlamento e governo e come le decisioni prese a Roma arrivano sui territori.' },
  { icon: <LuGlobe />, title: 'La macchina europea', text: 'Programmi, fondi e opportunità dell’Unione, conosciuti da ambasciatore e nel confronto diretto con funzionari ed esperti delle istituzioni europee.' },
];

const PRESS = [
  {
    outlet: 'Il Giorno',
    date: '26 marzo 2022',
    title: 'A 21 anni ambasciatore della Lombardia per l’Anno europeo dei giovani',
    url: 'https://www.ilgiorno.it/milano/cronaca/andrea-bonazzi-ambasciatore-lombardia-5d472e39',
  },
  {
    outlet: 'Il Giorno',
    date: '15 settembre 2023',
    title: 'A 23 anni candidato sindaco a Rozzano: «Serve un cambiamento»',
    url: 'https://www.ilgiorno.it/milano/cronaca/verso-le-amministrative-il-23enne-andrea-bonazzi-e-il-candidato-dei-5-stelle-serve-un-cambiamento-8e3dea75',
  },
];

export default function Story() {
  const { session } = useAuth();
  return (
    <Screen nav={!!session}>
      <TopBar back={session ? '/home' : '/'} title="Chi è Andrea" />
      <section className="story-hero">
        <span className="story-hero__arch" aria-hidden="true" />
        <FounderAvatar size="l" />
        <span className="story-hero__kicker">Founder e docente di THE LOBBY</span>
        <h1 className="story-hero__name">Andrea Bonazzi</h1>
        <p className="story-hero__line">Dieci anni dentro le istituzioni. Ora apre le porte a tutti.</p>
        <ul className="story-hero__roles">
          <li>Consigliere comunale</li>
          <li>Candidato sindaco 2024</li>
          <li>Ambasciatore europeo dei giovani 2022</li>
        </ul>
      </section>

      <main className="page">
        <ul className="story-stats">
          {STATS.map((s) => (
            <li key={s.label}><strong>{s.n}</strong><span>{s.label}</span></li>
          ))}
        </ul>

        <section className="block story-text">
          <h2 className="h-section">La sua storia</h2>
          <p>
            Andrea è nato e cresciuto a Rozzano, alle porte di Milano. Ha cominciato a occuparsi di vita pubblica ai tempi della
            scuola e non ha più smesso: dieci anni di impegno civico e politico, due mandati da consigliere comunale e, a 23 anni, la
            candidatura a sindaco della sua città.
          </p>
          <p>
            Nel 2022 è stato scelto come ambasciatore della Lombardia per l’Anno europeo dei giovani. Da lì l’Europa è diventata
            concreta: conferenze ed eventi sul futuro dell’Unione, il confronto diretto con funzionari ed esperti delle istituzioni
            europee, e la scoperta di quante opportunità esistono per i giovani, spesso senza che nessuno lo sappia.
          </p>
          <p>
            In questi anni ha imparato a conoscere dall’interno la macchina comunale, quella nazionale e quella europea. Di
            professione è formatore in un grande gruppo bancario internazionale: aiutare le persone a crescere è il suo mestiere.
            THE LOBBY mette insieme le due cose.
          </p>
        </section>

        <section className="block">
          <h2 className="h-section">Le tappe</h2>
          <ol className="timeline">
            {TIMELINE.map((t) => (
              <li key={t.title}>
                <span className="timeline__when">{t.when}</span>
                <strong>{t.title}</strong>
                <span>{t.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="block">
          <h2 className="h-section">Cosa ha imparato</h2>
          <ul className="learned">
            {LEARNED.map((l) => (
              <li key={l.title}>
                <span className="learned__icon" aria-hidden="true">{l.icon}</span>
                <div><strong>{l.title}</strong><span>{l.text}</span></div>
              </li>
            ))}
          </ul>
        </section>

        <section className="why">
          <span className="why__arch" aria-hidden="true" />
          <span className="why__kicker">Perché THE LOBBY</span>
          <p className="why__quote">
            “Dopo dieci anni ho capito una cosa: le opportunità ci sono, ma restano a chi sa dove guardare e a chi conosce le
            persone giuste. THE LOBBY nasce per cambiarlo. Metto quello che ho imparato al servizio di tutti, per rendere
            accessibili la vita pubblica, le istituzioni e le occasioni che offrono.”
          </p>
          <span className="why__sign">Andrea Bonazzi</span>
        </section>

        <section className="block">
          <h2 className="h-section">Ne hanno parlato</h2>
          <ul className="press">
            {PRESS.map((p) => (
              <li key={p.url}>
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  <span className="press__src">{p.outlet} · {p.date}</span>
                  <strong>{p.title}</strong>
                  <span className="press__go">Leggi l’articolo <LuExternalLink aria-hidden="true" /></span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <p className="story-note">
          THE LOBBY è un progetto indipendente: non è legato ad alcun partito ed è aperto a tutti, qualunque sia la tua idea
          politica.
        </p>

        {session ? (
          <ButtonLink to="/academy" block>Entra nelle sue lezioni</ButtonLink>
        ) : (
          <ButtonLink to="/accedi?tab=registrati" block>Entra nella Lobby, è gratis</ButtonLink>
        )}
      </main>
    </Screen>
  );
}
