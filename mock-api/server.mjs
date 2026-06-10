/*
 * VotRite local mock API
 * ----------------------------------------------------------------------
 * Stands in for the remote backend (env('API')) so the real Laravel voter
 * app can run end-to-end locally with no database and no live backend.
 *
 * Implements exactly the endpoints the app calls, with the JSON shapes the
 * controllers expect (see app/Http/Controllers/*). Sends CORS headers so the
 * browser-side write-in call (crossDomain POST /candidate/create) works too.
 *
 * Run:   node mock-api/server.mjs        (listens on http://127.0.0.1:9191)
 * Point the app at it:  API=http://127.0.0.1:9191/api   (in .env)
 *
 * Any pincode is accepted. Data is in-memory and resets on restart.
 */
import { createServer } from 'node:http';

const PORT = 9191;
const HOST = '127.0.0.1';

/* ---- Sample ballot data ------------------------------------------------ */
const BALLOT = { ballot_id: 1, board: 'City Board of Elections',
                 election: 'General Election 2026', address: '123 Main Street' };

const RACES = [
  { race_id: 10, race_title: 'Mayor',        race_type: 'N', min_num_of_votes: 0, max_num_of_votes: 1, max_num_of_write_ins: 1, ...BALLOT },
  { race_id: 11, race_title: 'City Council',  race_type: 'N', min_num_of_votes: 0, max_num_of_votes: 2, max_num_of_write_ins: 1, ...BALLOT },
  { race_id: 12, race_title: 'Judicial Seats', race_type: 'R', min_num_of_votes: 0, max_num_of_votes: 3, max_num_of_write_ins: 1, ...BALLOT },
];

const CANDIDATES = {
  10: [ c(101, 'Alex Rivera'), c(102, 'Jordan Lee'), c(103, 'Sam Patel') ],
  11: [ c(201, 'Taylor Kim'), c(202, 'Morgan Diaz'), c(203, 'Casey Brown'), c(204, 'Riley Nguyen') ],
  12: [ c(301, 'Pat Stone'), c(302, 'Jamie Fox'), c(303, 'Drew Park') ],
};

const PROPS = [
  { proposition_id: 401, prop_title: 'Proposition 1', prop_answer_type: 1,
    prop_text: 'Shall the city issue bonds to fund park improvements?' },
];
const MASS = [
  { proposition_id: 501, prop_title: 'Mass Proposition A', prop_answer_type: 2,
    prop_text: 'Shall the state charter be amended regarding term limits?' },
];

const LANGUAGES = [ { language_code: 'es', lang_id: 2, language_name: 'Español' } ];

function c(id, name) { return { candidate_id: id, candidate_name: name, party_logo: null, photo: null }; }

let nextWriteInId = 9001;

/* ---- HTTP plumbing ----------------------------------------------------- */
function send(res, obj, code = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (ch) => (d += ch));
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch { resolve({}); } });
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // strip optional /api prefix so routes match regardless of base path
  const path = url.pathname.replace(/^\/api/, '');
  const q = url.searchParams;
  console.log(`${req.method} ${url.pathname}${url.search}`);

  if (req.method === 'OPTIONS') return send(res, {});

  // --- GET endpoints (getParamApi / getApi) ---
  if (req.method === 'GET') {
    switch (path) {
      case '/pincode':            // any pin accepted; not used, not expired
        return send(res, { data: [ { is_used: false, expiration_time: '2099-12-31 23:59:59' } ] });
      case '/ballot':
        return send(res, { data: [ BALLOT ] });
      case '/ballot/language':
        return send(res, { data: LANGUAGES });
      case '/race':
        return send(res, { data: RACES });
      case '/proposition':
        return send(res, { data: q.get('prop_type') === 'M' ? MASS : PROPS });
      case '/candidate': {
        const list = CANDIDATES[q.get('race_id')] || [];
        return send(res, { data: list });
      }
    }
  }

  // --- POST endpoints (postApi) ---
  if (req.method === 'POST') {
    const body = await readBody(req);
    switch (path) {
      case '/ballot/active':
        return send(res, { data: [ BALLOT ] });
      case '/candidate/create': {       // write-in; returns new candidate id in `message`
        const id = nextWriteInId++;
        const raceId = body.race_id;
        if (CANDIDATES[raceId]) CANDIDATES[raceId].push(c(id, body.candidate_name || 'Write-in'));
        return send(res, { message: id });
      }
      case '/counter/candidate/create':
      case '/counter/proposition/create':
        return send(res, { status: 'ok', recorded: body });
      case '/pincode/update':
        return send(res, { status: 'ok' });
    }
  }

  return send(res, { error: 'Not found', path: url.pathname }, 404);
});

server.listen(PORT, HOST, () => {
  console.log(`VotRite mock API listening on http://${HOST}:${PORT}/api`);
  console.log(`Set  API=http://${HOST}:${PORT}/api  in your .env, then run: php artisan serve`);
});
