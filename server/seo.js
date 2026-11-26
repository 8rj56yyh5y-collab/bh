'use strict';
/*
 * Сторінки для Google і соцмереж: кожна адреса сайту віддає HTML із власним заголовком, описом,
 * картинкою для прев’ю (Open Graph), розміткою schema.org і базовим текстом сторінки.
 * Далі браузер запускає app.js і малює повну інтерактивну сторінку.
 */
const fs = require('node:fs');
const path = require('node:path');
const { db, getSettings, parseJSON } = require('./db');
const { KINDS, CATEGORIES } = require('./catalog');
const { esc } = require('./util');

const TEMPLATE_PATH = path.join(__dirname, '..', 'public', 'index.html');
let template = null;
let templateMtime = 0;
function getTemplate() {
  const st = fs.statSync(TEMPLATE_PATH);
  if (!template || st.mtimeMs !== templateMtime) {
    // Версія файлів у посиланнях (?v=…) — щоб після оновлення сайту браузери не тримали старі css/js.
    const ver = ['css/app.css', 'css/pages.css', 'css/brand.css', 'js/app.js', 'js/i18n.js', 'js/admin.js']
      .map((f) => { try { return fs.statSync(path.join(__dirname, '..', 'public', f)).mtimeMs; } catch { return 0; } })
      .reduce((a, b) => a + b, 0).toString(36).slice(-8);
    template = fs.readFileSync(TEMPLATE_PATH, 'utf8').replaceAll('__V__', ver);
    templateMtime = st.mtimeMs;
  }
  return template;
}

const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const money = (n) => Number(n).toLocaleString('uk-UA').replace(/\u00a0/g, ' ');
const priceText = (it) => (it.price_type === 'request' || it.price == null ? (it.price_note || 'Ціна за запитом')
  : `${it.price_type === 'from' ? 'від ' : ''}${money(it.price)} ₴`);

const KIND_BY_PATH = Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [v.path, k]));

const PAGES = {
  '/': ['БХ — перетворюємо вторсировину на готовий продукт', 'Цех БХ, Дніпро: проєктуємо й виготовляємо дробарки, екструдери, тиглі, форми, контейнери та лінії переробки металу, пластику, скла й деревини; вироби з вторсировини; обробка на ЧПУ.'],
  '/equipment': ['Обладнання для переробки — каталог БХ', 'Дробарки для пластику, екструдери, тиглі, форми для лиття на ЧПУ, контейнери для мультиліфта. Власне виробництво БХ, а також збирання під замовлення й постачання.'],
  '/products': ['Вироби з переробленого пластику та кришечок — БХ', 'Лавки, брус, урни, бордюри, столи з кришечок під замовлення. Склянки з пляшок, мангали, тротуарна плитка.'],
  '/services': ['Послуги цеху: ЧПУ, проєктування, 3D-друк — БХ', 'Плазмова різка, фрезерування, лазерне гравіювання, 3D-друк, нестандартне обладнання під вашу задачу.'],
  '/caps': ['Кришечки → лавки: вироби з кришечок під замовлення — БХ', 'Переробляємо пластикові кришечки на лавки, урни, брус і таблички. Замовте вироби або здайте зібрані кришечки.'],
  '/partners': ['Партнерство з БХ: навчання, спільне виробництво, дилерство', 'Навчаємо запуску переробки, приймаємо на стажування, шукаємо дилерів, постачальників сировини та партнерів для спільних проєктів.'],
  '/careers': ['Вакансії та стажування — БХ', 'Зварювальники, оператори ЧПУ, інженери-конструктори, стажування в цеху з переробки та виробництва обладнання.'],
  '/about': ['Про БХ — цех обладнання для переробки', 'Хто ми, чим займаємося і як працюємо: від металобрухту й кришечок до обладнання та готових виробів.'],
  '/contacts': ['Контакти — БХ', 'Як зв’язатися з цехом БХ: телефон, Telegram, адреса, форма заявки.'],
  '/request': ['Ваша заявка — БХ', 'Список обладнання та виробів для запиту комерційної пропозиції.'],
  '/admin': ['Адмінка — БХ', ''],
  '/404': ['Сторінку не знайдено — БХ', ''],
};

function itemForPath(pathname) {
  const m = /^\/(equipment|products|services)\/([a-z0-9-]+)\/?$/.exec(pathname);
  if (!m) return undefined;
  const it = db.prepare('SELECT * FROM items WHERE slug = ? AND published = 1').get(m[2]);
  if (!it || KINDS[it.kind].path !== m[1]) return null;
  return it;
}

function renderPage(req, pathname, base) {
  const p = pathname.replace(/\/+$/, '') || '/';
  const s = getSettings();
  let title, desc, image = `${base}/img/og.png`, ssr = '', ld = [];
  const org = {
    '@context': 'https://schema.org', '@type': 'Organization', name: s.brand, description: s.brand_sub, url: base,
    logo: `${base}/img/logo.svg`, address: { '@type': 'PostalAddress', addressLocality: s.city, streetAddress: s.address || undefined, addressCountry: 'UA' },
    telephone: s.phone || undefined, email: s.email || undefined,
  };

  const item = itemForPath(p);
  if (item === null) return null;
  if (item) {
    const imgs = parseJSON(item.images, []);
    const specs = parseJSON(item.specs, []);
    title = `${item.title} — ${priceText(item)} | БХ`;
    desc = clip(item.summary || item.description, 160);
    if (imgs[0]) image = imgs[0].startsWith('http') ? imgs[0] : `${base}${imgs[0]}`;
    const cat = CATEGORIES.find((c) => c.slug === item.category);
    ssr = `<nav><a href="/">Головна</a> › <a href="/${KINDS[item.kind].path}">${esc(KINDS[item.kind].uk)}</a>${cat ? ` › ${esc(cat.uk)}` : ''}</nav>
      <h1>${esc(item.title)}</h1><p><b>${esc(priceText(item))}</b></p><p>${esc(item.summary)}</p>
      ${imgs[0] ? `<img src="${esc(imgs[0])}" alt="${esc(item.title)}" width="640">` : ''}
      ${specs.length ? `<table>${specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>` : ''}
      <div>${esc(item.description).replace(/\n/g, '<br>')}</div>`;
    const product = {
      '@context': 'https://schema.org', '@type': item.kind === 'service' ? 'Service' : 'Product', name: item.title,
      description: clip(item.summary || item.description, 500), image: imgs.map((u) => (u.startsWith('http') ? u : `${base}${u}`)),
      url: `${base}${p}`, brand: { '@type': 'Brand', name: s.brand }, category: cat?.uk,
    };
    if (item.kind === 'service') { delete product.brand; product.provider = { '@type': 'Organization', name: s.brand }; }
    if (item.kind !== 'service' && item.price != null && item.price_type !== 'request') {
      product.offers = { '@type': 'Offer', priceCurrency: 'UAH', price: item.price, url: `${base}${p}`,
        availability: item.availability === 'stock' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder' };
    }
    ld.push(product, {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Головна', item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: KINDS[item.kind].uk, item: `${base}/${KINDS[item.kind].path}` },
        { '@type': 'ListItem', position: 3, name: item.title, item: `${base}${p}` },
      ],
    });
  } else {
    if (!PAGES[p]) return null;
    [title, desc] = PAGES[p];
    const kind = KIND_BY_PATH[p.slice(1)];
    if (kind || p === '/' || p === '/caps') {
      const rows = db.prepare(`SELECT slug, kind, title, summary, price, price_type, price_note FROM items WHERE published = 1 ${kind ? 'AND kind = ?' : p === '/caps' ? "AND category = 'caps'" : 'AND featured = 1'} ORDER BY sort, id`).all(...(kind ? [kind] : []));
      ssr = `<h1>${esc(title.split(' — ')[0])}</h1><p>${esc(desc)}</p><ul>${rows.map((r) => `<li><a href="/${KINDS[r.kind].path}/${r.slug}">${esc(r.title)}</a> — ${esc(priceText(r))}. ${esc(r.summary)}</li>`).join('')}</ul>`;
    } else if (p === '/careers') {
      const rows = db.prepare('SELECT title, summary, schedule FROM vacancies WHERE published = 1 ORDER BY sort, id').all();
      ssr = `<h1>Вакансії та стажування</h1><ul>${rows.map((v) => `<li><b>${esc(v.title)}</b> — ${esc(v.schedule)}. ${esc(v.summary)}</li>`).join('')}</ul>`;
      ld.push(...db.prepare('SELECT * FROM vacancies WHERE published = 1').all().map((v) => ({
        '@context': 'https://schema.org', '@type': 'JobPosting', title: v.title, description: v.summary, datePosted: v.created_at.slice(0, 10),
        employmentType: v.kind === 'internship' ? 'INTERN' : 'FULL_TIME', hiringOrganization: { '@type': 'Organization', name: s.brand, sameAs: base },
        jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: s.city, addressCountry: 'UA' } },
      })));
    } else {
      ssr = `<h1>${esc(title.split(' — ')[0])}</h1><p>${esc(desc)}</p>`;
    }
    if (p === '/') ld.push(org);
  }

  const noindex = p === '/admin' || p === '/404' || p === '/request';
  const meta = [
    `<title>${esc(title)}</title>`,
    desc ? `<meta name="description" content="${esc(desc)}">` : '',
    noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(base + (p === '/' ? '/' : p))}">`,
    `<meta property="og:type" content="${item ? 'product' : 'website'}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    desc ? `<meta property="og:description" content="${esc(desc)}">` : '',
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:url" content="${esc(base + p)}">`,
    '<meta property="og:locale" content="uk_UA">',
    '<meta name="twitter:card" content="summary_large_image">',
    process.env.GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${esc(process.env.GOOGLE_SITE_VERIFICATION)}">` : '',
    ...ld.map((x) => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`),
  ].filter(Boolean).join('\n  ');

  return getTemplate().replace('<!--META-->', meta).replace('<!--SSR-->', `<div class="ssr">${ssr}</div>`);
}

function sitemap(base) {
  const urls = ['/', '/equipment', '/products', '/caps', '/services', '/partners', '/careers', '/about', '/contacts'].map((u) => ({ loc: u }));
  for (const r of db.prepare('SELECT slug, kind, updated_at FROM items WHERE published = 1').all()) {
    urls.push({ loc: `/${KINDS[r.kind].path}/${r.slug}`, lastmod: r.updated_at.slice(0, 10) });
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) =>
    `  <url><loc>${esc(base + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
}

module.exports = { renderPage, sitemap };
