'use strict';
// Перевірка основних сценаріїв: каталог, сторінки для Google, заявки, адмінка. Запуск: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-test-'));
process.env.DATA_DIR = dir;
process.env.ADMIN_PASSWORD = 'secret-pass-1';
process.env.CACHE_IMAGES = '0';
const { server } = require('../server/index.js');
let base;
let cookie = '';

before(() => new Promise((ok) => server.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; ok(); })));
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

const req = async (url, opts = {}) => {
  const res = await fetch(base + url, { ...opts, headers: { 'Content-Type': 'application/json', cookie, ...(opts.headers || {}) } });
  const type = res.headers.get('content-type') || '';
  return { status: res.status, headers: res.headers, body: type.includes('json') ? await res.json() : await res.text() };
};

test('каталог: усе обладнання з маркетплейсу на місці', async () => {
  const { body } = await req('/api/items?kind=equipment');
  const titles = body.items.map((i) => i.title).join(' | ');
  for (const w of ['Дробарка', 'екструдер', 'тигель', 'мультиліфта', 'Модульний', 'фітоламп', 'буржуйка']) assert.match(titles, new RegExp(w, 'i'));
  // пелетна лінія й «Карпати» — окреме підприємство, до БХ не належать
  assert.doesNotMatch(titles, /пелет|Карпати/i);
  const byOrigin = Object.fromEntries(body.items.map((i) => [i.slug, i.origin]));
  assert.equal(byOrigin['forma-dlya-lyttya-hryppa-100-g'], 'own');
  assert.equal(byOrigin['modulnyi-zbirno-rozbirnyi-kontejner-pir-100'], 'order');
  assert.equal(byOrigin['komplekt-led-fitolamp-1600-vt'], 'supply');
  const meta = (await req('/api/meta')).body;
  assert.ok(meta.counts.product >= 8 && meta.counts.service >= 5);
});

test('сторінка позиції віддає заголовок, опис і schema.org', async () => {
  const r = await req('/equipment/shnekovyi-ekstruder-dlya-plastyku');
  assert.equal(r.status, 200);
  assert.match(r.body, /<title>Шнековий екструдер[^<]*20 500 ₴/);
  assert.match(r.body, /"@type":"Product"/);
  assert.equal((await req('/products/shnekovyi-ekstruder-dlya-plastyku')).status, 404);
  assert.equal((await req('/nope')).status, 404);
  const sm = await req('/sitemap.xml');
  assert.match(sm.body, /\/caps<\/loc>/);
});

test('заявка: валідація, збереження, файли', async () => {
  const bad = await req('/api/requests', { method: 'POST', body: JSON.stringify({ type: 'product', name: 'А' }) });
  assert.equal(bad.status, 400);
  const items = (await req('/api/items?kind=product')).body.items;
  const ok = await req('/api/requests', { method: 'POST', body: JSON.stringify({
    type: 'product', name: 'Олена', phone: '067 123 45 67', items: [{ id: items[0].id, qty: 3 }],
    details: { color: 'Мікс', branding: true }, message: 'Лавки для школи',
    files: [{ name: 'plan.pdf', data: `data:application/pdf;base64,${Buffer.from('%PDF-1.4 test').toString('base64')}` }],
  }) });
  assert.equal(ok.status, 200);
  assert.match(ok.body.number, /^BH-\d{5}$/);
  const evil = await req('/api/requests', { method: 'POST', body: JSON.stringify({ type: 'job', name: 'Іван', phone: '0671234567', files: [{ name: 'x.exe', data: 'data:;base64,AAAA' }] }) });
  assert.equal(evil.status, 400);
});

test('адмінка: доступ лише з паролем', async () => {
  assert.equal((await req('/api/admin/requests')).status, 401);
  assert.equal((await req('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: 'wrong' }) })).status, 401);
  const r = await req('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: 'secret-pass-1' }) });
  assert.equal(r.status, 200);
  cookie = r.headers.get('set-cookie').split(';')[0];
  const list = (await req('/api/admin/requests')).body;
  assert.equal(list.requests.length, 1);
  const rq = list.requests[0];
  assert.equal(rq.phone, '+380671234567');
  assert.equal(rq.items[0].qty, 3);
  const file = await fetch(`${base}/api/admin/files/${rq.id}/${rq.files[0].id}`, { headers: { cookie } });
  assert.equal(await file.text(), '%PDF-1.4 test');
  const upd = await req(`/api/admin/requests/${rq.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'work', note: 'передзвонити' }) });
  assert.equal(upd.body.request.status, 'work');
  const csv = await req('/api/admin/requests.csv');
  assert.match(csv.body, /Олена/);
});

test('адмінка: додати, змінити, приховати та видалити обладнання', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const up = await req('/api/admin/upload', { method: 'POST', body: JSON.stringify({ data: `data:image/png;base64,${png.toString('base64')}` }) });
  assert.match(up.body.url, /^\/uploads\/[a-f0-9]+\.png$/);
  const c = await req('/api/admin/items', { method: 'POST', body: JSON.stringify({
    kind: 'equipment', category: 'plastic', title: 'Прес для кришечок', price_type: 'request', images: [up.body.url],
    specs: [['Зусилля', '20 т']], rent: true,
  }) });
  assert.equal(c.status, 200);
  assert.equal(c.body.item.slug, 'pres-dlia-kryshechok');
  assert.equal((await req('/equipment/pres-dlia-kryshechok')).status, 200);
  await req(`/api/admin/items/${c.body.item.id}`, { method: 'PATCH', body: JSON.stringify({ published: false }) });
  assert.equal((await req('/equipment/pres-dlia-kryshechok')).status, 404);
  // збереження без поля extra не стирає розповідь товару
  const ex = (await req('/api/items/drobarka-dlya-plastyku-1-5-kvt')).body.item;
  assert.ok(ex.extra.how.length >= 3);
  await req(`/api/admin/items/${ex.id}`, { method: 'PUT', body: JSON.stringify({ ...ex, extra: undefined, price: 36000 }) });
  const ex2 = (await req('/api/items/drobarka-dlya-plastyku-1-5-kvt')).body.item;
  assert.equal(ex2.price, 36000);
  assert.equal(ex2.extra.how.length, ex.extra.how.length);
  assert.equal((await req('/solutions')).status, 404);
  assert.equal((await req(`/api/admin/items/${c.body.item.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await fetch(base + up.body.url)).status, 404);
});

test('вакансії та налаштування', async () => {
  const v = (await req('/api/vacancies')).body.vacancies;
  assert.ok(v.length >= 3);
  const s = await req('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ settings: { phone: '095 111 22 33', telegram: '@bh_test', map_url: 'javascript:alert(1)' } }) });
  assert.equal(s.body.settings.phone, '+380951112233');
  assert.equal(s.body.settings.telegram, 'bh_test');
  assert.equal(s.body.settings.map_url, '');
});
