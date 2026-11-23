'use strict';
const http = require('node:http');
const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, UPLOAD_DIR, FILES_DIR, getSettings, setSettings, parseJSON } = require('./db');
const { KINDS, CATEGORIES, REQUEST_TYPES, REQUEST_STATUSES, PRICE_TYPES, AVAILABILITY, ORIGINS } = require('./catalog');
const U = require('./util');
const { HttpError, str, int, bool, clamp } = U;
const { seedIfEmpty, cacheRemoteImages, ITEM_FIELDS } = require('./seed');
const { notifyRequest } = require('./notify');
const seo = require('./seo');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_BODY = 40 * 1024 * 1024;
const MAX_FILE = 10 * 1024 * 1024;
const MAX_FILES = 5;
const MAX_IMAGE = 6 * 1024 * 1024;
const SESSION_DAYS = 30;
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1';
const FILE_EXT = /\.(pdf|jpe?g|png|webp|heic|dxf|dwg|step|stp|stl|igs|iges|doc|docx|xls|xlsx|odt|rtf|txt|zip|rar|7z)$/i;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

// ───────────────────────── адмін-доступ
// Пароль: змінна ADMIN_PASSWORD. Якщо її немає — генеруємо пароль при першому запуску та друкуємо в консоль.
function ensureAdminPassword() {
  if (process.env.ADMIN_PASSWORD) return;
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_hash'").get();
  if (row) return;
  const pw = crypto.randomBytes(6).toString('base64url');
  db.prepare("INSERT INTO settings (key, value) VALUES ('admin_hash', ?)").run(JSON.stringify(U.hashPassword(pw)));
  console.log(`\n🔑 Пароль адмінки (/admin): ${pw}\n   Запишіть його або задайте свій через змінну ADMIN_PASSWORD.\n`);
}
function verifyAdminPassword(pw) {
  if (process.env.ADMIN_PASSWORD) {
    const a = Buffer.from(String(pw)); const b = Buffer.from(process.env.ADMIN_PASSWORD);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_hash'").get();
  return !!row && U.checkPassword(pw, parseJSON(row.value, ''));
}
function isAdmin(req) {
  const token = U.parseCookies(req.headers.cookie).bh_admin;
  if (!token || token.length < 20) return false;
  const s = db.prepare('SELECT expires_at FROM sessions WHERE token = ?').get(token);
  return !!s && s.expires_at > Date.now();
}
function requireAdmin(req) {
  if (!isAdmin(req)) throw new HttpError(401, 'Потрібно увійти в адмінку');
  // Захист від CSRF: зміни приймаємо лише зі свого сайту.
  if (req.method !== 'GET') {
    const origin = req.headers.origin;
    let host = null;
    try { host = origin ? new URL(origin).host : req.headers.host; } catch { /* «null» або сміття */ }
    if (host !== req.headers.host) throw new HttpError(403, 'Заборонено');
  }
}
const cookie = (value, maxAge) => `bh_admin=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${COOKIE_SECURE ? '; Secure' : ''}`;

// ───────────────────────── відповіді
function send(res, status, data, headers = {}, req = null) {
  const json = JSON.stringify(data);
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers };
  if (req && json.length > 2048 && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) {
    res.writeHead(status, { ...h, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
    return res.end(zlib.gzipSync(json));
  }
  res.writeHead(status, h);
  res.end(json);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'Завеликий запит')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'Некоректний JSON')); }
    });
    req.on('error', reject);
  });
}
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
const publicUrl = (req) => (process.env.PUBLIC_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`).replace(/\/$/, '');

// ───────────────────────── каталог
const JSON_ITEM = ['specs', 'highlights', 'images'];
function itemOut(r, full = false) {
  const o = { ...r };
  for (const f of JSON_ITEM) o[f] = parseJSON(r[f], []);
  o.extra = parseJSON(r.extra, {});
  if (!full) { delete o.extra; delete o.description; delete o.description_ru; delete o.description_en; delete o.specs; delete o.source_url; }
  return o;
}
const LIST_COLS = 'id, slug, kind, category, origin, title, title_ru, title_en, summary, summary_ru, summary_en, highlights, price, price_type, price_note, unit, availability, lead_time, rent, custom, plastic_kg, images, featured, sort';

function listItems(q) {
  const where = ['published = 1'];
  const args = [];
  if (KINDS[q.kind]) { where.push('kind = ?'); args.push(q.kind); }
  if (q.category) { where.push('category = ?'); args.push(str(q.category, 40)); }
  if (q.featured) where.push('featured = 1');
  if (q.q) {
    where.push("(ulower(title) LIKE ? OR ulower(title_ru) LIKE ? OR ulower(summary) LIKE ? OR ulower(description) LIKE ?)");
    const like = `%${str(q.q, 80).toLowerCase()}%`;
    args.push(like, like, like, like);
  }
  const order = { price_asc: 'price IS NULL, price ASC', price_desc: 'price IS NULL, price DESC', new: 'id DESC' }[q.sort] || 'featured DESC, sort ASC, id ASC';
  return db.prepare(`SELECT ${LIST_COLS} FROM items WHERE ${where.join(' AND ')} ORDER BY ${order}`).all(...args).map((r) => itemOut(r));
}

function publicMeta() {
  const s = getSettings();
  const counts = Object.fromEntries(db.prepare('SELECT kind, COUNT(*) n FROM items WHERE published = 1 GROUP BY kind').all().map((r) => [r.kind, r.n]));
  const catCounts = Object.fromEntries(db.prepare('SELECT category, COUNT(*) n FROM items WHERE published = 1 GROUP BY category').all().map((r) => [r.category, r.n]));
  return {
    settings: s, kinds: KINDS, categories: CATEGORIES.map((c) => ({ ...c, count: catCounts[c.slug] || 0 })), counts,
    vacancies: db.prepare('SELECT COUNT(*) n FROM vacancies WHERE published = 1').get().n,
    requestTypes: REQUEST_TYPES,
  };
}

// ───────────────────────── заявки
const REQ_DETAIL_KEYS = ['mode', 'qty', 'color', 'size', 'branding', 'deadline', 'own_material', 'material', 'volume', 'output', 'budget',
  'format', 'vacancy', 'experience', 'weight', 'pickup', 'delivery', 'install', 'service', 'product', 'org', 'solution'];
const reqNumber = (id) => `BH-${String(id).padStart(5, '0')}`;

function saveAttachments(files) {
  if (!Array.isArray(files) || !files.length) return [];
  if (files.length > MAX_FILES) throw new HttpError(400, `Не більше ${MAX_FILES} файлів`);
  return files.map((f) => {
    const name = str(f?.name, 120).replace(/[\\/:*?"<>|]+/g, '_') || 'file';
    if (!FILE_EXT.test(name)) throw new HttpError(400, `Тип файлу не підтримується: ${name}`);
    const { buf } = U.decodeDataUrl(f.data, MAX_FILE);
    if (buf.length > MAX_FILE) throw new HttpError(413, `Файл ${name} завеликий (максимум 10 МБ)`);
    const id = crypto.randomBytes(12).toString('hex');
    fs.writeFileSync(path.join(FILES_DIR, id), buf);
    return { id, name, size: buf.length };
  });
}

async function createRequest(req, body) {
  const ip = clientIp(req);
  if (body.website) return { ok: true, number: 'BH-00000' }; // приманка для ботів: людина це поле не бачить
  if (!U.rateLimit(`req:${ip}`, 8, 10 * 60 * 1000)) throw new HttpError(429, 'Забагато заявок поспіль. Спробуйте за кілька хвилин або зателефонуйте нам.');
  const type = REQUEST_TYPES[body.type] ? body.type : 'contact';
  const name = str(body.name, 100);
  const phone = U.normPhone(body.phone);
  const email = str(body.email, 120);
  if (name.length < 2) throw new HttpError(400, 'Вкажіть ім’я');
  if (phone.replace(/\D/g, '').length < 9 && !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Вкажіть телефон або email, щоб ми могли відповісти');

  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 30).map((x) => {
    const it = db.prepare('SELECT id, slug, title, kind FROM items WHERE id = ?').get(int(x?.id));
    if (!it) return null;
    return { id: it.id, slug: it.slug, kind: it.kind, title: it.title, qty: clamp(int(x.qty, 1), 1, 100000), mode: str(x.mode, 40) };
  }).filter(Boolean);

  const details = {};
  for (const k of REQ_DETAIL_KEYS) {
    const v = body.details?.[k];
    if (v === true || v === false) details[k] = v;
    else if (v != null && String(v).trim() !== '') details[k] = str(v, 300);
  }
  const files = saveAttachments(body.files);
  const now = new Date().toISOString();
  const r = db.prepare(`INSERT INTO requests (type, items, name, phone, email, company, city, contact_via, message, details, files, history, lang, page, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    type, JSON.stringify(items), name, phone, email, str(body.company, 120), str(body.city, 80), str(body.contact_via, 30),
    str(body.message, 4000), JSON.stringify(details), JSON.stringify(files), JSON.stringify([{ at: now, status: 'new' }]),
    ['uk', 'ru', 'en'].includes(body.lang) ? body.lang : 'uk', str(body.page, 200), ip,
  );
  const id = Number(r.lastInsertRowid);
  const out = { id, number: reqNumber(id), type, items, name, phone, email, company: str(body.company, 120), city: str(body.city, 80),
    contact_via: str(body.contact_via, 30), message: str(body.message, 4000), details, files };
  notifyRequest(out, publicUrl(req)).catch(() => {});
  return { ok: true, number: out.number };
}

function requestOut(r) {
  return { ...r, number: reqNumber(r.id), items: parseJSON(r.items, []), details: parseJSON(r.details, {}), files: parseJSON(r.files, []), history: parseJSON(r.history, []) };
}

// ───────────────────────── адмін: збереження позиції
function itemFromBody(b, existing = {}) {
  const o = {};
  o.kind = KINDS[b.kind] ? b.kind : existing.kind || 'equipment';
  const cat = CATEGORIES.find((c) => c.slug === b.category);
  o.category = cat ? cat.slug : existing.category || CATEGORIES.find((c) => c.kind === o.kind).slug;
  o.title = str(b.title, 200);
  if (o.title.length < 3) throw new HttpError(400, 'Вкажіть назву (від 3 символів)');
  for (const f of ['title_ru', 'title_en']) o[f] = str(b[f], 200);
  for (const f of ['summary', 'summary_ru', 'summary_en']) o[f] = str(b[f], 600);
  for (const f of ['description', 'description_ru', 'description_en']) o[f] = str(b[f], 20000);
  const pairs = (v, n) => (Array.isArray(v) ? v : []).slice(0, n)
    .map((p) => [str(p?.[0], 120), str(p?.[1], 300)]).filter((p) => p[0] || p[1]);
  o.specs = JSON.stringify(pairs(b.specs, 60));
  o.highlights = JSON.stringify(pairs(b.highlights, 4));
  o.price_type = PRICE_TYPES.includes(b.price_type) ? b.price_type : 'fixed';
  o.price = o.price_type === 'request' || b.price === '' || b.price == null ? null : clamp(int(b.price, 0), 0, 1e10);
  if (o.price_type !== 'request' && o.price == null) throw new HttpError(400, 'Вкажіть ціну або оберіть «за запитом»');
  o.price_note = str(b.price_note, 200);
  o.unit = str(b.unit, 20) || 'шт.';
  o.availability = AVAILABILITY.includes(b.availability) ? b.availability : 'order';
  o.origin = ORIGINS.includes(b.origin) ? b.origin : existing.origin || 'own';
  o.lead_time = str(b.lead_time, 80);
  o.rent = bool(b.rent); o.custom = bool(b.custom); o.featured = bool(b.featured);
  o.published = b.published === undefined ? 1 : bool(b.published);
  o.plastic_kg = b.plastic_kg === '' || b.plastic_kg == null ? null : clamp(Number(b.plastic_kg) || 0, 0, 100000);
  o.sort = clamp(int(b.sort, 100), 0, 100000);
  o.images = JSON.stringify((Array.isArray(b.images) ? b.images : []).slice(0, 12)
    .map((u) => str(u, 500)).filter((u) => /^\/uploads\/[a-f0-9]+\.(jpg|png|webp)$/.test(u) || /^https:\/\//.test(u)));
  o.source_url = str(b.source_url, 300);
  // Без поля extra (старий клієнт, масові правки) — лишаємо збережену розповідь як є.
  const ex = b.extra && typeof b.extra === 'object' ? b.extra : parseJSON(existing.extra, {});
  const lines = (v, n, max = 300) => (Array.isArray(v) ? v : []).slice(0, n).map((x) => str(x, max)).filter(Boolean);
  const prs = (v, n) => (Array.isArray(v) ? v : []).slice(0, n).map((p) => [str(p?.[0], 160), str(p?.[1], 600)]).filter((p) => p[0] || p[1]);
  o.extra = JSON.stringify({ tagline: str(ex.tagline, 300), how: prs(ex.how, 8), uses: prs(ex.uses, 8), makes: lines(ex.makes, 16), kit: lines(ex.kit, 16), faq: prs(ex.faq, 10) });
  let slug = U.slugify(str(b.slug, 80) || o.title);
  const taken = (s) => db.prepare('SELECT id FROM items WHERE slug = ? AND id != ?').get(s, existing.id || 0);
  for (let i = 2; taken(slug); i++) slug = `${slug.replace(/-\d+$/, '')}-${i}`;
  o.slug = slug;
  return o;
}

function saveImage(dataUrl) {
  const { buf } = U.decodeDataUrl(dataUrl, MAX_IMAGE);
  const ext = U.sniffImage(buf);
  if (!ext) throw new HttpError(400, 'Підтримуються фото JPG, PNG, WebP');
  const name = `${crypto.randomBytes(10).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}

function vacancyFromBody(b) {
  const list = (v) => JSON.stringify((Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => str(x, 300)).filter(Boolean).slice(0, 20));
  const title = str(b.title, 150);
  if (title.length < 3) throw new HttpError(400, 'Вкажіть назву вакансії');
  return {
    title, kind: b.kind === 'internship' ? 'internship' : 'job', schedule: str(b.schedule, 120), salary: str(b.salary, 120),
    summary: str(b.summary, 600), duties: list(b.duties), requirements: list(b.requirements), offer: list(b.offer),
    published: b.published === undefined ? 1 : bool(b.published), sort: clamp(int(b.sort, 100), 0, 100000),
  };
}
const vacancyOut = (v) => ({ ...v, duties: parseJSON(v.duties, []), requirements: parseJSON(v.requirements, []), offer: parseJSON(v.offer, []) });

function csvCell(v) {
  const s = String(v ?? '');
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ───────────────────────── маршрути API
const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  routes.push({ method, re, keys, handler });
};

route('GET', '/api/meta', () => publicMeta());
route('GET', '/api/items', (req, p, q) => ({ items: listItems(q) }));
route('GET', '/api/items/:slug', (req, p) => {
  const r = db.prepare('SELECT * FROM items WHERE slug = ? AND published = 1').get(p.slug);
  if (!r) throw new HttpError(404, 'Позицію не знайдено');
  db.prepare('UPDATE items SET views = views + 1 WHERE id = ?').run(r.id);
  const related = db.prepare(`SELECT ${LIST_COLS} FROM items WHERE published = 1 AND id != ? AND (category = ? OR kind = ?)
    ORDER BY (category = ?) DESC, featured DESC, sort LIMIT 4`).all(r.id, r.category, r.kind, r.category).map((x) => itemOut(x));
  const out = itemOut(r, true); delete out.views;
  return { item: out, related };
});
route('GET', '/api/vacancies', () => ({ vacancies: db.prepare('SELECT * FROM vacancies WHERE published = 1 ORDER BY sort, id').all().map(vacancyOut) }));
route('POST', '/api/requests', async (req) => createRequest(req, await readBody(req)));

// — адмінка
route('POST', '/api/admin/login', async (req) => {
  const ip = clientIp(req);
  if (!U.rateLimit(`login:${ip}`, 8, 15 * 60 * 1000)) throw new HttpError(429, 'Забагато спроб. Зачекайте 15 хвилин.');
  const { password } = await readBody(req);
  if (!verifyAdminPassword(password || '')) throw new HttpError(401, 'Невірний пароль');
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  db.prepare('INSERT INTO sessions (token, created_at, expires_at) VALUES (?, ?, ?)').run(token, now, now + SESSION_DAYS * 864e5);
  return [{ ok: true }, { 'Set-Cookie': cookie(token, SESSION_DAYS * 86400) }];
});
route('POST', '/api/admin/logout', (req) => {
  const token = U.parseCookies(req.headers.cookie).bh_admin;
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  return [{ ok: true }, { 'Set-Cookie': cookie('', 0) }];
});
route('GET', '/api/admin/me', (req) => ({ admin: isAdmin(req), envPassword: !!process.env.ADMIN_PASSWORD,
  telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) }));

route('GET', '/api/admin/stats', (req) => {
  requireAdmin(req);
  const by = db.prepare('SELECT status, COUNT(*) n FROM requests GROUP BY status').all();
  const types = db.prepare("SELECT type, COUNT(*) n FROM requests WHERE created_at >= datetime('now', '-30 days') GROUP BY type").all();
  const days = db.prepare("SELECT date(created_at) d, COUNT(*) n FROM requests WHERE created_at >= datetime('now', '-29 days') GROUP BY d").all();
  const top = db.prepare('SELECT id, slug, title, kind, views FROM items ORDER BY views DESC LIMIT 6').all();
  return {
    statuses: Object.fromEntries(by.map((r) => [r.status, r.n])),
    types: Object.fromEntries(types.map((r) => [r.type, r.n])),
    days: Object.fromEntries(days.map((r) => [r.d, r.n])),
    week: db.prepare("SELECT COUNT(*) n FROM requests WHERE created_at >= datetime('now', '-7 days')").get().n,
    total: db.prepare('SELECT COUNT(*) n FROM requests').get().n,
    items: db.prepare('SELECT kind, COUNT(*) n, SUM(published) p FROM items GROUP BY kind').all(),
    top,
  };
});
route('GET', '/api/admin/requests', (req, p, q) => {
  requireAdmin(req);
  const where = []; const args = [];
  if (REQUEST_STATUSES[q.status]) { where.push('status = ?'); args.push(q.status); }
  if (REQUEST_TYPES[q.type]) { where.push('type = ?'); args.push(q.type); }
  if (q.q) {
    const like = `%${str(q.q, 80).toLowerCase()}%`;
    where.push('(ulower(name) LIKE ? OR phone LIKE ? OR ulower(email) LIKE ? OR ulower(company) LIKE ? OR ulower(message) LIKE ? OR ulower(items) LIKE ? OR id = ?)');
    args.push(like, like, like, like, like, like, int(String(q.q).replace(/\D/g, ''), -1));
  }
  const rows = db.prepare(`SELECT * FROM requests ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 500`).all(...args);
  const counts = Object.fromEntries(db.prepare('SELECT status, COUNT(*) n FROM requests GROUP BY status').all().map((r) => [r.status, r.n]));
  return { requests: rows.map(requestOut), counts };
});
route('PATCH', '/api/admin/requests/:id', async (req, p) => {
  requireAdmin(req);
  const b = await readBody(req);
  const r = db.prepare('SELECT * FROM requests WHERE id = ?').get(int(p.id));
  if (!r) throw new HttpError(404, 'Заявку не знайдено');
  const history = parseJSON(r.history, []);
  let status = r.status;
  if (b.status && REQUEST_STATUSES[b.status] && b.status !== r.status) { status = b.status; history.push({ at: new Date().toISOString(), status }); }
  const note = b.note === undefined ? r.note : str(b.note, 4000);
  db.prepare("UPDATE requests SET status = ?, note = ?, history = ?, updated_at = datetime('now') WHERE id = ?").run(status, note, JSON.stringify(history), r.id);
  return { request: requestOut(db.prepare('SELECT * FROM requests WHERE id = ?').get(r.id)) };
});
route('DELETE', '/api/admin/requests/:id', (req, p) => {
  requireAdmin(req);
  const r = db.prepare('SELECT files FROM requests WHERE id = ?').get(int(p.id));
  if (!r) throw new HttpError(404, 'Заявку не знайдено');
  for (const f of parseJSON(r.files, [])) fs.rmSync(path.join(FILES_DIR, f.id), { force: true });
  db.prepare('DELETE FROM requests WHERE id = ?').run(int(p.id));
  return { ok: true };
});
route('GET', '/api/admin/requests.csv', (req, res) => {
  requireAdmin(req);
  const head = ['Номер', 'Дата', 'Тип', 'Статус', 'Ім’я', 'Телефон', 'Email', 'Компанія', 'Місто', 'Позиції', 'Деталі', 'Повідомлення', 'Нотатка'];
  const rows = db.prepare('SELECT * FROM requests ORDER BY id DESC').all().map(requestOut).map((r) => [
    r.number, r.created_at, REQUEST_TYPES[r.type]?.uk || r.type, REQUEST_STATUSES[r.status]?.uk || r.status, r.name, r.phone, r.email, r.company, r.city,
    r.items.map((i) => `${i.title} × ${i.qty}${i.mode ? ` (${i.mode})` : ''}`).join('; '),
    Object.entries(r.details).map(([k, v]) => `${k}: ${v}`).join('; '), r.message, r.note,
  ]);
  const csv = '﻿' + [head, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
  return { raw: csv, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="bh-requests-${new Date().toISOString().slice(0, 10)}.csv"` } };
});
route('GET', '/api/admin/files/:rid/:fid', (req, p) => {
  requireAdmin(req);
  const r = db.prepare('SELECT files FROM requests WHERE id = ?').get(int(p.rid));
  const f = r && parseJSON(r.files, []).find((x) => x.id === p.fid);
  if (!f || !/^[a-f0-9]{24}$/.test(f.id)) throw new HttpError(404, 'Файл не знайдено');
  const fp = path.join(FILES_DIR, f.id);
  if (!fs.existsSync(fp)) throw new HttpError(404, 'Файл не знайдено');
  return { raw: fs.readFileSync(fp), headers: {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="file"; filename*=UTF-8''${encodeURIComponent(f.name)}`,
  } };
});

route('GET', '/api/admin/items', (req) => {
  requireAdmin(req);
  return { items: db.prepare('SELECT * FROM items ORDER BY kind, sort, id').all().map((r) => itemOut(r, true)) };
});
route('POST', '/api/admin/items', async (req) => {
  requireAdmin(req);
  const o = itemFromBody(await readBody(req));
  const cols = Object.keys(o);
  const r = db.prepare(`INSERT INTO items (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...cols.map((c) => o[c]));
  return { item: itemOut(db.prepare('SELECT * FROM items WHERE id = ?').get(r.lastInsertRowid), true) };
});
route('PUT', '/api/admin/items/:id', async (req, p) => {
  requireAdmin(req);
  const ex = db.prepare('SELECT * FROM items WHERE id = ?').get(int(p.id));
  if (!ex) throw new HttpError(404, 'Позицію не знайдено');
  const o = itemFromBody(await readBody(req), ex);
  const cols = Object.keys(o).filter((c) => ITEM_FIELDS.includes(c));
  db.prepare(`UPDATE items SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...cols.map((c) => o[c]), ex.id);
  return { item: itemOut(db.prepare('SELECT * FROM items WHERE id = ?').get(ex.id), true) };
});
route('PATCH', '/api/admin/items/:id', async (req, p) => {
  requireAdmin(req);
  const b = await readBody(req);
  const ex = db.prepare('SELECT id FROM items WHERE id = ?').get(int(p.id));
  if (!ex) throw new HttpError(404, 'Позицію не знайдено');
  for (const f of ['published', 'featured']) if (f in b) db.prepare(`UPDATE items SET ${f} = ?, updated_at = datetime('now') WHERE id = ?`).run(bool(b[f]), ex.id);
  return { item: itemOut(db.prepare('SELECT * FROM items WHERE id = ?').get(ex.id), true) };
});
route('DELETE', '/api/admin/items/:id', (req, p) => {
  requireAdmin(req);
  const ex = db.prepare('SELECT images FROM items WHERE id = ?').get(int(p.id));
  if (!ex) throw new HttpError(404, 'Позицію не знайдено');
  db.prepare('DELETE FROM items WHERE id = ?').run(int(p.id));
  // Видаляємо файли фото, якщо вони більше ніде не використовуються.
  for (const u of parseJSON(ex.images, [])) {
    if (!u.startsWith('/uploads/')) continue;
    if (!db.prepare('SELECT 1 FROM items WHERE images LIKE ?').get(`%${u}%`)) fs.rmSync(path.join(UPLOAD_DIR, path.basename(u)), { force: true });
  }
  return { ok: true };
});
route('POST', '/api/admin/upload', async (req) => {
  requireAdmin(req);
  const { data } = await readBody(req);
  return { url: saveImage(data) };
});

route('GET', '/api/admin/vacancies', (req) => { requireAdmin(req); return { vacancies: db.prepare('SELECT * FROM vacancies ORDER BY sort, id').all().map(vacancyOut) }; });
route('POST', '/api/admin/vacancies', async (req) => {
  requireAdmin(req);
  const v = vacancyFromBody(await readBody(req));
  const cols = Object.keys(v);
  const r = db.prepare(`INSERT INTO vacancies (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...cols.map((c) => v[c]));
  return { vacancy: vacancyOut(db.prepare('SELECT * FROM vacancies WHERE id = ?').get(r.lastInsertRowid)) };
});
route('PUT', '/api/admin/vacancies/:id', async (req, p) => {
  requireAdmin(req);
  if (!db.prepare('SELECT 1 FROM vacancies WHERE id = ?').get(int(p.id))) throw new HttpError(404, 'Вакансію не знайдено');
  const v = vacancyFromBody(await readBody(req));
  const cols = Object.keys(v);
  db.prepare(`UPDATE vacancies SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...cols.map((c) => v[c]), int(p.id));
  return { vacancy: vacancyOut(db.prepare('SELECT * FROM vacancies WHERE id = ?').get(int(p.id))) };
});
route('DELETE', '/api/admin/vacancies/:id', (req, p) => { requireAdmin(req); db.prepare('DELETE FROM vacancies WHERE id = ?').run(int(p.id)); return { ok: true }; });

route('GET', '/api/admin/settings', (req) => { requireAdmin(req); return { settings: getSettings() }; });
route('PUT', '/api/admin/settings', async (req) => {
  requireAdmin(req);
  const b = await readBody(req);
  if (b.settings) {
    const s = { ...b.settings };
    if ('phone' in s) s.phone = U.normPhone(s.phone);
    if ('telegram' in s) s.telegram = str(s.telegram, 60).replace(/^@|^https?:\/\/t\.me\//g, '');
    for (const k of ['map_url', 'marketplace_url']) if (s[k] && !/^https:\/\//.test(s[k])) s[k] = '';
    setSettings(s);
  }
  if (b.newPassword) {
    if (process.env.ADMIN_PASSWORD) throw new HttpError(400, 'Пароль задано змінною ADMIN_PASSWORD на сервері — змініть його там');
    if (String(b.newPassword).length < 8) throw new HttpError(400, 'Пароль має бути не коротшим за 8 символів');
    db.prepare("INSERT INTO settings (key, value) VALUES ('admin_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(U.hashPassword(b.newPassword)));
  }
  return { settings: getSettings() };
});

// ───────────────────────── статика
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob: https://images.prom.ua; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
};

function serveFile(req, res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return notFound(req, res);
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const etag = `"${st.size.toString(36)}-${st.mtimeMs.toString(36)}"`;
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag }); return res.end(); }
    const headers = { 'Content-Type': type, 'Cache-Control': cache, ETag: etag, ...SECURITY_HEADERS };
    const gz = /\.(html|css|js|svg|json|webmanifest|txt)$/.test(ext) && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
    if (gz) {
      res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res);
    } else {
      res.writeHead(200, { ...headers, 'Content-Length': st.size });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    }
  });
}
function notFound(req, res) {
  const html = seo.renderPage(req, '/404', publicUrl(req));
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', ...SECURITY_HEADERS });
  res.end(html);
}

// ───────────────────────── сервер
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const pathname = decodeURIComponent(url.pathname);
  try {
    if (pathname.startsWith('/api/')) {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(pathname);
        if (!m) continue;
        const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
        let out = await r.handler(req, params, Object.fromEntries(url.searchParams), res);
        let headers = {};
        if (Array.isArray(out)) [out, headers] = out;
        if (out && out.raw !== undefined) {
          res.writeHead(200, { 'Cache-Control': 'no-store', ...out.headers });
          return res.end(out.raw);
        }
        return send(res, 200, out, headers, req);
      }
      throw new HttpError(404, 'Не знайдено');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Метод не підтримується');

    if (pathname === '/robots.txt') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${publicUrl(req)}/sitemap.xml\n`);
    }
    if (pathname === '/sitemap.xml') {
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
      return res.end(seo.sitemap(publicUrl(req)));
    }
    if (pathname.startsWith('/uploads/')) {
      const name = path.basename(pathname);
      if (!/^[a-f0-9]+\.(jpg|png|webp)$/.test(name)) return notFound(req, res);
      return serveFile(req, res, path.join(UPLOAD_DIR, name), 'public, max-age=31536000, immutable');
    }
    // Файли з public/ (css, js, img, manifest)
    if (/\.[a-z0-9]+$/i.test(pathname)) {
      const file = path.normalize(path.join(PUBLIC_DIR, pathname));
      if (!file.startsWith(PUBLIC_DIR + path.sep)) return notFound(req, res);
      const cache = /\/(css|js)\//.test(pathname) && url.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
      return serveFile(req, res, file, cache);
    }
    // Сторінки сайту: HTML з заголовками й описом для Google та соцмереж.
    const page = seo.renderPage(req, pathname, publicUrl(req));
    if (!page) return notFound(req, res);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', ...SECURITY_HEADERS });
    return res.end(req.method === 'HEAD' ? undefined : page);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    if (pathname.startsWith('/api/')) return send(res, status, { error: status === 500 ? 'Помилка сервера. Спробуйте ще раз.' : e.message });
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(e.message);
  }
});

seedIfEmpty();
ensureAdminPassword();
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`БХ: сайт працює на http://localhost:${PORT}  ·  адмінка: http://localhost:${PORT}/admin`);
    setTimeout(() => cacheRemoteImages().catch((e) => console.error('Фото:', e.message)), 1500);
  });
}

module.exports = { server };
