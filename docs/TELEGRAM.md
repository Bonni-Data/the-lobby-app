# Canale Telegram di THE LOBBY

Ogni mattina l'automazione «Canale Telegram» pubblica sul canale:

1. la copertina del «Dietro la notizia» del giorno (con il volto di Andrea, come su Instagram) e il link alla pagina con le fonti;
2. le opportunità entrate nell'app nelle ultime 24 ore, con scadenza e link alla loro pagina.

Usa solo dati pubblici e non costa nulla. Finché mancano i due segreti qui sotto resta ferma (scrive solo cosa avrebbe pubblicato).

## Da fare una volta sola (Andrea, 5 minuti)

1. **Crea il canale** dall'app Telegram: matita › Nuovo canale › nome «THE LOBBY», descrizione
   «Formazione per giovani politici, le migliori opportunità internazionali e networking con altri giovani di talento. Gratis: thelobbyitalia.it».
   Scegli **Pubblico** con indirizzo `t.me/thelobbyitalia` (o il più vicino disponibile). Come foto usa il logo.
2. **Crea il bot**: apri la chat con `@BotFather` (spunta blu), scrivi `/newbot`, nome «THE LOBBY», username per esempio
   `thelobbyitalia_bot`. BotFather risponde con un **token**: non mandarlo a nessuno, nemmeno in chat a Claude.
3. **Fai del bot un amministratore** del canale: Canale › Amministratori › Aggiungi amministratore › cerca il bot ›
   lascia solo «Pubblica messaggi».
4. **Salva i due segreti su GitHub**: repository `Bonni-Data/the-lobby-app` › Settings › Secrets and variables › Actions ›
   New repository secret:
   - `TELEGRAM_BOT_TOKEN` = il token di BotFather
   - `TELEGRAM_CHAT_ID` = `@thelobbyitalia` (l'indirizzo pubblico del canale, con la chiocciola)
5. **Prova**: Actions › Canale Telegram › Run workflow, togli la spunta «Solo prova» › Run. Nel canale arrivano i post di oggi.

Poi aggiungi il link `t.me/thelobbyitalia` alla bio di Instagram (insieme al sito) e, se vuoi, nel profilo dell'app.
