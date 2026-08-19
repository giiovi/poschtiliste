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

The repository uses npm workspaces. This command installs both backend and
frontend dependencies.

## Development

```shell
$ npm run dev
```

Starts the backend TypeScript application with automatic restarts when files in
`backend/src/` change. `npm run serve` remains available as an alias.

Start the Vue development server in a second terminal:

```shell
$ npm run dev:frontend
```

The frontend is available at `http://localhost:5173`. During development, Vite
forwards `/api` requests to the backend at `http://localhost:3000`.

## Build and production start

```shell
$ npm run build
$ npm start
```

`npm run build` compiles the backend TypeScript source into `backend/dist/src/` and
creates the frontend production bundle in `frontend/dist/`. Test files are
compiled separately by Jest and are not included in the production output.
`npm start` runs `backend/dist/src/server.js` without using `ts-node`.

## Tests

```shell
$ npm run test
```

Runs the Jest tests written in TypeScript.

## Source structure

The Express TypeScript application lives in `backend/`:

* `backend/src/app.ts` creates and configures the Express application.
* `backend/src/server.ts` starts the HTTP server.
* `backend/src/library.ts` contains the existing starter utility.
* `backend/tests/` contains the Jest tests.
* `backend/chinook.db` is the starter SQLite database.

The Vue 3 TypeScript application lives in `frontend/`:

* `frontend/src/App.vue` contains the starter page and backend status display.
* `frontend/src/main.ts` initializes Vue.
* `frontend/vite.config.ts` configures Vite and the development API proxy.
