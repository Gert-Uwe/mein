# Blutdruck Tagebuch

Offlinefähige iPhone-PWA für Blutdruckmessungen. Die App läuft ohne Backend. Messungen werden in IndexedDB auf dem jeweiligen Gerät gespeichert.

## Funktionen

- Systolischen und diastolischen Druck, Puls, Datum/Uhrzeit und Kommentar direkt in der Tabelle erfassen und bearbeiten
- Nach Datum/Uhrzeit sortieren und die Tabelle nach Datum filtern
- Verlauf mit frei wählbaren und vordefinierten Zeiträumen anzeigen und zwei Zeiträume vergleichen
- Diagramm mit zeitabhängiger X-Achse und grau markierten Wochenenden; Messungen nach Tageszeit (alle, morgens 00–10 Uhr, mittags 10–16 Uhr, abends 16–24 Uhr) filtern, auch im Vergleich
- Alle Messungen als CSV exportieren und aus einer früheren CSV-Sicherung wieder laden
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

## CSV-Daten laden

Unter **Messungen → Daten aus CSV laden** eine CSV-Datei aus diesem Tagebuch auswählen. Die App prüft alle Datensätze vor dem Import. Wenn bereits Messungen vorhanden sind, zuerst über den angezeigten Knopf die bestehende CSV-Exportfunktion für eine Sicherung verwenden und prüfen, dass die Datei gespeichert wurde. Danach den Ersatz bestätigen. Die bisherigen Messungen werden zusammen mit dem Laden der neuen Daten in einer IndexedDB-Transaktion ersetzt; bei einem Fehler bleiben sie erhalten.
