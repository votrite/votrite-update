# Accessibility test harness

Standalone pages that load the **real** `votrite-a11y.css` / `votrite-a11y.js`
(plus the production theme CSS) over faithful, static copies of the voter
screens — so the keyboard + screen‑reader behaviour can be tested **without**
running PHP / the database / the external API.

## Manual testing (keyboard + screen reader)

Open the pages in a browser. Either double‑click them (they use relative paths
to `../public/assets/...`) or serve the app root with any static server, e.g.:

```
npx serve ..        # then visit /accessibility-harness/candidate-selection.html
```

Pages:

- `candidate-selection.html` — multi‑select candidates, write‑in, footer nav.
- `propositions.html` — YES/NO single‑answer toggle + exclusivity.
- `review.html` — the converted "edit contest" link‑buttons + Cast / Go Back.

Walk each page using only the keyboard: **Tab / Shift+Tab**, **↑/↓** between
choices, **F** select, **K** deselect, **S** read selection, **L** read
instructions, **J / →** next, **D / ← / Esc** back, **Space/Enter** activate.
Then repeat with NVDA (Firefox/Chrome), JAWS (Chrome/Edge), and VoiceOver
(Safari); on mobile use VoiceOver/iOS and TalkBack/Android.

## Automated checks (axe-core, CI‑ready)

```
npm install
npm run test:a11y      # set CHROME_PATH to a chrome.exe / msedge.exe if needed
```

Runs axe‑core (WCAG 2.0/2.1 A & AA tags) against all three pages and exits
non‑zero on any serious/critical violation, so it can gate CI (plan §7.3).

> `node_modules/` here is dev‑only tooling for the check; it is not part of the
> Laravel app and is not deployed.

## Latest result (recorded)

**Clean — 0 WCAG 2.1 A/AA violations** across all three pages, at both mobile
(800px) and desktop (1366px) viewports.

The one earlier finding (white text on the brand purple `#7864f7` at 4.22:1,
just under the 4.5:1 AA threshold — header subtitle, footer pager, footer
buttons, Write‑In button) has been fixed: the voter header/footer surfaces and
the Write‑In button are darkened to `#6c5ade` (~5.05:1 with white) in
`votrite-a11y.css`. It is visually the same brand purple and, being in the
flag‑gated a11y layer, ships and rolls back with the rest of the keyboard work.
