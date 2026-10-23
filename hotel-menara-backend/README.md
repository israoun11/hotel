# Hotel Menara Hammamet – Backend API

REST API in plain **JavaScript (CommonJS)** – Node.js, Express, MongoDB/Mongoose, Zod for the Hotel Menara Hammamet website.

> **All data shipped with this project is DEMO data** (`[DEMO]` prefix, `example.com` URLs, placeholder phone/e-mail).
> Replace it with the real hotel information through the admin API (`PUT /api/v1/settings`, rooms, services, gallery).

## Features

- Versioned API under `/api/v1`, Swagger UI at `/api/docs` (JSON at `/api/docs.json`)
- Admin-only authentication (JWT + bcrypt), **no public registration**; the first admin is created from the terminal
- Rooms, hotel services, gallery (image URLs), hotel settings, bookings, contact messages
- Availability search, **prices computed on the server**, **double-booking prevention** (atomic per-night inventory)
- Optional OpenAI concierge (key stays on the server) and optional e-mail notifications – both OFF by default and never block the API
- Central error handling, Helmet, CORS allow-list, rate limiting, request validation (Zod, unknown fields rejected), env validation at startup

## Requirements

- Node.js **22 or newer** (the project is JavaScript only, nothing to compile) (`node -v`), npm, VS Code, a free MongoDB Atlas account, Postman (optional)

## 1. Install and start (step by step)

```bash
cd hotel-menara-backend
npm install
npm run env:init      # creates .env (never overwrites an existing one) with a random JWT_SECRET
```

Open `.env` and paste your Atlas connection string in `MONGODB_URI` (next section). Then:

```bash
npm run seed          # demo rooms, services, gallery, settings (development only)
npm run admin:create  # asks for e-mail, name and password (hidden); creates the first administrator
npm run dev           # http://localhost:4000  (auto-restarts on changes)
```

Check: <http://localhost:4000/api/v1/health> and <http://localhost:4000/api/docs>.

## 2. MongoDB Atlas configuration

1. Create an account at <https://www.mongodb.com/cloud/atlas> and create a free **M0** cluster.
2. **Database Access** → *Add New Database User* → username + password (autogenerate and copy it) → role *Read and write to any database*.
3. **Network Access** → *Add IP Address* → *Add Current IP Address* (for a server, add its IP; avoid `0.0.0.0/0` in production).
4. **Database** → *Connect* → *Drivers* → copy the connection string:
   `mongodb+srv://<db_user>:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. In `.env`, set `MONGODB_URI` and **add the database name before the `?`**:
   `mongodb+srv://myuser:myPassword@cluster0.xxxxx.mongodb.net/hotel_menara?retryWrites=true&w=majority`
   (URL-encode special characters of the password, e.g. `@` → `%40`.)
6. Collections and indexes are created automatically on first start.

## 3. Configuration (`.env`)

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | **yes** | Atlas connection string, must contain a database name |
| `JWT_SECRET` | **yes** | ≥ 32 chars (`npm run env:init` generates it) |
| `MONGODB_URI_TEST` | for DB tests | Separate DB whose name **ends with `_test`**; it is wiped by tests |
| `NODE_ENV`, `PORT` | no | default `development`, `4000` |
| `JWT_EXPIRES_MINUTES`, `BCRYPT_ROUNDS` | no | default 480 / 12 |
| `CORS_ORIGINS` | no | comma separated front-end origins (explicit list required in production) |
| `TRUST_PROXY` | no | `true` behind a reverse proxy |
| `HOTEL_TIMEZONE` | no | default `Africa/Tunis`, defines "today" for bookings |
| `EMAIL_ENABLED` + `SMTP_*`, `EMAIL_FROM`, `HOTEL_NOTIFY_EMAIL` | optional | e-mail notifications; all required only if enabled |
| `AI_ENABLED`, `OPENAI_API_KEY`, `OPENAI_MODEL` | optional | AI concierge; all required only if enabled |

If something is missing or invalid, the server prints a clear list of problems and exits before connecting.

## 4. npm scripts

| Command | What it does |
|---|---|
| `npm run env:init` | Creates `.env` from `.env.example` (refuses to overwrite) |
| `npm run dev` | Development server with automatic reload (`node --watch`) |
| `npm start` | Run the server (no build step: the code runs as is) |
| `npm run seed` | Inserts DEMO data only if missing; refuses when `NODE_ENV=production` |
| `npm run seed:reset-demo` | Deletes **only** records flagged `isDemo` (rooms with bookings are kept), then re-seeds |
| `npm run admin:create` | Creates the first administrator (refuses if one exists unless `-- --additional`). Non-interactive: set `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` |
| `npm run check:syntax` / `npm run lint` | Syntax check of every `.js` file / ESLint |
| `npm test` | Unit tests + DB integration tests (skipped without `MONGODB_URI_TEST`) |
| `npm run check:docs` | Verifies Express routes ⇄ OpenAPI ⇄ Postman |
| `npm run postman:generate` | Regenerates the Postman files from `scripts/lib/postmanBuilder.js` |
| `npm run verify` | check:syntax + lint + test |

Production: set `NODE_ENV=production` and run `npm start`; create the admin with `npm run admin:create`.

## 5. API overview (`/api/v1`)

Public: `GET /health`, `GET /settings`, `GET /rooms`, `GET /rooms/:idOrSlug`, `GET /services`, `GET /gallery`, `GET /availability`, `POST /bookings`, `POST /bookings/lookup`, `POST /contact-messages`, `POST /ai/assistant`, `POST /auth/login`.

Admin (`Authorization: Bearer <token>`): `GET /auth/me`, `POST /auth/change-password`, `PUT /settings`, `POST|PATCH|DELETE` on `/rooms`, `/services`, `/gallery`, `GET /bookings`, `GET /bookings/:id`, `PATCH /bookings/:id/status`, `GET|PATCH|DELETE` on `/contact-messages`.

Responses: `{ "success": true, "data": ..., "meta": ... }` or `{ "success": false, "error": { "code", "message", "details?" } }`.

### How bookings stay safe

- A room record is a **room type** with `totalUnits` identical rooms. Each booked night increments a counter in the `inventories` collection with a conditional atomic update (`booked < totalUnits`) backed by a unique index, so simultaneous requests cannot both take the last unit.
- Price = nights × rate + tax + tourist tax from the hotel settings, computed in integer millimes; any price sent by the client is rejected.
- Cancelling a booking releases its nights. Status flow: `pending → confirmed | cancelled`, `confirmed → completed | cancelled`.
- Images are stored as **URLs** (http/https only); file upload is not included.

## 6. Testing the API in Postman

1. Import `postman/hotel-menara.postman_collection.json` and `postman/hotel-menara.postman_environment.json`.
2. Select the environment **Hotel Menara - Local**, fill `adminEmail` and `adminPassword` (the admin created with `npm run admin:create`). `baseUrl` is `http://localhost:4000/api/v1`.
3. Start the API (`npm run dev`) and run the collection (right-click → *Run collection*), in this order:
   `0 System` → `1 Public content` → `2 Authentication` → `3 Room management` → `4 Availability and bookings` → `5 Contact messages` → `6 Administrator operations` → `7 Authorization failures` → `8 Optional AI assistant`.
4. The run creates a temporary test room and deletes it in folder 6; it also restores the hotel tagline it temporarily changes. Dates are computed automatically (today + 30 days).

Do not run Postman against a production database.

## 7. Automated tests

```bash
npm test
```

- Unit tests (no database): dates, pricing, helpers, environment validation, all Zod schemas, route/OpenAPI/Postman consistency.
- Integration tests (real MongoDB): set `MONGODB_URI_TEST` to a **separate** database (name ending in `_test`, e.g. `.../hotel_menara_test?...`). They cover login, authorization, rooms, availability, server-side pricing, double booking with 6 simultaneous requests, cancellation, contact messages, password change.

## 8. Project structure

```
src/
  config/       env validation (zod), MongoDB connection
  models/       Mongoose models (Admin, Room, Booking, Inventory, ...)
  validation/   Zod schemas for every request
  services/     business logic (booking.service.js is the core)
  controllers/  thin HTTP layer
  routes/       Express routers (mounted in routes/index.js)
  middleware/   auth, validate, errorHandler, rateLimit
  docs/         OpenAPI description
  scripts/      createAdmin, seed
scripts/        init-env, Postman generator, docs consistency check
tests/          unit + integration tests
postman/        collection + environment
```

## 9. Security notes

Never commit `.env`. Passwords are hashed with bcrypt (`bcryptjs`, pure JS, no native build). Login is rate limited in production (10 / 15 min / IP). Tokens are invalidated after a password change. Unknown request fields are rejected. Only `http(s)` image URLs are accepted.

## 10. Troubleshooting

- *`Invalid environment configuration`* – read the listed variables and fix `.env`.
- *Cannot connect to MongoDB* – check user/password, URL-encoded password, Atlas **Network Access** IP list, and that the URI has a database name.
- *Port in use* – change `PORT`.
