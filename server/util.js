'use strict';
const crypto = require('node:crypto');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const str = (v, max = 200) => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, max);
const int = (v, def = 0) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Math.trunc(Number(v)) : def);
const bool = (v) => (v === true || v === 1 || v === '1' || v === 'true' || v === 'on' ? 1 : 0);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Транслітерація для адрес сторінок (офіційна українська, спрощена).
const TR = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '',
  ю: 'iu', я: 'ia', ы: 'y', э: 'e', ё: 'e', ъ: '', '’': '', "'": '', 'ʼ': '',
};
function slugify(s) {
  return String(s || '').toLowerCase().split('').map((c) => (c in TR ? TR[c] : c)).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `item-${Date.now().toString(36)}`;
}

function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(String(pw), salt, 64).toString('hex')}`;
}
function checkPassword(pw, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = crypto.scryptSync(String(pw), salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Простий ліміт запитів у пам’яті: key → мітки часу.
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { buckets.set(key, arr); return false; }
  arr.push(now); buckets.set(key, arr);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  return true;
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const normPhone = (p) => {
  const d = String(p || '').replace(/[^\d+]/g, '');
  if (/^0\d{9}$/.test(d)) return `+38${d}`;
  if (/^380\d{9}$/.test(d)) return `+${d}`;
  return d.slice(0, 20);
};

// Розпізнаємо тип файлу за «магічними» байтами — не довіряємо розширенню.
function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

function decodeDataUrl(s, maxBytes) {
  const m = /^data:([\w/+.-]+)?;base64,([A-Za-z0-9+/=\s]+)$/.exec(String(s || ''));
  if (!m) throw new HttpError(400, 'Некоректний файл');
  if (m[2].length * 0.75 > maxBytes + 4) throw new HttpError(413, `Файл завеликий (максимум ${Math.round(maxBytes / 1048576)} МБ)`);
  return { mime: m[1] || 'application/octet-stream', buf: Buffer.from(m[2], 'base64') };
}

module.exports = { HttpError, str, int, bool, clamp, esc, slugify, hashPassword, checkPassword, rateLimit, parseCookies, normPhone, sniffImage, decodeDataUrl };
