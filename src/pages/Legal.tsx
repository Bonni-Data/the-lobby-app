import React from 'react';
import { useAuth } from '../lib/auth';
import { Link } from '../lib/router';
import { Screen, TopBar } from '../components/ui';
import { CONTACT_EMAIL, LEGAL_UPDATED } from '../config';

function Contact() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
  ) : (
    <span>l'indirizzo email dedicato a THE LOBBY, in attivazione e pubblicato su questa pagina a breve</span>
  );
}

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { session } = useAuth();
  return (
    <Screen nav={!!session}>
      <TopBar back={session ? '/profilo' : '/'} title={title} />
      <main className="page legal">
        <h1 className="h-page">{title}</h1>
        <p className="muted small">Ultimo aggiornamento: {LEGAL_UPDATED}</p>
        {children}
      </main>
    </Screen>
  );
}

export function Privacy() {
  return (
    <LegalShell title="Informativa privacy">
      <p>
        Questa informativa spiega quali dati personali tratta THE LOBBY, perché lo fa e quali diritti hai, ai sensi del
        Regolamento (UE) 2016/679 (GDPR) e del Codice privacy (D.Lgs. 196/2003).
      </p>

      <h2>1. Chi è il titolare</h2>
      <p>
        Il titolare del trattamento è <strong>Andrea Bonazzi</strong>, persona fisica, founder di THE LOBBY. Per qualsiasi
        richiesta sui tuoi dati puoi scrivere a <Contact />.
      </p>

      <h2>2. Quali dati trattiamo</h2>
      <ul>
        <li><strong>Dati dell'account:</strong> nome, indirizzo email (e se lo hai confermato) e password (conservata solo in forma cifrata dal fornitore di autenticazione: nessuno può leggerla).</li>
        <li><strong>Dati di utilizzo:</strong> lezioni iniziate e completate, risultati dei quiz, stato del tuo accesso Premium, le risposte alle cene e le prenotazioni alle lezioni live. Se arrivi da un link di una nostra campagna, al momento dell'iscrizione salviamo anche il nome della campagna (per esempio «instagram»): serve solo a capire quali annunci funzionano.</li>
        <li><strong>Candidatura a Premium:</strong> se ti candidi, i testi che scrivi su di te, sul tuo percorso e sui tuoi obiettivi, l'eventuale link che indichi e l'esito della valutazione, con l'eventuale messaggio del founder.</li>
        <li><strong>Dati tecnici:</strong> indirizzo IP, tipo di dispositivo e browser, data e ora degli accessi, registrati dai fornitori per far funzionare il servizio e proteggerlo da abusi.</li>
        <li><strong>Dati salvati sul tuo dispositivo:</strong> il codice di accesso che ti tiene collegato e una copia dell'app per farla aprire più velocemente. Sono strumenti tecnici necessari: non usiamo cookie di profilazione, pubblicità o sistemi di statistica.</li>
      </ul>

      <h2>3. Perché li trattiamo e su quale base</h2>
      <ul>
        <li><strong>Creare e gestire il tuo account e farti seguire corsi, quiz e opportunità.</strong> Base: esecuzione del contratto (art. 6.1.b GDPR).</li>
        <li><strong>Valutare la tua candidatura a Premium e, se approvata, attivarti l'accesso.</strong> Base: esecuzione del servizio che richiedi candidandoti (art. 6.1.b). La valutazione la fa personalmente Andrea Bonazzi, non un sistema automatico.</li>
        <li><strong>Mandarti le email di servizio:</strong> conferma dell'indirizzo, recupero password, prenotazioni e date delle lezioni live, esito della candidatura Premium. Base: esecuzione del contratto (art. 6.1.b). Non sono newsletter né pubblicità.</li>
        <li><strong>Garantire la sicurezza del servizio e prevenire abusi.</strong> Base: legittimo interesse del titolare (art. 6.1.f).</li>
        <li><strong>Rispettare obblighi di legge.</strong> Base: obbligo legale (art. 6.1.c).</li>
      </ul>
      <p>Non vendiamo i tuoi dati, non li usiamo per pubblicità e non ti iscriviamo a newsletter senza il tuo consenso.</p>

      <h2>4. Chi li tratta per nostro conto</h2>
      <p>Ci appoggiamo a fornitori che trattano i dati come responsabili del trattamento, solo per erogare il servizio:</p>
      <ul>
        <li><strong>Supabase</strong> (database, autenticazione ed email di servizio): i dati sono ospitati nell'Unione europea, a Francoforte.</li>
        <li><strong>GitHub</strong> (pubblicazione delle pagine dell'app): può trattare dati tecnici come l'indirizzo IP, anche negli Stati Uniti.</li>
        <li><strong>Google Fonts</strong> (caratteri tipografici): per mostrarti i caratteri il browser contatta i server di Google, che ricevono il tuo indirizzo IP.</li>
        <li><strong>Resend</strong> (invio delle email dell'app): spedisce le email di servizio, come la conferma dell'indirizzo, il recupero password, le prenotazioni e le date delle lezioni live, la risposta alla candidatura Premium. Riceve il tuo indirizzo email e il contenuto del messaggio e può trattarli anche fuori dall'UE.</li>
        <li><strong>Google Gmail</strong>: la casella {CONTACT_EMAIL} che riceve candidature e richieste è gestita con Gmail.</li>
      </ul>
      <p>
        Le lezioni live si svolgono su <strong>Microsoft Teams</strong>. Se prenoti una live, il founder vede il tuo nome e la tua
        email per organizzarla e scriverti; quando entri nella riunione con il link, Microsoft tratta i dati della chiamata secondo
        la propria informativa.
      </p>
      <p>
        Quando i dati vengono trasferiti fuori dallo Spazio economico europeo, il trasferimento avviene con le garanzie previste
        dal GDPR, come l'EU-US Data Privacy Framework o le clausole contrattuali standard della Commissione europea. Oggi THE LOBBY
        è interamente gratuita: se in futuro introdurremo servizi a pagamento, aggiorneremo questa informativa prima.
      </p>

      <h2>5. Per quanto tempo li conserviamo</h2>
      <ul>
        <li>I dati dell'account e di utilizzo finché l'account è attivo. Se chiedi la cancellazione, li eliminiamo entro 30 giorni, salvo quelli che la legge ci obbliga a tenere.</li>
        <li>Le candidature a Premium fino a 12 mesi dopo la decisione, per gestire eventuali nuove candidature. Puoi chiederne la cancellazione prima.</li>
        <li>I dati tecnici per i tempi stabiliti dai fornitori per sicurezza e funzionamento, di norma pochi giorni o settimane.</li>
      </ul>

      <h2>6. I tuoi diritti</h2>
      <p>
        Puoi chiedere in ogni momento di accedere ai tuoi dati, correggerli, cancellarli, limitarne il trattamento, riceverli in un
        formato portabile oppure opporti al trattamento basato sul legittimo interesse. Basta scrivere a <Contact />: rispondiamo
        entro un mese. Se ritieni che i tuoi dati siano trattati in modo non corretto puoi presentare reclamo al Garante per la
        protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>).
      </p>

      <h2>7. Età minima</h2>
      <p>THE LOBBY è pensata per chi ha almeno 14 anni, l'età minima prevista in Italia per acconsentire da soli ai servizi online.</p>

      <h2>8. Modifiche</h2>
      <p>Se cambiamo questa informativa aggiorniamo la data in alto e, per le modifiche importanti, te lo segnaliamo nell'app.</p>

      <p className="legal__links"><Link to="/termini">Leggi anche i Termini di servizio</Link></p>
    </LegalShell>
  );
}

export function Terms() {
  return (
    <LegalShell title="Termini di servizio">
      <p>
        Questi termini regolano l'uso di THE LOBBY, l'academy digitale su istituzioni, politica ed Europa. Usando l'app li accetti:
        leggili con calma, sono scritti per essere chiari.
      </p>

      <h2>1. Chi offre il servizio</h2>
      <p>
        THE LOBBY è ideata e gestita da <strong>Andrea Bonazzi</strong>, persona fisica, founder del progetto e docente dei corsi.
        Contatti: <Contact />.
      </p>

      <h2>2. Cosa offre THE LOBBY</h2>
      <ul>
        <li>Corsi brevi, lezioni e quiz su come funzionano le istituzioni.</li>
        <li>Una raccolta, aggiornata ogni giorno, di opportunità pubblicate da enti pubblici, istituzioni europee e organizzazioni internazionali.</li>
        <li>Con Premium, contenuti ed esperienze riservate, come descritto nella pagina Premium.</li>
      </ul>
      <p>
        THE LOBBY non è affiliata ad alcun partito o movimento politico. I contenuti hanno scopo formativo e informativo e non sono
        consulenza legale o professionale.
      </p>

      <h2>3. Il tuo account</h2>
      <ul>
        <li>Per registrarti devi avere almeno 14 anni e fornire dati veri.</li>
        <li>L'account è personale: non condividerlo e custodisci la password. Sei responsabile di quello che avviene con le tue credenziali.</li>
        <li>Puoi chiedere la chiusura dell'account in qualsiasi momento scrivendo a <Contact />.</li>
      </ul>

      <h2>4. Le opportunità: come funzionano</h2>
      <p>
        THE LOBBY ti dà accesso, in un solo posto, alle opportunità pubblicate da altri: bandi, tirocini, programmi, eventi e
        viaggi. <strong>Non le organizza, non le finanzia e non seleziona i candidati.</strong> Viaggi, alloggi, rimborsi, borse e
        compensi, quando previsti, sono offerti e pagati dagli enti che pubblicano l'opportunità, alle condizioni dei loro bandi.
      </p>
      <p>
        Raccogliamo le informazioni dalle fonti ufficiali e le controlliamo ogni giorno, ma requisiti, scadenze e condizioni
        possono cambiare: prima di candidarti verifica sempre sulla pagina ufficiale dell'ente, che è l'unica fonte valida. La
        candidatura si presenta direttamente all'ente; THE LOBBY non garantisce l'esito.
      </p>

      <h2>5. Free e Premium</h2>
      <ul>
        <li>THE LOBBY è <strong>interamente gratuita</strong>, Premium compreso.</li>
        <li>Con l'account base accedi ai corsi base, ai quiz e alle prime tre opportunità della lista quotidiana.</li>
        <li>
          L'accesso a Premium è <strong>su selezione</strong>: ti candidi raccontando il tuo percorso e Andrea Bonazzi valuta
          personalmente ogni candidatura, a sua discrezione. L'esito ti viene comunicato nell'app; se non vieni selezionato puoi
          ricandidarti dopo 30 giorni.
        </li>
        <li>L'accesso Premium è personale e può essere revocato in caso di violazione di questi termini.</li>
        <li>
          Se in futuro alcune funzioni diventassero a pagamento te lo diremo prima: nulla ti verrà mai addebitato senza il tuo
          consenso esplicito.
        </li>
      </ul>

      <h2>6. Contenuti e marchio</h2>
      <p>
        Corsi, video, testi, quiz, grafiche e il marchio THE LOBBY appartengono ad Andrea Bonazzi o ai rispettivi titolari. Puoi
        usarli per uso personale e di studio; non puoi copiarli, rivenderli o diffonderli senza autorizzazione.
      </p>

      <h2>7. Regole di comportamento</h2>
      <p>
        Non usare THE LOBBY per scopi illeciti, non tentare di accedere ad aree o dati non tuoi, non interferire con il
        funzionamento del servizio e non estrarne i contenuti in modo automatico. In caso di violazioni possiamo sospendere o
        chiudere l'account.
      </p>

      <h2>8. Disponibilità e responsabilità</h2>
      <p>
        Facciamo il possibile perché THE LOBBY funzioni sempre e i contenuti siano corretti, ma il servizio può avere interruzioni
        o cambiare nel tempo. Nei limiti consentiti dalla legge non rispondiamo di danni indiretti derivanti dall'uso delle
        informazioni, in particolare delle opportunità di terzi. Restano salvi i diritti che la legge riconosce ai consumatori.
      </p>

      <h2>9. Modifiche ai termini</h2>
      <p>
        Possiamo aggiornare questi termini: la data in alto indica l'ultima versione e le modifiche importanti ti vengono
        segnalate nell'app. Se non sei d'accordo puoi chiudere l'account in qualsiasi momento.
      </p>

      <h2>10. Legge applicabile</h2>
      <p>
        Si applica la legge italiana. Per le controversie con i consumatori è competente il giudice del luogo di residenza o
        domicilio del consumatore.
      </p>

      <p className="legal__links"><Link to="/privacy">Leggi anche l'Informativa privacy</Link></p>
    </LegalShell>
  );
}
