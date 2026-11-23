'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, UPLOAD_DIR, parseJSON } = require('./db');

const ITEM_FIELDS = ['slug', 'kind', 'category', 'title', 'title_ru', 'title_en', 'summary', 'summary_ru', 'summary_en',
  'description', 'description_ru', 'description_en', 'specs', 'highlights', 'price', 'price_type', 'price_note', 'unit',
  'availability', 'lead_time', 'rent', 'custom', 'plastic_kg', 'images', 'featured', 'published', 'sort', 'source_url', 'extra', 'origin'];

function insertItem(it) {
  const row = {
    title_ru: '', title_en: '', summary: '', summary_ru: '', summary_en: '', description: '', description_ru: '', description_en: '',
    specs: [], highlights: [], price: null, price_type: 'fixed', price_note: '', unit: 'шт.', availability: 'order', lead_time: '',
    rent: 0, custom: 1, plastic_kg: null, images: [], featured: 0, published: 1, sort: 100, source_url: '', origin: 'own', ...it,
  };
  row.extra = JSON.stringify(it.extra || require('../seed/extra')[it.slug] || {});
  row.specs = JSON.stringify(row.specs);
  row.highlights = JSON.stringify(row.highlights);
  row.images = JSON.stringify(row.images);
  const cols = ITEM_FIELDS.join(', ');
  const qs = ITEM_FIELDS.map(() => '?').join(', ');
  return db.prepare(`INSERT INTO items (${cols}) VALUES (${qs})`).run(...ITEM_FIELDS.map((f) => row[f] ?? null));
}

function seedIfEmpty() {
  if (process.env.SEED === '0') return;
  if (!db.prepare('SELECT COUNT(*) n FROM items').get().n) {
    const items = require('../seed/items');
    for (const it of items) insertItem(it);
    console.log(`Каталог: завантажено ${items.length} позицій (обладнання, вироби, послуги).`);
  }
  fixContent();
  // Розширені описи сторінок товарів: доповнюємо позиції, де їх ще немає (бази попередніх версій).
  const extra = require('../seed/extra');
  const upd = db.prepare("UPDATE items SET extra = ? WHERE slug = ? AND (extra = '{}' OR extra = '')");
  for (const [slug, x] of Object.entries(extra)) upd.run(JSON.stringify(x), slug);
  if (!db.prepare('SELECT COUNT(*) n FROM vacancies').get().n && !db.prepare("SELECT 1 FROM settings WHERE key = 'vacancies_seeded'").get()) {
    const ins = db.prepare('INSERT INTO vacancies (title, kind, schedule, salary, summary, duties, requirements, offer, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const v of require('../seed/vacancies')) {
      ins.run(v.title, v.kind, v.schedule, v.salary, v.summary, JSON.stringify(v.duties), JSON.stringify(v.requirements), JSON.stringify(v.offer), v.sort);
    }
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('vacancies_seeded', '\"1\"')").run();
  }
}

// Виправлення змісту для баз попередніх версій (один раз): прибираємо позиції, що не належать БХ,
// проставляємо походження і замінюємо описи, у яких були неточності щодо виробництва.
const CONTENT_VERSION = 3;
const REMOVED = ['liniya-vyrobnytstva-pelet-1-t-god', 'derevoobrobne-pidpryiemstvo-karpaty'];
const REWRITTEN = ['shnekovyi-ekstruder-dlya-plastyku', 'elektrychnyi-tyhel-dlya-plavlennya', 'kontejner-dlya-multylifta-scania',
  'modulnyi-zbirno-rozbirnyi-kontejner-pir-100', 'komplekt-led-fitolamp-1600-vt', 'pich-burzhuika-z-dymokhodom', 'frezerna-obrobka-chpu'];
function fixContent() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'content_v'").get();
  if (row && Number(parseJSON(row.value, 0)) >= CONTENT_VERSION) return;
  const items = require('../seed/items');
  const extra = require('../seed/extra');
  const del = db.prepare('UPDATE items SET published = 0 WHERE slug = ?');
  for (const slug of REMOVED) del.run(slug);
  const org = db.prepare('UPDATE items SET origin = ? WHERE slug = ?');
  const txt = db.prepare("UPDATE items SET description = ?, extra = ?, updated_at = datetime('now') WHERE slug = ?");
  for (const it of items) {
    org.run(it.origin || 'own', it.slug);
    if (REWRITTEN.includes(it.slug)) txt.run(it.description, JSON.stringify(extra[it.slug] || {}), it.slug);
  }
  db.prepare("INSERT INTO settings (key, value) VALUES ('content_v', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(CONTENT_VERSION));
}

// Фото з Prom завантажуємо на свій диск у фоні: сайт не залежить від чужого сервера.
// Якщо завантажити не вдалося — лишається посилання на оригінал, спробуємо при наступному запуску.
async function cacheRemoteImages({ log = console.log } = {}) {
  if (process.env.CACHE_IMAGES === '0') return;
  const rows = db.prepare("SELECT id, images FROM items WHERE images LIKE '%http%'").all();
  if (!rows.length) return;
  const upd = db.prepare("UPDATE items SET images = ? WHERE id = ?");
  const cache = new Map();
  let ok = 0, fail = 0;
  for (const r of rows) {
    const imgs = parseJSON(r.images, []);
    let changed = false;
    for (const [i, url] of imgs.entries()) {
      if (!/^https?:\/\//.test(url)) continue;
      try {
        let local = cache.get(url);
        if (!local) {
          const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const type = res.headers.get('content-type') || '';
          if (!/^image\//.test(type)) throw new Error('not an image');
          const buf = Buffer.from(await res.arrayBuffer());
          const ext = /png/.test(type) ? 'png' : /webp/.test(type) ? 'webp' : 'jpg';
          const name = `${crypto.randomBytes(10).toString('hex')}.${ext}`;
          fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
          local = `/uploads/${name}`;
          cache.set(url, local);
        }
        imgs[i] = local; changed = true; ok++;
      } catch { fail++; }
    }
    // Читаємо свіжий рядок: адмін міг змінити фото, поки ми качали.
    if (changed) {
      const fresh = parseJSON(db.prepare('SELECT images FROM items WHERE id = ?').get(r.id)?.images, []);
      const merged = fresh.map((u) => cache.get(u) || u);
      upd.run(JSON.stringify(merged), r.id);
    }
  }
  if (ok || fail) log(`Фото каталогу: збережено на диск ${ok}${fail ? `, не вдалося ${fail} (показуємо з оригінального сайту)` : ''}`);
}

module.exports = { seedIfEmpty, cacheRemoteImages, insertItem, ITEM_FIELDS };
