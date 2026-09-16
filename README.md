# Starter-Projekt für Modul 324

Autor: [Alexander Schenkel](mailto:alexander.schenkel@bztf.ch), [BZT Frauenfeld](https://www.bztf.ch/)

Diese [ ExpressJS ](https://expressjs.com)-Applikation dient als Starter-Projekt für das ICT-Modul 324, DevOps-Prozesse anwenden.

Die Applikation verwendet ein ExpressJS-/TypeScript-Backend, ein Vue-Frontend
und eine über Knex verwaltete SQLite-Datenbank. Die alte Chinook-Demo ist nicht
Teil der Poschtilischte-API.

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
`SESSION_SECRET` is required by the backend to sign session cookies and must be
replaced with a private, sufficiently long value in each deployed environment.

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

Roll back all migrations in the selected database:

```shell
$ npm run db:rollback
$ npm run db:rollback -- --env test
```

Both commands use `backend/knexfile.ts`. Migration source files live in
`backend/src/db/migrations/`; database files are created in `backend/data/` and
are not committed. The initial schema contains `users`, `shopping_lists`,
`shopping_items`, and `list_assignments`. Passwords have no plaintext column;
only bcrypt values are accepted in `users.password_hash`.

## Development seed data

Fill the development database with reproducible test data:

```shell
$ npm run db:seed
$ npm run db:seed -- --env test
```

The seed lives in `backend/src/db/seeds/` and requires the migrations to be
applied first. It can be run any number of times: users are upserted by
username, and the example lists of the seed users are replaced together with
their items and assignments. Passwords are stored as bcrypt hashes.

Test logins (development only, never use them in production):

| Username | Password    | Role  |
| -------- | ----------- | ----- |
| `admin`  | `admin1234` | admin |
| `alice`  | `alice1234` | user  |
| `bob`    | `bob12345`  | user  |

The seed creates three example shopping lists with items and user assignments.

## API

Sessions are cookie based (`express-session`). The cookie is signed with
`SESSION_SECRET` from `.env`; the backend refuses to start without it. Routes
marked as protected require an authenticated session and answer `401`
otherwise.

| Method | Route              | Protected | Description                                                                   |
| ------ | ------------------ | --------- | ----------------------------------------------------------------------------- |
| `GET`  | `/api/health`      | no        | Health check                                                                  |
| `POST` | `/api/auth/login`  | no        | Login and create a session                                                    |
| `POST` | `/api/auth/logout` | no        | Destroy the session and clear its cookie                                      |
| `GET`  | `/api/auth/me`     | yes       | Return the current user without the password hash                             |
| `GET`  | `/api/lists`       | yes       | Shopping lists; users see assigned or responsible lists, admins see all lists |

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

## Login API

`POST /api/auth/login` accepts a JSON body containing `username` and `password`.
Valid credentials return the public user fields and set a signed, HTTP-only
session cookie. Invalid credentials always return `401 Unauthorized` with the
same error response, regardless of whether the username or password was wrong.
Passwords are compared against `users.password_hash` exclusively with bcrypt.
`GET /api/auth/me` returns the currently authenticated user and responds with
`401 Unauthorized` when no valid session exists. `POST /api/auth/logout`
destroys the server-side session and removes the session cookie.

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

## Pre-commit checks

`npm install` installs Husky and activates the Git hooks through the `prepare`
script. No further manual step is required after cloning the repository.

The `.husky/pre-commit` hook runs on every commit:

1. `lint-staged` checks only the staged files: ESLint runs on staged TypeScript
   and Vue files, then Prettier formats all supported staged files.
2. `npm test` runs the Jest test suite.

Files reformatted by Prettier are added back to the commit automatically. A
commit is rejected when ESLint reports an error or a test fails; the commit is
created only after all checks pass. ESLint runs with `--max-warnings=0`, so
warnings block the commit as well.

Skip the hook only in justified exceptional cases:

```shell
$ git commit --no-verify
```

## Source structure

The Express TypeScript application lives in `backend/`:

- `backend/src/app.ts` creates and configures the Express application.
- `backend/src/server.ts` starts the HTTP server.
- `backend/src/library.ts` contains the existing starter utility.
- `backend/tests/` contains the Jest tests.
- `backend/chinook.db` is the starter SQLite database.

The Vue 3 TypeScript application lives in `frontend/`:

- `frontend/src/App.vue` contains the starter page and backend status display.
- `frontend/src/main.ts` initializes Vue.
- `frontend/vite.config.ts` configures Vite and the development API proxy.
