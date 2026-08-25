# Kalender

Privaatne kalender aadressil `/kalender`. Staatiline leht (GitHub Pages) +
[Supabase](https://supabase.com) autentimiseks ja andmete hoidmiseks.

## Miks andmed pole selles repos

Repo on avalik, seega siin ei ole ega tohi olla ühtki parooli ega sündmust.
Kasutajakontod (paroolid räsitult), sündmused ja perioodid elavad ainult
Supabase'i projektis. Iga tabelil on Row Level Security, mis lubab reale ligi
ainult selle omanikule (`auth.uid() = user_id`) — st isegi sama andmebaasi
teine kasutaja ei näe võõraid kirjeid.

`config.js` sisaldab projekti aadressi ja `anon` võtme. Need on avalikud
väärtused: `anon` võti on mõeldud brauserisse saatmiseks ja üksinda ta midagi ei
ava, sest kõik päringud käivad RLS reeglite alt läbi. **Siia ei tohi kunagi
panna `service_role` võtit ega andmebaasi parooli** — need saavad reeglitest
mööda minna.

## Seadistamine

1. Loo Supabase'is uus (tasuta) projekt.
2. Ava SQL Editor ja käivita [`schema.sql`](schema.sql). See loob tabelid
   `events` ja `periods` ning kõik RLS poliitikad.
3. Authentication → Providers → Email: hoia e-post + parool sisse lülitatud.
   Kui tahad, et konto töötaks kohe, lülita „Confirm email“ välja; muidu tuleb
   registreerumise järel e-kiri kinnitada.
4. Authentication → URL Configuration: lisa Site URL
   `https://mattias-j-t.github.io/kalender/` (ja soovi korral
   `http://localhost:8000/kalender/` kohalikuks katsetamiseks).
5. Kirjuta Settings → API väärtused faili [`config.js`](config.js):
   `SUPABASE_URL` ja `SUPABASE_ANON_KEY`.

Kui `config.js` on tühi, näitab leht seadistuse hoiatust.

## Kasutamine

- **Vaated**: Kuu / Nädal / Loend. Nooleklahvid liiguvad ajas, `T` = täna,
  `M`/`W`/`A` = vaated, `N` = uus sündmus.
- **Sündmus**: klõps päeval (kuuvaates) või nupp „+ Sündmus“. Saab määrata
  terve päeva sündmuse, asukoha, märkmed ja värvi.
- **Periood**: lohista kuuvaates üle mitme päeva → avaneb perioodi dialoog
  (nt reedest ülejärgmise reedeni). Perioodile saab anda nime ja värvi.
- **Korduv periood**: märgi „Kordub tsüklina“. Märgitud vahemiku pikkus on ühe
  bloki pikkus ja järjestikused blokid saavad kordamööda tsükli värvid. Näiteks
  14-päevane periood kahe värviga: 2 nädalat värv A, järgmised 2 nädalat värv B,
  siis jälle A jne. „Korda kuni“ piirab, kui kaugele tsükkel ulatub.

## Failid

| Fail | Sisu |
| --- | --- |
| `index.html` | Kogu lehe struktuur (auth-vaade, kalender, dialoogid) |
| `styles.css` | Kujundus |
| `app.js` | Rakenduse loogika ja vaadete joonistamine |
| `data.js` | Supabase klient ja päringud |
| `periods.js` | Perioodide/tsüklite laiendamine kalendripäevadeks |
| `dates.js` | Kuupäevaabilised |
| `config.js` | Supabase URL + anon võti |
| `schema.sql` | Tabelid, triggerid ja RLS poliitikad |
