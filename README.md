# 🌊 Splash SMDN 2026

Sito per i tornei di **Calcetto Saponato** e **Splash Volley** della Sagra della Madonna della Neve di Vezzano sul Crostolo.

Sito statico (HTML/CSS/JS) + [Firebase](https://firebase.google.com) (piano gratuito Spark) per dati in tempo reale e login admin. Hosting gratuito su GitHub Pages. **Costo totale: 0€.**

## Funzionalità

- Due sezioni: ⚽ Calcetto Saponato e 🏐 Splash Volley (tab in alto)
- Elenco squadre con giocatori (giocatrici marcate con ♀)
- Calendario partite e risultati in tempo reale
- Classifica calcolata automaticamente (3/1/0 punti)
- Classifica marcatori (solo calcetto)
- Classifica Fanta Splash con punti assegnati dall'admin
- Votazione miglior giocatore E miglior giocatrice per torneo (1 voto a testa per dispositivo, modificabile)
- Galleria foto/video: upload dai giocatori (Cloudinary), pubblicazione dopo approvazione admin
- Regolamento e Fanta Splash
- Link Instagram, iscrizioni (Google Form) e invio via WhatsApp in alternativa
- Pannello admin (🔐 in alto a destra): squadre, partite, risultati, marcatori, punti fanta, moderazione foto

> **Requisito:** il sito legge e scrive sempre su Firebase/Firestore. Configura `js/firebase-config.js` (vedi sotto) prima di aprirlo. Per lo sviluppo locale usa un server statico: `python3 -m http.server`.

## Setup Firebase (una tantum, ~10 minuti)

1. Vai su [console.firebase.google.com](https://console.firebase.google.com) → **Crea progetto** (es. `smdn-splash`). Disattiva Analytics, non serve.
2. **Firestore Database** → Crea database → modalità *production* → region `europe-west` qualsiasi.
3. Tab **Regole** → incolla il contenuto di `firestore.rules` → **Pubblica**.
4. **Authentication** → Inizia → attiva **Email/Password** → tab *Users* → **Aggiungi utente** (email + password: saranno le credenziali admin).
5. **Authentication** → *Sign-in method* → attiva anche **Anonimo** (serve per voti MVP e upload foto: identifica i dispositivi senza registrazione).
6. **Impostazioni progetto** (⚙️) → *Le tue app* → icona **Web** `</>` → registra l'app → copia l'oggetto `firebaseConfig`.
7. Incolla i valori in `js/firebase-config.js` al posto dei `REPLACE_ME`.

Fatto: il sito legge e scrive i dati reali su Firestore.

> ⚠️ Dopo ogni modifica a `firestore.rules` ricordati di ripubblicare le regole nella console Firebase (tab **Regole** → incolla → **Pubblica**).

## Setup Cloudinary (upload foto/video, ~5 minuti)

1. Crea un account gratuito su [cloudinary.com](https://cloudinary.com) (piano Free: 25GB banda/mese, più che sufficiente).
2. Dalla **Dashboard** copia il **Cloud name**.
3. **Settings → Upload → Upload presets → Add upload preset**: imposta *Signing mode* su **Unsigned** e (consigliato) *Folder* su `smdn-splash`. Salva e copia il nome del preset.
4. Incolla Cloud name e preset in `js/config.js` (`cloudinaryCloudName`, `cloudinaryUploadPreset`).

Finché non lo configuri, il box di upload resta nascosto e rimane il link WhatsApp. I contenuti caricati appaiono in galleria solo dopo l'approvazione dal pannello admin (tab **Foto**).

### Sicurezza

La config Firebase in `firebase-config.js` è pubblica per design: la protezione sta nelle regole Firestore (`firestore.rules`), che permettono la scrittura di squadre/partite solo agli utenti autenticati. Per maggiore sicurezza puoi restringere le API key al dominio del sito da Google Cloud Console → Credentials.

## Deploy su GitHub Pages

```bash
cd smdn-splash
git init && git add -A && git commit -m "Splash SMDN 2026"
# crea un repo su github.com, poi:
git remote add origin git@github.com:RicCa96/smdn-splash.git
git push -u origin main
```

Su GitHub: **Settings → Pages → Source: Deploy from a branch → main / root → Save**.
Il sito sarà su `https://TUO_UTENTE.github.io/smdn-splash/` in 1-2 minuti.

Per aggiornare il sito: `git add -A && git commit -m "update" && git push`. I dati (squadre, partite, voti) invece si aggiornano dal pannello admin, senza toccare il codice.

### URL alternativi gratuiti

- **`smdn-splash.github.io`**: crea una **organization** GitHub gratuita chiamata `smdn-splash`, poi al suo interno un repo chiamato esattamente `smdn-splash.github.io` e attiva Pages: il sito sarà su quell'URL, senza il tuo username.
- **`smdn-splash.web.app`**: Firebase Hosting (già incluso nel progetto Firebase, gratis): `npm i -g firebase-tools && firebase login && firebase init hosting` (public: `.`) `&& firebase deploy`.
- Dominio personalizzato (es. `splashsmdn.it`): unica opzione a pagamento (~10€/anno), collegabile sia a GitHub Pages sia a Firebase Hosting.

## Configurazione rapida

`js/config.js` contiene link Instagram, numero WhatsApp per foto/video, link iscrizioni e giorni del torneo.

## Struttura

```
index.html          pagina unica (pubblico + modali regolamento/admin)
css/style.css       stile
js/config.js        link e impostazioni evento
js/firebase-config.js  credenziali Firebase (da compilare)
js/app.js           logica pubblica (render, voti MVP)
js/admin.js         pannello admin
js/team-display.js  colore/pallino squadra (con test)
firestore.rules     regole di sicurezza Firestore
```

## Uso durante il torneo (admin)

1. Clicca 🔐 in alto a destra → login con email/password Firebase.
2. **Squadre:** aggiungi nome, torneo, emoji e giocatori (uno per riga; aggiungi `(F)` dopo il nome delle giocatrici, es. `Giulia T. (F)` — serve per il voto "miglior giocatrice"). Eliminando una squadra vengono rimossi anche i voti MVP dei suoi giocatori e i suoi punti fanta.
3. **Partite:** scegli torneo, squadre, giorno e ora.
4. **Risultati:** seleziona la partita, inserisci punteggio, spunta "Partita conclusa"; per il calcetto aggiungi i marcatori. Classifiche e marcatori si aggiornano da soli su tutti i dispositivi.
5. **Fanta:** seleziona squadra e motivo (i punti si precompilano per i bonus standard) o inserisci motivo e punti liberi, anche negativi. La classifica fanta sul sito si aggiorna subito.
6. **Foto:** approva ✅ o elimina 🗑️ i contenuti caricati dai giocatori; solo quelli approvati appaiono in galleria.


Migliorare invio foto. Caricamento immagini con salvataggio da qualche parte + consultazione sul sito.
Aggiungere gestione punti e classifica del fanta.
Miglior giocatore: aggiungere distinzione voto miglior maschio e miglior femmina + opzione cambia voto.
Quando cancello squadra, i voti ai giocatori devono sparire.