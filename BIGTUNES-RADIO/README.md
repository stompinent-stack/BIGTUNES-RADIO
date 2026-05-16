# BIGTUNES RADIO 📻

Amateur radio station voor onontdekte artiesten.

## Stack
- **Frontend**: React (Vite)
- **Database + Auth**: Supabase
- **Audio opslag**: Supabase Storage
- **Hosting**: Vercel
- **Cloudflare**: Account ID klaar voor R2 uitbreiding

---

## Stap 1 — Supabase instellen

1. Ga naar [supabase.com](https://supabase.com) → jouw project
2. Klik links op **SQL Editor** → **New Query**
3. Kopieer de volledige inhoud van `schema.sql` en plak het in de editor
4. Klik op **Run** — alle tabellen worden aangemaakt

---

## Stap 2 — Supabase Storage instellen

1. Ga naar **Storage** in je Supabase dashboard
2. Controleer of de bucket `audio` aangemaakt is (doet het schema automatisch)
3. Zo niet: klik **New Bucket** → naam: `audio` → zet **Public** aan

---

## Stap 3 — Project lokaal starten

```bash
# Clone de repo
git clone https://github.com/stompinent-stack/bigtunes-radio.git
cd bigtunes-radio

# Dependencies installeren
npm install

# App starten
npm run dev
```

De app draait op `http://localhost:5173`

---

## Stap 4 — Deployen via Vercel

1. Ga naar [vercel.com](https://vercel.com) en log in met GitHub
2. Klik **Add New Project**
3. Kies de `bigtunes-radio` repo
4. Vercel detecteert Vite automatisch
5. Klik **Deploy**

Je app is live op `https://bigtunes-radio.vercel.app` 🎉

---

## Stap 5 — Vercel domein (optioneel)

1. In Vercel → jouw project → **Settings** → **Domains**
2. Voeg je eigen domein toe bijv. `bigtunes-radio.nl`
3. Volg de DNS instructies

---

## Cloudflare R2 (later, voor schaal)

Als het station groeit kun je overstappen van Supabase Storage naar Cloudflare R2:

1. Ga naar [dash.cloudflare.com](https://dash.cloudflare.com)
2. Klik **R2** → **Create Bucket** → naam: `bigtunes-audio`
3. Deploy de Worker: `npx wrangler deploy`
4. Update `WORKER_URL` in `App.jsx`

---

## Bestanden overzicht

| Bestand | Doel |
|---|---|
| `App.jsx` | Volledige React app met Supabase integratie |
| `schema.sql` | Supabase database tabellen + policies |
| `worker.js` | Cloudflare Worker voor R2 uploads |
| `wrangler.toml` | Cloudflare Worker configuratie |

---

## Supabase gegevens

- **Project URL**: `https://cpltcslwtyjrnfkqmwph.supabase.co`
- **Cloudflare Account ID**: `76a98df8c5fbf2903d57f6825594a39a`

---

## Features

- ✅ Automatische shuffled playlist bij elke bezoek
- ✅ Play / Pauze / Volgende / Vorige controls
- ✅ Upload max 2 nummers per artiest (max 3 MB)
- ✅ Korte bio per track
- ✅ Stemmen via vlammen 🔥 en likes ❤️
- ✅ Ranglijst op basis van stemmen
- ✅ Nummer van de maand
- ✅ Inloggen / registreren via Supabase Auth
- ✅ Realtime updates (stemmen zichtbaar voor iedereen direct)
- ✅ Warm podium achtergrond (CSS, geen foto nodig)
