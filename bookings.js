// ===== MPHO SAULI BOOKINGS =====
// Appointment booking for the Mpho Sauli design studio. Fully separate from the
// Nalèa XoXo features in server.js: it reads only MPHO_* environment variables,
// talks only to the Mpho Sauli Shopify store, and lives under /mpho/*.
// If MPHO_SHOPIFY_STORE / MPHO_SHOPIFY_ADMIN_TOKEN are not set, every route
// answers 503 and nothing else in the server is affected.
//
// Bookings are stored as Shopify metaobjects (type "mpho_booking") in the Mpho
// Sauli store. Clients see their own history by verifying their email with a
// one-time code; Mpho sees everything with MPHO_ADMIN_SECRET.

const crypto = require('crypto');

const STORE = process.env.MPHO_SHOPIFY_STORE;
const TOKEN = process.env.MPHO_SHOPIFY_ADMIN_TOKEN;
const ADMIN_SECRET = process.env.MPHO_ADMIN_SECRET;
const SESSION_SECRET = process.env.MPHO_SESSION_SECRET || ADMIN_SECRET || '';
const ALLOWED_ORIGINS = (process.env.MPHO_ALLOWED_ORIGINS || 'https://mphosauli.com,https://www.mphosauli.com,https://4pqks1-fs.myshopify.com')
  .split(',').map(s => s.trim()).filter(Boolean);
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.MPHO_EMAIL_FROM; // e.g. "Mpho Sauli <bookings@mphosauli.com>" (domain must be verified in Resend)
const NOTIFY_EMAIL = process.env.MPHO_NOTIFY_EMAIL || 'support@mphosauli.com';

const API_VERSION = '2024-04';
const TYPE = 'mpho_booking';
const TZ_OFFSET_MIN = 120; // South Africa (SAST, UTC+2, no daylight saving)

// What clients can book, and how long each takes.
const SERVICES = {
  intro:   { label: 'Free 15-min intro call', minutes: 15 },
  consult: { label: 'Project consultation',   minutes: 60 },
  fix:     { label: 'Shopify fix session',     minutes: 60 },
  review:  { label: 'Design review',           minutes: 30 },
};

// Opening hours in SAST. 0 = Sunday … 6 = Saturday. [startHour, endHour)
const HOURS = { 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: [9, 13] };
const SLOT_STEP_MIN = 30;
const MIN_NOTICE_MIN = 120;   // no bookings less than 2 hours ahead
const MAX_DAYS_AHEAD = 60;

// ---------- helpers ---------------------------------------------------------

const configured = () => Boolean(STORE && TOKEN);

async function gql(query, variables) {
  const fetch = (await import('node-fetch')).default;
  const r = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const data = await r.json();
  if (data.errors) throw new Error('Shopify: ' + JSON.stringify(data.errors).slice(0, 300));
  return data.data;
}

/** SAST wall-clock parts for a UTC Date. */
function sast(d) {
  const t = new Date(d.getTime() + TZ_OFFSET_MIN * 60000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), dow: t.getUTCDay(), h: t.getUTCHours(), min: t.getUTCMinutes() };
}
/** UTC Date for a SAST wall-clock time. */
function fromSast(y, m, d, h = 0, min = 0) {
  return new Date(Date.UTC(y, m, d, h, min) - TZ_OFFSET_MIN * 60000);
}
const dayKey = (d) => { const s = sast(d); return `${s.y}-${String(s.m + 1).padStart(2, '0')}-${String(s.d).padStart(2, '0')}`; };
const normEmail = (e) => String(e || '').trim().toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${mac}`;
}
function verify(token) {
  if (!token || !SESSION_SECRET) return null;
  const [body, mac] = String(token).split('.');
  if (!body || !mac) return null;
  const want = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  if (want.length !== mac.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(mac))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
function adminOk(req) {
  const given = String(req.get('x-admin-secret') || '');
  return Boolean(ADMIN_SECRET) && given.length === ADMIN_SECRET.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(ADMIN_SECRET));
}

// Tiny in-memory rate limiter: `max` hits per `windowMs` per key.
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}

// ---------- storage (Shopify metaobjects) -----------------------------------

let definitionReady = false;
async function ensureDefinition() {
  if (definitionReady) return;
  const d = await gql(`query { metaobjectDefinitionByType(type: "${TYPE}") { id } }`);
  if (!d.metaobjectDefinitionByType) {
    const f = (key, name, type) => ({ key, name, type });
    const res = await gql(`mutation($def: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $def) { userErrors { field message } }
    }`, { def: {
      type: TYPE, name: 'Mpho booking', displayNameKey: 'name',
      fieldDefinitions: [
        f('service', 'Service', 'single_line_text_field'),
        f('start', 'Start', 'date_time'),
        f('end', 'End', 'date_time'),
        f('name', 'Client name', 'single_line_text_field'),
        f('email', 'Client email', 'single_line_text_field'),
        f('phone', 'Phone / WhatsApp', 'single_line_text_field'),
        f('notes', 'Notes', 'multi_line_text_field'),
        f('status', 'Status', 'single_line_text_field'),
        f('created', 'Created', 'date_time'),
      ],
    } });
    const errs = res.metaobjectDefinitionCreate.userErrors;
    if (errs.length && !errs.some(e => /taken|exists/i.test(e.message))) throw new Error('Definition: ' + JSON.stringify(errs));
  }
  definitionReady = true;
}

function toBooking(node) {
  const v = Object.fromEntries(node.fields.map(f => [f.key, f.value]));
  return {
    id: node.id, service: v.service, start: v.start, end: v.end,
    name: v.name, email: v.email, phone: v.phone || '', notes: v.notes || '',
    status: v.status || 'confirmed', created: v.created,
  };
}

// Small cache so the public calendar doesn't hit Shopify on every view.
let cache = { at: 0, list: null };
async function allBookings(force = false) {
  if (!force && cache.list && Date.now() - cache.at < 30000) return cache.list;
  await ensureDefinition();
  const out = [];
  let after = null;
  for (let page = 0; page < 40; page++) {
    const d = await gql(`query($after: String) {
      metaobjects(type: "${TYPE}", first: 250, after: $after) {
        nodes { id fields { key value } }
        pageInfo { hasNextPage endCursor }
      }
    }`, { after });
    out.push(...d.metaobjects.nodes.map(toBooking));
    if (!d.metaobjects.pageInfo.hasNextPage) break;
    after = d.metaobjects.pageInfo.endCursor;
  }
  cache = { at: Date.now(), list: out };
  return out;
}

async function createBooking(b) {
  await ensureDefinition();
  const fields = Object.entries(b).map(([key, value]) => ({ key, value: String(value) }));
  const d = await gql(`mutation($m: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $m) { metaobject { id fields { key value } } userErrors { field message } }
  }`, { m: { type: TYPE, fields } });
  const errs = d.metaobjectCreate.userErrors;
  if (errs.length) throw new Error('Create: ' + JSON.stringify(errs));
  cache.at = 0;
  return toBooking(d.metaobjectCreate.metaobject);
}

async function setStatus(id, status) {
  const d = await gql(`mutation($id: ID!, $m: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $m) { metaobject { id fields { key value } } userErrors { field message } }
  }`, { id, m: { fields: [{ key: 'status', value: status }] } });
  const errs = d.metaobjectUpdate.userErrors;
  if (errs.length) throw new Error('Update: ' + JSON.stringify(errs));
  cache.at = 0;
  return toBooking(d.metaobjectUpdate.metaobject);
}

// ---------- availability ----------------------------------------------------

const active = (b) => b.status !== 'cancelled';
const overlaps = (aS, aE, bS, bE) => aS < bE && bS < aE;

/** Open start times for `service` on SAST day (y, m, d). */
function slotsForDay(y, m, d, service, bookings, now = new Date()) {
  const dow = new Date(Date.UTC(y, m, d)).getUTCDay();
  const hours = HOURS[dow];
  if (!hours) return [];
  const len = SERVICES[service].minutes;
  const earliest = now.getTime() + MIN_NOTICE_MIN * 60000;
  const out = [];
  for (let t = hours[0] * 60; t + len <= hours[1] * 60; t += SLOT_STEP_MIN) {
    const s = fromSast(y, m, d, Math.floor(t / 60), t % 60);
    const e = new Date(s.getTime() + len * 60000);
    if (s.getTime() < earliest) continue;
    const taken = bookings.some(b => active(b) && overlaps(s, e, new Date(b.start), new Date(b.end)));
    out.push({ start: s.toISOString(), end: e.toISOString(), free: !taken });
  }
  return out;
}

function stats(list) {
  const now = Date.now();
  const byDay = {};
  for (const b of list) byDay[dayKey(new Date(b.start))] = (byDay[dayKey(new Date(b.start))] || 0) + (active(b) ? 1 : 0);
  let busiest = null;
  for (const [day, n] of Object.entries(byDay)) if (!busiest || n > busiest.count) busiest = { day, count: n };
  return {
    total: list.length,
    upcoming: list.filter(b => active(b) && new Date(b.start).getTime() > now).length,
    completed: list.filter(b => active(b) && new Date(b.end).getTime() <= now).length,
    cancelled: list.filter(b => !active(b)).length,
    busiest,
  };
}

// ---------- email -----------------------------------------------------------

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY || !EMAIL_FROM) return false;
  const fetch = (await import('node-fetch')).default;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  if (!r.ok) console.error('Mpho email failed:', r.status, (await r.text()).slice(0, 200));
  return r.ok;
}

const esc = (s) => String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtWhen = (iso) => new Date(iso).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const shell = (title, body) => `
<div style="background:#050507;padding:40px 16px;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#111116;border:1px solid #26262e;border-radius:20px;overflow:hidden">
    <div style="padding:26px 28px;background:linear-gradient(135deg,#ff2d7a,#6d5dfc)"><div style="color:#fff;font-weight:800;letter-spacing:.2em;font-size:14px">MPHO SAULI</div></div>
    <div style="padding:28px;color:#f4f4f6"><h1 style="font-size:20px;margin:0 0 16px">${title}</h1>${body}</div>
  </div>
</div>`;

// ---------- routes ----------------------------------------------------------

module.exports = function mountMphoBookings(app) {
  // CORS for the Mpho Sauli site only, and only on /mpho routes.
  app.use('/mpho', (req, res, next) => {
    const origin = req.get('origin');
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-secret');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    if (!configured()) return res.status(503).json({ error: 'Bookings are not set up yet' });
    next();
  });

  // Services, opening hours and per-day open slots for the next `days` days.
  app.get('/mpho/bookings/availability', async (req, res) => {
    try {
      const service = SERVICES[req.query.service] ? req.query.service : 'intro';
      const days = Math.min(MAX_DAYS_AHEAD, Math.max(1, parseInt(req.query.days, 10) || 42));
      const bookings = await allBookings();
      const now = new Date();
      const today = sast(now);
      const out = [];
      for (let i = 0; i < days; i++) {
        const day = new Date(Date.UTC(today.y, today.m, today.d + i));
        const y = day.getUTCFullYear(), m = day.getUTCMonth(), d = day.getUTCDate();
        const slots = slotsForDay(y, m, d, service, bookings, now);
        const dayStart = fromSast(y, m, d), dayEnd = fromSast(y, m, d + 1);
        const booked = bookings.filter(b => active(b) && new Date(b.start) >= dayStart && new Date(b.start) < dayEnd).length;
        out.push({ date: dayKey(dayStart), open: Boolean(HOURS[day.getUTCDay()]), booked, slots });
      }
      // Public view: counts only, never client details.
      const past = bookings.filter(b => new Date(b.start) < now);
      res.json({
        services: Object.entries(SERVICES).map(([id, s]) => ({ id, ...s })),
        timezone: 'Africa/Johannesburg',
        days: out,
        history: { total: past.filter(active).length },
      });
    } catch (err) {
      console.error('Mpho availability:', err.message);
      res.status(500).json({ error: 'Could not load availability' });
    }
  });

  // Create a booking.
  app.post('/mpho/bookings', async (req, res) => {
    try {
      if (limited('book:' + req.ip, 8, 60 * 60000)) return res.status(429).json({ error: 'Too many bookings, try again later' });
      const { service, start } = req.body || {};
      const name = clean(req.body?.name, 80);
      const email = normEmail(req.body?.email);
      const phone = clean(req.body?.phone, 30);
      const notes = clean(req.body?.notes, 1000);
      if (!SERVICES[service]) return res.status(400).json({ error: 'Pick a service' });
      if (!name) return res.status(400).json({ error: 'Your name is required' });
      if (!validEmail(email)) return res.status(400).json({ error: 'A valid email is required' });
      const s = new Date(start);
      if (isNaN(s)) return res.status(400).json({ error: 'Pick a time' });

      const bookings = await allBookings(true);
      const p = sast(s);
      const ok = slotsForDay(p.y, p.m, p.d, service, bookings).find(x => x.start === s.toISOString());
      if (!ok) return res.status(400).json({ error: 'That time is not available' });
      if (!ok.free) return res.status(409).json({ error: 'Someone just booked that time — pick another' });

      const booking = await createBooking({
        service, start: ok.start, end: ok.end, name, email, phone, notes,
        status: 'confirmed', created: new Date().toISOString(),
      });
      const session = sign({ email, exp: Date.now() + 7 * 864e5 });
      const when = fmtWhen(booking.start);
      sendEmail(email, `You're booked: ${SERVICES[service].label}`, shell(`You're booked, ${esc(name)} ✦`,
        `<p style="color:#bbb;line-height:1.6">${esc(SERVICES[service].label)}<br><strong style="color:#fff">${esc(when)}</strong> (South Africa time)</p>
         <p style="color:#888;font-size:13px">Need to change it? Open "My bookings" on mphosauli.com.</p>`)).catch(() => {});
      sendEmail(NOTIFY_EMAIL, `New booking: ${name} — ${SERVICES[service].label}`, shell('New booking',
        `<p style="color:#bbb;line-height:1.7">${esc(SERVICES[service].label)}<br><strong style="color:#fff">${esc(when)}</strong><br>
         ${esc(name)} · ${esc(email)}${phone ? ' · ' + esc(phone) : ''}</p>${notes ? `<p style="color:#999;white-space:pre-wrap">${esc(notes)}</p>` : ''}`)).catch(() => {});
      res.json({ booking, session });
    } catch (err) {
      console.error('Mpho create booking:', err.message);
      res.status(500).json({ error: 'Could not save your booking' });
    }
  });

  // "My bookings" sign-in: email a 6-digit code.
  const codes = new Map(); // email -> { hash, exp, tries }
  app.post('/mpho/bookings/login', async (req, res) => {
    const email = normEmail(req.body?.email);
    if (!validEmail(email)) return res.status(400).json({ error: 'A valid email is required' });
    if (limited('login:' + email, 5, 15 * 60000) || limited('loginip:' + req.ip, 20, 15 * 60000)) {
      return res.status(429).json({ error: 'Too many codes requested, wait a few minutes' });
    }
    if (!RESEND_API_KEY || !EMAIL_FROM) return res.status(503).json({ error: 'Email sign-in is not set up yet' });
    const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
    codes.set(email, { hash: crypto.createHash('sha256').update(code + email).digest('hex'), exp: Date.now() + 10 * 60000, tries: 0 });
    const sent = await sendEmail(email, `${code} is your Mpho Sauli code`, shell('Your sign-in code',
      `<div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#ff4d8d;margin:8px 0 16px">${code}</div>
       <p style="color:#888;font-size:13px">It expires in 10 minutes. If you didn't ask for it, ignore this email.</p>`));
    if (!sent) return res.status(502).json({ error: 'Could not send the code' });
    res.json({ ok: true });
  });

  app.post('/mpho/bookings/verify', (req, res) => {
    const email = normEmail(req.body?.email);
    const entry = codes.get(email);
    if (!entry || entry.exp < Date.now() || entry.tries >= 5) return res.status(400).json({ error: 'Code expired, request a new one' });
    entry.tries++;
    const given = crypto.createHash('sha256').update(String(req.body?.code || '') + email).digest('hex');
    if (given !== entry.hash) return res.status(400).json({ error: 'Wrong code' });
    codes.delete(email);
    res.json({ session: sign({ email, exp: Date.now() + 7 * 864e5 }) });
  });

  const session = (req) => verify(String(req.get('authorization') || '').replace(/^Bearer\s+/i, ''));

  // A client's own history and stats.
  app.get('/mpho/bookings/mine', async (req, res) => {
    const s = session(req);
    if (!s) return res.status(401).json({ error: 'Sign in again' });
    try {
      const mine = (await allBookings(true)).filter(b => normEmail(b.email) === s.email)
        .sort((a, b) => new Date(b.start) - new Date(a.start));
      res.json({ email: s.email, stats: stats(mine), bookings: mine });
    } catch (err) {
      console.error('Mpho my bookings:', err.message);
      res.status(500).json({ error: 'Could not load your bookings' });
    }
  });

  app.post('/mpho/bookings/:id/cancel', async (req, res) => {
    const s = session(req);
    if (!s) return res.status(401).json({ error: 'Sign in again' });
    try {
      const id = decodeURIComponent(req.params.id);
      const b = (await allBookings(true)).find(x => x.id === id);
      if (!b || normEmail(b.email) !== s.email) return res.status(404).json({ error: 'Booking not found' });
      if (new Date(b.start) < new Date()) return res.status(400).json({ error: 'That booking has already happened' });
      const updated = await setStatus(id, 'cancelled');
      sendEmail(NOTIFY_EMAIL, `Cancelled: ${b.name} — ${fmtWhen(b.start)}`, shell('Booking cancelled',
        `<p style="color:#bbb">${esc(b.name)} cancelled ${esc(SERVICES[b.service]?.label || b.service)} on ${esc(fmtWhen(b.start))}.</p>`)).catch(() => {});
      res.json({ booking: updated });
    } catch (err) {
      console.error('Mpho cancel:', err.message);
      res.status(500).json({ error: 'Could not cancel' });
    }
  });

  // Mpho's view of everything.
  app.get('/mpho/admin/bookings', async (req, res) => {
    if (!adminOk(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const list = (await allBookings(true)).sort((a, b) => new Date(b.start) - new Date(a.start));
      res.json({ stats: stats(list), bookings: list });
    } catch (err) {
      console.error('Mpho admin list:', err.message);
      res.status(500).json({ error: 'Could not load bookings' });
    }
  });

  app.post('/mpho/admin/bookings/:id/status', async (req, res) => {
    if (!adminOk(req)) return res.status(401).json({ error: 'Unauthorized' });
    const status = req.body?.status;
    if (!['confirmed', 'cancelled', 'completed', 'no_show'].includes(status)) return res.status(400).json({ error: 'Bad status' });
    try {
      res.json({ booking: await setStatus(decodeURIComponent(req.params.id), status) });
    } catch (err) {
      console.error('Mpho admin status:', err.message);
      res.status(500).json({ error: 'Could not update' });
    }
  });
};

// Exposed for tests.
module.exports._internal = { slotsForDay, stats, sast, fromSast, dayKey, sign, verify, SERVICES, HOURS };
