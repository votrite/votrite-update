# Keyboard‑First Navigation Update — VotRiteMobil.com

This release makes the entire voter ballot flow fully operable **without a
mouse**, so blind, low‑vision, DeafBlind, and motor‑impaired voters can vote
independently with a keyboard, switch device, braille display, screen reader,
or voice control. Mouse and touch use is unchanged — nothing was removed.

> **Procurement language:** VotRiteMobil has been updated to align with federal
> accessibility expectations by ensuring all ballot‑marking functions are fully
> operable via keyboard and compatible with screen readers and assistive
> devices. Mouse use is still supported but is no longer required for any voter
> interaction.

---

## Key mapping shipped

We ship **Option 1 (home‑row keys)** and **Option 2 (standard navigation)**
together as the default for visually‑impaired voting. Option 3 (number‑key
voting) is intentionally **not** in this web release — it is reserved for the
iOS / Android disability rollout so the experience matches across platforms.

| Key | Action |
| --- | --- |
| **F** | Confirm / select the current choice |
| **J** | Next page |
| **D** | Back one page |
| **K** | Deselect (remove) the current choice |
| **S** | Read the current selection aloud |
| **L** | Read the instructions / help aloud |
| **Space / Enter** | Activate the focused button or toggle the focused choice |
| **Tab / Shift+Tab** | Move focus forward / backward |
| **↑ / ↓** | Move between choices in a group |
| **← / →** | Back page / Next page |
| **Esc** | Go back / close |
| **Home / End** | Jump to first / last choice |

`F` and `J` carry the raised bump found on every keyboard, giving fully blind
voters a no‑look anchor for the whole ballot.

> Per the accessibility requirements: **S repeats the current selection**, and the
> **L key** reads instructions/help aloud — the H key is **not** used for help;
> help is delivered by voice through L.

---

## What changed

**New shared assets (loaded on every voter screen):**

- `public/assets/css/votrite-a11y.css` — restores keyboard focusability to the
  custom checkboxes/radios (the base theme hid them with `visibility:hidden`,
  which dropped them out of the Tab order), high‑contrast visible focus rings,
  ~44px touch targets, a skip link, and a link‑styled button for the Review page.
- `public/assets/js/votrite-a11y.js` — the keyboard engine: home‑row + standard
  keys, roving arrow navigation, focus‑on‑load to the screen heading, an
  `aria-live` region for state announcements, and SpeechSynthesis for the S / L
  keys. Keyboard actions drive controls via their native `click()`, so the
  existing vote logic runs identically to a mouse click.

**Per‑screen semantics (ARIA, labels, focus):** Welcome, Ballot select,
Pincode login, Language, Candidate/Race, Propositions, Mass Propositions,
Review, and Confirmation. Highlights:

- Candidate / proposition groups now expose `role="group"` / `radiogroup` with
  accessible names tied to the contest title.
- Review‑page "edit this contest" links were non‑focusable `<h4 onclick>`
  elements; they are now real, keyboard‑activatable buttons.
- Spinner (+/−) vote buttons and the count fields received accessible names.
- The pincode field now has a real label and receives initial focus.

**Bug fixed along the way:** the `AGAINST` option on Propositions and Mass
Propositions had a malformed `name` attribute (`{$prop->proposition_id}}`), so
an "against" vote did not post correctly. Corrected on both screens.

---

## Feature flag / rollback

The whole layer is behind a flag so it can be enabled per environment and
rolled back instantly without a deploy:

```
# .env
KEYBOARD_NAV_ENABLED=true   # default; set to false to roll back
```

Defined in `config/app.php` as `app.keyboard_nav`. After changing the value on
a server with cached config, run `php artisan config:clear` (or
`config:cache`). Run `php artisan view:clear` after deploy so the Blade changes
recompile.

---

## QA checklist (keyboard‑only + screen reader)

- [ ] Complete the full ballot using only the keyboard: Tab, Shift+Tab, arrows,
      Enter, Space, Esc, and the F/J/D/K/S/L home‑row keys.
- [ ] Confirm focus is always visible and lands on the screen heading after each
      step transition.
- [ ] Confirm no keyboard trap anywhere in the flow (Tab/Shift+Tab cycle freely).
- [ ] Select / deselect candidates and YES/NO/FOR/AGAINST answers by keyboard;
      verify the count and review summary match.
- [ ] On Review, edit a contest with Enter/F and confirm you return correctly.
- [ ] Cast a vote by keyboard end‑to‑end.
- [ ] Confirm mouse/touch still works exactly as before (regression).
- [ ] Screen readers: NVDA + Firefox/Chrome, JAWS + Chrome/Edge, VoiceOver +
      Safari (desktop); VoiceOver/iOS and TalkBack/Android (mobile). Verify each
      control announces name, role, and state, and that selection changes are
      announced.
- [ ] Run axe / Lighthouse and clear obvious WCAG violations.

## Automated checks + test harness

Because the app needs PHP, a database, and an external API to run, a standalone
harness in [`accessibility-harness/`](accessibility-harness/) loads the **real**
`votrite-a11y.css` / `votrite-a11y.js` (and the production theme) over static
copies of the voter screens, so it can be tested and CI‑checked without the
backend. Run `npm install && npm run test:a11y` there (axe‑core, WCAG A/AA;
exits non‑zero on serious violations).

**Recorded axe result: clean — 0 WCAG 2.1 A/AA violations** across all three
screens at both mobile (800px) and desktop (1366px) viewports. An earlier
color‑contrast finding (white text on the brand purple `#7864f7` at 4.22:1, just
below the 4.5:1 AA threshold) was fixed by darkening the voter header/footer and
Write‑In button to `#6c5ade` (~5.05:1) in `votrite-a11y.css` — visually the same
brand purple, and gated/rolled back with the rest of the layer.

> Note: axe (and any automated tool) covers only part of WCAG. The manual
> keyboard + screen‑reader passes in the checklist above are still required.

## Known notes

- The Welcome and Confirmation screens auto‑advance on a timer (3s / 5s) — a
  future enhancement could let screen‑reader users control the pace.
- When a desktop screen reader is in *browse* mode, its own single‑letter quick
  keys take precedence; the home‑row keys operate in forms/focus mode or without
  a screen reader. Standard navigation (Option 2) works in all modes.
