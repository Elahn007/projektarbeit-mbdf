# Münchenbernsdorf – Projektübersicht

Statische Informations- und Entdecker-Website für Münchbernsdorf mit mehreren Ortsseiten, Quiz, Suchfunktion und PWA-Elementen.

## Struktur

- `index.html` – Startseite mit Überblick, Suche und Karten/Quiz-Abschnitten
- `Orte/` – Inhaltsseiten zu den einzelnen Sehenswürdigkeiten
- `images/` – Bilddateien für die Seiten
- `data/` – Lokale Inhaltsdaten
- `style.css` – Haupt-Styling
- `script.js` – Interaktive Logik, Suche, Dark Mode, Quiz, lokale Speicherung
- `service-worker.js` – Offline-PWA-Funktion
- `manifest.json` – PWA-Manifest
- `tools/` – Optimierungs- und Qualitäts-Skripte

## Lokale Ausführung

```bash
npm install
npm run serve
```

Danach öffnet die Seite normalerweise unter:

- http://localhost:8080

## Qualitätsprüfung

```bash
npm test
```

Die Prüfung validiert unter anderem:

- vorhandene HTML-Titel und Meta-Beschreibungen
- Canonical-Links
- fehlerhafte interne Links
- benötigte Kernseiten

## Launch-Checkliste

- [ ] Inhalte überprüft und final korrigiert
- [ ] Links und Bildpfade geprüft
- [ ] Browser-Ansicht auf Desktop und Mobilgeräten getestet
- [ ] SEO-/Meta-Tags geprüft
- [ ] Dark Mode und Navigation funktionieren
- [ ] Quiz und Suche getestet
- [ ] Offline-/PWA-Funktion geprüft
- [ ] QA-Check erfolgreich (`npm test`)
- [ ] Hosting-URL und DNS/SSL vorbereitet

## Hinweise

- Für die Projektvalidierung gilt der in `qa-check.ps1` definierte Standard.
- Die Website ist als statische Seite ausgelegt und für ein einfaches Hosting auf Webservern geeignet.
