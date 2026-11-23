/* БХ — односторінковий сайт: маршрутизація, сторінки, форми заявок, кошик заявки. Без залежностей. */
'use strict';
(() => {
  const D = window.BH_I18N;
  const LANGS = ['uk', 'ru', 'en'];
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватний режим */ } },
  };

  // ── мова
  let lang = (() => {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) { store.set('bh-lang', q); return q; }
    const s = store.get('bh-lang');
    if (LANGS.includes(s)) return s;
    return /^ru/i.test(navigator.language) ? 'ru' : 'uk';
  })();
  const LI = () => LANGS.indexOf(lang);
  function t(key, vars) {
    const v = D[key];
    let s = Array.isArray(v) ? (v[LI()] ?? v[0]) : key;
    if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    return s;
  }
  const L = (o, f) => (lang !== 'uk' && o[`${f}_${lang}`]) || o[f] || ''; // поле позиції з перекладом
  const N = (n) => Number(n).toLocaleString(lang === 'en' ? 'en-US' : 'uk-UA').replace(/ /g, ' ');

  // ── іконки (лінійні, 24×24)
  const I = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', arrowUR: '<path d="M7 17 17 7M8 7h9v9"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    clip: '<path d="M8 7h8M8 11h8M8 15h5"/><rect x="4" y="3" width="16" height="18" rx="3"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    send: '<path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z"/><path d="m10 13 4.5-4.5"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    pin: '<path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>', file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/>',
    chevL: '<path d="m15 6-6 6 6 6"/>', chevR: '<path d="m9 6 6 6-6 6"/>', zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
    shredder: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M7 9V5h10v4M8 14h8M9 20v-3M12 20v-3M15 20v-3"/>',
    flame: '<path d="M12 21c4 0 7-2.7 7-6.5 0-3.4-2.4-5.6-4-7.5-.3 2-1.4 3-2.5 3.5C12.7 7.6 11.5 5 9 3c.3 3-1.7 5-3 7-1.1 1.6-1 3-1 4.5C5 18.3 8 21 12 21Z"/>',
    pellet: '<rect x="4" y="9" width="6" height="6" rx="3"/><rect x="14" y="5" width="6" height="6" rx="3"/><rect x="12" y="14" width="6" height="6" rx="3"/>',
    container: '<path d="M2 8h20v10H2z"/><path d="M6 8v10M10 8v10M14 8v10M18 8v10"/>', leaf: '<path d="M5 19c8 0 14-6 14-15C10 4 5 9 5 15v4Zm0 0 7-7"/>',
    heat: '<path d="M8 4c-1.5 2 1.5 3.5 0 6M12 4c-1.5 2 1.5 3.5 0 6M16 4c-1.5 2 1.5 3.5 0 6"/><rect x="4" y="13" width="16" height="7" rx="2"/>',
    factory: '<path d="M3 21V10l6 3V10l6 3V6h6v15H3Z"/><path d="M7 17h2M12 17h2M17 17h1"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    caps: '<circle cx="7" cy="8" r="3.5"/><circle cx="16.5" cy="7" r="3"/><circle cx="12" cy="16" r="4"/>', glass: '<path d="M7 3h10l-1.5 17a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1L7 3Z"/><path d="M7.4 8h9.2"/>',
    anvil: '<path d="M3 7h13a5 5 0 0 1-5 5H9v3h4v4H6v-4h3v-3c-3 0-6-2-6-5Z"/><path d="M16 7h5"/>', tile: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    cnc: '<path d="M4 20h16M6 20V9h12v11"/><path d="M12 4v8M9 4h6M12 12l-2 3h4l-2-3"/>', blueprint: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 20V9M13 13h4v4h-4z"/>',
    cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5Z"/><path d="M4 20a2 2 0 0 0 2 1h13v-3"/>', handshake: '<path d="m3 11 4-4 5 2 5-2 4 4-7 7a2 2 0 0 1-3 0l-6-5"/><path d="m12 9-3 3a1.5 1.5 0 0 0 2 2l2-2"/>',
    truck: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>', recycle: '<path d="M7 19H4.5a1.5 1.5 0 0 1-1.3-2.3L6 12M9.5 6l1.2-2a1.5 1.5 0 0 1 2.6 0L16 8.5M17 13l2.8 4.7a1.5 1.5 0 0 1-1.3 2.3H12"/><path d="m4 9 2 3 3.4-.6M14 5.5l2 3 3.3-1M14 22l-2-2 2-2"/>',
    wrench: '<path d="M15 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 1-2-2Z"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    school: '<path d="m12 3 10 5-10 5L2 8l10-5Z"/><path d="M6 10v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>', building: '<path d="M4 21V5l8-2v18M12 8h8v13M8 8v.01M8 12v.01M8 16v.01M16 12v.01M16 16v.01M2 21h20"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>', shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    viber: '<path d="M12 3c5 0 8 2.5 8 7.5S17 18 12 18c-.8 0-1.5 0-2.2-.2L6 21v-3.8C4.7 15.9 4 13.4 4 10.5 4 5.5 7 3 12 3Z"/><path d="M9.5 8.5c.3 2.5 2.3 4.6 5 5"/>',
  };
  const icon = (n, size = 20, sw = 1.8) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || I.gear}</svg>`;

  // ── ілюстрації для позицій без фото: «терраццо» з кришечок + силует виробу
  const CAP_COLORS = ['#8C9A93', '#B9C4BE', '#6F7C76', '#A8C7C0', '#C6F432', '#5D6963', '#D5DBD6'];
  function rng(seed) { let h = 2166136261; for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909), (h >>>= 0) / 4294967296)); }
  const SIL = {
    bench: '<g fill="none" stroke="#0A0E0D" stroke-width="10" stroke-linecap="round"><path d="M70 215v60M330 215v60M90 160v55M310 160v55"/></g><rect x="50" y="195" width="300" height="26" rx="8"/><rect x="50" y="150" width="300" height="22" rx="8"/><rect x="50" y="112" width="300" height="22" rx="8"/>',
    beam: '<g transform="rotate(-12 200 170)"><rect x="40" y="120" width="320" height="34" rx="6"/><rect x="60" y="165" width="300" height="34" rx="6"/><rect x="30" y="210" width="330" height="34" rx="6"/></g>',
    bin: '<rect x="120" y="95" width="160" height="22" rx="8"/><path d="M132 125h136l-12 160H144z"/><g stroke="#0A0E0D" stroke-width="7" opacity=".55"><path d="M170 150v110M200 150v110M230 150v110"/></g>',
    border: '<path d="M40 210c40-30 80-30 120 0s80 30 120 0 60-20 80-10v40H40z"/><rect x="40" y="230" width="320" height="30" rx="6"/>',
    table: '<rect x="70" y="120" width="260" height="26" rx="8"/><g fill="none" stroke="#0A0E0D" stroke-width="10" stroke-linecap="round"><path d="M110 146l-30 120M290 146l30 120M200 146v40"/></g><rect x="30" y="215" width="110" height="20" rx="7"/><rect x="260" y="215" width="110" height="20" rx="7"/>',
    sheet: '<g transform="rotate(-8 200 180)"><rect x="80" y="80" width="230" height="170" rx="10"/></g><g transform="rotate(6 220 200)" opacity=".9"><rect x="110" y="110" width="230" height="170" rx="10"/></g>',
    glass: '<path d="M150 90h100l-10 190a10 10 0 0 1-10 9h-60a10 10 0 0 1-10-9z"/><path d="M152 130h96" stroke="#0A0E0D" stroke-width="5" opacity=".4"/>',
    gear: '<circle cx="200" cy="180" r="70"/><circle cx="200" cy="180" r="26" fill="#0A0E0D"/>',
  };
  const SIL_BY_SLUG = [[/lavk|bench/, 'bench'], [/brus|doshk/, 'beam'], [/urn|bak/, 'bin'], [/bordiur/, 'border'], [/stil/, 'table'], [/lyst|panel/, 'sheet'], [/sklyan|vaz/, 'glass']];
  function art(it, opts = {}) {
    const r = rng(it.slug || it.title);
    const dark = '#0F1412';
    const parts = [];
    const n = opts.dense ? 260 : 150;
    for (let i = 0; i < n; i++) {
      const x = r() * 400, y = r() * 300, s = 2 + r() * (opts.dense ? 9 : 7), c = CAP_COLORS[Math.floor(r() * CAP_COLORS.length)];
      parts.push(r() > .5 ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="${c}"/>` : `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(s * 1.6).toFixed(1)}" height="${s.toFixed(1)}" rx="1.5" fill="${c}" transform="rotate(${Math.floor(r() * 180)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`);
    }
    const dots = parts.join('');
    const kind = (SIL_BY_SLUG.find(([re]) => re.test(it.slug || '')) || [])[1];
    const id = `p${Math.floor(r() * 1e9)}`;
    if (opts.terrazzo) {
      return `<svg class="art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${opts.nobg ? '' : '<rect width="400" height="300" fill="#1B2521"/>'}${dots}</svg>`;
    }
    if (!kind || it.kind !== 'product') {
      // обладнання / послуги без фото — креслення з іконкою
      return `<svg class="art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="300" fill="${dark}"/>
        <g stroke="rgba(198,244,50,.09)">${Array.from({ length: 20 }, (_, i) => `<path d="M${i * 20} 0v300M0 ${i * 20}h400"/>`).join('')}</g>
        <g opacity=".45">${parts.slice(0, 26).join('')}</g>
        <g transform="translate(140 90) scale(5)" fill="none" stroke="#C6F432" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${I[(window.BH_CAT_ICON || {})[it.category] || 'gear']}</g></svg>`;
    }
    return `<svg class="art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><pattern id="${id}" width="400" height="300" patternUnits="userSpaceOnUse"><rect width="400" height="300" fill="#22302A"/>${dots}</pattern></defs>
      <rect width="400" height="300" fill="${dark}"/><g fill="url(#${id})">${SIL[kind]}</g></svg>`;
  }

  // ── дані
  let META = null;
  const cache = new Map();
  async function api(url, opts = {}) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, credentials: 'same-origin', ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || t('err.generic')), { status: res.status });
    return data;
  }
  async function cached(url) {
    if (!cache.has(url)) cache.set(url, api(url).catch((e) => { cache.delete(url); throw e; }));
    return cache.get(url);
  }
  const S = () => META.settings;
  const catOf = (slug) => META.categories.find((c) => c.slug === slug);
  const catName = (slug) => { const c = catOf(slug); return c ? c[lang] || c.uk : ''; };
  const kindPath = (k) => META.kinds[k]?.path || 'equipment';
  const itemUrl = (it) => `/${kindPath(it.kind)}/${it.slug}`;
  const telHref = () => (S().phone ? `tel:${S().phone}` : '');
  const tgHref = (text) => (S().telegram ? `https://t.me/${S().telegram}${text ? `?text=${encodeURIComponent(text)}` : ''}` : '');
  const phoneLabel = () => S().phone_label || S().phone || '';

  // ── ціна
  function priceHtml(it, cls = 'price') {
    if (it.price_type === 'request' || it.price == null) return `<span class="${cls} price--req">${esc(it.price_note && lang === 'uk' ? it.price_note : t('price.request'))}</span>`;
    return `<span class="${cls}">${it.price_type === 'from' ? `<small>${t('price.from')} </small>` : ''}${N(it.price)} ₴${it.unit && it.unit !== 'шт.' ? `<small> / ${esc(it.unit)}</small>` : ''}</span>`;
  }
  const priceText = (it) => (it.price_type === 'request' || it.price == null ? t('price.request') : `${it.price_type === 'from' ? `${t('price.from')} ` : ''}${N(it.price)} ₴`);
  const capsOf = (kg) => Math.round((kg * 1000) / 2.5 / 100) * 100;

  // ── кошик заявки (зберігається в браузері)
  const basket = {
    items: store.get('bh-basket', []),
    save() { store.set('bh-basket', this.items); renderBasketBtn(); },
    has(id) { return this.items.some((x) => x.id === id); },
    add(it, qty = 1, mode = '') {
      if (this.has(it.id)) return;
      this.items.push({ id: it.id, slug: it.slug, kind: it.kind, title: it.title, title_ru: it.title_ru, title_en: it.title_en, price: it.price, price_type: it.price_type, unit: it.unit, image: (it.images || [])[0] || '', category: it.category, qty, mode });
      this.save();
    },
    remove(id) { this.items = this.items.filter((x) => x.id !== id); this.save(); },
    clear() { this.items = []; this.save(); },
  };

  // ── оболонка: шапка, меню, підвал
  const NAV = [['/equipment', 'nav.equipment'], ['/products', 'nav.products'], ['/services', 'nav.services'], ['/partners', 'nav.partners'], ['/careers', 'nav.careers'], ['/contacts', 'nav.contacts']];
  function renderShell() {
    document.documentElement.lang = lang === 'uk' ? 'uk' : lang;
    $('[data-s="brand"]').textContent = S().brand;
    $('[data-s="brand_sub"]').textContent = lang === 'uk' ? S().brand_sub : ({ ru: 'Цех оборудования для переработки', en: 'Recycling equipment workshop' })[lang];
    $$('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
    $('#nav').innerHTML = NAV.map(([h, k]) => `<a href="${h}">${t(k)}</a>`).join('');
    const vac = META.vacancies;
    $('#mnav').innerHTML = `<nav aria-label="${t('menu')}">${[['/', 'nav.home'], ...NAV, ['/about', 'nav.about'], ['/request', 'nav.request']].map(([h, k]) => `<a class="mlink" href="${h}">${t(k)}${k === 'nav.careers' && vac ? `<small>${vac}</small>` : ''}${icon('chevR', 18)}</a>`).join('')}</nav>
      <div class="mnav__foot">
        <div class="lang" role="group">${LANGS.map((l) => `<button type="button" data-lang="${l}" class="${l === lang ? 'on' : ''}">${l === 'uk' ? 'UA' : l.toUpperCase()}</button>`).join('')}</div>
        <a class="btn btn--acc btn--block" href="/contacts#form">${t('cta.order')}</a>
        ${telHref() ? `<a class="btn btn--block" href="${telHref()}">${icon('phone', 18)} ${esc(phoneLabel())}</a>` : ''}
        ${tgHref() ? `<a class="btn btn--block" href="${tgHref()}" target="_blank" rel="noopener">${icon('send', 18)} Telegram</a>` : ''}
      </div>`;
    $$('.lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
    $('#burger').innerHTML = icon('menu', 20);
    renderTheme();
    renderBasketBtn();
    renderFooter();
    markNav();
  }
  function renderTheme() {
    const light = document.documentElement.dataset.theme === 'light';
    const b = $('#themeBtn');
    b.innerHTML = icon(light ? 'moon' : 'sun', 19);
    b.setAttribute('aria-label', t(light ? 'theme.dark' : 'theme.light'));
    b.title = b.getAttribute('aria-label');
    $('meta[name=theme-color]').content = light ? '#F3F5F1' : '#0A0E0D';
  }
  function renderBasketBtn() {
    const n = basket.items.length;
    const b = $('#basketBtn');
    b.innerHTML = `${icon('clip', 19)}${n ? `<span class="badge">${n}</span>` : ''}`;
    b.setAttribute('aria-label', `${t('nav.request')}${n ? ` (${n})` : ''}`);
  }
  function renderFooter() {
    const s = S();
    const cats = META.categories.filter((c) => c.kind === 'equipment' && c.count).slice(0, 6);
    $('#ftr').innerHTML = `<div class="wrap">
      <div class="ftr__top">
        <div>
          <a class="logo" href="/"><img class="logo__mark" src="/img/logo.svg" alt="" width="40" height="40"><span class="logo__txt"><b>${esc(s.brand)}</b><small>${esc($('[data-s="brand_sub"]').textContent)}</small></span></a>
          <p class="ftr__about">${t('ft.about')}</p>
          <div class="socials">
            ${telHref() ? `<a class="iconbtn" href="${telHref()}" aria-label="${t('co.phone')}">${icon('phone', 18)}</a>` : ''}
            ${tgHref() ? `<a class="iconbtn" href="${tgHref()}" target="_blank" rel="noopener" aria-label="Telegram">${icon('send', 18)}</a>` : ''}
            ${s.viber ? `<a class="iconbtn" href="viber://chat?number=${encodeURIComponent(s.viber.replace(/[^\d+]/g, ''))}" aria-label="Viber">${icon('viber', 18)}</a>` : ''}
            ${s.email ? `<a class="iconbtn" href="mailto:${esc(s.email)}" aria-label="Email">${icon('mail', 18)}</a>` : ''}
          </div>
        </div>
        <div><h4>${t('ft.catalog')}</h4><ul>${cats.map((c) => `<li><a href="/equipment?cat=${c.slug}">${esc(c[lang] || c.uk)}</a></li>`).join('')}<li><a href="/caps">${t('nav.caps')}</a></li><li><a href="/services">${t('nav.services')}</a></li></ul></div>
        <div><h4>${t('ft.company')}</h4><ul>
          <li><a href="/about">${t('nav.about')}</a></li><li><a href="/partners">${t('nav.partners')}</a></li><li><a href="/careers">${t('nav.careers')}</a></li><li><a href="/contacts">${t('nav.contacts')}</a></li>
          ${s.marketplace_url ? `<li><a href="${esc(s.marketplace_url)}" target="_blank" rel="noopener">${t('ft.marketplace')} ↗</a></li>` : ''}
        </ul></div>
        <div><h4>${t('ft.contacts')}</h4><ul>
          ${s.phone ? `<li><a href="${telHref()}">${esc(phoneLabel())}</a></li>` : ''}
          ${s.email ? `<li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>` : ''}
          ${s.telegram ? `<li><a href="${tgHref()}" target="_blank" rel="noopener">@${esc(s.telegram)}</a></li>` : ''}
          <li>${esc([s.city, s.address].filter(Boolean).join(', '))}</li>
          ${s.hours ? `<li>${esc(s.hours)}</li>` : ''}
          <li><a class="link" href="/contacts#form">${t('cta.order')} →</a></li>
        </ul></div>
      </div>
      <div class="ftr__bottom"><span>© ${new Date().getFullYear()} ${esc(s.brand)}${s.legal ? ` · ${esc(s.legal)}` : ''} · ${t('ft.rights')}</span><span class="mono">${esc(s.city)} · UA</span></div>
    </div>`;
  }
  function markNav() {
    const p = location.pathname;
    $$('#nav a').forEach((a) => a.classList.toggle('active', p === a.getAttribute('href') || p.startsWith(`${a.getAttribute('href')}/`)));
  }

  // ── маршрутизатор
  const app = $('#app');
  const ROUTES = [
    [/^\/$/, pageHome], [/^\/equipment\/?$/, () => pageCatalog('equipment')], [/^\/products\/?$/, () => pageCatalog('product')],
    [/^\/services\/?$/, pageServices], [/^\/(equipment|products|services)\/([a-z0-9-]+)\/?$/, (m) => pageItem(m[2])],
    [/^\/caps\/?$/, pageCaps], [/^\/partners\/?$/, pagePartners], [/^\/careers\/?$/, pageCareers], [/^\/about\/?$/, pageAbout],
    [/^\/contacts\/?$/, pageContacts], [/^\/request\/?$/, pageBasket], [/^\/admin\/?$/, pageAdmin],
  ];
  let navToken = 0;
  async function render(scroll = true) {
    const token = ++navToken;
    closeMenu();
    $$('#layer > *').forEach((el) => el.remove());
    document.body.classList.remove('has-sticky');
    const p = location.pathname;
    const r = ROUTES.find(([re]) => re.test(p));
    try {
      if (!r) page404();
      else await r[1](p.match(r[0]));
    } catch (e) {
      if (token !== navToken) return;
      console.error(e);
      app.innerHTML = `<section class="sec"><div class="wrap"><div class="empty"><h3>${t('net.err')}</h3><p>${esc(e.message)}</p></div></div></section>`;
    }
    if (token !== navToken) return;
    app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter');
    markNav();
    if (scroll) {
      if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) { setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 60); } else window.scrollTo(0, 0); }
      else window.scrollTo(0, 0);
    }
    observeReveal();
  }
  function go(url) { history.pushState(null, '', url); render(); }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname.startsWith('/api/') || /\.\w+$/.test(url.pathname)) return;
    e.preventDefault();
    if (url.pathname === location.pathname && url.search === location.search && url.hash) {
      history.replaceState(null, '', url.hash);
      document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
      closeMenu();
      return;
    }
    go(url.pathname + url.search + url.hash);
  });
  window.addEventListener('popstate', () => render(false));

  function setTitle(title, desc) {
    document.title = title;
    const m = $('meta[name=description]'); if (m && desc) m.content = desc;
  }
  function animateCount(el) {
    const to = Number(el.dataset.count); const pre = el.dataset.pre || '';
    if (!to || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now(), dur = 1400;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 4;
      el.textContent = pre + N(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function observeReveal() {
    $$('.stagger').forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 8))));
    $$('[data-count]').forEach((el) => { if (!el.dataset.counted) { el.dataset.counted = '1'; setTimeout(() => animateCount(el), 700); } });
    const els = $$('.reveal:not(.in), .stagger:not(.in), .steps:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
  }

  // ── світло за курсором, компактна шапка, прогрес прокрутки
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('.spot'); if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const h = document.documentElement.scrollHeight - innerHeight;
    $('#hdr').classList.toggle('scrolled', scrollY > 10);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  // ── меню на телефоні
  function closeMenu() { $('#mnav').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false'); $('#burger').innerHTML = icon('menu', 20); document.body.style.overflow = ''; }
  $('#burger').addEventListener('click', () => {
    const open = !$('#mnav').classList.contains('open');
    $('#mnav').classList.toggle('open', open);
    $('#burger').setAttribute('aria-expanded', String(open));
    $('#burger').innerHTML = icon(open ? 'x' : 'menu', 20);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (b) { lang = b.dataset.lang; store.set('bh-lang', lang); renderShell(); render(false); }
  });
  $('#themeBtn').addEventListener('click', () => {
    const light = document.documentElement.dataset.theme !== 'light';
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    try { localStorage.setItem('bh-theme', light ? 'light' : 'dark'); } catch { /* */ }
    renderTheme();
  });

  // ── спільні блоки
  function toast(html, ms = 2800) {
    $$('.toast').forEach((x) => x.remove());
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status'); el.innerHTML = html;
    document.body.append(el);
    setTimeout(() => el.remove(), ms);
  }
  const head = (eyebrow, title, lead, extra = '') => `<div class="sec__head reveal"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2></div>${lead ? `<p>${lead}</p>` : ''}${extra}</div>`;
  const originText = (it) => t(`origin.${it.origin || 'own'}`);
  function badges(it) {
    const b = [];
    if (it.origin && it.origin !== 'own') b.push(`<span class="chip">${originText(it)}</span>`);
    if (it.availability === 'stock') b.push(`<span class="chip"><span class="dot" style="color:var(--ok)"></span>${t('badge.stock')}</span>`);
    else if (it.origin !== 'order') b.push(`<span class="chip">${t(`badge.${it.availability}`)}</span>`);
    if (it.rent) b.push(`<span class="chip">${t('badge.rent')}</span>`);
    return b.join('');
  }
  function imgOrArt(it, i = 0, attrs = '') {
    const src = (it.images || [])[i];
    return src ? `<img src="${esc(src)}" alt="${esc(L(it, 'title'))}" loading="lazy" decoding="async" ${attrs}>` : art(it);
  }
  function card(it) {
    const inB = basket.has(it.id);
    return `<article class="card">
      <div class="card__img">${imgOrArt(it)}</div>
      <div class="card__body">
        <div class="card__cat">${esc(catName(it.category))}${it.origin && it.origin !== 'own' ? ` · ${originText(it)}` : ''}</div>
        <h3 class="card__title"><a href="${itemUrl(it)}">${esc(L(it, 'title'))}</a></h3>
        <p class="card__sum">${esc(L(it, 'summary'))}</p>
        <div class="card__foot">${priceHtml(it)}<button type="button" class="btn btn--xs card__add ${inB ? 'on' : ''}" data-add="${it.id}">${icon(inB ? 'check' : 'plus', 15, 2.2)} ${t(inB ? 'card.added' : 'card.add')}</button></div>
      </div></article>`;
  }
  const itemsById = new Map();
  function remember(list) { for (const it of list) itemsById.set(it.id, it); return list; }
  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    e.preventDefault();
    const it = itemsById.get(Number(b.dataset.add));
    if (!it) return;
    if (basket.has(it.id)) { basket.remove(it.id); }
    else { basket.add(it); toast(`${icon('check', 18)} ${t('bk.added')} · <a href="/request">${t('bk.open')}</a>`); }
    const on = basket.has(it.id);
    $$(`[data-add="${it.id}"]`).forEach((x) => {
      x.classList.toggle('on', on);
      if (x.classList.contains('card__add')) x.innerHTML = `${icon(on ? 'check' : 'plus', 15, 2.2)} ${t(on ? 'card.added' : 'card.add')}`;
      else x.innerHTML = `${icon(on ? 'check' : 'clip', 18)} ${t(on ? 'item.inBasket' : 'item.toBasket')}`;
    });
  });

  const ctaBlock = () => `<section class="sec sec--tight"><div class="wrap"><div class="cta reveal"><div class="cta__grid"></div>
    <div style="position:relative"><h2>${t('cta.title')}</h2><p>${t('cta.text')}</p></div>
    <div class="cta__act" style="position:relative"><a class="btn btn--dark" href="/contacts?topic=custom#form">${t('cta.btn1')} ${icon('arrow', 18)}</a>
      ${telHref() ? `<a class="btn btn--ghost" href="${telHref()}">${icon('phone', 18)} ${t('cta.btn2')}</a>` : tgHref() ? `<a class="btn btn--ghost" href="${tgHref()}" target="_blank" rel="noopener">${icon('send', 18)} ${t('cta.btn2b')}</a>` : ''}</div>
  </div></div></section>`;

  function faqBlock() {
    return `<section class="sec"><div class="wrap split"><div class="reveal"><div class="eyebrow">FAQ</div><h2>${t('faq.title')}</h2></div>
      <div class="faq reveal">${[1, 2, 3, 4, 5, 6].map((i) => `<details><summary>${t(`faq.q${i}`)}</summary><p>${t(`faq.a${i}`)}</p></details>`).join('')}</div></div></section>`;
  }

  // ── схема процесу (hero)
  function flowSvg() {
    const caps = Array.from({ length: 9 }, (_, i) => {
      const c = CAP_COLORS[i % CAP_COLORS.length], x = 70 + (i % 3) * 22 + (i % 2) * 6, d = (i * 0.36).toFixed(2);
      return `<g class="cap-fall" style="animation-delay:${d}s"><circle cx="${x}" cy="70" r="9" fill="${c}"/><circle cx="${x}" cy="70" r="5" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/></g>`;
    }).join('');
    const flakes = Array.from({ length: 10 }, (_, i) => `<rect class="flake" x="${150 + (i % 3) * 6}" y="${232 + (i % 2) * 6}" width="6" height="4" rx="1" fill="${CAP_COLORS[i % 7]}" style="animation-delay:${(i * 0.24).toFixed(2)}s;--dx:${90 + (i % 4) * 8}px;--dy:${-18 + (i % 3) * 4}px"/>`).join('');
    const beamDots = Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 13.7) % 190}" cy="${((i * 7.3) % 22) + 2}" r="${1.6 + (i % 3)}" fill="${CAP_COLORS[i % 7]}"/>`).join('');
    return `<svg viewBox="0 0 560 480" role="img" aria-label="${esc(t('flow.in'))} → ${esc(t('flow.shred'))} → ${esc(t('flow.ext'))} → ${esc(t('flow.out'))}">
      <defs>
        <pattern id="fg" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0v20" fill="none" stroke="rgba(198,244,50,.07)"/></pattern>
        <linearGradient id="fh" x1="0" x2="1"><stop offset="0" stop-color="#FF8A3D"/><stop offset="1" stop-color="#FF5A4E"/></linearGradient>
        <clipPath id="fbeam"><rect x="0" y="0" width="190" height="26" rx="5"/></clipPath>
      </defs>
      <rect width="560" height="480" fill="url(#fg)"/>
      <!-- бункер -->
      <path d="M40 110h120l-30 60H70z" fill="#1C2522" stroke="#C6F432" stroke-width="2"/>
      ${caps}
      <!-- дробарка -->
      <rect x="50" y="170" width="100" height="90" rx="10" fill="#18211E" stroke="rgba(238,243,239,.25)" stroke-width="2"/>
      <g fill="none" stroke="#C6F432" stroke-width="3"><g class="blade"><circle cx="82" cy="215" r="18"/><path d="M82 197v36M64 215h36"/></g><g class="blade rev"><circle cx="118" cy="215" r="18"/><path d="M118 197v36M100 215h36"/></g></g>
      <rect x="62" y="260" width="16" height="40" fill="#18211E" stroke="rgba(238,243,239,.25)" stroke-width="2"/><rect x="122" y="260" width="16" height="40" fill="#18211E" stroke="rgba(238,243,239,.25)" stroke-width="2"/>
      ${flakes}
      <!-- екструдер -->
      <path d="M248 196h40l-10 26h-20z" fill="#1C2522" stroke="#C6F432" stroke-width="2"/>
      <rect x="240" y="222" width="230" height="40" rx="8" fill="#18211E" stroke="rgba(238,243,239,.25)" stroke-width="2"/>
      <rect class="heat" x="300" y="226" width="44" height="32" rx="4" fill="url(#fh)" opacity=".6"/><rect class="heat" x="352" y="226" width="44" height="32" rx="4" fill="url(#fh)" opacity=".6" style="animation-delay:.6s"/><rect class="heat" x="404" y="226" width="44" height="32" rx="4" fill="url(#fh)" opacity=".6" style="animation-delay:1.2s"/>
      <path class="screw" d="M250 242h210" stroke="#EEF3EF" stroke-width="3" stroke-dasharray="6 4" opacity=".6"/>
      <rect x="200" y="226" width="40" height="32" rx="6" fill="#222D29" stroke="rgba(238,243,239,.25)" stroke-width="2"/>
      <rect x="470" y="232" width="14" height="20" rx="3" fill="#C6F432"/>
      <!-- брус -->
      <g transform="translate(330 300)"><g class="beam"><g clip-path="url(#fbeam)"><rect width="190" height="26" fill="#2A3732"/>${beamDots}</g></g></g>
      <path d="M484 252c20 10 30 30 30 48" fill="none" stroke="rgba(198,244,50,.5)" stroke-width="2" stroke-dasharray="4 5"/>
      <!-- лавка -->
      <g transform="translate(300 352)">
        <rect x="0" y="34" width="220" height="16" rx="5" fill="#2A3732"/><rect x="0" y="12" width="220" height="14" rx="5" fill="#2A3732"/>
        <g opacity=".95">${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 15.3) % 216 + 3}" cy="${i % 2 ? 41 + (i % 3) * 2 : 18 + (i % 3) * 2}" r="${1.5 + (i % 3)}" fill="${CAP_COLORS[i % 7]}"/>`).join('')}</g>
        <path d="M18 50v42M202 50v42M30 26v8M190 26v8" stroke="#8A968F" stroke-width="7" stroke-linecap="round"/>
      </g>
      <!-- підписи -->
      <g font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="#7F8C86" letter-spacing=".6">
        <text x="40" y="96">01 · ${esc(t('flow.in').toUpperCase())}</text>
        <text x="50" y="322">02 · ${esc(t('flow.shred').toUpperCase())}</text>
        <text x="240" y="188">03 · ${esc(t('flow.ext').toUpperCase())}</text>
        <text x="300" y="460">04 · ${esc(t('flow.out').toUpperCase())}</text>
      </g>
      <g stroke="rgba(198,244,50,.35)" stroke-width="1"><path d="M160 170h40M160 175v-5"/></g>
    </svg>`;
  }

  // ── ГОЛОВНА
  async function pageHome() {
    setTitle(`${S().brand} — ${t('hero.h1a').toLowerCase()} ${t('hero.h1b')} ${t('hero.h1c')}`, t('hero.lead'));
    const { items } = await cached('/api/items?kind=equipment');
    remember(items);
    const own = items.filter((x) => (x.origin || 'own') === 'own').slice(0, 6);
    const dirs = [[1, '/equipment'], [2, '/products'], [3, '/services'], [4, '/contacts?topic=custom#form']];
    app.innerHTML = `
    <section class="hero"><div class="grid-bg"></div>
      <div class="wrap">
        <div class="hero__in">
          <div>
            <div class="eyebrow">${esc(t('hero.eyebrow', { city: S().city }))}</div>
            <h1>${t('hero.h1a')} ${t('hero.h1b')} <span class="acc">${t('hero.h1c')}</span></h1>
            <p class="lead">${t('hero.lead')}</p>
            <div class="hero__cta"><a class="btn btn--acc" href="/equipment">${t('hero.cta1')} ${icon('arrow', 18)}</a><a class="btn btn--ghost" href="/contacts?topic=custom#form">${t('hero.cta2')}</a></div>
          </div>
          <div class="flow">${flowSvg()}</div>
        </div>
      </div>
    </section>

    <section class="sec"><div class="wrap">
      <div class="sec__head reveal"><div><div class="eyebrow">${t('dirs.eyebrow')}</div><h2>${t('dirs.title')}</h2></div><p>${t('dirs.lead')}</p></div>
      <div class="svc-list">${dirs.map(([i, href]) => `<a class="svc reveal" href="${href}"><span class="svc__n mono">0${i}</span><div><h3>${t(`dir${i}.t`)}</h3><p>${t(`dir${i}.p`)}</p></div><span class="svc__go">${icon('arrow', 20)}</span></a>`).join('')}</div>
    </div></section>

    <section class="story sec--panel" id="story" aria-label="${esc(t('story.eyebrow'))}"></section>

    <section class="sec"><div class="wrap">
      <div class="sec__head reveal"><div><div class="eyebrow">${t('feat.eyebrow')}</div><h2>${t('feat.title')}</h2></div><a class="btn btn--sm" href="/equipment">${t('feat.all')} ${icon('arrow', 16)}</a></div>
      <div class="cards">${own.map(card).join('')}</div>
    </div></section>

    <section class="sec sec--panel"><div class="wrap duo">
      <a class="duo__item reveal" href="/partners"><div class="eyebrow">${t('pa.eyebrow')}</div><h3>${t('pa.title')}</h3><p>${t('pa.lead')}</p><span class="link">${t('pa.join')} →</span></a>
      <a class="duo__item reveal" href="/careers"><div class="eyebrow">${t('job.eyebrow')}</div><h3>${t('job.title')}</h3><p>${t('job.lead')}</p><span class="link">${t('nav.careers')}${META.vacancies ? ` · ${META.vacancies}` : ''} →</span></a>
    </div></section>

    ${ctaBlock()}`;
    if (window.BH_STORY) window.BH_STORY.mount($('#story'), { t, esc, icon });
    observeReveal();
  }

  const TL = (arr) => (Array.isArray(arr) ? arr[LI()] || arr[0] : arr);
  async function allBySlug() {
    const { items } = await cached('/api/items');
    remember(items);
    return new Map(items.map((x) => [x.slug, x]));
  }
  function words(parts) {
    let i = 0;
    return parts.map(([text, cls]) => {
      const ws = String(text).split(/\s+/).filter(Boolean).map((w) => `<span class="wd" aria-hidden="true"><span style="--i:${i++}">${esc(w)}</span></span>`).join(' ');
      return cls ? `<span class="${cls}">${ws}</span>` : ws;
    }).join(' ');
  }
  function bindTilt() {
    const el = $('#flow');
    if (!el || matchMedia('(hover: none), (prefers-reduced-motion: reduce)').matches) return;
    const wrap = el.parentElement;
    wrap.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${(x - .5) * 10}deg`); el.style.setProperty('--rx', `${(.5 - y) * 8}deg`);
      el.style.setProperty('--gx', `${x * 100}%`); el.style.setProperty('--gy', `${y * 100}%`);
    });
    wrap.addEventListener('pointerleave', () => { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); });
  }
  function dirTile(i, href, ic, cats, cls = '') {
    const tags = cats ? cats.map((c) => catOf(c)).filter((c) => c && c.count).map((c) => `<span class="chip">${esc(c[lang] || c.uk)}</span>`).join('') : '';
    const artSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--acc-text)" stroke-width=".55" stroke-linecap="round" stroke-linejoin="round" opacity=".55">${I[ic]}</svg>`;
    return `<a class="dir spot reveal ${cls}" href="${href}">
      <div class="dir__art">${artSvg}</div>
      <span class="dir__n">0${i} /</span><span class="dir__go">${icon('arrowUR', 20)}</span>
      <h3>${t(`dir${i}.t`)}</h3><p>${t(`dir${i}.p`)}</p>${tags ? `<div class="dir__tags">${tags}</div>` : ''}</a>`;
  }
  function stepsBlock(prefix, icons) {
    return `<div class="steps reveal">${icons.map((ic, i) => `<div class="step" style="--i:${i}"><span class="step__n">0${i + 1}</span><span class="step__icon">${icon(ic, 22)}</span><h3>${t(`${prefix}.${i + 1}t`)}</h3><p>${t(`${prefix}.${i + 1}p`)}</p></div>`).join('')}</div>`;
  }
  function capsBand(items = []) {
    const pic = art({ slug: 'caps-band-terrazzo', kind: 'product' }, { dense: true, terrazzo: true });
    return `<div class="caps reveal">
      <div class="caps__copy">
        <div class="eyebrow">${t('caps.eyebrow')}</div>
        <h2>${t('caps.title')}</h2>
        <p class="lead" style="font-size:17px">${t('caps.lead')}</p>
        <div class="calc" id="calc">
          <div class="calc__row"><label for="calcR">${t('calc.label')}</label><div class="seg" role="group"><button type="button" class="on" data-unit="caps">${t('calc.byCaps')}</button><button type="button" data-unit="kg">${t('calc.byKg')}</button></div></div>
          <div class="calc__val"><span id="calcV">12 000</span> <small id="calcU">${t('calc.caps')}</small></div>
          <input id="calcR" type="range" min="1000" max="200000" step="1000" value="12000" aria-label="${esc(t('calc.label'))}">
          <div class="benches" id="benches" aria-hidden="true"></div>
          <div class="calc__out"><div><b id="cB">1</b><span>${t('calc.bench')}</span></div><div><b id="cU">2</b><span>${t('calc.bin')}</span></div><div><b id="cM">10</b><span>${t('calc.beam')}</span></div></div>
          <p class="calc__hint">${t('calc.hint')}</p>
        </div>
        <div class="hero__cta"><a class="btn btn--acc" href="/caps#order">${t('caps.cta1')} ${icon('arrow', 18)}</a><a class="btn" href="/caps#handover">${icon('recycle', 18)} ${t('caps.cta2')}</a></div>
      </div>
      <div class="caps__art">${pic.replace('class="art"', '')}
        <div class="caps__big"><b class="mono" id="capsBig">12 000</b><span>${t('calc.caps')} → 1 ${t('calc.bench')}</span></div>
        ${items.length ? `<div style="position:absolute;left:20px;right:20px;bottom:20px;display:flex;gap:8px;flex-wrap:wrap">${items.slice(0, 4).map((it) => { remember([it]); return `<a class="chip" style="background:rgba(10,14,13,.82);color:#EEF3EF;border-color:rgba(255,255,255,.14);padding:8px 13px" href="${itemUrl(it)}">${esc(L(it, 'title'))}</a>`; }).join('')}</div>` : ''}
      </div>
    </div>`;
  }
  function bindCalc() {
    const box = $('#calc'); if (!box) return;
    let unit = 'caps';
    const r = $('#calcR', box);
    const upd = () => {
      const v = Number(r.value);
      const kg = unit === 'caps' ? (v * 2.5) / 1000 : v;
      $('#calcV').textContent = N(v);
      $('#calcU').textContent = unit === 'caps' ? t('calc.caps') : t('calc.kg');
      const f = (x) => (x >= 10 ? N(Math.floor(x)) : (Math.floor(x * 10) / 10).toLocaleString(lang === 'en' ? 'en-US' : 'uk-UA'));
      $('#cB').textContent = f(kg / 30); $('#cU').textContent = f(kg / 12); $('#cM').textContent = f(kg / 3);
      r.style.setProperty('--fill', `${((v - r.min) / (r.max - r.min)) * 100}%`);
      const caps = Math.round((kg * 1000) / 2.5);
      const big = $('#capsBig'); if (big) { big.textContent = N(caps); big.nextElementSibling.textContent = `${t('calc.caps')} → ${f(kg / 30)} ${t('calc.bench')}`; }
      const n = kg / 30, MAX = 12;
      const benchSvg = '<svg viewBox="0 0 30 22" fill="currentColor"><rect x="1" y="2" width="28" height="4" rx="1.5"/><rect x="1" y="9" width="28" height="4" rx="1.5"/><rect x="4" y="13" width="3" height="9" rx="1"/><rect x="23" y="13" width="3" height="9" rx="1"/></svg>';
      $('#benches').innerHTML = Array.from({ length: Math.min(MAX, Math.max(1, Math.ceil(n))) }, (_, i) => `<span class="bench ${i + 1 <= n ? 'on' : 'part'}">${benchSvg}</span>`).join('')
        + (n > MAX ? `<span class="benches__more">+${N(Math.floor(n) - MAX)}</span>` : '');
    };
    $$('[data-unit]', box).forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.unit === unit) return;
      const v = Number(r.value);
      unit = b.dataset.unit;
      $$('[data-unit]', box).forEach((x) => x.classList.toggle('on', x === b));
      if (unit === 'kg') { r.min = 5; r.max = 1000; r.step = 5; r.value = Math.max(5, Math.round((v * 2.5) / 1000 / 5) * 5); }
      else { r.min = 1000; r.max = 200000; r.step = 1000; r.value = Math.max(1000, Math.round((v * 1000) / 2.5 / 1000) * 1000); }
      upd();
    }));
    r.addEventListener('input', upd);
    upd();
  }

  // ── КАТАЛОГ (обладнання / вироби)
  async function pageCatalog(kind) {
    const isEq = kind === 'equipment';
    const q = new URLSearchParams(location.search);
    let cat = q.get('cat') || '';
    let search = q.get('q') || '';
    let sort = q.get('sort') || '';
    const title = t(isEq ? 'eq.title' : 'pr.title');
    setTitle(`${title} — ${S().brand}`, t(isEq ? 'eq.lead' : 'pr.lead'));
    const { items } = await cached(`/api/items?kind=${kind}`);
    remember(items);
    const cats = META.categories.filter((c) => c.kind === kind && c.count);
    app.innerHTML = `
      <section class="page-head"><div class="grid-bg"></div><div class="wrap" style="position:relative">
        <div class="crumbs"><a href="/">${t('nav.home')}</a><span>${t(isEq ? 'nav.equipment' : 'nav.products')}</span></div>
        <h1>${title}</h1><p class="lead">${t(isEq ? 'eq.lead' : 'pr.lead')}</p>
        ${!isEq ? `<div class="hero__cta" style="margin-top:24px"><a class="btn btn--acc btn--sm" href="/caps">${icon('caps', 16)} ${t('capsP.title')}</a></div>` : ''}
      </div></section>
      <section class="sec--tight" style="padding-top:0"><div class="wrap">
        <div class="toolbar">
          <div class="cats" role="group">${[['', t('cat.all'), items.length], ...cats.map((c) => [c.slug, c[lang] || c.uk, c.count])].map(([s, n, c]) => `<button type="button" class="cat-btn ${s === cat ? 'on' : ''}" data-cat="${s}">${s ? icon(catOf(s).icon, 16) : ''}${esc(n)} <span class="n">${c}</span></button>`).join('')}</div>
        </div>
        <div class="toolbar" style="margin-top:-8px">
          <label class="search">${icon('search', 18)}<input type="search" id="q" placeholder="${esc(t('cat.search'))}" value="${esc(search)}" aria-label="${esc(t('cat.search'))}"></label>
          <select class="select" id="sort" aria-label="sort">${['', 'price_asc', 'price_desc', 'new'].map((s) => `<option value="${s}" ${s === sort ? 'selected' : ''}>${t(`sort.${s || 'default'}`)}</option>`).join('')}</select>
        </div>
        <div id="grid"></div>
      </div></section>
      ${isEq ? stepsSection() : ''}
      ${ctaBlock()}`;
    const draw = () => {
      const s = search.trim().toLowerCase();
      let list = items.filter((it) => (!cat || it.category === cat) && (!s || `${it.title} ${it.title_ru} ${it.title_en} ${it.summary} ${catName(it.category)}`.toLowerCase().includes(s)));
      if (sort === 'price_asc') list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      if (sort === 'price_desc') list = [...list].sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
      if (sort === 'new') list = [...list].sort((a, b) => b.id - a.id);
      const own = list.filter((x) => (x.origin || 'own') === 'own');
      const other = list.filter((x) => (x.origin || 'own') !== 'own');
      const grid = (arr) => `<div class="cards">${arr.map(card).join('')}</div>`;
      $('#grid').innerHTML = list.length ? (other.length && own.length
        ? `<h2 class="cat-h">${t('origin.ownH')}</h2><p class="cat-p">${t('origin.ownP')}</p>${grid(own)}<h2 class="cat-h" style="margin-top:56px">${t('origin.otherH')}</h2><p class="cat-p">${t('origin.otherP')}</p>${grid(other)}`
        : grid(list))
        : `<div class="empty"><h3>${t('empty.title')}</h3><p>${t('empty.text')}</p><p style="margin-top:16px"><a class="btn btn--acc btn--sm" href="/contacts?topic=custom#form">${t('empty.cta')}</a></p></div>`;
      const u = new URLSearchParams(); if (cat) u.set('cat', cat); if (search) u.set('q', search); if (sort) u.set('sort', sort);
      history.replaceState(null, '', `${location.pathname}${u.toString() ? `?${u}` : ''}`);
    };
    $$('[data-cat]').forEach((b) => b.addEventListener('click', () => { cat = b.dataset.cat; $$('[data-cat]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    let tm; $('#q').addEventListener('input', (e) => { clearTimeout(tm); tm = setTimeout(() => { search = e.target.value; draw(); }, 150); });
    $('#sort').addEventListener('change', (e) => { sort = e.target.value; draw(); });
    draw();
  }
  const stepsSection = () => `<section class="sec sec--panel"><div class="wrap">${head(t('proc.eyebrow'), t('proc.title'), '')}${stepsBlock('proc', ['clip', 'chart', 'blueprint', 'wrench', 'shield', 'truck'])}</div></section>`;

  // ── СТОРІНКА ПОЗИЦІЇ
  async function pageItem(slug) {
    let data;
    try { data = await cached(`/api/items/${slug}`); }
    catch (e) { if (e.status === 404) return page404(t('item.notFound'), t('item.notFoundP')); throw e; }
    const { item: it, related } = data;
    remember([it, ...related]);
    const title = L(it, 'title');
    setTitle(`${title} — ${priceText(it)} | ${S().brand}`, L(it, 'summary'));
    const imgs = it.images || [];
    const kindKey = { equipment: 'nav.equipment', product: 'nav.products', service: 'nav.services' }[it.kind];
    const inB = basket.has(it.id);
    const fmts = [];
    if (it.kind === 'equipment') fmts.push(t('item.fmtBuy'));
    if (it.rent) fmts.push(t('item.fmtRent'));
    if (it.custom) fmts.push(t('item.fmtCustom'));
    const desc = L(it, 'description');
    const ex = it.extra || {};
    const secs = [['overview', 'it.overview'], ex.how?.length && ['how', 'it.how'], ex.uses?.length && ['uses', 'it.uses'], ex.makes?.length && ['makes', 'it.makes'],
      ['specs', 'it.specs'], ex.faq?.length && ['faq', 'it.faq']].filter(Boolean);
    app.innerHTML = `
      <section class="ihero"><div class="wrap">
        <div class="crumbs" style="margin:28px 0 0"><a href="/">${t('nav.home')}</a><a href="/${kindPath(it.kind)}"><span>${t(kindKey)}</span></a><a href="/${kindPath(it.kind)}?cat=${it.category}"><span>${esc(catName(it.category))}</span></a></div>
        <div class="item">
            <div class="gallery item__gallery">
              <div class="gallery__main" id="gMain">${imgs.length ? `<img src="${esc(imgs[0])}" alt="${esc(title)}" id="gImg">` : art(it, { dense: true })}
                ${imgs.length > 1 ? `<button type="button" class="gallery__nav prev" data-g="-1" aria-label="prev">${icon('chevL', 22)}</button><button type="button" class="gallery__nav next" data-g="1" aria-label="next">${icon('chevR', 22)}</button><span class="gallery__count mono" id="gCount">1 / ${imgs.length}</span>` : ''}
              </div>
              ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((u, i) => `<button type="button" class="${i ? '' : 'on'}" data-thumb="${i}" aria-label="${i + 1}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
            </div>
            <div class="item__info hidden"></div>
          <aside class="buy">
            <div style="display:flex;gap:6px;flex-wrap:wrap">${badges(it)}</div>
            <h1>${esc(title)}</h1>
            <p class="buy__sum">${esc(L(it, 'summary'))}</p>
            ${(it.highlights || []).length ? `<div class="hl">${it.highlights.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}
            ${it.plastic_kg ? `<div class="caps-meter">${icon('caps', 28)}<div><b class="mono">≈ ${N(capsOf(it.plastic_kg))}</b> <small>${t('item.capsTitle')} · ${t('item.capsSub', { kg: N(it.plastic_kg) })}</small></div></div>` : ''}
            <div class="buy__box">
              <div class="buy__price">${priceHtml(it)}</div>
              ${it.price_note && it.price_type !== 'request' ? `<p class="buy__note">${esc(it.price_note)}</p>` : ''}
              <div class="buy__meta">
                <div><small>${t('item.avail')}</small><b>${t(`badge.${it.availability}`)}</b></div>
                <div><small>${t('item.lead')}</small><b>${esc(it.lead_time || '—')}</b></div>
                ${fmts.length ? `<div><small>${t('item.formats')}</small><b>${fmts.join(' · ')}</b></div>` : ''}
                <div><small>${t('origin.label')}</small><b>${originText(it)}</b></div>
              </div>
              <div class="buy__actions">
                <button type="button" class="btn btn--acc" id="orderBtn">${t('item.order')} ${icon('arrow', 18)}</button>
                <button type="button" class="btn ${inB ? 'on' : ''}" data-add="${it.id}">${icon(inB ? 'check' : 'clip', 18)} ${t(inB ? 'item.inBasket' : 'item.toBasket')}</button>
              </div>
              <div class="buy__more">
                ${it.rent ? `<button type="button" class="btn btn--sm btn--ghost" id="rentBtn">${t('item.orderRent')}</button>` : ''}
                ${tgHref() ? `<a class="btn btn--sm btn--ghost" href="${tgHref(`${title} — ${location.href}`)}" target="_blank" rel="noopener">${icon('send', 16)} Telegram</a>` : ''}
                ${telHref() ? `<a class="btn btn--sm btn--ghost" href="${telHref()}">${icon('phone', 16)} ${esc(phoneLabel())}</a>` : ''}
                <button type="button" class="btn btn--sm btn--ghost" id="shareBtn">${icon('share', 16)} ${t('item.share')}</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
      </section>

      <nav class="subnav" aria-label="${esc(title)}"><div class="wrap subnav__in">${secs.map(([id, k]) => `<a href="#${id}" data-sn="${id}">${t(k)}</a>`).join('')}<button type="button" class="btn btn--acc btn--xs" id="orderBtn3">${t('item.order')}</button></div></nav>

      <section class="isec" id="overview"><div class="wrap">
        ${ex.tagline ? `<p class="itag reveal">${esc(ex.tagline)}</p>` : ''}
        ${it.kind !== 'service' ? `<div class="included" style="margin-top:32px">${[['chart', 1], ['truck', 2], ['book', 3], ...((it.origin || 'own') === 'own' ? [['wrench', 4]] : [])].map(([ic, i]) => `<div class="spot">${icon(ic, 22)}<p><b>${t(`inc.${i}t`)}</b><span>${t(`inc.${i}p`)}</span></p></div>`).join('')}</div>` : ''}
      </div></section>

      ${ex.how?.length ? `<section class="isec" id="how"><div class="wrap">
        <div class="eyebrow">${t('it.how')}</div><h2>${esc(title)}: ${t('it.how').toLowerCase()}</h2>
        <div class="how">${ex.how.map(([h, p], i) => `<div class="how__step" style="--i:${i}"><div class="how__dot">0${i + 1}</div><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div>
      </div></section>` : ''}

      ${ex.uses?.length ? `<section class="isec" id="uses" style="background:var(--bg-2)"><div class="wrap">
        <div class="eyebrow">${t('it.uses')}</div><h2>${t('it.uses')}</h2>
        <div class="uses stagger">${ex.uses.map(([h, p], i) => `<div class="use spot"><b>0${i + 1}</b><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div>
      </div></section>` : ''}

      ${ex.makes?.length ? `<section class="isec" id="makes"><div class="wrap">
        <div class="eyebrow">${t('it.makes')}</div><h2>${t('it.makes')}</h2>
        <ul class="kit">${ex.makes.map((m) => `<li>${icon('arrow', 18)}${esc(m)}</li>`).join('')}</ul>
      </div></section>` : ''}

      <section class="isec" id="specs"><div class="wrap ispecs">
        <div>
          <div class="eyebrow">${t('it.specs')}</div><h2>${t('it.specs')}</h2>
          ${(it.specs || []).length ? `<table class="specs"><tbody>${it.specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>` : `<p class="rich">${t('item.noSpecs')}</p>`}
          ${ex.kit?.length ? `<h3 style="margin:36px 0 14px;font-size:20px">${t('it.kit')}</h3><ul class="kit">${ex.kit.map((k) => `<li>${icon('check', 18, 2.2)}${esc(k)}</li>`).join('')}</ul>` : ''}
        </div>
        <div><div class="eyebrow">${t('it.desc')}</div><div class="rich" style="margin-top:8px">${richText(desc)}</div></div>
      </div></section>

      ${ex.faq?.length ? `<section class="isec" id="faq"><div class="wrap split">
        <div><div class="eyebrow">FAQ</div><h2>${t('it.faq')}</h2><p class="lead" style="margin-bottom:22px">${t('co.lead')}</p><button type="button" class="btn btn--acc" id="askBtn">${t('it.askEngineer')} ${icon('arrow', 18)}</button></div>
        <div class="faq">${ex.faq.map(([q, a], i) => `<details ${i ? '' : 'open'}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
      </div></section>` : ''}
      ${related.length ? `<section class="sec sec--panel"><div class="wrap">${head(t('item.related'), catName(it.category), '')}<div class="cards stagger">${related.map(card).join('')}</div></div></section>` : ''}
      ${ctaBlock()}
      <div class="sticky-buy">${priceHtml(it)}<button type="button" class="btn btn--acc btn--sm" id="orderBtn2">${t('item.order')}</button></div>`;
    document.body.classList.add('has-sticky');

    // галерея
    let gi = 0;
    const show = (i) => {
      if (!imgs.length) return;
      gi = (i + imgs.length) % imgs.length;
      $('#gImg').src = imgs[gi];
      if ($('#gCount')) $('#gCount').textContent = `${gi + 1} / ${imgs.length}`;
      $$('[data-thumb]').forEach((b, j) => b.classList.toggle('on', j === gi));
    };
    $$('[data-g]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); show(gi + Number(b.dataset.g)); }));
    $$('[data-thumb]').forEach((b) => b.addEventListener('click', () => show(Number(b.dataset.thumb))));
    if (imgs.length) $('#gMain').addEventListener('click', () => lightbox(imgs, gi));
    let tx = null;
    $('#gMain').addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
    $('#gMain').addEventListener('touchend', (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) show(gi + (dx < 0 ? 1 : -1)); tx = null; });
    $$('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      $$('[data-tab]').forEach((x) => x.classList.toggle('on', x === b));
      $$('[data-pane]').forEach((p) => p.classList.toggle('hidden', p.dataset.pane !== b.dataset.tab));
    }));
    const type = it.kind === 'product' ? 'product' : it.kind === 'service' ? 'service' : 'equipment';
    const open = (mode) => openRequestModal({ type, item: it, mode });
    $('#orderBtn').addEventListener('click', () => open(''));
    $('#orderBtn2').addEventListener('click', () => open(''));
    $('#orderBtn3').addEventListener('click', () => open(''));
    $('#askBtn')?.addEventListener('click', () => openRequestModal({ type: it.kind === 'equipment' ? 'equipment' : type, item: it, mode: 'consult' }));
    const how = $('.how');
    if (how && 'IntersectionObserver' in window) { const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { how.classList.add('in'); io.disconnect(); } }, { threshold: .4 }); io.observe(how); }
    // підсвічування пункту підменю за прокруткою
    if ('IntersectionObserver' in window) {
      const links = new Map($$('[data-sn]').map((a2) => [a2.dataset.sn, a2]));
      const io2 = new IntersectionObserver((ens) => ens.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l, id) => l.classList.toggle('on', id === en.target.id));
        links.get(en.target.id)?.scrollIntoView({ block: 'nearest', inline: 'center' });
      }), { rootMargin: '-45% 0px -50% 0px' });
      $$('.isec').forEach((sec) => io2.observe(sec));
    }
    $('#rentBtn')?.addEventListener('click', () => open('rent'));
    $('#shareBtn').addEventListener('click', async () => {
      const url = location.href.split('#')[0];
      try { if (navigator.share) await navigator.share({ title, url }); else { await navigator.clipboard.writeText(url); toast(t('item.copied')); } } catch { /* скасовано */ }
    });
  }
  function richText(s) {
    if (!s) return '';
    return s.split(/\n{2,}/).map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      let html = ''; let list = [];
      const flush = () => { if (list.length) { html += `<ul>${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`; list = []; } };
      for (const l of lines) {
        if (/^[•\-–—*]\s+/.test(l)) list.push(l.replace(/^[•\-–—*]\s+/, ''));
        else if (/:$/.test(l) && l.length < 70) { flush(); html += `<h4>${esc(l.slice(0, -1))}</h4>`; }
        else { flush(); html += `<p>${esc(l)}</p>`; }
      }
      flush();
      return html;
    }).join('');
  }
  function lightbox(imgs, start) {
    let i = start;
    const el = document.createElement('div');
    el.className = 'lightbox'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<img alt=""><button class="iconbtn" style="top:16px;right:16px" data-x aria-label="close">${icon('x', 20)}</button>
      ${imgs.length > 1 ? `<button class="iconbtn" style="left:16px;top:50%" data-d="-1" aria-label="prev">${icon('chevL', 22)}</button><button class="iconbtn" style="right:16px;top:50%" data-d="1" aria-label="next">${icon('chevR', 22)}</button>` : ''}`;
    const set = () => { $('img', el).src = imgs[i]; };
    const close = () => { el.remove(); document.removeEventListener('keydown', key); };
    const key = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') { i = (i + 1) % imgs.length; set(); } if (e.key === 'ArrowLeft') { i = (i - 1 + imgs.length) % imgs.length; set(); } };
    el.addEventListener('click', (e) => {
      const d = e.target.closest('[data-d]');
      if (d) { i = (i + Number(d.dataset.d) + imgs.length) % imgs.length; set(); return; }
      if (e.target === el || e.target.closest('[data-x]')) close();
    });
    document.addEventListener('keydown', key);
    set();
    $('#layer').append(el);
  }

  // ── ПОСЛУГИ
  async function pageServices() {
    setTitle(`${t('sv.title')} — ${S().brand}`, t('sv.lead'));
    const { items } = await cached('/api/items?kind=service');
    remember(items);
    app.innerHTML = `
      <section class="page-head"><div class="grid-bg"></div><div class="wrap" style="position:relative">
        <div class="crumbs"><a href="/">${t('nav.home')}</a><span>${t('nav.services')}</span></div>
        <h1>${t('sv.title')}</h1><p class="lead">${t('sv.lead')}</p>
      </div></section>
      <section class="sec"><div class="wrap"><div class="cards cards--3 stagger">${items.map(card).join('')}</div></div></section>
      ${stepsSection()}
      <section class="sec" id="form"><div class="wrap split">
        <div class="reveal"><div class="eyebrow">${t('nav.services')}</div><h2>${t('sv.formTitle')}</h2><p class="lead" style="margin-top:18px">${t('sv.formLead')}</p></div>
        <div class="form-card reveal" id="svForm"></div>
      </div></section>`;
    mountForm($('#svForm'), { type: 'service', services: items });
  }

  // ── КРИШЕЧКИ
  async function pageCaps() {
    setTitle(`${t('capsP.title')} — ${S().brand}`, t('capsP.lead'));
    const { items } = await cached('/api/items?kind=product');
    remember(items);
    const capsItems = items.filter((x) => x.category === 'caps');
    const svc = (await cached('/api/items?kind=service')).items.find((x) => x.slug === 'vyroby-z-vashoi-syrovyny');
    if (svc) remember([svc]);
    app.innerHTML = `
      <section class="page-head" style="border-bottom:0"><div class="grid-bg"></div><div class="wrap" style="position:relative">
        <div class="crumbs"><a href="/">${t('nav.home')}</a><a href="/products"><span>${t('nav.products')}</span></a><span>${t('nav.caps')}</span></div>
        <h1>${t('capsP.title')}</h1><p class="lead">${t('capsP.lead')}</p>
      </div></section>
      <section class="sec--tight" style="padding-top:0"><div class="wrap">${capsBand([])}</div></section>
      <section class="sec"><div class="wrap">
        ${head(t('nav.caps'), t('capsP.title'), t('capsF.lead'))}
        <div class="cards stagger">${capsItems.map(card).join('')}${svc ? card(svc) : ''}</div>
      </div></section>
      <section class="sec sec--panel"><div class="wrap">${head(t('caps.eyebrow'), t('capsP.how'), '')}${stepsBlock('capsS', ['caps', 'shredder', 'flame', 'wrench', 'sparkle', 'recycle'])}</div></section>
      <section class="sec"><div class="wrap">
        ${head(t('pa.eyebrow'), t('capsG.title'), '')}
        <div class="feats">${[['school', 1], ['building', 2], ['chart', 3]].map(([ic, i]) => `<div class="feat spot reveal"><div class="feat__icon">${icon(ic, 24)}</div><h3>${t(`capsG.${i}t`)}</h3><p>${t(`capsG.${i}p`)}</p></div>`).join('')}</div>
      </div></section>
      <section class="sec sec--panel" id="order"><div class="wrap split">
        <div class="reveal"><div class="eyebrow">${t('caps.cta1')}</div><h2>${t('capsF.title')}</h2><p class="lead" style="margin-top:18px">${t('capsF.lead')}</p></div>
        <div class="form-card reveal" id="capsForm"></div>
      </div></section>
      <section class="sec" id="handover"><div class="wrap split">
        <div class="reveal"><div class="eyebrow">${t('caps.cta2')}</div><h2>${t('capsH.title')}</h2><p class="lead" style="margin-top:18px">${t('capsH.lead')}</p>${S().caps_note ? `<p class="chip chip--acc" style="margin-top:20px;white-space:normal;line-height:1.5;padding:10px 14px;border-radius:12px">${esc(S().caps_note)}</p>` : ''}</div>
        <div class="form-card reveal" id="handForm"></div>
      </div></section>
      ${faqBlock()}`;
    bindCalc();
    mountForm($('#capsForm'), { type: 'product', products: capsItems });
    mountForm($('#handForm'), { type: 'caps' });
  }

  // ── ПАРТНЕРСТВО
  function pagePartners() {
    setTitle(`${t('pa.title')} — ${S().brand}`, t('pa.lead'));
    const icons = ['book', 'users', 'handshake', 'truck', 'factory', 'wrench'];
    app.innerHTML = `
      <section class="page-head"><div class="grid-bg"></div><div class="wrap" style="position:relative">
        <div class="crumbs"><a href="/">${t('nav.home')}</a><span>${t('nav.partners')}</span></div>
        <h1>${t('pa.title')}</h1><p class="lead">${t('pa.lead')}</p>
        <div class="hero__cta" style="margin-top:28px"><a class="btn btn--acc" href="#form">${t('pa.join')} ${icon('arrow', 18)}</a></div>
      </div></section>
      <section class="sec"><div class="wrap">
        <div class="feats">${icons.map((ic, k) => { const i = k + 1; return `<div class="feat spot reveal" id="f${i}"><div class="feat__icon">${icon(ic, 24)}</div><h3>${t(`pa.${i}t`)}</h3><p>${t(`pa.${i}p`)}</p><ul>${t(`pa.${i}l`).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${i === 6 ? `<a class="btn btn--sm" href="/careers">${t('nav.careers')} ${icon('arrow', 16)}</a>` : `<a class="btn btn--sm" href="#form" data-fmt="${['teach', 'learn', 'dealer', 'supply', 'joint'][k]}">${t('pa.join')}</a>`}</div>`; }).join('')}</div>
      </div></section>
      <section class="sec sec--panel" id="form"><div class="wrap split">
        <div class="reveal"><div class="eyebrow">${t('pa.eyebrow')}</div><h2>${t('pa.formTitle')}</h2><p class="lead" style="margin-top:18px">${t('pa.formLead')}</p></div>
        <div class="form-card reveal" id="paForm"></div>
      </div></section>`;
    mountForm($('#paForm'), { type: 'partner' });
    $$('[data-fmt]').forEach((a) => a.addEventListener('click', () => { const r = $(`#paForm input[name="d_format"][value="${a.dataset.fmt}"]`); if (r) r.checked = true; }));
  }

  // ── ВАКАНСІЇ
  async function pageCareers() {
    setTitle(`${t('job.title')} — ${S().brand}`, t('job.lead'));
    const { vacancies } = await cached('/api/vacancies');
    const salary = (v) => (v.salary ? t('job.salary', { s: v.salary }) : t('job.salaryNeg'));
    app.innerHTML = `
      <section class="page-head"><div class="grid-bg"></div><div class="wrap" style="position:relative">
        <div class="crumbs"><a href="/">${t('nav.home')}</a><span>${t('nav.careers')}</span></div>
        <h1>${t('job.title')}</h1><p class="lead">${t('job.lead')}</p>
      </div></section>
      <section class="sec"><div class="wrap">
        ${vacancies.length ? `<div class="vacs">${vacancies.map((v, i) => `<details class="vac reveal" ${i === 0 ? 'open' : ''}>
          <summary><div><h3>${esc(v.title)}</h3><p>${esc([v.schedule, salary(v)].filter(Boolean).join(' · '))}</p></div>${v.kind === 'internship' ? `<span class="chip chip--acc">${t('job.intern')}</span>` : `<span class="chip">${esc(S().city)}</span>`}<span class="vac__plus">${icon('plus', 18)}</span></summary>
          <div class="vac__body">
            ${v.summary ? `<p style="grid-column:1/-1;color:var(--text-2)">${esc(v.summary)}</p>` : ''}
            ${[['duties', 'job.duties'], ['requirements', 'job.req'], ['offer', 'job.offer']].filter(([k]) => v[k].length).map(([k, l]) => `<div><h4>${t(l)}</h4><ul>${v[k].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
            <div class="vac__apply"><button type="button" class="btn btn--acc btn--sm" data-apply="${esc(v.title)}">${t('job.apply')} ${icon('arrow', 16)}</button>${tgHref() ? `<a class="btn btn--sm" href="${tgHref(`${t('job.formTitle')}: ${v.title}`)}" target="_blank" rel="noopener">${icon('send', 16)} Telegram</a>` : ''}</div>
          </div></details>`).join('')}</div>` : `<div class="empty"><p>${t('job.none')}</p></div>`}
      </div></section>
      <section class="sec sec--panel"><div class="wrap">
        ${head(t('job.eyebrow'), t('job.why'), '')}
        <div class="feats">${[['wrench', 1], ['book', 2], ['shield', 3], ['recycle', 4]].map(([ic, i]) => `<div class="feat spot reveal"><div class="feat__icon">${icon(ic, 24)}</div><h3>${t(`job.w${i}t`)}</h3><p>${t(`job.w${i}p`)}</p></div>`).join('')}</div>
      </div></section>
      <section class="sec"><div class="wrap"><div class="cta reveal"><div class="cta__grid"></div><div style="position:relative"><h2>${t('job.open')}</h2><p>${t('job.openP')}</p></div><div class="cta__act" style="position:relative"><button type="button" class="btn btn--dark" data-apply="">${t('job.openBtn')} ${icon('arrow', 18)}</button></div></div></div></section>`;
    $$('[data-apply]').forEach((b) => b.addEventListener('click', () => openRequestModal({ type: 'job', vacancy: b.dataset.apply, vacancies })));
  }

  // ── ПРО НАС
  function pageAbout() {
    setTitle(`${t('ab.title')} — ${S().brand}`, t('ab.lead'));
    const s = S();
    app.innerHTML = `
      <section class="page-head"><div class="grid-bg"></div><div class="wrap" style="position:relative">
        <div class="crumbs"><a href="/">${t('nav.home')}</a><span>${t('nav.about')}</span></div>
        <h1>${t('ab.title')}</h1><p class="lead">${t('ab.lead')}</p>
      </div></section>
      <section class="sec"><div class="wrap split">
        <div class="reveal"><div class="eyebrow">${t('ab.eyebrow')}</div><p class="big-quote">${t('why.quote')}</p></div>
        <div class="rich reveal" style="font-size:17.5px"><p>${t('ab.story1')}</p><p>${t('ab.story2')}</p>
          ${s.marketplace_url ? `<p><a class="link" href="${esc(s.marketplace_url)}" target="_blank" rel="noopener">${t('ab.market')} ${icon('arrowUR', 16)}</a></p>` : ''}</div>
      </div></section>
      <section class="sec sec--panel"><div class="wrap split">
        <div class="reveal"><div class="eyebrow">${t('ab.mission')}</div><h2 style="font-size:clamp(26px,3vw,40px)">${t('ab.missionP')}</h2></div>
        <div class="numbers reveal">
          <div><b class="mono">${(META.counts.equipment || 0) + (META.counts.product || 0)}</b><span>${t('ab.n1')}</span></div>
          <div><b class="mono">4</b><span>${t('ab.n2')}</span></div>
          <div><b class="mono">4</b><span>${t('ab.n3')}</span></div>
          <div><b class="mono">ЧПУ</b><span>${t('ab.n4')}</span></div>
        </div>
      </div></section>
      <section class="sec"><div class="wrap">
        ${head(t('dirs.eyebrow'), t('dirs.title'), '')}
        <div class="dirs">${dirTile(1, '/equipment', 'shredder', null)}${dirTile(2, '/products', 'recycle', null)}${dirTile(3, '/services', 'cnc', null)}${dirTile(4, '/contacts?topic=custom#form', 'blueprint', null)}</div>
      </div></section>
      <section class="sec sec--panel"><div class="wrap">
        ${head(t('ab.values'), t('ab.values'), '')}
        <div class="feats">${[['eye', 1], ['recycle', 2], ['users', 3]].map(([ic, i]) => `<div class="feat spot reveal"><div class="feat__icon">${icon(ic, 24)}</div><h3>${t(`ab.v${i}t`)}</h3><p>${t(`ab.v${i}p`)}</p></div>`).join('')}</div>
      </div></section>
      ${ctaBlock()}`;
  }

  // ── КОНТАКТИ
  function pageContacts() {
    setTitle(`${t('nav.contacts')} — ${S().brand}`, t('co.lead'));
    const s = S();
    const topic = new URLSearchParams(location.search).get('topic') || 'equipment';
    const cards = [
      s.phone && `<a class="ccard" href="${telHref()}"><span class="ccard__i">${icon('phone', 22)}</span><div><small>${t('co.phone')}</small><b>${esc(phoneLabel())}</b></div></a>`,
      s.telegram && `<a class="ccard" href="${tgHref()}" target="_blank" rel="noopener"><span class="ccard__i">${icon('send', 22)}</span><div><small>Telegram</small><b>@${esc(s.telegram)}</b></div></a>`,
      s.viber && `<a class="ccard" href="viber://chat?number=${encodeURIComponent(s.viber.replace(/[^\d+]/g, ''))}"><span class="ccard__i">${icon('viber', 22)}</span><div><small>Viber</small><b>${esc(s.viber)}</b></div></a>`,
      s.email && `<a class="ccard" href="mailto:${esc(s.email)}"><span class="ccard__i">${icon('mail', 22)}</span><div><small>Email</small><b>${esc(s.email)}</b></div></a>`,
      `<${s.map_url ? `a href="${esc(s.map_url)}" target="_blank" rel="noopener"` : 'div'} class="ccard"><span class="ccard__i">${icon('pin', 22)}</span><div><small>${t('co.address')}</small><b>${esc([s.city, s.address].filter(Boolean).join(', '))}</b>${s.map_url ? `<br><span class="link" style="font-size:13px">${t('co.map')} ↗</span>` : ''}</div></${s.map_url ? 'a' : 'div'}>`,
      s.hours && `<div class="ccard"><span class="ccard__i">${icon('clock', 22)}</span><div><small>${t('co.hours')}</small><b>${esc(s.hours)}</b></div></div>`,
    ].filter(Boolean);
    app.innerHTML = `
      <section class="page-head"><div class="grid-bg"></div><div class="wrap" style="position:relative">
        <div class="crumbs"><a href="/">${t('nav.home')}</a><span>${t('nav.contacts')}</span></div>
        <h1>${t('co.title')}</h1><p class="lead">${t('co.lead')}</p>
      </div></section>
      <section class="sec"><div class="wrap contacts">
        <div class="ccards reveal">${cards.join('')}</div>
        <div class="form-card reveal" id="form"><h3 style="font-size:24px">${t('co.formTitle')}</h3><p style="color:var(--muted);margin:6px 0 20px">${t('co.formLead')}</p><div id="coForm"></div></div>
      </div></section>
      ${faqBlock()}`;
    mountForm($('#coForm'), { type: topic, topicSelect: true });
  }

  // ── КОШИК ЗАЯВКИ
  function pageBasket() {
    setTitle(`${t('bk.title')} — ${S().brand}`, t('bk.lead'));
    const draw = () => {
      const list = basket.items;
      const total = list.reduce((s, x) => s + (x.price_type !== 'request' && x.price ? x.price * (x.qty || 1) : 0), 0);
      app.innerHTML = `
        <section class="page-head"><div class="wrap">
          <div class="crumbs"><a href="/">${t('nav.home')}</a><span>${t('nav.request')}</span></div>
          <h1>${t('bk.title')}</h1><p class="lead">${t('bk.lead')}</p>
        </div></section>
        <div class="wrap">${list.length ? `<div class="basket">
          <div>${list.map((x) => `<div class="bline" data-id="${x.id}">
              <div class="bline__img">${x.image ? `<img src="${esc(x.image)}" alt="">` : art(x)}</div>
              <div><h4><a href="${itemUrl(x)}">${esc(L(x, 'title'))}</a></h4><div style="font-size:13.5px;color:var(--muted)">${esc(catName(x.category))} · ${esc(priceText(x))}</div></div>
              <div class="bline__ctrl">
                <div class="qty"><button type="button" data-q="-1" aria-label="-">−</button><input type="number" min="1" value="${x.qty || 1}" aria-label="${t('f.qty')}"><button type="button" data-q="1" aria-label="+">+</button></div>
                ${x.kind === 'equipment' ? `<select class="mini-select" data-mode aria-label="${t('f.mode')}">${[['buy', 'f.modeBuy'], ['rent', 'f.modeRent'], ['custom', 'f.modeCustom']].map(([v, k]) => `<option value="${v}" ${x.mode === v ? 'selected' : ''}>${t(k)}</option>`).join('')}</select>` : ''}
                <button type="button" class="btn btn--xs btn--ghost" data-rm>${icon('x', 14)} ${t('bk.remove')}</button>
              </div></div>`).join('')}
            ${total ? `<div class="bline" style="grid-template-columns:1fr auto"><div><b>${t('bk.total')}</b><div style="font-size:13px;color:var(--muted)">${t('bk.totalNote')}</div></div><span class="price">${N(total)} ₴</span></div>` : ''}
          </div>
          <div class="form-card" style="position:sticky;top:calc(var(--hdr) + 20px)"><h3 style="font-size:22px;margin-bottom:16px">${t('bk.formTitle')}</h3><div id="bkForm"></div></div>
        </div>` : `<div class="empty" style="margin:40px 0 100px"><h3>${t('bk.empty')}</h3><p>${t('bk.emptyP')}</p><p style="margin-top:18px"><a class="btn btn--acc btn--sm" href="/equipment">${t('bk.go')}</a></p></div>`}</div>`;
      if (!list.length) return;
      $$('.bline[data-id]').forEach((row) => {
        const id = Number(row.dataset.id);
        const x = basket.items.find((b) => b.id === id);
        const inp = $('input', row);
        const setQ = (v) => { x.qty = Math.max(1, Math.min(100000, Number(v) || 1)); inp.value = x.qty; basket.save(); };
        $$('[data-q]', row).forEach((b) => b.addEventListener('click', () => { setQ(x.qty + Number(b.dataset.q)); draw(); }));
        inp.addEventListener('change', () => { setQ(inp.value); draw(); });
        $('[data-mode]', row)?.addEventListener('change', (e) => { x.mode = e.target.value; basket.save(); });
        $('[data-rm]', row).addEventListener('click', () => { basket.remove(id); draw(); });
      });
      mountForm($('#bkForm'), { type: 'equipment', basket: true, onDone: () => basket.clear() });
    };
    draw();
  }

  // ── 404 і адмінка
  function page404(title, text) {
    setTitle(`${title || t('p404.title')} — ${S().brand}`);
    app.innerHTML = `<section class="sec"><div class="wrap"><div class="empty" style="padding:96px 24px"><div class="mono" style="font-size:64px;font-weight:700;color:var(--acc-text)">404</div><h3>${title || t('p404.title')}</h3><p>${text || t('p404.text')}</p><p style="margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn--acc btn--sm" href="/">${t('nav.home')}</a><a class="btn btn--sm" href="/equipment">${t('nav.equipment')}</a></p></div></div></section>`;
  }
  async function pageAdmin() {
    document.title = `Адмінка — ${S().brand}`;
    if (!window.BH_ADMIN) {
      await new Promise((ok, fail) => { const s = document.createElement('script'); s.src = `/js/admin.js?v=${Date.now().toString(36).slice(0, 6)}`; s.onload = ok; s.onerror = fail; document.head.append(s); });
    }
    await window.BH_ADMIN.mount(app, { api, esc, icon, META, art, toast, catName });
  }

  // ═══════════════ ФОРМИ ЗАЯВОК ═══════════════
  const TOPICS = ['equipment', 'custom', 'product', 'service', 'caps', 'partner', 'job', 'contact'];
  const fld = (name, label, { type = 'text', req = false, ph = '', val = '', attrs = '', hint = '' } = {}) => `<label class="field"><span>${label}${req ? ' <span class="req">*</span>' : ''}</span>${type === 'textarea'
    ? `<textarea name="${name}" placeholder="${esc(ph)}" ${attrs}>${esc(val)}</textarea>` : `<input name="${name}" type="${type}" placeholder="${esc(ph)}" value="${esc(val)}" ${req ? 'required' : ''} ${attrs}>`}${hint ? `<small>${hint}</small>` : ''}</label>`;
  const radios = (name, opts, checked) => `<div class="opts">${opts.map(([v, l]) => `<label class="opt"><input type="radio" name="${name}" value="${esc(v)}" ${v === checked ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`;
  const checkbox = (name, label, on = false) => `<label class="check"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}> ${label}</label>`;
  const selectF = (name, label, opts, val) => `<label class="field"><span>${label}</span><select name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;

  function typeFields(type, ctx) {
    const mode = ctx.mode || 'buy';
    switch (type) {
      case 'equipment':
        if (ctx.basket || ctx.itemsList) return `${checkbox('d_delivery', t('f.delivery'))}${checkbox('d_install', t('f.install'))}`;
        return `<div class="field"><span>${t('f.mode')}</span>${radios('d_mode', [['buy', t('f.modeBuy')], ...(ctx.item?.rent || !ctx.item ? [['rent', t('f.modeRent')]] : []), ['custom', t('f.modeCustom')], ['consult', t('f.modeConsult')]], mode)}</div>
          <div class="form__row">${fld('d_qty', t('f.qty'), { type: 'number', val: '1', attrs: 'min="1"' })}${fld('city', t('f.city'))}</div>
          ${checkbox('d_install', t('f.install'))}`;
      case 'custom':
        return `<div class="form__row">${fld('d_material', t('f.material'), { ph: 'PET, HDPE, метал, деревина…' })}${fld('d_volume', t('f.volume'), { ph: t('f.volumePh') })}</div>
          <div class="form__row">${fld('d_output', t('f.output'), { ph: 'флекс, гранула, брус, пресовані тюки…' })}${fld('d_budget', t('f.budget'), { hint: t('f.optional') })}</div>`;
      case 'product': {
        const prods = ctx.products || [];
        return `${prods.length && !ctx.item ? selectF('d_product', t('f.product'), [['', '—'], ...prods.map((p) => [L(p, 'title'), L(p, 'title')])], '') : ''}
          <div class="form__row">${fld('d_qty', t('f.qty'), { type: 'number', val: '1', attrs: 'min="1"' })}${fld('d_deadline', t('f.deadline'), { ph: 'напр., до 1 травня' })}</div>
          <div class="field"><span>${t('f.color')}</span>${radios('d_color', [[t('f.colorMix'), t('f.colorMix')], [t('f.colorMono'), t('f.colorMono')], [t('f.colorBrand'), t('f.colorBrand')]], t('f.colorMix'))}</div>
          ${fld('d_size', t('f.size'), { ph: 'довжина 2 м, 3 секції…', hint: t('f.optional') })}
          ${checkbox('d_branding', t('f.branding'))}${checkbox('d_own_material', t('f.own'))}`;
      }
      case 'service': {
        const svcs = ctx.services || [];
        return `${svcs.length && !ctx.item ? selectF('d_service', t('f.service'), svcs.map((p) => [L(p, 'title'), L(p, 'title')]), '') : ''}
          <div class="form__row">${fld('d_qty', t('f.qty'), { type: 'number', val: '1', attrs: 'min="1"' })}${fld('d_deadline', t('f.deadline'), { hint: t('f.optional') })}</div>`;
      }
      case 'caps':
        return `<div class="form__row">${fld('d_weight', t('f.weight'), { ph: '30 кг / 10 000 шт.', req: false })}${fld('d_org', t('f.org'), { ph: 'школа №…, ОСББ…', hint: t('f.optional') })}</div>
          ${fld('city', t('f.city'))}${checkbox('d_pickup', t('f.pickup'), true)}${checkbox('d_own_material', t('f.own'))}`;
      case 'partner':
        return `<div class="field"><span>${t('f.format')}</span>${radios('d_format', [['teach', t('pa.f.teach')], ['learn', t('pa.f.learn')], ['dealer', t('pa.f.dealer')], ['supply', t('pa.f.supply')], ['joint', t('pa.f.joint')], ['invest', t('pa.f.invest')], ['other', t('pa.f.other')]], ctx.format || 'teach')}</div>
          <div class="form__row">${fld('company', t('f.company'))}${fld('city', t('f.city'))}</div>`;
      case 'job': {
        const vs = ctx.vacancies || [];
        return `${selectF('d_vacancy', t('f.vacancy'), [['', t('job.open')], ...vs.map((v) => [v.title, v.title])], ctx.vacancy || '')}
          ${fld('d_experience', t('job.exp'), { ph: 'напр., 3 роки зварювальником' })}`;
      }
      default: return '';
    }
  }
  const FILES_FOR = new Set(['custom', 'service', 'job', 'product', 'partner', 'equipment']);

  function mountForm(box, ctx) {
    let type = TOPICS.includes(ctx.type) ? ctx.type : 'contact';
    const files = [];
    const saved = store.get('bh-contact', {});
    const showFiles = () => FILES_FOR.has(type) && !(type === 'equipment' && ctx.basket);
    const build = () => {
      const msgLabel = ['custom', 'service'].includes(type) ? t('f.messageTask') : t('f.message');
      box.innerHTML = `<form class="form" novalidate>
        ${ctx.topicSelect ? `<div class="field"><span>${t('f.topic')}</span><select name="__topic">${TOPICS.map((k) => `<option value="${k}" ${k === type ? 'selected' : ''}>${t(`topic.${k}`)}</option>`).join('')}</select></div>` : ''}
        ${ctx.itemsList ? `<div class="files">${ctx.itemsList.map(({ it, qty }) => `<div><span>${esc(L(it, 'title'))}</span><span class="mono">× ${qty}</span></div>`).join('')}</div>` : ''}
        ${ctx.item ? `<div class="bline" style="grid-template-columns:64px 1fr;padding:10px"><div class="bline__img" style="width:64px;height:48px">${imgOrArt(ctx.item)}</div><div><h4 style="font-size:15px;margin:0">${esc(L(ctx.item, 'title'))}</h4><div style="font-size:13px;color:var(--muted)">${esc(priceText(ctx.item))}</div></div></div>` : ''}
        <div class="type-fields" style="display:grid;gap:14px">${typeFields(type, ctx)}</div>
        <div class="form__row">${fld('name', t('f.name'), { req: true, val: saved.name || '', attrs: 'autocomplete="name"' })}${fld('phone', t('f.phone'), { type: 'tel', req: true, ph: '+380 __ ___ __ __', val: saved.phone || '', attrs: 'autocomplete="tel" inputmode="tel"' })}</div>
        ${['partner'].includes(type) ? '' : `<div class="form__row">${fld('email', t('f.email'), { type: 'email', val: saved.email || '', attrs: 'autocomplete="email"', hint: t('f.optional') })}${['equipment', 'caps'].includes(type) && !ctx.basket ? '' : fld('company', t('f.company'), { val: saved.company || '', hint: t('f.optional') })}</div>`}
        ${ctx.basket ? fld('city', t('f.city')) : ''}
        <div class="field"><span>${t('f.via')}</span>${radios('contact_via', [['call', t('f.viaCall')], ['telegram', 'Telegram'], ['viber', 'Viber'], ['email', 'Email']], saved.contact_via || 'call')}</div>
        ${fld('message', msgLabel, { type: 'textarea' })}
        ${showFiles() ? `<div class="field"><span>${type === 'job' ? t('job.cv') : t('f.files')}</span><div class="drop" tabindex="0" role="button">${icon('upload', 20)}<div style="margin-top:6px">${t('f.filesHint')}</div><input type="file" multiple hidden></div><div class="files"></div></div>` : ''}
        <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
        <div class="form__msg err hidden" role="alert"></div>
        <div class="form__foot"><p class="form__legal">${t('f.legal')}</p><button class="btn btn--acc" type="submit">${t(ctx.basket ? 'bk.send' : 'f.send')} ${icon('arrow', 18)}</button></div>
      </form>`;
      const form = $('form', box);
      $('[name="__topic"]', form)?.addEventListener('change', (e) => { type = e.target.value; keepValues(form, build); });
      bindFiles(form);
      form.addEventListener('submit', (e) => { e.preventDefault(); submit(form); });
    };
    const keepValues = (form, then) => {
      const keep = {}; for (const n of ['name', 'phone', 'email', 'company', 'message']) if (form[n]) keep[n] = form[n].value;
      then();
      const f2 = $('form', box); for (const [n, v] of Object.entries(keep)) if (f2[n]) f2[n].value = v;
    };
    const bindFiles = (form) => {
      const drop = $('.drop', form); if (!drop) return;
      const input = $('input[type=file]', drop);
      const list = $('.files', form);
      const draw = () => { list.innerHTML = files.map((f, i) => `<div><span>${icon('file', 16)} ${esc(f.name)} <span class="mono" style="color:var(--muted)">${(f.size / 1048576).toFixed(1)} МБ</span></span><button type="button" data-rmf="${i}" aria-label="x">${icon('x', 16)}</button></div>`).join(''); };
      const addFiles = (fl) => {
        const err = $('.form__msg', form);
        for (const f of fl) {
          if (files.length >= 5) { err.textContent = t('err.files'); err.classList.remove('hidden'); break; }
          if (f.size > 10 * 1048576) { err.textContent = t('err.file', { name: f.name }); err.classList.remove('hidden'); continue; }
          files.push(f);
        }
        draw();
      };
      drop.addEventListener('click', () => input.click());
      drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
      input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });
      list.addEventListener('click', (e) => { const b = e.target.closest('[data-rmf]'); if (b) { files.splice(Number(b.dataset.rmf), 1); draw(); } });
      draw();
    };
    const readFile = (f) => new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok({ name: f.name, data: r.result }); r.onerror = fail; r.readAsDataURL(f); });
    async function submit(form) {
      const err = $('.form__msg', form);
      err.classList.add('hidden');
      const fd = new FormData(form);
      const v = (k) => String(fd.get(k) ?? '').trim();
      $$('.field', form).forEach((f) => f.classList.remove('invalid'));
      const digits = v('phone').replace(/\D/g, '');
      if (v('name').length < 2 || (digits.length < 9 && !/^\S+@\S+\.\S+$/.test(v('email')))) {
        if (v('name').length < 2) form.name.closest('.field').classList.add('invalid');
        if (digits.length < 9) form.phone.closest('.field').classList.add('invalid');
        err.textContent = t('f.need'); err.classList.remove('hidden');
        (v('name').length < 2 ? form.name : form.phone).focus();
        return;
      }
      const details = {};
      for (const [k, val] of fd.entries()) if (k.startsWith('d_')) details[k.slice(2)] = typeof val === 'string' ? val.trim() : val;
      for (const el of $$('input[type=checkbox][name^="d_"]', form)) details[el.name.slice(2)] = el.checked;
      const modeLabel = { buy: t('f.modeBuy'), rent: t('f.modeRent'), custom: t('f.modeCustom'), consult: t('f.modeConsult') };
      if (details.mode) details.mode = modeLabel[details.mode] || details.mode;
      if (details.format) details.format = t(`pa.f.${details.format}`) || details.format;
      let items = [];
      if (ctx.item) items = [{ id: ctx.item.id, qty: Number(details.qty) || 1, mode: details.mode || '' }];
      if (ctx.basket) items = basket.items.map((x) => ({ id: x.id, qty: x.qty || 1, mode: modeLabel[x.mode] || '' }));
      if (ctx.itemsList) items = ctx.itemsList.map(({ it, qty }) => ({ id: it.id, qty, mode: '' }));
      if (ctx.solution) details.solution = ctx.solution;
      const btn = $('button[type=submit]', form);
      btn.disabled = true; const txt = btn.innerHTML; btn.textContent = t('f.sending');
      try {
        const payload = {
          type, items, details, lang, page: location.pathname,
          name: v('name'), phone: v('phone'), email: v('email'), company: v('company'), city: v('city'),
          contact_via: v('contact_via'), message: v('message'), website: v('website'),
          files: await Promise.all(files.map(readFile)),
        };
        store.set('bh-contact', { name: payload.name, phone: payload.phone, email: payload.email, company: payload.company, contact_via: payload.contact_via });
        const r = await api('/api/requests', { method: 'POST', body: JSON.stringify(payload) });
        ctx.onDone?.();
        box.innerHTML = `<div class="success"><div class="success__icon">${icon('check', 34, 2.4)}</div><h3>${t('ok.title')}</h3><p>${t('ok.text')}</p><span class="mono">${esc(r.number)}</span>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px"><a class="btn btn--sm" href="/equipment">${t('ok.more')}</a>${tgHref() ? `<a class="btn btn--sm btn--ghost" href="${tgHref(`${t('nav.request')} ${r.number}`)}" target="_blank" rel="noopener">${icon('send', 16)} Telegram</a>` : ''}</div></div>`;
        renderBasketBtn();
      } catch (e2) {
        err.textContent = e2.message || t('err.generic'); err.classList.remove('hidden');
        btn.disabled = false; btn.innerHTML = txt;
      }
    }
    build();
  }

  function openRequestModal(ctx) {
    const titles = { equipment: t('item.order'), product: t('capsF.title'), service: t('sv.formTitle'), job: t('job.formTitle') };
    const el = document.createElement('div');
    el.className = 'modal'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="modal__box"><div class="modal__head"><div><h3>${esc(ctx.solution || ctx.vacancy || titles[ctx.type] || t('cta.order'))}</h3><p>${t('co.lead')}</p></div><button type="button" class="iconbtn" data-close aria-label="close">${icon('x', 20)}</button></div><div class="modal__body"></div></div>`;
    const close = () => { el.remove(); document.removeEventListener('keydown', key); document.body.style.overflow = ''; };
    const key = (e) => { if (e.key === 'Escape') close(); };
    el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
    $('[data-close]', el).addEventListener('click', close);
    document.addEventListener('keydown', key);
    $('#layer').append(el);
    document.body.style.overflow = 'hidden';
    mountForm($('.modal__body', el), ctx);
    setTimeout(() => $('input:not([type=radio]):not([type=hidden]), select', el)?.focus(), 50);
  }

  // ── старт
  async function boot() {
    try {
      META = await api('/api/meta');
    } catch {
      app.innerHTML = `<section class="sec"><div class="wrap"><div class="empty"><h3>${t('net.err')}</h3></div></div></section>`;
      return;
    }
    window.BH_CAT_ICON = Object.fromEntries(META.categories.map((c) => [c.slug, c.icon]));
    renderShell();
    await render(false);
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }
  boot();
})();

// Якщо фото не завантажилось (наприклад, сайт-джерело недоступний) — показуємо заглушку замість «битої» картинки.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img instanceof HTMLImageElement && !img.dataset.fb) { img.dataset.fb = '1'; img.src = '/img/placeholder.svg'; }
}, true);
