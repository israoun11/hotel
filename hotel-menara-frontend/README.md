# Hôtel Menara Hammamet – Frontend

Public website (French / English) and administration area of Hôtel Menara Hammamet, built with **React 18, TypeScript and Vite**.
It works with the existing **hotel-menara-backend** (`/api/v1`) **without any backend change**.

- Public site: home, the hotel, rooms and room details, services, Lina Spa, gallery with lightbox, contact form,
  online booking (availability → room → guest details → request sent) and "find my booking".
- Administration (`/admin`, where the sign-in form is): sign-in with the backend JWT, dashboard, bookings (filters, details, confirm / complete / cancel),
  rooms, services, gallery, contact messages, hotel settings, password change.
- No extra runtime dependency: only `react` and `react-dom`. Fonts (Libre Caslon Display, Jost, SIL Open Font License) are
  self-hosted in `public/fonts/`.

## 1. Requirements

- Node.js 20 or newer, npm
- The backend running (see its own README): `npm run dev` in `hotel-menara-backend` → `http://localhost:4000`

## 2. Install and run

```bash
cd hotel-menara-frontend
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run dev                 # http://localhost:5173
```

`.env`:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:4000/api/v1` | Backend URL **including `/api/v1`**, no trailing slash |
| `VITE_API_TIMEOUT_MS` | `15000` | Request timeout |

Only `VITE_*` variables reach the browser. **Never put a secret here** (no JWT secret, no database URL, no OpenAI key).

The backend must allow the frontend origin in its own `.env` → `CORS_ORIGINS`. Its default
(`http://localhost:3000,http://localhost:5173`) already covers `npm run dev`. For `npm run preview` (port 4173) or production,
add that origin to `CORS_ORIGINS` in the backend `.env` (this is configuration, not a code change).

### Administrator account

There is no public registration (the backend has none). Create the administrator with the backend command
`npm run admin:create`, then sign in at **http://localhost:5173/admin** (the sign-in form is shown there when you are signed out;
`/admin/login` also leads to it). Other admin pages send you to `/admin` and back once signed in. "Se déconnecter" clears the
session and returns to `/admin`. No credentials are stored in this project.

## 3. Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check (`tsc -b`) and production build into `dist/` |
| `npm run preview` | Serve the production build locally (port 4173) |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Node test runner through `tsx`, no browser needed) |
| `npm run verify` | typecheck + lint + test + build |
| `npm run photos:download` | Copies the official photos into `public/photos/` (see §5) |

## 4. How the frontend talks to the backend

All calls go through `src/api/`:

- `client.ts` – fetch wrapper. Understands the backend envelope `{ success, data, meta }` / `{ success: false, error: { code, message, details } }`,
  turns every failure into an `ApiError` (`NETWORK_ERROR`, `TIMEOUT`, `INVALID_RESPONSE` or the backend code such as `ROOM_UNAVAILABLE`),
  adds `Authorization: Bearer <token>` to admin calls, and signs the administrator out on `401 INVALID_TOKEN` / `UNAUTHORIZED`.
- `endpoints.ts` – one function per backend route actually used (paths, methods and bodies taken from `src/routes/*.js` and the Zod schemas).
- `types.ts` – TypeScript types written from the backend Mongoose models and Zod schemas.

| Screen | Backend routes |
|---|---|
| Whole site | `GET /settings` (once per visit) |
| Rooms, room details | `GET /rooms`, `GET /rooms/:slug` |
| Services, gallery | `GET /services`, `GET /gallery` |
| Booking | `GET /availability`, `POST /bookings` |
| Find my booking | `POST /bookings/lookup` |
| Contact | `POST /contact-messages` |
| Admin sign-in | `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password` |
| Admin | `GET/PATCH /bookings…`, `POST/PATCH/DELETE /rooms /services /gallery`, `GET/PATCH/DELETE /contact-messages`, `PUT /settings` |

**Booking rules respected**

- Prices are only shown when the backend returns them (`GET /availability`); the client never sends a price (the strict schema would reject it).
- The confirmation screen appears **only after a `201` answer** and shows the backend reference (`MEN-XXXXXXXX`) and status
  ("pending": the hotel confirms afterwards). Any error keeps the guest on the form with what they typed.
- Double clicks cannot create two requests (one submission at a time).
- `ROOM_UNAVAILABLE` / `CAPACITY_EXCEEDED` refresh the availability; `INVALID_DATES` / `STAY_TOO_LONG` go back to the dates;
  `BOOKING_DISABLED` (or `isBookingEnabled: false` in settings) shows the hotel's phone and e-mail instead of the form.

**Administrator session**

- The JWT from `POST /auth/login` is kept in `sessionStorage` with its expiry (`expiresInSeconds`); it is cleared when the tab closes,
  at expiry, on sign-out, and whenever the backend answers `401 INVALID_TOKEN` (e.g. after a password change).
- A restored session is checked once with `GET /auth/me`. `/admin/*` pages redirect to `/admin/login?next=…` when signed out.

## 5. Content, demo data and photos

- Hotel texts (spirit, rooms, services, Lina Spa rituals, "Naturally Menara") come from the official website
  https://www.menarahammamet.com/ (FR and EN), checked on 22 October 2026 — see `src/i18n/fr.ts` and `src/i18n/en.ts`.
  Official facts used while the backend settings are still demo values: `src/content/hotel.ts`
  (Rue de la Paix, 8050 Hammamet · +216 72 226 999 · welcome@menarahammamet.com · Facebook · Instagram).
- **The backend ships `[DEMO]` data.** The public site never shows it, and shows no technical warning either:
  - demo contact details / tagline / cancellation policy → replaced by the official facts or hidden;
  - demo rooms (`isDemo` or a `[DEMO]` name) are never listed, priced or offered for booking. Their address
    (`/rooms/demo-…`) shows a "not offered online" page;
  - when no genuine room is published, the Rooms page shows the official room categories and an invitation to check dates
    or write to the hotel; when a stay has no genuine room available, the booking page offers **"Réservation sur demande"**:
    the contact form opens prefilled with the dates and guests and is sent through the real `POST /contact-messages`;
  - demo services and gallery items are not shown publicly;
  - only the admin area labels demo records ("Démo" badges and a dashboard reminder).
  As soon as the hotel adds real rooms in **Admin → Chambres** (with `isActive` on), they appear on the site and are bookable online.
- **Photos.** By default the official photos are loaded from `www.menarahammamet.com/images/…`. To serve them yourself
  (recommended, and only if the hotel agrees), run once on a machine with internet access:

  ```bash
  npm run photos:download
  ```

  It saves them into `public/photos/` and updates `src/content/photo-manifest.json`; the site then uses the local files first.
  If a photo cannot load, a quiet branded panel is shown instead of a broken image. Photos added in **Admin → Galerie** are shown
  in the public gallery in addition to the official ones.

## 6. Languages

French is the default; English is used when the browser prefers it. The visitor's choice is remembered (localStorage).
All interface texts and hotel content exist in both languages (a test checks that both dictionaries have exactly the same keys).
Data typed in the admin (room names, descriptions…) is stored once by the backend and shown as entered.

## 7. Deployment

`npm run build` produces static files in `dist/`. The site uses clean URLs (`/rooms`, `/admin/bookings`…), so the web server must
send `index.html` for unknown paths:

- Netlify: `public/_redirects` containing `/*  /index.html  200`
- Nginx: `try_files $uri /index.html;`
- Vercel: a rewrite of `/(.*)` to `/index.html`

Set `VITE_API_BASE_URL` to the public backend URL **before** building, and add the site's origin to the backend `CORS_ORIGINS`.

## 8. What the backend does not support (not faked here)

- **Online payment** – none in the backend; the booking is a request with status *pending* that the hotel confirms.
- **Guest cancellation or modification** – the backend has no public endpoint; "Find my booking" shows the status and invites
  the guest to contact the hotel. Cancelling is done by the administrator.
- **Image upload** – the backend stores image URLs only; the admin asks for an `http(s)` address and previews it.
- **Room categories** – the backend room types are `single, double, twin, family, suite`; the official site's *triple* and
  *quadruple* rooms can be created as `family` rooms with the right capacity and name. The official four categories are also
  described on the Rooms page as hotel information.
- **Bilingual database content** – the backend stores one text per field.
- **Clearing a social link** – the backend accepts only full URLs for `socialLinks`, so a saved link can be replaced, not emptied.
- **AI concierge** (`POST /ai/assistant`) – disabled by default in the backend; not shown on the site.

## 9. Project structure

```
src/
  api/          client, endpoints, types (+ tests)
  auth/         session storage + React context (+ tests)
  i18n/         fr.ts, en.ts, language context (+ tests)
  router/       small History-API router (no dependency)
  content/      official facts and photo catalogue
  context/      hotel settings provider
  lib/          validation, booking submission, formatting, demo-data handling, settings diff (+ tests)
  hooks/        data loading, submit guard, reveal on scroll, focus trap, page title
  components/   header, footer, photo, fields, lightbox, booking bar…
  pages/        public pages
  admin/        administration screens
  styles/       tokens, base, site, admin
public/
  brand/        logo variants and favicon (from the hotel logo)
  fonts/        self-hosted WOFF files + licences
  photos/       filled by `npm run photos:download`
scripts/        download-photos.mjs
```

See `VERIFICATION.md` for what was tested and what could not be.
