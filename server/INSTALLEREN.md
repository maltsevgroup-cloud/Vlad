# Gymmaat 2.3 – accounts voor veel gebruikers (testversie)

De huidige app (2.2, toegangscode) blijft ongewijzigd werken. Alles hieronder staat er los naast.

## 1. Database (Supabase › SQL Editor)
1. Voer `gm2_schema.sql` uit. Maakt een apart schema `gm2` aan. Raakt `gm_docs` niet aan.
2. Voer `migrate_space.sql` uit. Dit maakt alleen de overzetfunctie aan, er wordt nog niets gekopieerd.

## 2. Inloggen per e-mail (Supabase › Authentication)
- **Sign In / Providers › Email**: aan. "Confirm email" mag aan blijven.
- **Emails › Templates**: zet in zowel *Magic Link* als *Confirm signup* de code erbij, bv.:
  `<p>Je inlogcode: <b>{{ .Token }}</b></p><p>Of tik op <a href="{{ .ConfirmationURL }}">deze link</a>.</p>`
  (De code is nodig op iPhone: een link uit de mail opent in Safari, niet in de app op je beginscherm.)
- **URL Configuration**: Site URL = adres van de test-site op Netlify; zet hetzelfde adres ook bij Redirect URLs.
- **SMTP** (nodig voor 100+ gebruikers): de ingebouwde mailer van Supabase verstuurt maar een paar mails per uur.
  Koppel een eigen mailer onder *Emails › SMTP Settings*, bv. Resend of Brevo (beide hebben een gratis niveau).
  Daarna onder *Rate Limits* het aantal mails per uur verhogen.

## 3. Netlify
Maak een **nieuwe** site (niet de huidige) en sleep `gymmaat-2.3-test-netlify.zip` erin.

## 4. Vlad en Chloe overzetten (zonder verlies)
1. Beiden openen de test-site, vullen hun e-mailadres in en vragen de inlogmail. **Nog geen profiel aanmaken.**
2. Beheerder voert uit in de SQL Editor (met de echte e-mailadressen):
   `select gm2.migrate_space('{"abbbgcirt":"VLAD@EMAIL","amhflh1wr":"CHLOE@EMAIL"}'::jsonb, 'VLAD@EMAIL');`
3. Beiden vullen de code uit de mail in: profiel, schema's, trainingen, gewicht en berichten staan er.
- De oude gegevens blijven onaangeroerd in `gm_docs`; de oude app blijft werken.
- Twee keer uitvoeren kan niet (de functie stopt dan zonder iets te wijzigen).
- Alternatief per persoon: in 2.2 een back-up downloaden en die in 2.3 terugzetten (kies je profiel).

## Getest
- Database lokaal (Postgres 16): duo's afgeschermd van elkaar, gewicht alleen voor jezelf, uitnodiging één keer en 7 dagen geldig,
  duo verlaten neemt eigen gegevens mee, account verwijderen wist alles. 150 gebruikers × 150 trainingen: ophalen ±2 ms.
- App (37 controles): inloggen, onboarding, trainen, uitnodigen, berichten, sessie vernieuwen, afmelden, verwijderen, back-up uit oude versie.
- Overzetten met de echte gegevens (21 controles): schema, alle trainingen en sets, alle suggesties, berichten en gewicht identiek aan 2.2.
