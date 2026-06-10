# VotRite — Keyboard‑First Accessibility: Delivery Note

This package converts the VotRiteMobil voter flow from mouse‑dependent controls
to **keyboard‑first, screen‑reader‑compatible** navigation, per the
accessibility implementation plan. Mouse/touch use is unchanged — everything is
additive, and no critical action requires a mouse (WCAG 2.1.1).

See also: **CHANGES.md** (exact files touched), **TEST_REPORT.md** (verification
+ screenshots), **KEYBOARD_NAVIGATION.md** (key map + QA checklist),
**RUN_LOCALLY.md** (run it locally with the bundled mock API).

---

## 1. What was delivered

- **Keyboard operation of the whole ballot** — Option 1 home‑row keys
  (F select, J next, D back, K deselect, S read selection, L read instructions)
  **plus** Option 2 standard keys (Tab, arrows, Enter, Space, Esc). Option 3
  (number‑key voting) was intentionally **not** included (reserved for the
  iOS/Android phase).
- **Root fix:** the theme hid every checkbox/radio with `visibility:hidden`,
  which removed them from the keyboard tab order — keyboard/AT users could not
  select anything. They are now focusable with a visible focus indicator.
- **ARIA & semantics** across all voter screens: group/radiogroup roles,
  accessible names, programmatic headings, labeled spinner and write‑in controls.
- **Review page:** the “edit contest” links were non‑focusable `<h4 onclick>`
  elements — now real, keyboard‑activatable buttons.
- **Focus management:** focus moves to the contest heading on each step; visible,
  high‑contrast focus rings; logical tab order.
- **Contrast:** brand purple darkened to `#6c5ade` where white text sits on it
  (was 4.22:1, now ~5.05:1 — WCAG 1.4.3 AA).
- **Two functional bugs fixed in passing:**
  1. The `AGAINST` option on Propositions/Mass had a malformed `name` attribute,
     so an “against” vote did not post correctly.
  2. The ranked‑choice +/- spinner was mouse‑only (`hold:true` bound `mousedown`,
     not `click`) — now `hold:false`, so keyboard Enter/Space operate it.
- **Rollback flag:** `KEYBOARD_NAV_ENABLED` (in `config/app.php` via `.env`).
- **Bundled tooling:** a local **mock API** (`mock-api/`) and an **axe test
  harness** (`accessibility-harness/`) so the app can be run and re‑checked
  without the live backend or a database.

## 2. Deploy / setup

Requires **PHP 7.2–7.4** (Laravel 6; 7.4 recommended) and Composer.

```bash
composer install
cp .env.example .env          # then fill in real values
php artisan key:generate
php artisan config:clear && php artisan view:clear
```

Set these in `.env` to your real values:

| Key | Set to |
| --- | --- |
| `API` | the real VotRite backend API base URL |
| `APP_URL` / `ASSET_URL` | your real site URL (assets load from `ASSET_URL`) |
| `KEYBOARD_NAV_ENABLED` | `true` (set `false` to roll back instantly) |
| `DB_*` | only if other features need it — the voter flow uses the API, not the DB |

> ⚠️ **`ASSET_URL` matters:** `asset()` loads all CSS/JS from it. If it points at
> the wrong host, the accessibility CSS/JS won’t load. It must match where this
> build is actually served.

> ⚠️ **Front controller:** this build includes `public/index.php` (standard
> Laravel). The original deploy routed through `public/index1.php` via the web
> server config — keep whichever your server expects; don’t double‑configure.

## 3. How to verify

- Follow the QA checklist in **KEYBOARD_NAVIGATION.md** (keyboard‑only walkthrough
  + screen readers).
- Automated check: `cd accessibility-harness && npm install && npm run test:a11y`
  (axe‑core, WCAG A/AA — currently **0 violations**; see TEST_REPORT.md).

## 4. Still outstanding (needs the client / real devices)

- **Manual screen‑reader passes** with NVDA, JAWS, VoiceOver, TalkBack, and
  **cross‑browser** (Chrome/Edge/Firefox/Safari) + **mobile** — automated tools
  cover ~30–40% of WCAG; the human AT passes are the final validation and were
  not performed here.
- Validation against the **real backend** — all testing used the bundled mock
  (the live API was unreachable from the dev environment).

## 5. Security note (not part of the app)

The EC2 backup also contained `111_html/` and `1111_html1/` (default Apache/nginx
pages, plus `adminer.php` and `phpinfo()`). These are **not** part of this app and
are **excluded** from this package. If `adminer.php` or `info.php` exist in the
live server’s web root, they should be removed — they expose the database/server
configuration.
