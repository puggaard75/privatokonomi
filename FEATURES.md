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
- Sender op til 100 transaktioner til Claude (claude-3-5-sonnet)
- Kategoriserer transaktioner i grupper (Dagligvarer, Transport, Bolig osv.)
- Identificerer faste udgifter og abonnementer
- Finder top-butikker/forretninger efter beløb
- Genererer personlige økonomiråd
- Laver månedlig trend-oversigt
- API-nøgle indtastes af brugeren og gemmes i `localStorage`

### Dashboard — Oversigt
- KPI-kort: Indkomst, Forbrug, Balance, Opsparingsrate
- Doughnut-chart over kategorifordeling
- Top 8 butikker med antal køb og samlet beløb

### Dashboard — Transaktioner
- Tabel med de 100 første transaktioner
- Viser dato, beskrivelse, AI-kategori og beløb
- Farvekodet kategorimærke pr. transaktion

### Dashboard — AI-råd
- Individuelle sparetips baseret på forbrugsmønster
- Overordnet opsummering af økonomien

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
