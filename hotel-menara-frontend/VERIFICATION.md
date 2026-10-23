# Verification report

Last run on 23 October 2026 in a cloud sandbox (after the second round of fixes). Everything listed under "Passed" was actually run;
everything under "Not verified" was not, and says why.

## Environment used

- The **unmodified backend** from `hotel-menara-backend.zip` was run (`node src/server.js`), after `npm run seed` and
  `npm run admin:create` (test account created through environment variables, not stored in this project).
- Database: MongoDB Atlas is not reachable from the sandbox, so a local **FerretDB 1.24** (MongoDB wire-compatible) was used.
  FerretDB does not implement TTL indexes, so the test harness preloaded a small Node `--require` shim that drops only the
  `expireAfterSeconds` option of the `inventories` index. **No backend file was changed** (checked with `diff -r` against the zip).
- The npm registry is not reachable from the sandbox, so the toolchain came from the `node_modules` folder of the previous
  frontend (same versions as this project's `package.json` / `package-lock.json`, which are kept identical so `npm ci` resolves
  exactly as before), with esbuild's Linux binary (same version, 0.28.2) added.

## Passed

| Check | Result |
|---|---|
| `tsc -b` (app + node configs, strict) | 0 errors |
| `eslint .` | 0 problems |
| Unit tests `tsx --test "src/**/*.test.ts"` | **63 / 63 passed** |
| End-to-end run in Chromium (Playwright) against the real backend | **35 / 35 passed** |
| Internal link crawl of the public site | 11 pages, no broken link |
| Browser console during the end-to-end run (public, mobile, admin) | no errors or warnings from the application |
| Backend files | identical to the supplied zip |

Unit tests cover: API envelope handling, 204, query strings, error envelope → `ApiError` with field details, network error, timeout,
unreadable answer, Bearer header, sign-out on `INVALID_TOKEN` but not on `INVALID_CREDENTIALS`; exact paths/methods/bodies of the
endpoints; session save / restore / expiry / logout / unavailable storage; all form validations (booking, guest, contact, lookup,
password, room, settings); reservation submission (strict body, confirmation only on 201, no confirmation on failures, room/date
error handling, field error mapping, double submission sends one request); demo-data handling; settings diff; FR/EN dictionary
parity and language choice; navigation helpers (active link, focus trap order, route matching).

End-to-end scenarios (real backend). The public site never offers demo rooms, so the tests created one test room
("Chambre test E2E") in the **local test database only**:
no demo wording or demo price anywhere on the public pages (the backend does return demo rooms; they are filtered) ·
demo room address → "not offered online" · stay with no genuine room → "Réservation sur demande" → prefilled contact form →
`201` · sign-in form at `/admin`, `/admin/login` alias, protected pages → `/admin?next=…` · logout → `/admin` with
"Vous êtes déconnecté." ·
French default and FR/EN switch remembered after reload · settings requested once per visit · demo rooms flagged · room detail and
unknown room · client validation blocks past/inverted dates without calling the API · availability prices equal to the backend
answer · guest form validation · **double click → exactly one `POST /bookings`, confirmation shows the backend reference and
"pending"** · simulated 500 → no confirmation, form kept · simulated `ROOM_UNAVAILABLE` → availability refreshed · network outage
message · booking lookup (wrong e-mail rejected, right e-mail found) · contact form → `201` · gallery lightbox (arrows, Escape,
focus returned) and filter · spa rituals expand · 404 page · mobile menu (covers the screen, focus trapped, Escape, closes on
navigation) · no horizontal scroll at 390 px on 7 pages · admin redirect when signed out · invalid credentials · sign-in stores the
JWT in sessionStorage and returns to the requested page · confirm then cancel (with reason) the booking made on the public site ·
room create (validation, `javascript:` URL refused) / edit / delete · `ROOM_HAS_BOOKINGS` message · service and gallery create /
delete · contact message opened → marked read · settings: nothing-changed message, then `PUT` with only the changed field ·
tampered token → signed out with "session expired" · wrong current password keeps the session · sign-out clears the token.

Visual review: full-page screenshots at 1440 × 900 and 390 × 844 of every public page, the booking steps, the lightbox, the
mobile menu and the admin screens were inspected, and the problems found were fixed (mobile menu clipped by the header, frame
lines, alignment, booking form overflow on mobile, fallback sizing).

## Not verified

- **`npm install` / `npm ci` and `vite build` / `vite dev`.** Rollup's native Linux binary (used by Vite) could not be downloaded
  here, so the production bundle used for all browser tests was produced with **esbuild** from the same sources
  (`import.meta.env.VITE_API_BASE_URL` defined the same way). The code uses nothing Vite-specific besides `import.meta.env` and
  absolute `/public` URLs. Please run `npm run verify` once on your machine.
- **The official photos.** The sandbox cannot reach `www.menarahammamet.com`, so their loading, subjects and crops were not seen.
  For the visual review, two neutral stand-in photos (not hotel pictures, not shipped) replaced them in the test browser only; the
  real no-photo fallback was also checked. Hotlinking may be refused by the hotel's server: `npm run photos:download` avoids it.
  The three hero photos are the first three of the official gallery; adjust `HERO` in `src/pages/Home.tsx` if another picture suits
  better.
- **MongoDB Atlas itself**, SMTP e-mails and the AI assistant (disabled in the backend by default).
- **Production-mode rate limits** (`NODE_ENV=production`: 10 logins and 30 public writes per 15 min) – the `RATE_LIMITED` message
  exists but was only unit-tested.
- **Safari / Firefox and real phones** – only Chromium (desktop and mobile emulation) was used. A manual screen-reader pass was not done.
