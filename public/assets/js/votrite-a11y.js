/* =====================================================================
   VotRite – Keyboard-first navigation engine
   ---------------------------------------------------------------------
   Ships Option 1 (home-row keys for blind voters) + Option 2 (standard
   keyboard navigation for low-vision / screen-reader voters) together,
   as the default for visually-impaired voting.

       Home row (Option 1)            Standard (Option 2)
       -------------------            -------------------
       F  Confirm / select choice     Tab / Shift+Tab  move focus
       J  Next page                   Arrow Up / Down   move between choices
       D  Back one page                Arrow Left        Back page
       K  Deselect current choice      Arrow Right       Next page
       S  Read current selection       Enter             Confirm / activate
       L  Read instructions / help     Space             Select / toggle
       Space  Activate focused         Esc               Go back / close

   Per the accessibility requirements:
     * S repeats / reads the current selection aloud.
     * L reads the instructions and help aloud. The H key is NOT used —
       help is delivered by voice through the L key instead.

   Number-key voting (Option 3) is intentionally NOT shipped here; it is
   reserved for the iOS / Android disability rollout so the experience
   stays consistent across platforms.

   Mouse and touch interaction is untouched — everything below is purely
   additive. No critical action requires a mouse (WCAG 2.1.1).
   ===================================================================== */
(function () {
    'use strict';

    var hasSpeech = ('speechSynthesis' in window) && typeof window.SpeechSynthesisUtterance === 'function';

    var KEY_GUIDE =
        'Keyboard keys. F to select the current choice. K to remove it. ' +
        'J or right arrow to go to the next page. D or left arrow to go back. ' +
        'Up and down arrows move between choices. ' +
        'S reads your current selection. L reads these instructions. ' +
        'Space or Enter activates the highlighted button. Escape goes back.';

    /* ----------------------------------------------------------------- */
    /* Helpers                                                           */
    /* ----------------------------------------------------------------- */

    function $all(sel, ctx) {
        return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
    }
    function $one(sel, ctx) {
        return (ctx || document).querySelector(sel);
    }

    // Is the user typing in a text-entry field? If so, single-letter
    // shortcuts (F/J/D/K/S/L) must NOT fire.
    function isTyping(el) {
        if (!el) return false;
        var tag = (el.tagName || '').toUpperCase();
        if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if (el.isContentEditable) return true;
        if (tag === 'INPUT') {
            var type = (el.getAttribute('type') || 'text').toLowerCase();
            return ['text', 'password', 'search', 'email', 'number', 'tel', 'url'].indexOf(type) !== -1;
        }
        return false;
    }

    function isVisible(el) {
        return !!el && !el.disabled && el.offsetParent !== null &&
               getComputedStyle(el).visibility !== 'hidden';
    }

    /* ----------------------------------------------------------------- */
    /* Live region + speech                                              */
    /* ----------------------------------------------------------------- */

    var liveRegion;

    function ensureLiveRegion() {
        if (liveRegion) return liveRegion;
        liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'assertive');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'a11y-live';
        document.body.appendChild(liveRegion);
        return liveRegion;
    }

    // Announce to assistive tech via the live region.
    function announce(msg) {
        var region = ensureLiveRegion();
        region.textContent = '';
        window.setTimeout(function () { region.textContent = msg; }, 30);
    }

    // Speak out loud (used by the S and L home-row keys). Works even when
    // no screen reader is running. Falls back to the live region.
    function speak(text) {
        if (!text) return;
        if (!hasSpeech) {
            announce(text);
            return;
        }
        try {
            window.speechSynthesis.cancel();
            var u = new window.SpeechSynthesisUtterance(text);
            u.rate = 1;
            u.lang = document.documentElement.getAttribute('lang') || 'en';
            window.speechSynthesis.speak(u);
        } catch (e) {
            announce(text);
        }
    }

    function stopSpeech() {
        if (hasSpeech) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    }

    /* ----------------------------------------------------------------- */
    /* Action buttons – resolved by explicit data-a11y, then by class    */
    /* ----------------------------------------------------------------- */

    function actionButton(action, fallbackSelectors) {
        var el = $one('[data-a11y="' + action + '"]');
        if (el) return el;
        for (var i = 0; i < (fallbackSelectors || []).length; i++) {
            el = $one(fallbackSelectors[i]);
            if (el) return el;
        }
        return null;
    }

    function clickAction(action, fallbackSelectors, label) {
        var btn = actionButton(action, fallbackSelectors);
        if (btn && isVisible(btn)) {
            btn.click();
            return true;
        }
        if (btn && !isVisible(btn)) {
            announce((label || 'That option') + ' is not available yet.');
            return false;
        }
        return false;
    }

    /* ----------------------------------------------------------------- */
    /* Selectable options (candidate checkboxes, radios)                 */
    /* ----------------------------------------------------------------- */

    function getOptions() {
        return $all('input.md-check, input.md-radiobtn').filter(isVisible);
    }

    function optionLabel(input) {
        var lbl = input.id ? $one('label[for="' + input.id + '"]') : null;
        if (!lbl) {
            var wrap = input.closest('.md-checkbox, .md-radio');
            lbl = wrap ? wrap.querySelector('label') : null;
        }
        return lbl ? lbl.textContent.replace(/\s+/g, ' ').trim() : (input.value || 'option');
    }

    // Select / deselect a checkbox or radio from the keyboard. We drive
    // the control with its native click(), which produces the exact same
    // event sequence (and runs the exact same existing vote handlers) as a
    // real mouse click — guaranteeing keyboard/mouse parity with no
    // duplicated or skipped state changes.
    //   wantChecked === true   -> ensure selected
    //   wantChecked === false  -> ensure deselected
    //   wantChecked undefined  -> toggle
    function setOption(input, wantChecked) {
        if (!input || input.disabled) return;
        var isChecked = input.checked;
        if (wantChecked === undefined) {
            input.click();
        } else if (wantChecked && !isChecked) {
            input.click();
        } else if (!wantChecked && isChecked) {
            input.click();
        }
        announce(optionLabel(input) + (input.checked ? ', selected.' : ', not selected.'));
    }

    // The option the home-row keys act on: the focused one, else the one
    // containing focus, else the first option on the page.
    function currentOption() {
        var active = document.activeElement;
        if (active && active.classList &&
            (active.classList.contains('md-check') || active.classList.contains('md-radiobtn'))) {
            return active;
        }
        var opts = getOptions();
        return opts.length ? opts[0] : null;
    }

    /* ----------------------------------------------------------------- */
    /* Roving arrow navigation between choices (Up / Down)               */
    /* ----------------------------------------------------------------- */

    function moveOption(dir) {
        var opts = getOptions();
        if (!opts.length) return;
        var idx = opts.indexOf(document.activeElement);
        if (idx === -1) {
            opts[0].focus();
        } else {
            var next = (idx + dir + opts.length) % opts.length;
            opts[next].focus();
        }
        var f = document.activeElement;
        if (f && f.classList) {
            announce(optionLabel(f) + (f.checked ? ', selected' : '') +
                     ', ' + (f.type === 'radio' ? 'radio button' : 'checkbox') + '.');
        }
    }

    /* ----------------------------------------------------------------- */
    /* Read instructions (L) and current selection (S)                   */
    /* ----------------------------------------------------------------- */

    function readInstructions() {
        var blocks = $all('[data-a11y-instructions]');
        var text = blocks.map(function (b) { return b.textContent.replace(/\s+/g, ' ').trim(); }).join('. ');
        if (!text) {
            var body = $one('.guide-desc-body');
            text = body ? body.textContent.replace(/\s+/g, ' ').trim() : '';
        }
        speak((text ? text + '. ' : '') + KEY_GUIDE);
    }

    function readSelection() {
        var picked = [];

        getOptions().forEach(function (i) {
            if (i.checked) picked.push(optionLabel(i));
        });
        // Ranked-choice / count style races use number spinners.
        $all('.spinner-input').forEach(function (i) {
            var v = parseInt(i.value, 10);
            if (v && v !== 0) {
                var row = i.closest('.form-group');
                var nameEl = row ? row.querySelector('.control-label') : null;
                var name = nameEl ? nameEl.textContent.trim() : '';
                picked.push((name ? name + ': ' : '') + v);
            }
        });

        if (!picked.length) {
            speak('You have not made a selection on this screen yet.');
        } else {
            speak('Your current selection: ' + picked.join(', ') + '.');
        }
    }

    /* ----------------------------------------------------------------- */
    /* Global key handling                                               */
    /* ----------------------------------------------------------------- */

    function onKeyDown(e) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;   // leave Ctrl++ zoom etc. alone

        var typing = isTyping(e.target);
        var key = e.key;

        // --- Standard navigation (Option 2) ---
        switch (key) {
            case 'Escape':
                e.preventDefault();
                stopSpeech();
                clickAction('back', ['.btn-voter-back', '.btn-review'], 'Back');
                return;
            case 'ArrowRight':
                if (typing) return;
                e.preventDefault();
                clickAction('next', ['.btn-voter'], 'Next');
                return;
            case 'ArrowLeft':
                if (typing) return;
                e.preventDefault();
                clickAction('back', ['.btn-voter-back', '.btn-review'], 'Back');
                return;
            case 'ArrowDown':
                if (typing) return;
                e.preventDefault();
                moveOption(1);
                return;
            case 'ArrowUp':
                if (typing) return;
                e.preventDefault();
                moveOption(-1);
                return;
            case 'Home':
                if (typing) return;
                { var o1 = getOptions(); if (o1.length) { e.preventDefault(); o1[0].focus(); announce(optionLabel(o1[0])); } }
                return;
            case 'End':
                if (typing) return;
                { var o2 = getOptions(); if (o2.length) { e.preventDefault(); o2[o2.length - 1].focus(); announce(optionLabel(o2[o2.length - 1])); } }
                return;
            default:
                break;
        }

        if (typing) return;

        // --- Home-row keys (Option 1) ---
        switch (key.toLowerCase()) {
            case 'f': {                         // Confirm / select current
                e.preventDefault();
                var active = document.activeElement;
                if (active && (active.tagName === 'BUTTON' || active.tagName === 'A')) {
                    active.click();
                } else {
                    var opt = currentOption();
                    if (opt) {
                        if (document.activeElement !== opt) opt.focus();
                        setOption(opt, true);
                    } else {
                        clickAction('next', ['.btn-voter'], 'Next');
                    }
                }
                break;
            }
            case 'j':                           // Next page
                e.preventDefault();
                clickAction('next', ['.btn-voter'], 'Next');
                break;
            case 'd':                           // Back one page
                e.preventDefault();
                clickAction('back', ['.btn-voter-back', '.btn-review'], 'Back');
                break;
            case 'k': {                         // Deselect current
                e.preventDefault();
                var co = currentOption();
                if (co && co.checked) setOption(co, false);
                else announce('Nothing to deselect.');
                break;
            }
            case 's':                           // Read selection aloud
                e.preventDefault();
                readSelection();
                break;
            case 'l':                           // Read instructions / help aloud
                e.preventDefault();
                readInstructions();
                break;
            default:
                break;
        }
    }

    /* ----------------------------------------------------------------- */
    /* Focus management on page / step load                              */
    /* ----------------------------------------------------------------- */

    function focusOnLoad() {
        var heading = $one('[data-a11y-heading]') ||
                      $one('.guide-desc-header h2') ||
                      $one('.voter-title h2') ||
                      $one('h1, h2');
        if (heading) {
            if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
            heading.setAttribute('data-a11y-heading', '');
            window.setTimeout(function () {
                try { heading.focus(); } catch (e) {}
            }, 120);
            announce(heading.textContent.replace(/\s+/g, ' ').trim() +
                     '. Keyboard voting is on. Press L to hear the instructions, or S to hear your current selection.');
        }
    }

    /* ----------------------------------------------------------------- */
    /* Skip link                                                         */
    /* ----------------------------------------------------------------- */

    function buildChrome() {
        var main = $one('.page-content-fullwidth, .page-content-wrapper, main');
        if (main) {
            if (!main.id) main.id = 'a11y-main';
            if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
            var skip = document.createElement('a');
            skip.href = '#' + main.id;
            skip.className = 'a11y-skip-link';
            skip.textContent = 'Skip to ballot';
            skip.addEventListener('click', function (e) {
                e.preventDefault();
                main.focus();
            });
            document.body.insertBefore(skip, document.body.firstChild);
        }
    }

    /* ----------------------------------------------------------------- */
    /* Init                                                              */
    /* ----------------------------------------------------------------- */

    function init() {
        ensureLiveRegion();
        buildChrome();
        document.addEventListener('keydown', onKeyDown, true);
        focusOnLoad();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
