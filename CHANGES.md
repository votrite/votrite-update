# Changed files manifest

All paths are relative to the app root (`votrite-web-backend/`). The project was
not under version control in the working environment, so this is a precise
file‑by‑file manifest rather than a `git diff`. If you have the original repo,
drop these files in and run `git diff` to get a line‑level patch — or send me the
baseline and I’ll produce a unified `.diff`.

## New files (drop‑in)

| File | Purpose |
| --- | --- |
| `public/assets/css/votrite-a11y.css` | Focusable checkboxes/radios, visible focus rings, 44px touch targets, skip link, link‑button style, **contrast fix** (`#6c5ade`) |
| `public/assets/js/votrite-a11y.js` | Keyboard engine: home‑row (F/J/D/K/S/L) + standard keys, roving arrows, focus‑on‑load, `aria-live` announcements, SpeechSynthesis for S/L |
| `public/index.php` | Standard Laravel front controller (repo only had `index1.php`; needed for `artisan serve`) |
| `.env.example` | Sanitized env template (no secrets) |
| `KEYBOARD_NAVIGATION.md` | Key map, procurement language, QA checklist |
| `RUN_LOCALLY.md` | Run the app locally with the mock API |
| `DELIVERY.md` | This delivery’s handoff note |
| `TEST_REPORT.md` | Verification results + screenshots |
| `delivery-docs/*.png` | Verification screenshots |
| `mock-api/server.mjs` | Local mock of the backend API (run/test without the live backend) |
| `accessibility-harness/` | Standalone test pages + axe‑core CI check (`candidate-selection.html`, `propositions.html`, `review.html`, `axe-test.mjs`, `serve.mjs`, `package.json`, `README.md`) |

## Modified files

| File | Change |
| --- | --- |
| `config/app.php` | Added `keyboard_nav` flag → `env('KEYBOARD_NAV_ENABLED', true)` |
| `resources/views/client/layout/client.blade.php` | Load `votrite-a11y.css` / `.js` (gated by the flag) |
| `resources/views/client/race.blade.php` | `data-a11y` on action buttons; `role=group`/`aria-labelledby`; programmatic heading; spinner aria‑labels + `aria-live`; **spinner `hold:false`** (keyboard fix); write‑in spinner init + unique ids; write‑in label (sr‑only); keyboard‑aware instructions |
| `resources/views/client/prop.blade.php` | `role=group` + label per proposition; programmatic heading; instructions marker; `data-a11y` buttons; **fixed malformed `AGAINST` `name`** |
| `resources/views/client/mass.blade.php` | Same treatment as `prop.blade.php` (incl. the `AGAINST` `name` fix) |
| `resources/views/client/review.blade.php` | `<h4 onclick>` “edit contest” → real `<button>`; programmatic heading; instructions marker; `data-a11y` on Go Back / Cast |
| `resources/views/client/ballot.blade.php` | `role=radiogroup` + label; programmatic heading; `data-a11y="next"` |
| `resources/views/client/lang.blade.php` | `role=radiogroup` + label; programmatic heading; `data-a11y="next"` |
| `resources/views/client/index.blade.php` | Real `<label>` + `aria-label` + autofocus on pincode; `aria-hidden` icon; loads a11y CSS |
| `resources/views/client/welcome.blade.php` | Programmatic heading (`data-a11y-heading`) |
| `resources/views/client/cast.blade.php` | Programmatic heading + `role=status` on confirmation |

## Not in this package (regenerate / configure)

- `vendor/`, `accessibility-harness/node_modules/` → `composer install` / `npm install`
- `.env` (secrets) → copy from `.env.example`
- `bootstrap/cache/*.php`, `storage` runtime, harness screenshots/lockfile → regenerated
