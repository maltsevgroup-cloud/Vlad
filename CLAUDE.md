# Gymmaat – werkregels

Deze regels gelden voor elke sessie die aan Gymmaat werkt.

## Communicatie
- Antwoord in het Nederlands, kort en direct.
- Bij grote nieuwe functies: eerst brainstormen (vragen + opties), dan een voorbeeld, dan bouwen.

## Harde regels
- Er mogen geen gegevens verloren gaan. Elke migratie of wijziging aan opslag moet bestaande data behouden. Test dat eerst.
- Niets gaat live (Supabase-database of Netlify) tot Vlad "ready" zegt of het uitdrukkelijk goedkeurt.
- De uitnodigingslink blijft privé. Plaats hem nooit in publieke bestanden, artifacts of commits.
- Versienummers hebben twee delen (2.3, 2.4, 3.0).

## Product
- De app is algemeen, niet persoonlijk: geen namen of gegevens van Vlad of Chloe in code of voorbeelden. Gebruik demodata (Noor).
- Alleen correcte gezondheidsinformatie. Lichaamsgewicht wordt nooit beloond. Ziek melden gebeurt per training. Bij de volgende training meldt de gebruiker opnieuw als hij nog ziek is.
- Streak en badges tellen alleen afgeronde trainingen waarin minstens één set gedaan is.

## Design
- Volg de regels van de skill `ui-ux-pro-max` (`.claude/skills/ui-ux-pro-max/`): stijl, kleurpaletten, lettertypes, UX-regels en de checklist. De skill bepaalt het design.

## Werkwijze bij elke wijziging
1. `npm test`: dit bouwt de app en draait alle suites in `tests/`. Alles moet slagen. Contrast moet 0 problemen geven in alle thema's.
2. Bij UI-werk: gebruik de skill `ui-ux-pro-max` uit `.claude/skills/ui-ux-pro-max/` en volg haar regels. Niet `anthropic-skills:ui-ux-pro-max`.
3. Database-wijzigingen staan in `server/`. Test ze eerst lokaal op Postgres (`server/test_gm2.sql`) en pas ze pas na "ready" toe op Supabase.
4. Commit per afgeronde wijziging, met een korte Nederlandse boodschap.

## Techniek
- Kleurtokens en thema's staan in `src/index.css`. Tailwind-opacity op var-kleuren werkt niet: gebruik `color-mix` of `style={{opacity}}`.
- Sheets renderen via portal (z-60), boven de navigatie.
- React 19, TypeScript, Vite, Tailwind en lucide-react. `npm run build` maakt `dist/` voor Netlify.
- Backend: schema `gm2` (zie `server/gm2_schema.sql`). Supabase-project `tpmiwgyvqbhwlxfkahev` (eu-central-1).
- Voorbeeld-artifact: https://claude.ai/artifact/BDqPCMECM9n3WZ2ifZ9Qwe
- Design system: https://claude.ai/artifact/53tubKVuLcA7iqFmuk2NTx
