# Starter-Projekt für Modul 324

Autor: [Alexander Schenkel](mailto:alexander.schenkel@bztf.ch), [BZT Frauenfeld](https://www.bztf.ch/)

Diese [ ExpressJS ](https://expressjs.com)-Applikation dient als Starter-Projekt für das ICT-Modul 324, DevOps-Prozesse anwenden.

Die Applikation stellt folgendes zur Verfügung:

- eine NodeJS-Applikation mit dem [ExpressJS](https://expressjs.com) Framework
- eine einfache, kleine Mini-Applikation mit 2 URL-Routen:
  - '/': die Index-Route
  - '/json-demo': Eine Route, die JSON-Daten liefert
- eine Demo-SQLite-Datenbank (die Demo-Datenbank [chinook](https://www.sqlitetutorial.net/sqlite-sample-database/))
- ein Demo, wie die Demo-SQLite-Datenbank mit ExpressJS und SQLite konnektiert und ausgelesen werden kann

## Setup

```shell
$ npm install
```

The repository uses npm workspaces. This command installs both backend and
frontend dependencies.

## Environment configuration

```shell
$ cp .env.example .env
```

`.env.example` documents all environment variables with safe placeholder
values. Never commit a real `.env` file; it is listed in `.gitignore`.

The development and test databases use separate environment variables:

| Environment | Knex client            | Database file            |
| ----------- | ---------------------- | ------------------------ |
| Development | `DATABASE_CLIENT`      | `DATABASE_FILENAME`      |
| Test        | `TEST_DATABASE_CLIENT` | `TEST_DATABASE_FILENAME` |

No database connection parameter is hardcoded in the Knex configuration. Copy
`.env.example` to `.env` before running database commands locally.

## Database migrations

Apply all pending migrations to the development database:

```shell
$ npm run db:migrate
```

Apply the same migrations to the isolated test database:

```shell
$ npm run db:migrate -- --env test
```

Both commands use `backend/knexfile.ts`. Migration source files live in
`backend/src/db/migrations/`; database files are created in `backend/data/` and
are not committed.

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

## Linting

```shell
$ npm run lint
```

Runs ESLint for both the backend and the frontend. The backend config checks all
TypeScript files, and the frontend config checks all TypeScript and Vue files.
You can lint a single workspace with `npm run lint:backend` or
`npm run lint:frontend`.

## Formatting

```shell
$ npm run format
```

Formats the whole project with Prettier. To check whether all files are
formatted without changing them, use:

```shell
$ npm run format:check
```

## Source structure

The Express TypeScript application lives in `backend/`:

- `backend/src/app.ts` creates the Express application and connects its components.
- `backend/src/routes/` defines HTTP endpoints and delegates work to services.
- `backend/src/services/` contains business logic and database-independent rules.
- `backend/src/middleware/` contains shared Express request and error handling.
- `backend/src/db/` provides database access. SQL queries are used by services rather
  than route handlers.
- `backend/src/types/` contains shared TypeScript domain types.
- `backend/src/server.ts` starts the configured HTTP server.
- `backend/src/library.ts` contains the existing starter utility.
- `backend/tests/` contains the Jest tests.
- `backend/chinook.db` is the starter SQLite database.

The backend request flow is intentionally simple:

```text
HTTP request -> route -> service -> database
```

Routes are responsible only for HTTP concerns such as reading a request and sending
a response. Validation and business decisions belong in services, while reusable
request/error handling belongs in middleware. New backend features should follow
this separation so that their business logic can be unit-tested without Express.

The Vue 3 TypeScript application lives in `frontend/`:

- `frontend/src/App.vue` contains the starter page and backend status display.
- `frontend/src/main.ts` initializes Vue.
- `frontend/vite.config.ts` configures Vite and the development API proxy.
