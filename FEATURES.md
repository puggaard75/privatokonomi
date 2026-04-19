# Økonomi Dashboard — Funktionalitet

## Overblik
En single-page applikation (SPA) til personlig økonomianalyse. Brugeren uploader et CSV-kontoudtog fra sin bank, hvorefter Claude AI analyserer transaktionerne og præsenterer resultatet som et interaktivt dashboard.

---

## Nuværende funktionalitet

### CSV-import
- Upload af kontoudtog i CSV-format (`.csv` / `.txt`)
- Automatisk detektering af delimiter (`;`, `\t`, `,`)
- Understøtter filer med og uden header-række
- Parser datoer i formaterne `DD-MM-YYYY`, `DD/MM/YYYY` og `YYYY-MM-DD`
- Håndterer danske beløbsformater med punktum/komma
- BOM-stripping for UTF-8 filer fra danske banker

### AI-analyse (Claude)
- To parallelle API-kald for hurtigere dashboard:
  - Kald 1 (aggregeret): kategorier, råd, top-butikker, trend — viser dashboard med det samme
  - Kald 2 (kategorisering): txCategories — opdaterer transaktions-gruppering i baggrunden
- Transaktions-tab viser spinner mens kald 2 stadig kører
- Sender alle transaktioner til Claude (claude-sonnet-4-5)
- Identificerer faste udgifter og abonnementer
- Genererer personlige økonomiråd
- Laver månedlig trend-oversigt
- API-nøgle indtastes af brugeren og gemmes i `localStorage`

### Dashboard — Oversigt
- KPI-kort: Indkomst, Forbrug, Balance, Opsparingsrate
- Doughnut-chart over kategorifordeling — klikbart
- Top 8 butikker med antal køb og samlet beløb
- Kategori-popup: klik på diagram eller kategori åbner modal med posteringer filtreret på kategori, top-butikker, sortering på beløb/dato/butik

### Dashboard — Transaktioner
- Posteringer grupperet per kategori, sorteret efter beløb
- Foldbare grupper — klik på kategori for at se posteringerne
- Alle transaktioner vises (ingen 100-grænse)

### Dashboard — AI-råd
- Individuelle sparetips baseret på forbrugsmønster
- Overordnet opsummering af økonomien

### Gem seneste analyse
- Analyseresultatet gemmes automatisk i `localStorage` efter hver analyse
- Ved næste besøg åbner appen direkte i dashboardet med det gemte resultat
- "Fortsæt med seneste analyse"-knap på upload-skærmen hvis der er gemt data
- "Ny analyse" rydder det gemte resultat og starter forfra

### AI Chat-widget
- Flydende chat-knap i hjørnet af dashboardet
- Stiller spørgsmål til Claude om eget forbrug på dansk
- Kontekst med indkomst, forbrug og kategorier sendes med hver besked

### Eksport
- Print/PDF via browser-print-dialog

---

## Planlagt funktionalitet

_(Tilføj kommende features her)_

---

## Tech stack
- React 19 + TypeScript
- Vite (bundler)
- Tailwind CSS v4
- Chart.js + react-chartjs-2
- Lucide React (ikoner)
- Anthropic API (direkte fra browser)
- GitHub Actions + GitHub Pages (deployment)
