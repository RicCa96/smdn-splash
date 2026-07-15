# 🌊 Splash SMDN 2026

Sito per i tornei di **Calcetto Saponato** e **Splash Volley** della Sagra della Madonna della Neve di Vezzano sul Crostolo.

Sito statico (HTML/CSS/JS) + [Firebase](https://firebase.google.com) (piano gratuito Spark) per dati in tempo reale e login admin. Hosting gratuito su GitHub Pages. **Costo totale: 0€.**

## Funzionalità

- Due sezioni: ⚽ Calcetto Saponato e 🏐 Splash Volley (tab in alto)
- Elenco squadre con giocatori
- Calendario partite e risultati in tempo reale
- Classifica calcolata automaticamente (3/1/0 punti)
- Classifica marcatori (solo calcetto)
- Votazione MVP dal pubblico (1 voto per torneo per dispositivo)
- Regolamento e Fanta Splash
- Link Instagram, iscrizioni (Google Form) e invio foto/video via WhatsApp
- Pannello admin (🔐 in alto a destra) per gestire squadre, partite, risultati e marcatori

> **Modalità demo:** finché Firebase non è configurato, il sito mostra dati di esempio e il pannello admin funziona senza salvare nulla. Utile per provare tutto subito: apri `index.html` con un server locale (`python3 -m http.server`).

## Setup Firebase (una tantum, ~10 minuti)

1. Vai su [console.firebase.google.com](https://console.firebase.google.com) → **Crea progetto** (es. `smdn-splash`). Disattiva Analytics, non serve.
2. **Firestore Database** → Crea database → modalità *production* → region `europe-west` qualsiasi.
3. Tab **Regole** → incolla il contenuto di `firestore.rules` → **Pubblica**.
4. **Authentication** → Inizia → attiva **Email/Password** → tab *Users* → **Aggiungi utente** (email + password: saranno le credenziali admin).
5. **Impostazioni progetto** (⚙️) → *Le tue app* → icona **Web** `</>` → registra l'app → copia l'oggetto `firebaseConfig`.
6. Incolla i valori in `js/firebase-config.js` al posto dei `REPLACE_ME`.

Fatto: il sito passa automaticamente dalla modalità demo ai dati reali.

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
js/sample-data.js   dati demo
firestore.rules     regole di sicurezza Firestore
```

## Uso durante il torneo (admin)

1. Clicca 🔐 in alto a destra → login con email/password Firebase.
2. **Squadre:** aggiungi nome, torneo, emoji e giocatori (uno per riga).
3. **Partite:** scegli torneo, squadre, giorno e ora.
4. **Risultati:** seleziona la partita, inserisci punteggio, spunta "Partita conclusa"; per il calcetto aggiungi i marcatori. Classifiche e marcatori si aggiornano da soli su tutti i dispositivi.
