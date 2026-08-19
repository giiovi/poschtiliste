# Starter-Projekt für Modul 324

Autor: [Alexander Schenkel](mailto:alexander.schenkel@bztf.ch), [BZT Frauenfeld](https://www.bztf.ch/)

Diese [ ExpressJS ](https://expressjs.com)-Applikation dient als Starter-Projekt für das ICT-Modul 324, DevOps-Prozesse anwenden.

Die Applikation stellt folgendes zur Verfügung:

* eine NodeJS-Applikation mit dem [ExpressJS](https://expressjs.com) Framework
* eine einfache, kleine Mini-Applikation mit 2 URL-Routen:
  * '/': die Index-Route
  * '/json-demo': Eine Route, die JSON-Daten liefert
* eine Demo-SQLite-Datenbank (die Demo-Datenbank [chinook](https://www.sqlitetutorial.net/sqlite-sample-database/))
* ein Demo, wie die Demo-SQLite-Datenbank mit ExpressJS und SQLite konnektiert und ausgelesen werden kann

## Setup

```shell
$ npm install
```

## Development

```shell
$ npm run dev
```

Starts the TypeScript application with automatic restarts when files in `src/`
change. `npm run serve` remains available as an alias for the starter project.

## Build and production start

```shell
$ npm run build
$ npm start
```

`npm run build` compiles the TypeScript source into `dist/`. `npm start` runs the
compiled application.

## Tests

```shell
$ npm run test
```

Runs the Jest tests written in TypeScript.

## Source structure

Application code lives in `src/`:

* `src/app.ts` creates and configures the Express application.
* `src/server.ts` starts the HTTP server.
* `src/library.ts` contains the existing starter utility.
