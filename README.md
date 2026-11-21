# Blutdruck Tagebuch

Offlinefähige iPhone-PWA für Blutdruckmessungen. Die App läuft ohne Backend. Messungen werden in IndexedDB auf dem jeweiligen Gerät gespeichert.

## Funktionen

- Systolischen und diastolischen Druck, Puls, Datum/Uhrzeit und Kommentar direkt in der Tabelle erfassen und bearbeiten
- Nach Datum/Uhrzeit sortieren und die Tabelle nach Datum filtern
- Verlauf mit frei wählbaren und vordefinierten Zeiträumen anzeigen und zwei Zeiträume vergleichen
- Alle Messungen als CSV exportieren
- Nach dem ersten Online-Aufruf offline starten und nutzen

## Lokal starten

```sh
npm ci
npm run dev
```

Für einen Produktions-Build mit Offline-Cache:

```sh
npm run build
npm run preview
```

`vite-plugin-pwa` erzeugt beim Build Manifest und Service Worker. Die App verwendet den Vite-Basispfad `/mein/`. Der bestehende GitHub-Actions-Workflow stellt `dist` über GitHub Pages bereit.

## Auf dem iPhone installieren

Die HTTPS-Adresse der GitHub-Pages-Seite in Safari öffnen. Über **Teilen → Zum Home-Bildschirm** die App hinzufügen. Die Seite einmal online laden, bevor sie offline genutzt wird.

Die Daten bleiben im Browser-Speicher des Geräts und werden nicht zwischen Geräten synchronisiert. Regelmäßig über **CSV exportieren** sichern. Das Löschen von Browser- oder Web-App-Daten kann die Messungen entfernen.
