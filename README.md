# Starter-Projekt für Modul 324

Autor: [Alexander Schenkel](mailto:alexander.schenkel@bztf.ch), [BZT Frauenfeld](https://www.bztf.ch/)

Diese [ ExpressJS ](https://expressjs.com)-Applikation dient als Starter-Projekt für das ICT-Modul 324, DevOps-Prozesse anwenden.

Die Applikation verwendet ein ExpressJS-/TypeScript-Backend, ein Vue-Frontend
und eine über Knex verwaltete Datenbank: SQLite für Entwicklung und Tests,
PostgreSQL in der Docker-Compose-Umgebung. Die alte Chinook-Demo ist nicht
Teil der Poschtilischte-API.

## Architecture

The Vue frontend in the browser talks to the Express backend over a REST API
under `/api` and receives change notifications over Socket.IO. Routes pass the
requests to services, which apply the business rules and access the database
through Knex. Development and tests use SQLite, the Docker Compose environment
uses PostgreSQL.

[docs/architecture.md](docs/architecture.md) describes the system parts and
their communication with diagrams, the backend and frontend structure, the
request flow from the frontend to the database, the realtime events and the
data model with an ER diagram.

## Setup

The setup is split by role. Every role needs the prerequisites; then follow
the section that matches your task:

- [Setup for developers](#setup-for-developers): run and change the application
- [Setup for testers](#setup-for-testers): run the tests and prepare the test
  database
- [Setup for the CI environment](#setup-for-the-ci-environment): run the
  Jenkins pipeline

Problems during the setup are covered in [Troubleshooting](#troubleshooting).

### Prerequisites

| Tool           | Version                  | Needed for                                      |
| -------------- | ------------------------ | ----------------------------------------------- |
| Node.js        | 24 (see `.nvmrc`)        | Backend, frontend, tests and all npm commands   |
| npm            | 11, bundled with Node.js | Dependencies and npm commands                   |
| Git            | any current version      | Cloning and the pre-commit hook                 |
| Docker Desktop | with Docker Compose v2   | Optional: production image, Compose and Jenkins |

With nvm, `nvm use` selects the version from `.nvmrc`. The native modules
`sqlite3` and `bcrypt` are downloaded as prebuilt binaries for Windows, macOS
and Linux, so no compiler is needed.

### Setup for developers

Clone the repository and prepare it with a single command:

```shell
$ git clone https://github.com/giiovi/poschtiliste.git
$ cd poschtiliste
$ npm run setup
```

`scripts/dev-setup.mjs` runs these steps and stops at the first error:

1. `npm install` installs the backend and frontend dependencies (npm
   workspaces) and activates the Husky Git hooks.
2. `.env` is created from `.env.example`. An existing `.env` is kept.
3. `npm run db:migrate` and `npm run db:seed` create the development database
   in `backend/data/` and fill it with the seed users and lists.
4. If Docker is running and `docker-compose.yml` exists,
   `docker compose up --detach --build` builds the production image from the
   `Dockerfile` and starts the Compose environment on port 3000. Otherwise this
   step is skipped with a hint. Use `npm run setup -- --no-docker` to skip it on
   purpose.

The script can be run again at any time. The same steps by hand:

```shell
$ npm install
$ cp .env.example .env
$ npm run db:migrate
$ npm run db:seed
```

Start the backend and, in a second terminal, the Vue development server:

```shell
$ npm run dev
$ npm run dev:frontend
```

Open `http://localhost:5173` and log in with a seed user, for example `alice`
with the password `alice1234` (see
[Development seed data](#development-seed-data)). The Compose environment from
step 4 also uses port 3000: stop it with `docker compose down` before
`npm run dev`.

Before committing, `npm run check` and `npm test` should pass; the pre-commit
hook runs the same checks on every commit (see
[Pre-commit checks](#pre-commit-checks)). The
[npm command reference](#npm-command-reference) lists all commands.

### Setup for testers

The tests need only the installed dependencies, no running server and no
manually prepared database:

```shell
$ npm install
$ npm test
```

The integration tests create their SQLite databases themselves, in memory or
in a temporary directory, and delete them afterwards (see
[Integration-test database](#integration-test-database)). Run the test groups
separately with:

```shell
$ npm run test:unit
$ npm run test:integration
$ npm run test:authorization
$ npm run test:backend
$ npm run test:frontend
```

For manual tests with Knex commands there is a separate, file-based test
database. It is configured with `TEST_DATABASE_CLIENT` and
`TEST_DATABASE_FILENAME` in `.env` (default `backend/data/test.sqlite`) and
never touches the development data:

```shell
$ cp .env.example .env
$ npm run db:migrate -- --env test
$ npm run db:seed -- --env test
```

`npm run db:rollback -- --env test` empties it again. To test the running
application by hand, follow the [Setup for developers](#setup-for-developers)
and log in with the seed users.

### Setup for the CI environment

The CI environment is a Jenkins server that runs the `Jenkinsfile`. The
quickest way is the Jenkins service of the Compose file, which needs Docker
Desktop:

1. Set `JENKINS_ADMIN_PASSWORD` in `.env`. For the multibranch scan also set
   `GITHUB_USERNAME` and `GITHUB_TOKEN` (personal access token with the
   `public_repo` scope).
2. Start Jenkins:

   ```shell
   $ docker compose up --detach --build jenkins
   ```

3. Open `http://localhost:8080` and log in with `admin` and the password from
   `.env`. The multibranch job `poschtiliste` scans the repository every minute
   and builds branches and pull requests.

Details are in [Jenkins with Docker Compose](#jenkins-with-docker-compose). For
an existing Jenkins server follow
[Manual Jenkins preparation](#manual-jenkins-preparation). The pipeline stages
are described in
[Continuous integration (Jenkins)](#continuous-integration-jenkins).

## Environment configuration

```shell
$ cp .env.example .env
```

`.env.example` documents all environment variables with safe placeholder
values. Never commit a real `.env` file; it is listed in `.gitignore`.
`SESSION_SECRET` is required by the backend to sign session cookies and must be
replaced with a private, sufficiently long value in each deployed environment.
`SESSION_COOKIE_SECURE` should be `false` for direct local HTTP and `true` when
the application is exposed through HTTPS. If omitted, it defaults to `true` in
production and `false` otherwise.

The development and test databases use separate environment variables:

| Environment | Knex client            | Database file            |
| ----------- | ---------------------- | ------------------------ |
| Development | `DATABASE_CLIENT`      | `DATABASE_FILENAME`      |
| Test        | `TEST_DATABASE_CLIENT` | `TEST_DATABASE_FILENAME` |

With `DATABASE_CLIENT=pg` Knex connects to PostgreSQL instead of a SQLite file
and reads `DATABASE_HOST`, `DATABASE_PORT` (optional, default `5432`),
`DATABASE_NAME`, `DATABASE_USER` and `DATABASE_PASSWORD`. The test environment
uses the same names with the `TEST_` prefix.

No database connection parameter is hardcoded in the Knex configuration. Copy
`.env.example` to `.env` before running database commands locally.

## npm command reference

Run these commands from the repository root. The root scripts delegate to the
backend and frontend packages and propagate failures to the terminal and CI.

| Command                      | Purpose                                                | When to run it                                       |
| ---------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| `npm install`                | Install all workspace dependencies and Git hooks       | After cloning or changing dependencies               |
| `npm run setup`              | Install, create `.env`, migrate, seed, start Compose   | Once after cloning, again after a reset              |
| `npm run dev`                | Start the backend with automatic restarts              | During backend development                           |
| `npm run dev:backend`        | Same as `npm run dev`                                  | During backend development                           |
| `npm run serve`              | Alias of `npm run dev`                                 | During backend development                           |
| `npm run dev:frontend`       | Start the Vue development server                       | In a second terminal during frontend development     |
| `npm run build`              | Compile the backend and build the frontend bundle      | Before a release or production start                 |
| `npm run build:backend`      | Compile only the backend TypeScript to `backend/dist/` | When checking backend type errors                    |
| `npm run build:frontend`     | Type-check and bundle only the frontend                | When checking the production bundle                  |
| `npm start`                  | Start the compiled backend                             | After `npm run build` in a production-like setup     |
| `npm test`                   | Run all backend and frontend tests                     | Before every pull request                            |
| `npm run test:backend`       | Run the complete backend Jest suite                    | After backend changes                                |
| `npm run test:frontend`      | Run the frontend Vitest suite                          | After frontend changes                               |
| `npm run test:unit`          | Run all tests except the integration tests             | For fast feedback while developing                   |
| `npm run test:integration`   | Run API tests against isolated real SQLite databases   | After backend or persistence changes                 |
| `npm run test:authorization` | Run authorization tests with 100% coverage gates       | After authentication or permission changes           |
| `npm run lint`               | Check backend and frontend source with ESLint          | While developing and before committing               |
| `npm run lint:backend`       | Run ESLint only for the backend                        | After backend changes                                |
| `npm run lint:frontend`      | Run ESLint only for the frontend                       | After frontend changes                               |
| `npm run format`             | Format supported repository files with Prettier        | After editing or when `format:check` fails           |
| `npm run format:check`       | Verify formatting without modifying files              | Before committing and in CI                          |
| `npm run check`              | Run lint and the formatting check together             | Before every pull request                            |
| `npm run db:migrate`         | Apply pending development-database migrations          | After setup and after schema changes                 |
| `npm run db:seed`            | Load reproducible development data                     | After migrations when sample data is needed          |
| `npm run db:rollback`        | Roll back all development-database migrations          | When resetting or validating migration reversibility |

Append `-- --env test` to a database command to target the separate test
database, for example `npm run db:migrate -- --env test`.

`npm install` also runs the `prepare` script, which activates the Husky Git
hooks; it is not meant to be called directly. The workspaces have their own
scripts as well. `npm --prefix frontend run preview` serves the built frontend
bundle locally; the other workspace scripts are the targets of the root
commands above.

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
otherwise. Admin-only routes additionally use the role middleware and answer
`403` when an authenticated user does not have the `admin` role.

| Method        | Route                                | Protected | Description                                                                                                                      |
| ------------- | ------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET`         | `/api/health`                        | no        | Health check                                                                                                                     |
| `POST`        | `/api/auth/login`                    | no        | Login and create a session                                                                                                       |
| `POST`        | `/api/auth/logout`                   | no        | Destroy the session and clear its cookie                                                                                         |
| `GET`         | `/api/auth/me`                       | yes       | Return the current user without the password hash                                                                                |
| `GET`         | `/api/lists`                         | yes       | Shopping lists; users see assigned or responsible lists, admins see all lists                                                    |
| `POST`        | `/api/lists`                         | yes       | Create a shopping list with optional assignments, returns `201`                                                                  |
| `GET`         | `/api/lists/:id`                     | yes       | One list with `assigned_user_ids`; `403` without access, `404` if unknown                                                        |
| `PATCH`/`PUT` | `/api/lists/:id`                     | yes       | Update title, due date, responsible user or `completed`; `403` without access, `404` if unknown                                  |
| `DELETE`      | `/api/lists/:id`                     | yes       | Delete a list with its items and assignments, returns `204`; `403` without access, `404` if unknown                              |
| `POST`        | `/api/lists/:id/assignments`         | yes       | Assign a user (`{ "userId": number }`), returns `201` with all assigned user ids; `409` if already assigned                      |
| `DELETE`      | `/api/lists/:id/assignments/:userId` | yes       | Remove an assignment, returns `204`; `404` if not assigned                                                                       |
| `GET`         | `/api/lists/:id/items`               | yes       | Items from an accessible shopping list                                                                                           |
| `POST`        | `/api/lists/:id/items`               | yes       | Validate and create an item in an accessible shopping list                                                                       |
| `PATCH`       | `/api/lists/:id/items/:itemId`       | yes       | Edit an item's name, quantity, or purchased status in an accessible list                                                         |
| `DELETE`      | `/api/lists/:id/items/:itemId`       | yes       | Delete an item of an accessible list, returns `204`; `403` without access, `404` if the list or the item in this list is unknown |
| `GET`         | `/api/users`                         | yes       | Selectable users (`id`, `username`) sorted by username                                                                           |
| `GET`         | `/api/admin/users`                   | admin     | All users without password hashes, sorted by username                                                                            |
| `POST`        | `/api/admin/users`                   | admin     | Create a user (`username`, `password`, optional `role`), returns `201`; `409` if the username is taken                           |
| `PATCH`       | `/api/admin/users/:id`               | admin     | Change `username` and/or `role`; `409` if the username is taken                                                                  |
| `DELETE`      | `/api/admin/users/:id`               | admin     | Delete a user and their list assignments, returns `204`; `409` while the user is responsible for lists                           |
| `PUT`         | `/api/admin/users/:id/password`      | admin     | Reset the password (`{ "password": string }`), returns `204`                                                                     |

Admin routes answer `401` without a session and `403` for normal users.
Usernames are trimmed and contain 1 to 100 characters, passwords 8 characters
up to 72 bytes; they are stored as bcrypt hashes only. Roles are `admin` or
`user` (default). Administrators cannot delete their own account or remove
their own admin role (`409`), so the application cannot lose its last admin.
Unknown users answer `404`.

Body of `POST /api/lists` (JSON):

| Field               | Type       | Rules                                                    |
| ------------------- | ---------- | -------------------------------------------------------- |
| `title`             | `string`   | required, 1 to 255 characters                            |
| `dueDate`           | `string`   | optional, `YYYY-MM-DD`                                   |
| `responsibleUserId` | `number`   | optional, existing user id, defaults to the current user |
| `assignedUserIds`   | `number[]` | optional, existing user ids                              |

Invalid list input is rejected with `400` and `{ "error": "<message>" }`. The
list and its assignments are written in a single transaction.

Shopping-item names are trimmed and must contain between 1 and 255 characters.
Quantities must be positive integers and default to `1` when omitted. Normal
users receive `403 Forbidden` for lists they are neither assigned to nor
responsible for; administrators can access every list.

Item updates are partial: send at least one of `name`, `quantity`, or
`purchased`. Names and quantities follow the same validation rules as item
creation, while `purchased` must be a boolean. A missing item returns `404`.

## Frontend login flow

The Vue application uses a protected dashboard route and a public `/login`
route. On the first navigation after opening or reloading the application, the
frontend calls `GET /api/auth/me`. An existing session opens the dashboard;
otherwise the router redirects to the login page.

Invalid credentials are displayed directly below the login heading. After a
successful login the original protected destination is opened. The logout
button in the app bar destroys the server-side session and returns the user to
`/login`.

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

## Shopping-list dashboard

The start page renders the shopping-list dashboard. It loads `GET /api/lists`
and therefore shows exactly the lists the backend returns for the current
session: assigned or responsible lists for a normal user, all lists for an
admin.

The dashboard distinguishes four states:

- **Loading** – placeholder cards are shown while the request is running.
- **Unauthenticated** – a `401` response is rendered as a notice asking the
  visitor to log in.
- **Error** – any other failure shows a notice with a retry button.
- **Ready** – lists are grouped into `Offen` and `Abgeschlossen`, each group
  sorted by due date, lists without a due date last.

Every card carries a status chip: `Offen`, `Überfällig` (due date in the past
and not completed) or `Abgeschlossen`. The layout is fluid and usable down to a
viewport width of 320px.

## Mobile shopping-list detail

Select a list title on the dashboard to open its detail view. The view loads
the current items and lets assigned users add, edit, purchase, unpurchase and
delete them without reloading the page. Item checkboxes and action buttons use
mobile-friendly touch targets, and the layout changes to full-width controls on
small screens.

## Create and edit shopping lists

`Neue Liste` on the dashboard opens `/lists/new`, `Bearbeiten` on a card opens
`/lists/:id/edit`. Both routes are protected and use the same form with title,
due date, responsible user and assigned users. The users come from
`GET /api/users`; the responsible user defaults to the current user.

Saving a new list sends one `POST /api/lists`. Saving an existing list sends
the title and due date first, so a validation error stops before anything else
changes. Then new assignments are added, the responsible user is changed and
removed assignments are deleted last, because the current user may lose access
to the list with these two steps.

Validation errors from the backend (`400`) are shown below the matching field,
other errors above the form. After saving, the dashboard is opened again.

## Realtime connections

Socket.IO runs on the same HTTP server as the API (path `/socket.io`) and
shares the express session. A handshake is only accepted if the session belongs
to an existing user, otherwise the client gets the connect error
`Authentication required`. Every accepted socket joins the room `user:<id>`
(`userRoom()` in `backend/src/realtime/socket-server.ts`), so events can be sent
to all connections of one user.

The frontend connects after login and disconnects on logout
(`frontend/src/realtime/socket.ts`). In development the Vite proxy forwards
`/socket.io` including WebSockets to the backend.

Successful list and item mutations emit the following events to the responsible
user and all assigned users. Users who are not related to the list do not
receive them. Every payload includes `listId` and `actorUserId`.

| Event           | Additional payload                                                 | Emitted after                              |
| --------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| `list:assigned` | `assignedUserId`                                                   | a user is assigned                         |
| `list:updated`  | `change`: `created`, `updated`, `deleted`, or `assignment-removed` | a list or its assignments change           |
| `item:added`    | complete `item`                                                    | an item is created                         |
| `item:updated`  | complete `item`                                                    | an item is edited or purchased/unpurchased |
| `item:deleted`  | `itemId`                                                           | an item is deleted                         |

When responsibility or an assignment is removed, the previous recipients also
receive the final `list:updated` event so their frontend can remove or refresh
the list.

The frontend shows incoming events as a non-blocking toast for four seconds.
The dashboard refreshes its cards in the background, while an open list detail
applies item additions, updates and deletions directly without a page reload.
Events for other list ids are ignored by the detail view.

## User administration

Administrators see a `Benutzer` link in the app bar that opens `/admin/users`.
The route guard sends everyone else back to the dashboard, and the link is
hidden for them. The page lists all users and lets an administrator create,
edit (username, role), delete and reset the password of a user, using the
`/api/admin/users` endpoints. The own account cannot be deleted and its role
cannot be changed. Backend errors are translated to German messages in
`frontend/src/api/admin-users.ts`.

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

## Production Docker image

Build the multi-stage production image from the repository root:

```shell
$ docker build --tag poschtiliste:0.1.0 .
```

The build compiles the TypeScript backend and Vue frontend, removes development
dependencies and copies only the compiled application plus production
dependencies into the runtime stage. The container runs as the non-root `node`
user, applies pending Knex migrations at startup and serves the Vue application,
API and Socket.IO from one published port.

The `test` stage keeps the development dependencies and the tests. The Jenkins
pipeline uses it to run the tests in a container:

```shell
$ docker build --target test --tag poschtiliste-test .
$ docker run --rm poschtiliste-test npm run test:unit
```

Create a managed volume and start the application on local HTTP:

```shell
$ docker volume create poschtiliste-data
$ docker run --detach --name poschtiliste \
    --publish 3000:3000 \
    --env SESSION_SECRET=replace-with-a-long-random-secret \
    --env SESSION_COOKIE_SECURE=false \
    --mount source=poschtiliste-data,target=/data \
    poschtiliste:0.1.0
$ curl http://localhost:3000/api/health
```

The health response is `{ "status": "ok" }`. No application source or local
`node_modules` directory is mounted. SQLite data is stored in
`/data/poschtiliste.sqlite` inside the named volume and therefore survives
container replacement. Configuration can be changed with `PORT`,
`DATABASE_CLIENT`, `DATABASE_FILENAME`, `SESSION_SECRET`,
`SESSION_COOKIE_SECURE` and `FRONTEND_DIST_DIR`. Keep secure cookies enabled
when the container is exposed through HTTPS.

Stop and remove the container without deleting its data:

```shell
$ docker rm --force poschtiliste
```

For an offline submission, export and later import the complete image:

```shell
$ docker save --output poschtiliste-0.1.0.tar poschtiliste:0.1.0
$ docker load --input poschtiliste-0.1.0.tar
```

## Docker Compose environment

`docker-compose.yml` builds the production image and starts two containers:
`webapp` (the application) and `database` (PostgreSQL 18). The application
waits until the database container is healthy and connects to it through Knex.
The data is stored in a persistent volume:

```shell
$ cp .env.example .env
$ docker compose up --detach --build
$ docker compose ps
$ curl http://localhost:3000/api/health
```

Compose reads the variables below from `.env` or the shell and passes them to
the containers as environment variables. Secrets are neither stored in the image
nor in `docker-compose.yml`.

| Variable                | Default                 | Purpose                                                         |
| ----------------------- | ----------------------- | --------------------------------------------------------------- |
| `SESSION_SECRET`        | none, required          | Signs the session cookie. Use a long random value.              |
| `SESSION_COOKIE_SECURE` | `false`                 | Set to `true` when the application is served through HTTPS.     |
| `APP_PORT`              | `3000`                  | Host port that is published to port 3000 of the container.      |
| `POSTGRES_PASSWORD`     | none, required          | Password of the database user. Use a strong random value.       |
| `POSTGRES_USER`         | `poschtiliste`          | Database user that PostgreSQL creates and the application uses. |
| `POSTGRES_DB`           | `poschtiliste`          | Database that PostgreSQL creates and the application uses.      |
| `DATA_VOLUME`           | `poschtiliste-database` | Named volume or host path mounted to `/var/lib/postgresql`.     |

Compose passes the database values to the application as `DATABASE_CLIENT=pg`,
`DATABASE_HOST=database`, `DATABASE_PORT=5432`, `DATABASE_NAME`,
`DATABASE_USER` and `DATABASE_PASSWORD`. The database port is not published to
the host. `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` only take
effect when the volume is still empty; PostgreSQL keeps the existing user and
database afterwards.

The image itself still defaults to SQLite (`DATABASE_CLIENT=sqlite3`,
`DATABASE_FILENAME=/data/poschtiliste.sqlite`) and fixes `NODE_ENV=production`,
`PORT=3000` and `FRONTEND_DIST_DIR=/app/frontend/dist` (see
[Production Docker image](#production-docker-image)).

The optional third service `jenkins` only starts on request, see
[Jenkins with Docker Compose](#jenkins-with-docker-compose).

### Migrations

On every start the application container first applies all pending Knex
migrations to the PostgreSQL database. The server only starts when the
migrations succeed; otherwise the container exits with an error and
`docker compose logs webapp` shows the cause. Migrations can also be run
manually against the same database:

```shell
$ docker compose run --rm webapp node backend/dist/src/db/migrate.js
```

The database starts empty. Load the [development seed data](#development-seed-data)
to log in with the test users (local demo only, never in production):

```shell
$ docker compose exec webapp node backend/dist/src/db/seed.js
```

### Persistence

PostgreSQL stores its data in `/var/lib/postgresql` of the `database`
container. By default this is the named volume `poschtiliste-database`, so the
data survives container replacement:

```shell
$ docker compose down
$ docker compose up --detach
```

`docker compose down --volumes` deletes the named volume and all data.

To keep the database in a directory outside the container, set `DATA_VOLUME`
to a host path (bind mount). Relative paths are resolved from the repository
root:

```shell
DATA_VOLUME=/srv/poschtiliste/database
```

The PostgreSQL image creates the directory and hands it to its `postgres`
user on the first start. The data itself lies in the subdirectory
`18/docker`.

## Tests

```shell
$ npm run test
```

Runs the automated backend and frontend tests written in TypeScript.

The root test command runs both the backend Jest suite and the frontend Vitest
suite. Run only one suite with:

```shell
$ npm run test:backend
$ npm run test:frontend
```

The frontend tests cover session restoration through `/me`, login failures,
logout, and redirects between public and protected routes.

Run the focused authorization suite with enforced 100% branch, function, line
and statement coverage for the authentication and list-access functions:

```shell
$ npm run test:authorization
```

This suite covers unauthenticated and deleted-user sessions, normal users,
administrators, responsible users, assigned users and unrelated users.

### Integration-test database

Run the database integration tests separately with:

```shell
$ npm run test:integration
```

No manually created database or mocked database access is used for these
tests. `backend/tests/helpers/test-app.ts` opens a real SQLite database in
memory, restricts its connection pool to one connection and applies all Knex
migrations before the test starts. Each test destroys that database connection
afterwards, so test runs remain isolated and repeatable.

`shopping-list-persistence.integration.test.ts` represents data sent by the
frontend with a real HTTP `POST /api/lists` request through Supertest. The
request passes through Express, the authentication middleware and the shopping
list service into SQLite. The test then queries the `shopping_lists` table
directly with Knex and verifies that the submitted title, due date and
responsible user were actually persisted.

`api-crud.integration.test.ts` runs the complete application from `createApp`
against a separate, file-based SQLite test database. The helper
`backend/tests/helpers/integration-database.ts` sets up the database like this:

1. It creates a temporary directory and points `TEST_DATABASE_CLIENT` and
   `TEST_DATABASE_FILENAME` at a new file in it, so the Knex `test`
   environment is used and the development database is never touched.
2. Before every test it rolls back all migrations, applies them again with
   `migrate.latest()` and runs the development seed, so each test starts from
   the same known state.
3. After the suite it closes the connection and deletes the temporary
   directory, so no state is left behind.

The tests log in with the seeded users through `POST /api/auth/login`, cover
login, `/me` and logout, and create, read, update and delete lists and items
over HTTP. After each write they read the affected rows directly with Knex to
verify that the data was stored correctly.

For the file-based test database used by manual Knex commands, first copy
`.env.example` to `.env`, then apply its migrations:

```shell
$ npm run db:migrate -- --env test
```

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
   and Vue files, then `prettier --check` verifies the formatting of all
   supported staged files.
2. `npm test` runs the Jest test suite.

A commit is rejected when ESLint reports an error, a staged file is not
formatted or a test fails; the commit is created only after all checks pass.
ESLint runs with `--max-warnings=0`, so warnings block the commit as well. Run
`npm run format` to fix formatting errors before committing again.

Skip the hook only in justified exceptional cases:

```shell
$ git commit --no-verify
```

## Continuous integration (Jenkins)

The `Jenkinsfile` in the repository root defines the declarative Jenkins
pipeline. Every build deletes the workspace, checks out the repository and
installs Node.js and all dependencies itself, so the build server needs no
prepared project environment. The tests need no `.env` file either: they create
their configuration and SQLite databases in memory or in temporary directories.

| Stage             | Command                                                 | Purpose                                                    |
| ----------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Checkout          | `deleteDir()`, `checkout scm`                           | Start from an empty workspace with the built commit        |
| Install           | `npm ci`                                                | Install the locked dependencies for the lint stage         |
| Lint              | `npm run check`                                         | Run ESLint and the Prettier formatting check               |
| Docker build      | `docker build --target test`, `docker build`            | Build the test image and the production image              |
| Unit tests        | backend `test:unit`, frontend `test` in the test image  | Run Jest without integration tests and the Vitest suite    |
| Integration tests | backend `test:integration` in the test image            | Run the API tests against real file-based SQLite databases |
| Smoke test        | `docker run` of the production image, `GET /api/health` | Check that the production container starts and answers     |

The `test` stage of the `Dockerfile` contains the compiled application, all
dependencies including the development dependencies and the tests. The test
stages start one container of this image per test suite, so the tests run
exactly in the environment that the production image is built from. After each
run the pipeline copies the JUnit reports out of the container and removes the
container.

The smoke test starts a container of the production image with a test session
secret. The image applies the migrations to its SQLite database and starts the
server. The pipeline then sends an HTTP request to `/api/health` inside the
container every two seconds. The stage fails if the container stops or does
not answer with a success status within 60 seconds, and prints the container
log in that case. The container is removed afterwards in every case. Image and
container names contain the Jenkins build tag, and both images are removed at
the end of the build.

A failing command fails its stage. Jenkins then skips the remaining stages and
marks the build as failed. The test stages write JUnit reports to
`reports/junit/`, and the `junit` step publishes them after every build, also
after a failure. The results appear under "Test Result" on the build page and
as a trend on the job page.

### Jenkins with Docker Compose

`docker-compose.yml` contains a ready-to-use Jenkins in the service `jenkins`.
It belongs to the Compose profile `jenkins`, so `docker compose up` for the
application does not start it. Set the administrator password in `.env` and
start it with:

```shell
$ docker compose up --detach --build jenkins
```

Jenkins is then available on `http://localhost:8080` with the user `admin`.
The image in `jenkins/` and the configuration in `jenkins/casc.yaml` replace
the manual preparation below:

| Part            | Reproducible through                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| Jenkins         | Pinned base image `jenkins/jenkins:2.580.2-lts-jdk21`, setup wizard disabled                              |
| Plugins         | `jenkins/plugins.txt` with pinned versions, `jenkins-plugin-cli` adds their dependencies during the build |
| Node.js         | Copied from `node:24-trixie-slim` to `/opt/node-24` and registered as the NodeJS installation `node-24`   |
| Docker          | Docker CLI with buildx from `docker:29-cli`, the host daemon through the mounted `/var/run/docker.sock`   |
| Security        | Local administrator from `JENKINS_ADMIN_ID` and `JENKINS_ADMIN_PASSWORD`, no anonymous access             |
| Credentials     | `github-token` from `GITHUB_USERNAME` and `GITHUB_TOKEN`                                                  |
| Multibranch job | `poschtiliste` with the GitHub branch source, the default behaviours and a scan every minute              |

The configuration as code plugin applies `jenkins/casc.yaml` on every start, so
changes to these settings belong in the file and not in the web interface. The
multibranch job uses the token only when `GITHUB_TOKEN` is set, otherwise it
scans anonymously with the low GitHub rate limit. Jenkins refuses to start
without `JENKINS_ADMIN_PASSWORD`.

| Variable                 | Default | Purpose                                                          |
| ------------------------ | ------- | ---------------------------------------------------------------- |
| `JENKINS_ADMIN_PASSWORD` | none    | Password of the Jenkins administrator, required to start Jenkins |
| `JENKINS_ADMIN_ID`       | `admin` | User name of the Jenkins administrator                           |
| `JENKINS_PORT`           | `8080`  | Host port of the Jenkins web interface                           |
| `DOCKER_GID`             | `0`     | Group of `/var/run/docker.sock`, `0` on Docker Desktop           |
| `GITHUB_USERNAME`        | empty   | GitHub user that owns the token                                  |
| `GITHUB_TOKEN`           | empty   | Personal access token (classic) with the `public_repo` scope     |

On a Linux host the socket belongs to the `docker` group. Set `DOCKER_GID` to
its id, for example with `getent group docker | cut -d: -f3`.

Jobs, build history and plugin data live in the named volume
`poschtiliste-jenkins-home` and survive `docker compose down` and `up`. A plain
`docker compose down` ignores the profile and keeps Jenkins running. With the
profile, `down` removes all containers including the application, and `up`
starts Jenkins again:

```shell
$ docker compose --profile jenkins down
$ docker compose up --detach jenkins
```

To stop only Jenkins, use `docker compose stop jenkins`. To start over with an
empty Jenkins, remove its volume after `down` with
`docker volume rm poschtiliste-jenkins-home`; the next start creates the
configured job again. `down --volumes` would delete the database volume as
well.

The builds run on the Jenkins controller itself. They can read its environment
variables, including the token, and control the Docker daemon of the host
through the socket, which equals root access to the host. Only use this Jenkins
for this repository and keep it unreachable from untrusted networks.

### Manual Jenkins preparation

These steps are needed once per Jenkins instance that is not started with
Docker Compose:

1. Use a Jenkins LTS controller or agent on Linux with internet access to
   GitHub, nodejs.org and the npm registry. The native `sqlite3` module needs
   glibc 2.38 or newer, which the official Debian trixie based Jenkins image
   provides.
2. Make the Docker CLI available on the agent and allow the `jenkins` user to
   use the Docker daemon, for example by adding it to the `docker` group. When
   Jenkins itself runs in a container, mount `/var/run/docker.sock` into it
   and add the group of the socket with `--group-add`.
3. Install the plugins under Manage Jenkins → Plugins → Available plugins:
   Pipeline (`workflow-aggregator`), Git (`git`), GitHub Branch Source
   (`github-branch-source`), JUnit (`junit`) and NodeJS (`nodejs`). "Install
   suggested plugins" in the setup wizard already covers all except NodeJS.
4. Add a Node.js installation under Manage Jenkins → Tools → NodeJS
   installations:
   - Name: `node-24`, it must match `tools { nodejs 'node-24' }` in the
     `Jenkinsfile`
   - Install automatically from nodejs.org with the newest 24.x version

   Jenkins downloads Node.js on the first build.

5. Create a GitHub personal access token (classic) with the `public_repo`
   scope, or `repo` for a private repository, under GitHub → Settings →
   Developer settings. Store it under Manage Jenkins → Credentials → System →
   Global credentials → Add Credentials:
   - Kind: Username with password
   - Username: the GitHub user that owns the token
   - Password: the token
   - ID: `github-token`

   The token exists only in the encrypted Jenkins credential store. The
   repository contains no secrets, and the `Jenkinsfile` references no
   credential.

6. Create the job with New Item → Multibranch Pipeline:
   - Branch Sources → Add source → GitHub, Credentials `github-token`,
     Repository HTTPS URL `https://github.com/giiovi/poschtiliste`
   - Keep the default behaviours: discover branches except those filed as pull
     requests, pull requests from the repository and pull requests from forks
     of users with write access
   - Build Configuration: by Jenkinsfile, Script Path `Jenkinsfile`
   - Scan Multibranch Pipeline Triggers: "Periodically if not otherwise run"
     with an interval of 1 minute

   Jenkins then reads the repository with the token, creates one job per
   branch and per pull request (`PR-<number>`) that contains a `Jenkinsfile`
   and builds it.

### Automatic triggers

| Trigger          | Configured in                   | Starts a build when                                    |
| ---------------- | ------------------------------- | ------------------------------------------------------ |
| Multibranch scan | Multibranch job, 1 minute       | A branch or pull request is new or has a new commit    |
| GitHub webhook   | GitHub repository settings      | GitHub reports a push or pull request event (optional) |
| Nightly cron     | `triggers` in the `Jenkinsfile` | Every night around 02:00 for `develop` and `main`      |

The periodic scan works without any inbound connection, so it also covers a
Jenkins on a developer machine. Each scan asks the GitHub API for the branches
and pull requests and builds every head whose commit changed since the last
scan. A push is therefore built at the latest about one minute later. The scan
needs the token: without credentials GitHub allows only 60 API requests per
hour, and Jenkins then delays the scans by several minutes.

A Jenkins that GitHub can reach can be triggered immediately with a webhook.
Add it in the GitHub repository under Settings → Webhooks with the payload URL
`https://<jenkins-host>/github-webhook/`, content type `application/json` and
the events "Pushes" and "Pull requests". The scan interval can then be raised,
for example to one hour, and only serves as a fallback.

The cron trigger builds `develop` and `main` every night even without a new
commit, so failures caused by updated base images or external services become
visible early. `H` spreads the start time within the hour. Jenkins applies the
trigger after the first build of the branch, and other branches get no
schedule.

Run the test stages locally with:

```shell
$ npm run test:unit
$ npm run test:integration
```

## Troubleshooting

| Problem                                                                      | Cause                                                                     | Solution                                                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Missing required environment variable: DATABASE_CLIENT` or `SESSION_SECRET` | `.env` is missing or incomplete                                           | `cp .env.example .env`, then compare it with `.env.example`                                      |
| `npm install` prints `deprecated` warnings and an `npm audit` notice         | Transitive dependencies of the build and test tools                       | No action needed, the installation succeeded if it ends without `ERR!`                           |
| `SQLITE_ERROR: no such table: users`                                         | The migrations were not applied to this database                          | `npm run db:migrate`, for the test database `npm run db:migrate -- --env test`                   |
| Login with `alice` or `admin` fails locally                                  | The database has no seed data, for example after a rollback               | `npm run db:seed`                                                                                |
| `EADDRINUSE: address already in use :::3000`                                 | The Compose environment or another backend already uses port 3000         | `docker compose down` or stop the other process, the Vite proxy expects the backend on port 3000 |
| The frontend shows network errors on `http://localhost:5173`                 | The backend is not running, Vite forwards `/api` to port 3000             | Start `npm run dev` in a second terminal                                                         |
| `npm install` fails with errors from `node-gyp`, `sqlite3` or `bcrypt`       | Wrong Node.js version, no prebuilt binary matches                         | Use Node.js 24 (`nvm use`), delete `node_modules` and run `npm install` again                    |
| `required variable POSTGRES_PASSWORD is missing a value`                     | Docker Compose needs secrets from `.env`, also for `docker compose down`  | Create `.env` from `.env.example` and set `SESSION_SECRET` and `POSTGRES_PASSWORD`               |
| `GLIBC_2.38' not found` from `node_sqlite3.node`                             | An image or build server with an older glibc, for example Debian bookworm | Use the Debian trixie based images from the `Dockerfile` and `jenkins/Dockerfile`                |
| The commit is rejected by the pre-commit hook                                | ESLint error, unformatted staged file or failing test                     | `npm run format`, fix the reported error, `npm test`, then commit again                          |
| Jenkins does not start: `JENKINS_ADMIN_PASSWORD must be set in .env`         | The administrator password is missing                                     | Set `JENKINS_ADMIN_PASSWORD` in `.env` and run `docker compose up --detach jenkins`              |
| Jenkins: `permission denied while trying to connect to the Docker daemon`    | The `jenkins` user is not in the group of `/var/run/docker.sock`          | Set `DOCKER_GID` (Linux: `getent group docker \| cut -d: -f3`) and recreate the container        |
| Jenkins scans slowly, log shows `Jenkins-Imposed API Limiter`                | No GitHub token, anonymous access allows 60 requests per hour             | Set `GITHUB_USERNAME` and `GITHUB_TOKEN` in `.env` and restart Jenkins                           |

Reset the local development database completely with:

```shell
$ npm run db:rollback
$ npm run db:migrate
$ npm run db:seed
```

## Source structure

The layers of both applications are described in
[docs/architecture.md](docs/architecture.md).

The Express TypeScript application lives in `backend/`:

- `backend/src/app.ts` creates and configures the Express application.
- `backend/src/server.ts` starts the HTTP server.
- `backend/src/library.ts` contains the existing starter utility.
- `backend/tests/` contains the Jest tests.
- `backend/chinook.db` is the starter SQLite database.

The Vue 3 TypeScript application lives in `frontend/`:

- `frontend/src/App.vue` contains the application shell with the app bar.
- `frontend/src/components/` contains the dashboard, the list card and the list
  form component.
- `frontend/src/views/` contains the routed pages.
- `frontend/src/api/` contains the typed fetch helpers for the backend routes.
- `frontend/src/types/` mirrors the API types of the backend.
- `frontend/src/main.ts` initializes Vue.
- `frontend/vite.config.ts` configures Vite and the development API proxy.
