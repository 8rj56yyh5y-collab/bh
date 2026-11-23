'use strict';
const fs = require('node:fs');
const path = require('node:path');
let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.error(`\n❌ Потрібен Node.js 22.13 або новіший (зараз ${process.version}): вбудована база node:sqlite недоступна.`);
  console.error('   На Render задайте змінну NODE_VERSION=22.22.0. Локально оновіть Node.js з https://nodejs.org\n');
  process.exit(1);
}

// DATA_DIR — постійна папка для бази, фото й вкладень (на хостингу — підключений диск, наприклад /var/data).
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');       // фото каталогу — публічні
const FILES_DIR = path.join(DATA_DIR, 'files');          // вкладення заявок (креслення, резюме) — лише для адміна
for (const d of [DATA_DIR, UPLOAD_DIR, FILES_DIR]) fs.mkdirSync(d, { recursive: true });

const db = new DatabaseSync(process.env.DB_PATH || path.join(DATA_DIR, 'bh.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
// LOWER()/LIKE у SQLite працюють лише з ASCII — для пошуку кирилицею.
db.function('ulower', { deterministic: true }, (s) => (s == null ? null : String(s).toLowerCase()));

db.exec(`
CREATE TABLE IF NOT EXISTS items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  kind         TEXT NOT NULL DEFAULT 'equipment',   -- equipment | product | service
  category     TEXT NOT NULL DEFAULT 'other-eq',
  title        TEXT NOT NULL,
  title_ru     TEXT NOT NULL DEFAULT '',
  title_en     TEXT NOT NULL DEFAULT '',
  summary      TEXT NOT NULL DEFAULT '',
  summary_ru   TEXT NOT NULL DEFAULT '',
  summary_en   TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  description_ru TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  specs        TEXT NOT NULL DEFAULT '[]',          -- [[назва, значення], …]
  highlights   TEXT NOT NULL DEFAULT '[]',          -- 3–4 ключові цифри для картки: [[значення, підпис], …]
  price        INTEGER,                             -- грн; NULL — ціна за запитом
  price_type   TEXT NOT NULL DEFAULT 'fixed',       -- fixed | from | request
  price_note   TEXT NOT NULL DEFAULT '',
  unit         TEXT NOT NULL DEFAULT 'шт.',
  availability TEXT NOT NULL DEFAULT 'order',       -- stock | order | preorder
  lead_time    TEXT NOT NULL DEFAULT '',
  rent         INTEGER NOT NULL DEFAULT 0,          -- 1 — можна взяти в оренду
  custom       INTEGER NOT NULL DEFAULT 1,          -- 1 — виготовляємо під параметри замовника
  plastic_kg   REAL,                                -- для виробів: скільки пластику йде на 1 од. (рахуємо кришечки)
  images       TEXT NOT NULL DEFAULT '[]',
  featured     INTEGER NOT NULL DEFAULT 0,
  published    INTEGER NOT NULL DEFAULT 1,
  sort         INTEGER NOT NULL DEFAULT 100,
  source_url   TEXT NOT NULL DEFAULT '',
  views        INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS items_kind ON items(kind, published, sort);

CREATE TABLE IF NOT EXISTS requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',
  items       TEXT NOT NULL DEFAULT '[]',     -- [{id, slug, title, qty, mode}]
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  company     TEXT NOT NULL DEFAULT '',
  city        TEXT NOT NULL DEFAULT '',
  contact_via TEXT NOT NULL DEFAULT '',
  message     TEXT NOT NULL DEFAULT '',
  details     TEXT NOT NULL DEFAULT '{}',     -- поля, специфічні для типу заявки
  files       TEXT NOT NULL DEFAULT '[]',     -- [{id, name, size, mime}]
  note        TEXT NOT NULL DEFAULT '',       -- нотатка менеджера
  history     TEXT NOT NULL DEFAULT '[]',
  lang        TEXT NOT NULL DEFAULT 'uk',
  page        TEXT NOT NULL DEFAULT '',
  ip          TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS requests_status ON requests(status, created_at);

CREATE TABLE IF NOT EXISTS vacancies (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'job',   -- job | internship
  schedule     TEXT NOT NULL DEFAULT '',
  salary       TEXT NOT NULL DEFAULT '',
  summary      TEXT NOT NULL DEFAULT '',
  duties       TEXT NOT NULL DEFAULT '[]',
  requirements TEXT NOT NULL DEFAULT '[]',
  offer        TEXT NOT NULL DEFAULT '[]',
  published    INTEGER NOT NULL DEFAULT 1,
  sort         INTEGER NOT NULL DEFAULT 100,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
`);

// ── Налаштування (контакти тощо). Значення за замовчуванням — сайт показує лише заповнені поля.
const DEFAULT_SETTINGS = {
  brand: 'БХ',
  brand_sub: 'Цех обладнання для переробки',
  city: 'Дніпро',
  address: '',
  hours: 'Пн–Пт 8:00–17:00',
  phone: '',
  phone_label: '',
  telegram: '',
  viber: '',
  email: '',
  map_url: '',
  legal: '',
  marketplace_url: '',
  group_name: '',
  caps_note: 'Приймаємо чисті кришечки від ПЕТ-пляшок (HDPE/PP) будь-якого кольору. Для шкіл, ОСББ та екоініціатив — забираємо від 30 кг.',
};

function getSettings() {
  const out = { ...DEFAULT_SETTINGS };
  for (const r of db.prepare('SELECT key, value FROM settings').all()) {
    try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
  }
  return out;
}
function setSettings(obj) {
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  for (const [k, v] of Object.entries(obj)) {
    if (!(k in DEFAULT_SETTINGS)) continue;
    up.run(k, JSON.stringify(String(v ?? '').slice(0, 1000)));
  }
}

// Міграції для баз попередніх версій.
if (!db.prepare('PRAGMA table_info(items)').all().some((c) => c.name === 'extra')) {
  db.exec("ALTER TABLE items ADD COLUMN extra TEXT NOT NULL DEFAULT '{}'");
}
if (!db.prepare('PRAGMA table_info(items)').all().some((c) => c.name === 'origin')) {
  db.exec("ALTER TABLE items ADD COLUMN origin TEXT NOT NULL DEFAULT 'own'");
}

const parseJSON = (s, def) => { try { return JSON.parse(s); } catch { return def; } };

module.exports = { db, DATA_DIR, UPLOAD_DIR, FILES_DIR, getSettings, setSettings, DEFAULT_SETTINGS, parseJSON };
