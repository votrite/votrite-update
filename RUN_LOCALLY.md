# Run VotRite locally (real app, no live backend, no database)

This runs the **real Laravel voter app** end‑to‑end on your machine using a
small local **mock API** (in [`mock-api/`](mock-api/)) that stands in for the
remote backend. No database is needed — the app uses file sessions and gets all
ballot data from the API.

## Prerequisites

- **PHP 7.2–7.4** (this is Laravel 6; **7.4 recommended**. PHP 8.0 mostly works;
  8.1+ will likely error). Enable extensions: `openssl`, `mbstring`, `pdo`,
  `tokenizer`, `ctype`, `json`, `curl`, `fileinfo`.
- **Composer**.
- **Node.js** (any recent version) — only to run the mock API.

Check: `php -v` and `composer -V`.

## One‑time setup

```bash
cd 11111_votrite-web-backend1
composer install
```

**Create `public/index.php`.** The repo ships the front controller as
`public/index1.php` (renamed for the production deploy); `php artisan serve`
needs `public/index.php`:

```bash
cp public/index1.php public/index.php
```

**Edit `.env`** — point the app at the local mock *and* at localhost for asset
URLs. This last part is critical: `API`, `APP_URL`, and `ASSET_URL` all point at
production in the repo, and `ASSET_URL` makes `asset()` load every CSS/JS file
(including the accessibility layer) from `https://votritemobil.com` instead of
your local build — so your changes won't appear until you change it:

```ini
API=http://127.0.0.1:9191/api      # was http://52.5.44.163:9191/api (dead from here)
APP_URL=http://127.0.0.1:8000      # was https://votritemobil.com/
ASSET_URL=http://127.0.0.1:8000    # was https://votritemobil.com  <-- without this, local CSS/JS is ignored
SESSION_DRIVER=file                # already set
# DB_* can stay empty — the voter flow does not use the database
```

`APP_KEY` is already set. If it ever complains, run `php artisan key:generate`.
After editing `.env`, clear caches: `php artisan config:clear && php artisan view:clear`.

> **Restart `php artisan serve` after any `.env` change.** `artisan serve` bakes
> the environment in at startup and won't pick up edits until restarted.

## Run (two terminals)

**Terminal 1 — mock API:**
```bash
node mock-api/server.mjs
# -> VotRite mock API listening on http://127.0.0.1:9191/api
```

**Terminal 2 — the app:**
```bash
php artisan serve
# -> http://127.0.0.1:8000
```

## Walk the ballot

Open **http://127.0.0.1:8000/** :

1. Welcome screen → auto‑advances to **Choose Active Ballot**.
2. Select **General Election 2026** → **Next**.
3. Pincode login → enter **any** value (e.g. `1234`) → **Login** (the mock
   accepts any pin).
4. **Candidate selection** (Mayor) → then City Council, Judicial Seats
   (this one is the +/− count style), then **Proposition 1**, **Mass
   Proposition A**, **Review**, and **Cast my vote** → confirmation.

The write‑in box works too (it posts cross‑origin to the mock, which is why the
mock sends CORS headers).

## Testing the keyboard accessibility

Everything in [KEYBOARD_NAVIGATION.md](KEYBOARD_NAVIGATION.md) is live here:
**Tab/Shift+Tab**, **↑/↓** between choices, **F** select, **K** deselect,
**S** read selection, **L** read instructions, **J/→** next, **D/←/Esc** back,
**Space/Enter** activate. Turn on NVDA/VoiceOver to hear roles, names, and state
changes. To test with the feature **off** (rollback), set
`KEYBOARD_NAV_ENABLED=false` in `.env`, `php artisan config:clear`, reload.

## Notes

- Mock data is in‑memory and resets when you restart `server.mjs`. Edit the
  sample ballots/races/candidates at the top of that file to taste.
- To go back to the **real** backend later, restore the original
  `API=http://…` URL (and ensure that host/port is reachable from your network)
  and `php artisan config:clear`.
- The mock implements exactly the endpoints the app calls: `POST /ballot/active`,
  `GET /pincode`, `GET /ballot`, `GET /ballot/language`, `GET /race`,
  `GET /proposition`, `GET /candidate`, `POST /candidate/create`,
  `POST /counter/candidate/create`, `POST /counter/proposition/create`,
  `POST /pincode/update`.
```
