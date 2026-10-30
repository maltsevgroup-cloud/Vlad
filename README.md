# Gymmaat 3.0

Gymmaat is een gymtracker voor twee trainingsmaten. Deze map bevat de nieuwe app, gebouwd met React, TypeScript, Vite en Tailwind. In deze versie draait alles nog op voorbeelddata in de browser (localStorage). De koppeling met de server (schema `gm2`) volgt.

## Starten
```bash
npm install
npx playwright install chromium   # alleen nodig voor de tests
npm run dev                       # app op http://localhost:5173, ook bereikbaar via je wifi-adres op je iPhone
```

## Commando's
| Commando | Wat |
|---|---|
| `npm run dev` | Ontwikkelserver met live verversen |
| `npm run build` | Productiebuild in `dist/`, klaar voor Netlify |
| `npm test` | Bouwt de app en draait alle testsuites (gedrag, thema's, contrast, gebarenlijn) |
| `npm run lint` | Controleert de code |

## Mappen
- `src/lib/`: data, logica (progressie, records), streak en badges (`rewards.ts`), opslag (`store.tsx`)
- `src/app/`: schermen en componenten (Vandaag, Schema, Samen, Instellingen, Training, Chat, Badges …)
- `src/index.css`: alle kleurtokens en de drie thema's (blauw, roze, grijs), elk in licht en donker
- `server/`: databaseschema `gm2`, migratie vanuit 2.x, tests en installatie-uitleg
- `tests/`: Playwright-testsuites (`tests/run.cjs` draait ze allemaal)
- `CLAUDE.md`: werkregels die Claude Code bij elke sessie leest

## Met Claude Code
1. Zet deze map in een privé-GitHub-repo.
2. Open de map in Claude Code. `CLAUDE.md` wordt dan automatisch gelezen.
3. Optioneel: installeer de UI/UX Pro Max-skill met `npx skills add` (zie de pagina van de skill).

Er gaat niets live (Supabase of Netlify) zonder uitdrukkelijk "ready".
