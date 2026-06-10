/*
 * Automated WCAG checks (axe-core) for the VotRite voter screens.
 *
 * Runs against the standalone harness pages in this folder, which load the
 * real votrite-a11y.css / votrite-a11y.js, so it validates the shipped
 * accessibility layer without needing PHP/DB/API.
 *
 * Uses puppeteer-core against an already-installed system browser (no
 * Chromium download). Set CHROME_PATH to override the detected binary.
 *
 *   npm install        (in this folder)
 *   npm run test:a11y
 *
 * Exit code is non-zero if any serious/critical violation is found, so it
 * can gate a CI pipeline (plan §7.3).
 */
import { AxePuppeteer } from '@axe-core/puppeteer';
import puppeteer from 'puppeteer-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAGES = ['candidate-selection.html', 'propositions.html', 'review.html'];
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ];
  return candidates.find(existsSync);
}

const SEVERITY = { minor: 0, moderate: 1, serious: 2, critical: 3 };

async function run() {
  const executablePath = findBrowser();
  if (!executablePath) {
    console.error('No browser found. Set CHROME_PATH to chrome.exe or msedge.exe.');
    process.exit(2);
  }
  console.log('Using browser:', executablePath);

  const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox'] });
  let hardFailures = 0;

  for (const file of PAGES) {
    const url = pathToFileURL(join(__dirname, file)).href;
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    const results = await new AxePuppeteer(page).withTags(WCAG_TAGS).analyze();
    const violations = results.violations;

    console.log(`\n=== ${file} ===`);
    if (!violations.length) {
      console.log('  ✓ No WCAG 2.1 A/AA violations detected by axe.');
    } else {
      for (const v of violations) {
        const serious = (SEVERITY[v.impact] ?? 0) >= SEVERITY.serious;
        if (serious) hardFailures++;
        console.log(`  ${serious ? '✗' : '•'} [${v.impact}] ${v.id}: ${v.help}`);
        for (const n of v.nodes) console.log(`        ${n.target.join(' ')}`);
        console.log(`        ${v.helpUrl}`);
      }
    }
    await page.close();
  }

  await browser.close();
  console.log(`\nDone. Serious/critical violations: ${hardFailures}`);
  process.exit(hardFailures ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(2); });
