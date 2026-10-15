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
        Questa informativa spiega quali dati personali tratta THE LOBBY, per quali scopi, su quale base e quali diritti hai, ai
        sensi degli articoli 13 e 14 del Regolamento (UE) 2016/679 (GDPR) e del Codice privacy (D.Lgs. 196/2003, come modificato
        dal D.Lgs. 101/2018).
      </p>

      <h2>1. Titolare del trattamento</h2>
      <p>
        Il titolare è <strong>Andrea Bonazzi</strong>, persona fisica, founder di THE LOBBY. Per qualsiasi richiesta sui tuoi dati
        scrivi a <Contact />. Non è stato nominato un responsabile della protezione dei dati (DPO), perché per questo trattamento
        non è obbligatorio.
      </p>

      <h2>2. Quali dati trattiamo</h2>
      <ul>
        <li><strong>Account:</strong> nome, indirizzo email, password (conservata solo in forma cifrata dal fornitore di autenticazione: nessuno può leggerla), data di iscrizione, accettazione dei Termini e stato di conferma dell'email.</li>
        <li><strong>Accesso con Google:</strong> se lo scegli, Google ci comunica nome, indirizzo email, identificativo dell'account ed eventualmente l'immagine del profilo. Non riceviamo mai la tua password Google.</li>
        <li><strong>Utilizzo del servizio:</strong> lezioni iniziate e completate, risposte alle sfide dentro le lezioni, risultati dei quiz e delle simulazioni, punti, livello, serie di giorni, traguardi e certificati, stato del tuo accesso Premium, risposte agli inviti alle cene e prenotazioni alle lezioni live.</li>
        <li><strong>Richieste di incontro con Andrea:</strong> nome, email, telefono se lo indichi, di cosa hai bisogno, il testo e l'eventuale link che condividi, durata, modalità e disponibilità.</li>
        <li><strong>Candidatura a Premium:</strong> i testi che scrivi su di te, sul tuo percorso e sui tuoi obiettivi, l'eventuale link che indichi, l'esito e l'eventuale messaggio del founder.</li>
        <li><strong>Email di servizio:</strong> un registro delle email che ti inviamo (tipo di messaggio, data, esito della consegna).</li>
        <li><strong>Provenienza:</strong> se ti iscrivi da un link di una nostra campagna, il nome della campagna presente nel link (per esempio «instagram»). Lo leggiamo dall'indirizzo della pagina al momento dell'iscrizione, senza salvare nulla sul tuo dispositivo.</li>
        <li><strong>Dati tecnici:</strong> indirizzo IP, tipo di dispositivo e browser, data e ora delle richieste, registrati dai fornitori per far funzionare il servizio e proteggerlo da abusi.</li>
        <li><strong>Dati salvati sul tuo dispositivo:</strong> il codice di accesso che ti tiene collegato, una copia dell'app per aprirla più velocemente e le tue preferenze di lettura (lezione a schede o a pagina unica, scheda a cui eri arrivato, velocità della voce). Sono strumenti tecnici strettamente necessari (art. 122 del Codice privacy): non usiamo cookie di profilazione, pubblicitari o di statistica di terze parti, e per questo non ti chiediamo un consenso.</li>
      </ul>
      <p>
        <strong>Dati che non ti chiediamo.</strong> THE LOBBY parla di istituzioni e politica, ma non ha bisogno di sapere come la
        pensi. Non inserire nella candidatura o nei messaggi le tue opinioni politiche, l'appartenenza a partiti o sindacati, dati
        sulla salute o altre categorie particolari di dati (art. 9 GDPR). Se scegli comunque di farlo, li useremo solo per valutare
        la candidatura, sulla base del tuo consenso esplicito, che puoi revocare in ogni momento chiedendone la cancellazione.
      </p>

      <h2>3. Perché li trattiamo e su quale base</h2>
      <ul>
        <li><strong>Creare e gestire il tuo account, farti seguire corsi, quiz, opportunità e lezioni live.</strong> Base: esecuzione del contratto (art. 6.1.b GDPR).</li>
        <li><strong>Valutare la tua candidatura a Premium e, se approvata, attivarti l'accesso.</strong> Base: esecuzione di misure richieste da te (art. 6.1.b). La valutazione la fa personalmente Andrea Bonazzi: nessuna decisione è presa da un sistema automatico.</li>
        <li><strong>Organizzare gli incontri che chiedi ad Andrea.</strong> Base: esecuzione di misure richieste da te (art. 6.1.b). La richiesta arriva via email ad Andrea, che ti scrive per fissare giorno e ora.</li>
        <li><strong>Inviarti le email di servizio:</strong> conferma dell'indirizzo, recupero password, prenotazioni, date e link delle lezioni live, promemoria, esito della candidatura. Base: esecuzione del contratto (art. 6.1.b). Non sono newsletter né pubblicità.</li>
        <li><strong>Capire quali campagne portano nuovi iscritti</strong>, con dati aggregati. Base: legittimo interesse a far conoscere il progetto (art. 6.1.f). Puoi opporti scrivendoci.</li>
        <li><strong>Garantire la sicurezza del servizio, prevenire abusi e difendere i nostri diritti.</strong> Base: legittimo interesse (art. 6.1.f).</li>
        <li><strong>Rispettare obblighi di legge</strong> e richieste delle autorità. Base: obbligo legale (art. 6.1.c).</li>
      </ul>
      <p>
        Fornire i dati dell'account è necessario per usare THE LOBBY; la candidatura a Premium è facoltativa. Non vendiamo i tuoi
        dati, non li usiamo per pubblicità e non ti iscriviamo a newsletter senza il tuo consenso.
      </p>

      <h2>4. Chi può vedere i dati</h2>
      <p>I dati li vede solo Andrea Bonazzi. Per erogare il servizio ci appoggiamo a fornitori nominati responsabili del trattamento (art. 28 GDPR):</p>
      <ul>
        <li><strong>Supabase</strong>: database e autenticazione, con dati ospitati nell'Unione europea (Francoforte).</li>
        <li><strong>Resend</strong>: invio delle email di servizio; riceve il tuo indirizzo email e il contenuto del messaggio.</li>
        <li><strong>GitHub</strong>: pubblicazione delle pagine dell'app; riceve dati tecnici come l'indirizzo IP.</li>
        <li><strong>Google</strong>: caratteri tipografici dell'app (Google Fonts, che riceve l'indirizzo IP) e casella {CONTACT_EMAIL} (Gmail), dove arrivano richieste e candidature.</li>
      </ul>
      <p>
        Agiscono invece come <strong>titolari autonomi</strong>, con le proprie informative: <strong>Google</strong>, se scegli di
        accedere con Google, e <strong>Microsoft</strong>, quando entri in una lezione live su Teams. Se prenoti una live, il
        founder vede nome ed email per organizzarla e scriverti. Al di fuori di questi casi i dati non vengono comunicati a terzi,
        salvo obblighi di legge.
      </p>
      <p>
        <strong>Certificati.</strong> Quando completi un corso ricevi un certificato con un link di verifica. Se scegli di
        condividerlo, chi apre il link vede il nome del tuo profilo, il corso e la data: nient'altro. Il link è un codice casuale
        che conosce solo chi lo riceve da te; se elimini l'account, il certificato smette di esistere.
      </p>
      <p>
        <strong>Ascolta la lezione.</strong> La lettura ad alta voce usa la sintesi vocale del tuo browser o del tuo sistema
        operativo. Alcuni browser, per le voci più naturali, elaborano il testo sui server del loro produttore (per esempio Google
        o Microsoft): viene letto solo il testo della lezione, mai i tuoi dati.
      </p>

      <h2>5. Trasferimenti fuori dall'Unione europea</h2>
      <p>
        Alcuni fornitori possono trattare dati negli Stati Uniti. Il trasferimento avviene sulla base della decisione di adeguatezza
        della Commissione europea per le società aderenti all'EU-US Data Privacy Framework oppure delle clausole contrattuali
        standard approvate dalla Commissione (art. 45 e 46 GDPR).
      </p>

      <h2>6. Per quanto tempo li conserviamo</h2>
      <ul>
        <li><strong>Account e utilizzo:</strong> finché l'account è attivo. Se lo elimini dall'app, i dati vengono cancellati subito; le copie tecniche di sicurezza dei fornitori vengono sovrascritte nei giorni successivi.</li>
        <li><strong>Candidature a Premium:</strong> 12 mesi dalla decisione, per gestire eventuali nuove candidature; prima, se elimini l'account o ce lo chiedi.</li>
        <li><strong>Richieste di incontro:</strong> 12 mesi dalla richiesta; prima, se elimini l'account o ce lo chiedi.</li>
        <li><strong>Registro delle email di servizio:</strong> 12 mesi. I link di conferma scaduti o usati: 30 giorni.</li>
        <li><strong>Dati tecnici:</strong> per i tempi stabiliti dai fornitori per sicurezza e funzionamento, di norma pochi giorni o settimane.</li>
      </ul>

      <h2>7. I tuoi diritti</h2>
      <p>
        Puoi chiedere di accedere ai tuoi dati, correggerli, cancellarli, limitarne il trattamento, riceverli in un formato
        leggibile e trasferibile, e opporti ai trattamenti basati sul legittimo interesse (articoli 15-22 GDPR). Due diritti li
        eserciti da solo, in qualsiasi momento, dal tuo <Link to="/profilo">Profilo</Link>: <strong>scaricare una copia dei tuoi
        dati</strong> ed <strong>eliminare l'account</strong>. Per tutto il resto scrivi a <Contact />: rispondiamo entro un mese.
        Puoi anche presentare reclamo al Garante per la protezione dei dati personali
        (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>).
      </p>

      <h2>8. Minori</h2>
      <p>
        Per iscriverti devi avere almeno 14 anni, l'età prevista in Italia per acconsentire da soli ai servizi online (art.
        2-quinquies del Codice privacy). Se scopriamo un account di una persona più giovane lo eliminiamo. Le cene e gli incontri
        dal vivo sono riservati ai maggiorenni.
      </p>

      <h2>9. Sicurezza</h2>
      <p>
        I dati viaggiano cifrati, l'accesso al database è limitato per ruolo e i link delle lezioni live sono visibili solo a chi
        è iscritto. Nessun sistema è sicuro al 100%: se dovesse verificarsi una violazione che ti riguarda, ti avviseremo nei casi
        e nei tempi previsti dalla legge.
      </p>

      <h2>10. Modifiche</h2>
      <p>Se cambiamo questa informativa aggiorniamo la data in alto e, per le modifiche importanti, te lo segnaliamo nell'app o per email.</p>

      <p className="legal__links"><Link to="/termini">Leggi anche i Termini di servizio</Link></p>
    </LegalShell>
  );
}

export function Terms() {
  return (
    <LegalShell title="Termini di servizio">
      <p>
        Questi termini regolano l'uso di THE LOBBY, l'academy digitale su istituzioni, politica ed Europa. Iscrivendoti li
        accetti: leggili con calma, sono scritti per essere chiari.
      </p>

      <h2>1. Chi offre il servizio</h2>
      <p>
        THE LOBBY è un progetto ideato e gestito da <strong>Andrea Bonazzi</strong>, persona fisica, founder e docente dei corsi.
        Contatti: <Contact />. Oggi il servizio è offerto gratuitamente e non come attività commerciale.
      </p>

      <h2>2. Cosa offre THE LOBBY</h2>
      <ul>
        <li>Corsi da leggere, con quiz, su come funzionano le istituzioni e sulle competenze per muoversi al loro interno.</li>
        <li>Lezioni live su Microsoft Teams con Andrea Bonazzi, riservate a Premium.</li>
        <li>Una raccolta, aggiornata ogni giorno, di opportunità pubblicate da enti pubblici, istituzioni europee e organizzazioni internazionali.</li>
        <li>Con Premium, contenuti ed esperienze riservate, come descritto nella pagina Premium.</li>
      </ul>

      <h2>3. Natura dei contenuti</h2>
      <p>
        THE LOBBY non è affiliata ad alcun partito, movimento o istituzione e non fa propaganda politica: i contenuti hanno scopo
        formativo e informativo, presentano i temi in modo neutrale e non sono consulenza legale, fiscale o professionale. Alcuni
        testi sono preparati anche con strumenti di intelligenza artificiale e sono rivisti e pubblicati sotto la responsabilità
        editoriale di Andrea Bonazzi. Norme, scadenze e dati possono cambiare: per le decisioni importanti verifica sempre sulle
        fonti ufficiali.
      </p>

      <h2>4. Il tuo account</h2>
      <ul>
        <li>Per iscriverti devi avere almeno 14 anni e fornire dati veri. Se sei minorenne, usa THE LOBBY con il consenso dei tuoi genitori.</li>
        <li>Puoi accedere con email e password o con Google. L'account è personale: non condividerlo e custodisci le credenziali.</li>
        <li>Puoi scaricare i tuoi dati o eliminare l'account in qualsiasi momento dal Profilo.</li>
      </ul>

      <h2>5. Le opportunità: come funzionano</h2>
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

      <h2>6. Free e Premium</h2>
      <ul>
        <li>THE LOBBY è <strong>interamente gratuita</strong>, Premium compreso.</li>
        <li>Con l'account base accedi ai corsi base, ai quiz e alle prime tre opportunità della lista quotidiana.</li>
        <li>
          L'accesso a Premium è <strong>su selezione</strong>: ti candidi raccontando il tuo percorso e Andrea Bonazzi valuta
          personalmente ogni candidatura, a sua discrezione e senza discriminazioni. Le opinioni politiche e l'eventuale
          appartenenza a un partito non contano nella valutazione. L'esito ti arriva nell'app e per email; se non vieni
          selezionato puoi ricandidarti dopo 30 giorni.
        </li>
        <li>L'accesso Premium è personale e può essere revocato in caso di violazione di questi termini.</li>
        <li>Se in futuro alcune funzioni diventassero a pagamento te lo diremo prima: nulla ti verrà mai addebitato senza il tuo consenso esplicito.</li>
      </ul>

      <h2>7. Lezioni live</h2>
      <ul>
        <li>La prenotazione è gratuita e richiede un'email confermata. Una lezione parte quando raggiunge il numero minimo di iscritti indicato nel corso; data e link vengono comunicati agli iscritti nell'app e per email.</li>
        <li>Le date possono essere spostate o, per motivi seri, annullate: in quel caso avvisiamo gli iscritti il prima possibile.</li>
        <li>Il link di Teams è personale: non condividerlo con chi non è iscritto.</li>
        <li>È vietato registrare, fotografare o diffondere la lezione e le persone che vi partecipano. Le lezioni non vengono registrate, salvo avviso dato prima dell'inizio.</li>
        <li>Partecipa con rispetto per il docente e per gli altri. Chi disturba o offende può essere escluso dalla sessione e da quelle successive.</li>
        <li>L'uso di Teams è soggetto anche ai termini di Microsoft.</li>
      </ul>

      <h2>8. Cene e incontri dal vivo</h2>
      <ul>
        <li>Sono riservati ai maggiorenni iscritti a Premium, a numero chiuso, e si partecipa rispondendo all'invito nell'app.</li>
        <li>Eventuali costi, per esempio quello della cena, sono indicati nell'invito prima della conferma e restano a carico di chi partecipa.</li>
        <li>Luoghi e servizi sono gestiti dai rispettivi esercenti, alle loro condizioni.</li>
      </ul>

      <h2>9. Contenuti e marchio</h2>
      <p>
        Corsi, testi, quiz, grafiche e il marchio THE LOBBY appartengono ad Andrea Bonazzi o ai rispettivi titolari. Puoi usarli
        per uso personale e di studio; non puoi copiarli, rivenderli o diffonderli senza autorizzazione. È riservata
        l'estrazione di testo e di dati, anche per addestrare sistemi di intelligenza artificiale (art. 70-quater della legge sul
        diritto d'autore e art. 4 della Direttiva (UE) 2019/790).
      </p>

      <h2>10. Quello che ci invii</h2>
      <p>
        I testi della candidatura e i messaggi che ci mandi restano tuoi. Li usiamo solo per valutare la candidatura e
        risponderti, non li pubblichiamo. Ti chiediamo che siano veri e che non violino diritti di altri.
      </p>

      <h2>11. Regole di comportamento</h2>
      <p>
        Non usare THE LOBBY per scopi illeciti, non tentare di accedere ad aree o dati non tuoi, non interferire con il
        funzionamento del servizio e non estrarne i contenuti in modo automatico.
      </p>

      <h2>12. Sospensione e chiusura</h2>
      <p>
        In caso di violazioni gravi o ripetute di questi termini possiamo sospendere l'accesso a Premium o chiudere l'account,
        comunicandoti il motivo. Tu puoi chiudere l'account in qualsiasi momento dal Profilo.
      </p>

      <h2>13. Disponibilità e responsabilità</h2>
      <p>
        Il servizio è gratuito e facciamo il possibile perché funzioni sempre e i contenuti siano corretti, ma può avere
        interruzioni o cambiare nel tempo. Salvo dolo o colpa grave, non rispondiamo dei danni derivanti dall'uso delle
        informazioni, in particolare delle opportunità pubblicate da terzi. Restano fermi i diritti che la legge riconosce ai
        consumatori.
      </p>

      <h2>14. Link esterni</h2>
      <p>THE LOBBY contiene link a siti di terzi, come le pagine ufficiali degli enti: non ne controlliamo i contenuti e le condizioni d'uso.</p>

      <h2>15. Modifiche ai termini</h2>
      <p>
        Possiamo aggiornare questi termini per giustificati motivi, come novità del servizio o cambiamenti di legge. Le modifiche
        importanti ti vengono comunicate nell'app o per email almeno 15 giorni prima che si applichino; se non sei d'accordo puoi
        chiudere l'account prima di quella data.
      </p>

      <h2>16. Legge applicabile e controversie</h2>
      <p>
        Si applica la legge italiana. Per le controversie con i consumatori è competente il giudice del luogo di residenza o
        domicilio del consumatore (art. 66-bis del Codice del consumo). Prima di qualsiasi azione scrivici: proveremo a trovare una
        soluzione insieme.
      </p>

      <h2>17. Disposizioni finali</h2>
      <p>Se una clausola risultasse non valida, le altre restano efficaci. Questi termini sono redatti in italiano, che è la lingua che fa fede.</p>

      <p className="legal__links"><Link to="/privacy">Leggi anche l'Informativa privacy</Link></p>
    </LegalShell>
  );
}
