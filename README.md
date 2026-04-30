# WrestleIQ

WrestleIQ is a full-stack **video breakdown and film study** web app for **real wrestling** athletes and coaches (folkstyle/freestyle/Greco—not sports entertainment). Each user has a **username-only** account (no email stored); match film, tags, notes, and stats are **private to that user**.

## Stack

- **Frontend:** React (Vite), React Router, CSS
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Auth:** bcrypt password hashes, JWT in **httpOnly** cookies, `helmet`, rate-limited `/api/auth/*`

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ recommended
- [PostgreSQL](https://www.postgresql.org/) 14+

## Quick start

### 1. Create the database

```bash
createdb wrestleiq
```

### 2. Environment and schema

From the project root:

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and set at minimum:

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | **Long random string** (32+ characters) used to sign session JWTs. Never commit the real value. |
| `CLIENT_ORIGIN` | Exact browser origin for CORS + cookies (default `http://localhost:5173`) |
| `NODE_ENV` | `development` locally; in production, cookies use `Secure` |
| `PORT` | API port (default `3001`) |
| `CLOUDINARY_CLOUD_NAME` | (Optional for URL-only use) **Required** to upload video files; from [Cloudinary](https://cloudinary.com) dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary API key (server only — never put in the React app) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret (server only) |

**New database** (no prior WrestleIQ tables):

```bash
psql "$DATABASE_URL" -f schema.sql
```

**Already using WrestleIQ before `cloudinary_public_id` was added?** Run:

```bash
psql "$DATABASE_URL" -f migration-cloudinary.sql
```

**Upgrading an older WrestleIQ DB** (you already had `matches` / `tags` without users):

```bash
psql "$DATABASE_URL" -f migration-auth.sql
```

Then create a user via **Sign up** in the app, and assign any legacy rows:

```sql
UPDATE matches SET user_id = (SELECT id FROM users WHERE username = 'yourname') WHERE user_id IS NULL;
ALTER TABLE matches ALTER COLUMN user_id SET NOT NULL;
```

(Only run `ALTER ... SET NOT NULL` after no row has `user_id` NULL.)

### 3. Optional demo match (per user)

After at least one user exists, you can attach the sample YouTube film to **the first user** (by id):

```bash
psql "$DATABASE_URL" -f seed-demo.sql
```

**View Demo Match** on the home page only appears when logged in; it opens the demo row **on your account** (matched by YouTube id in `client/src/constants.js`).

### 4. Install dependencies

From the repository root:

```bash
npm run install:all
```

### 5. Run the app

**Terminal 1 — API**

```bash
cd server
npm run dev
```

**Terminal 2 — React**

```bash
cd client
npm run dev
```

Or from root: `npm run dev`

Open `http://localhost:5173`. The Vite dev server proxies `/api` and `/uploads` to Express on port **3001** so the SPA and API share one origin for cookies.

## Authentication (summary)

- **No emails** are collected or stored.
- **Passwords** are stored only as **bcrypt** hashes.
- **JWT** is issued on login/signup and sent in an **httpOnly** cookie (`wrestleiq_auth`), not `localStorage`.
- Cookie flags: `httpOnly: true` always. **Development:** `sameSite: 'lax'`, `secure: false` (so `http://localhost` works with the Vite dev server). **Production:** `sameSite: 'none'`, `secure: true` so a browser SPA on a different site (e.g. Netlify) can still send the session cookie to the API on another origin (e.g. Render/Railway) over HTTPS.
- **User id** for data access comes **only** from the verified JWT (`req.user.id`), never from the client body.
- Match, tag, stats, and upload routes require auth and **ownership** checks on every query.
- **Password reset** is not implemented (no email channel).

### Auth API

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/api/auth/signup` | Username + password; sets cookie; rate limited |
| POST | `/api/auth/login` | Sets cookie; **generic** error if invalid |
| POST | `/api/auth/logout` | Clears cookie |
| GET | `/api/auth/me` | Current user `{ id, username, created_at }` or 401 |

All other `/api/matches*` and `/api/tags*` routes require a valid session.

## Production video uploads with Cloudinary

Storing large match videos on the API server’s disk (`server/uploads`) does **not** scale in production: disk fills up, load-balanced instances do not share files, and backups/HTTPS delivery are your problem. **Cloudinary** hosts the binary video; WrestleIQ only stores the returned **`secure_url`** in `matches.video_url` and the asset **`public_id`** in `matches.cloudinary_public_id` (used when deleting a match so the host copy is removed too).

### Why Cloudinary

- Uploads are **server-controlled** (authenticated users only, multer → your backend → Cloudinary). The **API secret never leaves the server** and is not exposed to the browser.
- The React app only sees normal **HTTPS video URLs** for playback; same as YouTube-style flows.

### Getting credentials

1. Create a free account at [https://cloudinary.com](https://cloudinary.com).
2. Open the **Dashboard** — copy:
   - **Cloud name** → `CLOUDINARY_CLOUD_NAME`
   - **API key** → `CLOUDINARY_API_KEY`
   - **API secret** → `CLOUDINARY_API_SECRET`
3. Add them to `server/.env` (never commit `.env`). Restart the API after changes.

**YouTube-only or paste-URL matches** do not need Cloudinary. **File upload** returns `503` with a clear message if Cloudinary env vars are missing.

### What gets stored

- `matches.video_url` — `secure_url` from Cloudinary, or a pasted `http(s)` YouTube / direct link.
- `matches.cloudinary_public_id` — set only for Cloudinary uploads, so DELETE can call Cloudinary’s destroy API; **this column is not returned in JSON API responses** to keep responses minimal (the server still uses it for deletion).

### Limits (backend)

- **MP4, MOV, WebM**; MIME type must be `video/*`; max **500MB** per file.

## API overview (protected)

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/matches` | List **your** matches + tag counts |
| GET | `/api/matches/:id` | One match if **you** own it |
| POST | `/api/matches` | Create match: **file** → Cloudinary video + `video_url` = `secure_url`; **URL** → YouTube or direct link (`user_id` from JWT) |
| DELETE | `/api/matches/:id` | Delete if **you** own it |
| GET/POST | `/api/matches/:id/tags` | Tags if match **yours** |
| DELETE | `/api/tags/:tagId` | Delete if tag’s match **yours** |
| GET | `/api/matches/:id/stats` | Stats if match **yours** |

## How tagging works

1. On the breakdown page, timestamps come from the HTML5 video or YouTube IFrame API.
2. **Add tag** saves the current time and category to PostgreSQL.
3. **Jump to time** seeks the player to that stored second value.

## Production notes

- Set `NODE_ENV=production`, a long `JWT_SECRET`, and **required** `DATABASE_URL`, `JWT_SECRET`, and `CLIENT_ORIGIN` (the server exits on startup in production if these are missing). Set `CLOUDINARY_*` if you use file upload.
- **CORS** allows only the single origin in `CLIENT_ORIGIN` and uses `credentials: true` (no wildcard). Set `CLIENT_ORIGIN` to your deployed front-end URL, e.g. `https://wrestleiq.netlify.app`.
- **Auth cookies in production** use `SameSite=None` and `Secure` so the JWT cookie is sent on cross-origin XHR/fetch from your SPA to the API. Both sites must use **HTTPS**.
- The API does **not** return `cloudinary_public_id` in normal JSON; it is stored for internal delete only.

### Deploying the React app (e.g. Netlify)

1. Build: `cd client && npm run build` — output in `client/dist`.
2. Netlify: publish directory `client/dist` (or monorepo base `client` with build command `npm run build` from that folder).
3. Set a **redirect** for SPA routing: `/*` → `/index.html` (200). See [Netlify redirects](https://docs.netlify.com/routing/redirects/).
4. **Environment (Vite):** in production the client must know the API URL if it is not same-origin. This project uses relative `/api` in dev (Vite proxy). For Netlify → Render/Railway, either:
   - Put the API behind the same domain with a reverse proxy, or
   - Add a Vite `VITE_API_BASE_URL` (or similar) in a follow-up and point fetches to that origin, **and** set `CLIENT_ORIGIN` on the server to your Netlify URL.
5. Keep `CLIENT_ORIGIN` on the server **exactly** equal to the browser origin of the deployed SPA (scheme + host + port).

### Deploying the API (e.g. Render or Railway)

1. **Start command:** e.g. `node server/src/index.js` or `npm run start` from `server/` (match your `package.json`).
2. **Root directory:** `server` if the platform uses a monorepo subfolder.
3. Set all server env vars in the host dashboard: `DATABASE_URL`, `JWT_SECRET`, `PORT` (or use the host’s default), `NODE_ENV=production`, `CLIENT_ORIGIN`, and `CLOUDINARY_*` if using uploads.
4. Use a managed PostgreSQL instance and run migrations (see above) against `DATABASE_URL` from your machine or the host’s shell.
5. **Local `server/uploads`:** only used for legacy or dev **local** file paths under `/uploads/...`. New file uploads go to **Cloudinary**; do not rely on the container disk for user videos in production.

### Database migrations (reminder)

| Situation | Command |
| -------- | ------- |
| New database | `psql "$DATABASE_URL" -f server/schema.sql` (path from repo root) |
| Add `cloudinary_public_id` | `psql "$DATABASE_URL" -f server/migration-cloudinary.sql` |
| Older DB without auth | `psql "$DATABASE_URL" -f server/migration-auth.sql` |

## Manual test checklist

1. **User A** — Log in, **upload a video file** (Cloudinary env set), confirm the match on the **dashboard** and that the **breakdown** page plays the film. Add tags/notes; confirm **stats** update.
2. **User A** — Add a match with a **YouTube** URL only; confirm the **YouTube** player and tagging still work.
3. **Logout** — sign in as **User B**; confirm **no** matches from A (and `/matches/<A’s id>` returns **not found**).
4. **User A** — Delete a Cloudinary-backed match; confirm the video disappears from the **Cloudinary** Media Library and the app.
5. Inspect API JSON: **`password_hash`** never returned; match payloads do not expose **`cloudinary_public_id`**.

## License

MIT (adjust as needed for your team).
