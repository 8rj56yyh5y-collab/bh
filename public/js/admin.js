/* Адмінка БХ: заявки, каталог (обладнання, вироби, послуги), вакансії, налаштування. Підвантажується лише на /admin. */
'use strict';
window.BH_ADMIN = (() => {
  let C; // контекст із app.js: api, esc, icon, META, art, toast, catName
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const STATUSES = { new: 'Нова', work: 'В роботі', offer: 'КП надіслано', done: 'Виконано', cancel: 'Скасовано' };
  const KIND_UA = { equipment: 'Обладнання', product: 'Вироби', service: 'Послуги' };
  const AVAIL = { stock: 'В наявності', order: 'Виготовлення під замовлення', preorder: 'Під замовлення (виріб)' };
  const PRICE_T = { fixed: 'Фіксована', from: 'Від …', request: 'За запитом' };
  const fmtDate = (s) => { const d = new Date(s.includes('T') ? s : `${s.replace(' ', 'T')}Z`); return d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); };
  const money = (n) => Number(n).toLocaleString('uk-UA').replace(/ /g, ' ');
  let root, tab = 'requests', me = {};

  async function mount(app, ctx) {
    C = ctx;
    if (!$('link[href^="/css/admin.css"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/css/admin.css'; document.head.append(l); }
    root = app;
    me = await C.api('/api/admin/me');
    if (!me.admin) return login();
    const h = location.hash.slice(1).split('/')[0];
    if (['dash', 'requests', 'items', 'vacancies', 'settings'].includes(h)) tab = h;
    shell();
  }

  function login() {
    root.innerHTML = `<div class="wrap"><div class="adm-login form-card"><h1 style="font-size:28px;margin-bottom:6px">Адмінка БХ</h1><p style="color:var(--muted);margin-bottom:20px">Заявки, каталог, вакансії та контакти сайту.</p>
      <form class="form"><label class="field"><span>Пароль</span><input name="password" type="password" required autocomplete="current-password" autofocus></label>
      <div class="form__msg err hidden"></div><button class="btn btn--acc" type="submit">Увійти</button></form></div></div>`;
    $('form', root).addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('.form__msg', root);
      try { await C.api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: e.target.password.value }) }); me = await C.api('/api/admin/me'); shell(); }
      catch (x) { err.textContent = x.message; err.classList.remove('hidden'); }
    });
  }

  let newCount = 0;
  function shell() {
    root.innerHTML = `<div class="wrap adm">
      <div class="adm__top"><h1>Адмінка</h1><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn--sm" href="/" target="_blank">Відкрити сайт ↗</a><button class="btn btn--sm btn--ghost" id="logout">Вийти</button></div></div>
      <div class="adm__tabs">${[['dash', 'Огляд'], ['requests', 'Заявки'], ['items', 'Каталог'], ['vacancies', 'Вакансії'], ['settings', 'Налаштування']].map(([k, l]) => `<button type="button" data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}${k === 'requests' ? '<span class="badge hidden" id="newBadge"></span>' : ''}</button>`).join('')}</div>
      <div id="pane"></div></div>`;
    $$('[data-tab]', root).forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; history.replaceState(null, '', `/admin#${tab}`); $$('[data-tab]', root).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    $('#logout').addEventListener('click', async () => { await C.api('/api/admin/logout', { method: 'POST' }); login(); });
    draw();
  }
  function setBadge(n) { newCount = n; const b = $('#newBadge'); if (b) { b.textContent = n; b.classList.toggle('hidden', !n); } }
  function draw() { ({ dash, requests, items, vacancies, settings })[tab](); }

  function modal(title, body, { wide = false } = {}) {
    const el = document.createElement('div');
    el.className = `modal ${wide ? 'modal--wide' : ''}`;
    el.innerHTML = `<div class="modal__box"><div class="modal__head"><div><h3>${title}</h3></div><button type="button" class="iconbtn" data-close aria-label="Закрити">${C.icon('x', 20)}</button></div><div class="modal__body">${body}</div></div>`;
    const close = () => { el.remove(); document.removeEventListener('keydown', key); document.body.style.overflow = ''; };
    const key = (e) => { if (e.key === 'Escape') close(); };
    $('[data-close]', el).addEventListener('click', close);
    el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
    document.addEventListener('keydown', key);
    $('#layer').append(el);
    document.body.style.overflow = 'hidden';
    return { el, close };
  }

  // ═══ ОГЛЯД
  async function dash() {
    const pane = $('#pane');
    pane.innerHTML = `<p style="color:var(--muted)">Завантаження…</p>`;
    const s = await C.api('/api/admin/stats');
    setBadge(s.statuses.new || 0);
    const days = [];
    for (let i = 29; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); days.push([d, s.days[d] || 0]); }
    const max = Math.max(1, ...days.map((d) => d[1]));
    const types = C.META.requestTypes;
    pane.innerHTML = `
      <div class="kpis">
        <div class="kpi"><small>Нові заявки</small><b>${s.statuses.new || 0}</b></div>
        <div class="kpi"><small>В роботі</small><b>${(s.statuses.work || 0) + (s.statuses.offer || 0)}</b></div>
        <div class="kpi"><small>За 7 днів</small><b>${s.week}</b></div>
        <div class="kpi"><small>Усього заявок</small><b>${s.total}</b></div>
        ${s.items.map((k) => `<div class="kpi"><small>${KIND_UA[k.kind] || k.kind}</small><b>${k.p}<span style="font-size:15px;color:var(--muted)"> / ${k.n}</span></b></div>`).join('')}
      </div>
      <h3 style="margin:24px 0 10px">Заявки за 30 днів</h3>
      <div class="bars">${days.map(([d, n]) => `<div style="height:${(n / max) * 100}%" data-t="${d.slice(5)}: ${n}"></div>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-top:24px">
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Тип заявки (30 днів)</th><th>К-сть</th></tr></thead><tbody>${Object.entries(types).map(([k, v]) => `<tr><td>${v.uk}</td><td class="mono">${s.types[k] || 0}</td></tr>`).join('')}</tbody></table></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Найпопулярніші сторінки</th><th>Перегляди</th></tr></thead><tbody>${s.top.map((x) => `<tr><td><a class="link" href="/${C.META.kinds[x.kind].path}/${x.slug}" target="_blank">${C.esc(x.title)}</a></td><td class="mono">${x.views}</td></tr>`).join('')}</tbody></table></div>
      </div>
      ${me.telegram ? '' : `<div class="form-card" style="margin-top:24px"><h3>Сповіщення в Telegram не налаштовані</h3><p style="color:var(--text-2);margin-top:8px">Щоб заявки миттєво приходили в Telegram, додайте на сервері змінні <span class="mono">TELEGRAM_BOT_TOKEN</span> і <span class="mono">TELEGRAM_CHAT_ID</span> (інструкція — у README).</p></div>`}`;
  }

  // ═══ ЗАЯВКИ
  let rq = { status: '', type: '', q: '' };
  async function requests() {
    const pane = $('#pane');
    const types = C.META.requestTypes;
    pane.innerHTML = `
      <div class="adm-filters">
        <div class="cats" id="stF">${[['', 'Усі'], ...Object.entries(STATUSES)].map(([k, v]) => `<button type="button" class="cat-btn ${rq.status === k ? 'on' : ''}" data-st="${k}">${v} <span class="n" data-cnt="${k}"></span></button>`).join('')}</div>
      </div>
      <div class="adm-filters">
        <select class="select" id="tyF"><option value="">Усі типи</option>${Object.entries(types).map(([k, v]) => `<option value="${k}" ${rq.type === k ? 'selected' : ''}>${v.uk}</option>`).join('')}</select>
        <label class="search" style="margin-left:0">${C.icon('search', 18)}<input type="search" id="qF" placeholder="Ім’я, телефон, номер, текст…" value="${C.esc(rq.q)}"></label>
        <a class="btn btn--sm" href="/api/admin/requests.csv" download style="margin-left:auto">${C.icon('upload', 16)} Excel (CSV)</a>
      </div>
      <div id="rqList"><p style="color:var(--muted)">Завантаження…</p></div>`;
    $$('[data-st]', pane).forEach((b) => b.addEventListener('click', () => { rq.status = b.dataset.st; $$('[data-st]', pane).forEach((x) => x.classList.toggle('on', x === b)); load(); }));
    $('#tyF').addEventListener('change', (e) => { rq.type = e.target.value; load(); });
    let tm; $('#qF').addEventListener('input', (e) => { clearTimeout(tm); tm = setTimeout(() => { rq.q = e.target.value; load(); }, 250); });
    let list = [];
    async function load() {
      const p = new URLSearchParams(Object.entries(rq).filter(([, v]) => v));
      const r = await C.api(`/api/admin/requests?${p}`);
      list = r.counts && r.requests;
      const total = Object.values(r.counts).reduce((a, b) => a + b, 0);
      $$('[data-cnt]', pane).forEach((el) => { const k = el.dataset.cnt; el.textContent = k ? (r.counts[k] || 0) : total; });
      setBadge(r.counts.new || 0);
      $('#rqList').innerHTML = list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>№</th><th>Дата</th><th>Тип</th><th>Клієнт</th><th class="hide-m">Що цікавить</th><th>Статус</th></tr></thead><tbody>
        ${list.map((x) => `<tr class="clickable" data-id="${x.id}"><td class="mono">${x.number}</td><td class="mono" style="white-space:nowrap">${fmtDate(x.created_at)}</td><td>${C.esc(types[x.type]?.uk || x.type)}</td>
          <td><b>${C.esc(x.name)}</b>${x.company ? `<div style="color:var(--muted);font-size:13px">${C.esc(x.company)}</div>` : ''}<div class="mono" style="font-size:12.5px;color:var(--text-2)">${C.esc(x.phone || x.email)}</div></td>
          <td class="hide-m" style="max-width:340px">${C.esc(x.items.map((i) => `${i.title}${i.qty > 1 ? ` × ${i.qty}` : ''}`).join(', ') || Object.values(x.details).filter((v) => typeof v === 'string').slice(0, 2).join(' · ') || x.message.slice(0, 90))}${x.files.length ? ` · 📎${x.files.length}` : ''}</td>
          <td><span class="st st--${x.status}">${STATUSES[x.status]}</span></td></tr>`).join('')}</tbody></table></div>`
        : `<div class="empty"><h3>Заявок немає</h3><p>Нові заявки з сайту з’являтимуться тут${me.telegram ? ' і в Telegram' : ''}.</p></div>`;
      $$('tr[data-id]', pane).forEach((tr) => tr.addEventListener('click', () => openRequest(list.find((x) => x.id === Number(tr.dataset.id)), load)));
      const hid = Number(location.hash.split('/')[1]);
      if (hid) { const f = list.find((x) => x.id === hid); history.replaceState(null, '', '/admin#requests'); if (f) openRequest(f, load); }
    }
    load();
  }
  const DET = { mode: 'Формат', qty: 'Кількість', color: 'Колір', size: 'Розміри', branding: 'Лого/напис', deadline: 'Термін', own_material: 'Своя сировина', material: 'Сировина', volume: 'Обсяг', output: 'Бажаний продукт', budget: 'Бюджет', format: 'Формат партнерства', vacancy: 'Вакансія', experience: 'Досвід', weight: 'Кількість сировини', pickup: 'Потрібен вивіз', delivery: 'Доставка', install: 'Монтаж і навчання', service: 'Послуга', product: 'Виріб', org: 'Організація', solution: 'Рішення під ключ' };
  function openRequest(x, reload) {
    const types = C.META.requestTypes;
    const tel = x.phone ? `tel:${x.phone}` : '';
    const tgLink = x.phone ? `https://t.me/${x.phone.replace(/[^\d+]/g, '')}` : '';
    const via = { call: 'Дзвінок', telegram: 'Telegram', viber: 'Viber', email: 'Email' }[x.contact_via] || x.contact_via;
    const det = Object.entries(x.details).filter(([, v]) => v !== '' && v !== false && v != null);
    const m = modal(`${x.number} · ${C.esc(types[x.type]?.uk || x.type)}`, `
      <div style="display:grid;gap:18px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">${tel ? `<a class="btn btn--sm btn--acc" href="${tel}">${C.icon('phone', 16)} ${C.esc(x.phone)}</a>` : ''}
          ${x.contact_via === 'telegram' && tgLink ? `<a class="btn btn--sm" href="${tgLink}" target="_blank" rel="noopener">${C.icon('send', 16)} Telegram</a>` : ''}
          ${x.contact_via === 'viber' && x.phone ? `<a class="btn btn--sm" href="viber://chat?number=${encodeURIComponent(x.phone)}">${C.icon('viber', 16)} Viber</a>` : ''}
          ${x.email ? `<a class="btn btn--sm" href="mailto:${C.esc(x.email)}?subject=${encodeURIComponent(`Заявка ${x.number}`)}">${C.icon('mail', 16)} ${C.esc(x.email)}</a>` : ''}</div>
        <dl class="kv">
          <dt>Клієнт</dt><dd><b>${C.esc(x.name)}</b>${x.company ? ` · ${C.esc(x.company)}` : ''}</dd>
          ${x.city ? `<dt>Місто</dt><dd>${C.esc(x.city)}</dd>` : ''}
          ${via ? `<dt>Зв’язок</dt><dd>${C.esc(via)}</dd>` : ''}
          <dt>Отримано</dt><dd class="mono">${fmtDate(x.created_at)} · ${C.esc(x.page || '')} · ${x.lang.toUpperCase()}</dd>
          ${det.map(([k, v]) => `<dt>${DET[k] || k}</dt><dd>${v === true ? 'так' : C.esc(v)}</dd>`).join('')}
        </dl>
        ${x.items.length ? `<div><h4 style="font:600 12px var(--f-mono);text-transform:uppercase;color:var(--muted);margin-bottom:8px">Позиції</h4>${x.items.map((i) => `<div class="bline" style="grid-template-columns:1fr auto;padding:10px 14px"><a class="link" href="/${C.META.kinds[i.kind]?.path || 'equipment'}/${i.slug}" target="_blank">${C.esc(i.title)}</a><span class="mono">× ${i.qty}${i.mode ? ` · ${C.esc(i.mode)}` : ''}</span></div>`).join('')}</div>` : ''}
        ${x.message ? `<div><h4 style="font:600 12px var(--f-mono);text-transform:uppercase;color:var(--muted);margin-bottom:8px">Повідомлення</h4><p style="white-space:pre-wrap;background:var(--bg-2);border:1px solid var(--line);padding:14px;border-radius:12px">${C.esc(x.message)}</p></div>` : ''}
        ${x.files.length ? `<div><h4 style="font:600 12px var(--f-mono);text-transform:uppercase;color:var(--muted);margin-bottom:8px">Файли</h4><div class="files">${x.files.map((f) => `<div><a class="link" href="/api/admin/files/${x.id}/${f.id}" download>${C.icon('file', 16)} ${C.esc(f.name)}</a><span class="mono" style="color:var(--muted)">${(f.size / 1048576).toFixed(1)} МБ</span></div>`).join('')}</div></div>` : ''}
        <div class="ed-sec"><h4>Статус</h4><div class="opts">${Object.entries(STATUSES).map(([k, v]) => `<label class="opt"><input type="radio" name="st" value="${k}" ${x.status === k ? 'checked' : ''}><span>${v}</span></label>`).join('')}</div>
          <label class="field"><span>Нотатка менеджера (бачите лише ви)</span><textarea id="note">${C.esc(x.note)}</textarea></label>
          <div class="timeline">${x.history.map((h) => `<span>${fmtDate(h.at)} — ${STATUSES[h.status] || h.status}</span>`).join('')}</div>
          <div style="display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap"><button class="btn btn--sm btn--ghost btn--danger" id="del">Видалити заявку</button><button class="btn btn--acc" id="save">Зберегти</button></div></div>
      </div>`);
    $('#save', m.el).addEventListener('click', async () => {
      const status = $('input[name=st]:checked', m.el).value;
      await C.api(`/api/admin/requests/${x.id}`, { method: 'PATCH', body: JSON.stringify({ status, note: $('#note', m.el).value }) });
      C.toast('Збережено'); m.close(); reload();
    });
    $('#del', m.el).addEventListener('click', async () => {
      if (!confirm(`Видалити заявку ${x.number} разом із файлами? Цю дію не можна скасувати.`)) return;
      await C.api(`/api/admin/requests/${x.id}`, { method: 'DELETE' });
      C.toast('Заявку видалено'); m.close(); reload();
    });
  }

  // ═══ КАТАЛОГ
  let itKind = 'equipment', itQ = '';
  async function items() {
    const pane = $('#pane');
    pane.innerHTML = `
      <div class="adm-filters">
        <div class="cats">${Object.entries(KIND_UA).map(([k, v]) => `<button type="button" class="cat-btn ${k === itKind ? 'on' : ''}" data-k="${k}">${v}</button>`).join('')}</div>
        <label class="search" style="margin-left:0">${C.icon('search', 18)}<input type="search" id="iq" placeholder="Пошук…" value="${C.esc(itQ)}"></label>
        <button class="btn btn--acc btn--sm" id="addItem" style="margin-left:auto">${C.icon('plus', 16)} Додати позицію</button>
      </div><div id="itList"><p style="color:var(--muted)">Завантаження…</p></div>`;
    let all = (await C.api('/api/admin/items')).items;
    const list = () => {
      const q = itQ.toLowerCase();
      const rows = all.filter((x) => x.kind === itKind && (!q || x.title.toLowerCase().includes(q)));
      $('#itList').innerHTML = rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Назва</th><th class="hide-m">Категорія</th><th>Ціна</th><th title="Показувати на сайті">Сайт</th><th class="hide-m" title="На головній / хіт">Хіт</th><th class="hide-m">Перегл.</th><th></th></tr></thead><tbody>
        ${rows.map((x) => `<tr data-id="${x.id}"><td><div class="thumb">${x.images[0] ? `<img src="${C.esc(x.images[0])}" alt="">` : C.art(x)}</div></td>
          <td><a class="link" href="/${C.META.kinds[x.kind].path}/${x.slug}" target="_blank" style="font-weight:600;color:var(--text)">${C.esc(x.title)}</a><div class="mono" style="font-size:12px;color:var(--muted)">${x.images.length} фото · сорт. ${x.sort}${x.rent ? ' · оренда' : ''}</div></td>
          <td class="hide-m">${C.esc(C.catName(x.category))}</td>
          <td class="mono" style="white-space:nowrap">${x.price_type === 'request' || x.price == null ? 'за запитом' : `${x.price_type === 'from' ? 'від ' : ''}${money(x.price)} ₴`}</td>
          <td><button type="button" class="toggle ${x.published ? 'on' : ''}" data-tg="published" aria-label="Показувати"></button></td>
          <td class="hide-m"><button type="button" class="toggle ${x.featured ? 'on' : ''}" data-tg="featured" aria-label="Хіт"></button></td>
          <td class="hide-m mono">${x.views}</td>
          <td style="white-space:nowrap"><button class="btn btn--xs" data-edit>Змінити</button> <button class="btn btn--xs btn--ghost" data-copy title="Копія">⧉</button></td></tr>`).join('')}</tbody></table></div>`
        : '<div class="empty"><h3>Порожньо</h3><p>Додайте першу позицію.</p></div>';
      $$('tr[data-id]', pane).forEach((tr) => {
        const x = all.find((i) => i.id === Number(tr.dataset.id));
        $('[data-edit]', tr).addEventListener('click', () => editItem(x, save));
        $('[data-copy]', tr).addEventListener('click', () => editItem({ ...x, id: null, slug: '', title: `${x.title} (копія)`, published: 0 }, save));
        $$('[data-tg]', tr).forEach((b) => b.addEventListener('click', async () => {
          const f = b.dataset.tg; const r = await C.api(`/api/admin/items/${x.id}`, { method: 'PATCH', body: JSON.stringify({ [f]: !x[f] }) });
          Object.assign(x, r.item); b.classList.toggle('on', !!x[f]);
        }));
      });
    };
    const save = async () => { all = (await C.api('/api/admin/items')).items; list(); };
    $$('[data-k]', pane).forEach((b) => b.addEventListener('click', () => { itKind = b.dataset.k; $$('[data-k]', pane).forEach((x) => x.classList.toggle('on', x === b)); list(); }));
    $('#iq').addEventListener('input', (e) => { itQ = e.target.value; list(); });
    $('#addItem').addEventListener('click', () => editItem({ kind: itKind, images: [], specs: [], highlights: [], price_type: 'fixed', availability: 'order', unit: 'шт.', custom: 1, published: 1, sort: 100 }, save));
    list();
  }

  // стиснення фото в браузері перед завантаженням (до 1600 px)
  async function compress(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.86);
    } finally { URL.revokeObjectURL(url); }
  }

  function editItem(x, onSaved) {
    const cats = (k) => C.META.categories.filter((c) => c.kind === k);
    const f = (n, l, v, { type = 'text', ph = '', hint = '', attrs = '' } = {}) => `<label class="field"><span>${l}</span>${type === 'textarea' ? `<textarea name="${n}" placeholder="${C.esc(ph)}" ${attrs}>${C.esc(v ?? '')}</textarea>` : `<input name="${n}" type="${type}" value="${C.esc(v ?? '')}" placeholder="${C.esc(ph)}" ${attrs}>`}${hint ? `<small>${hint}</small>` : ''}</label>`;
    const sel = (n, l, opts, v) => `<label class="field"><span>${l}</span><select name="${n}">${Object.entries(opts).map(([k, t]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${C.esc(t)}</option>`).join('')}</select></label>`;
    const chk = (n, l, v) => `<label class="check"><input type="checkbox" name="${n}" ${v ? 'checked' : ''}> ${l}</label>`;
    let imgs = [...(x.images || [])];
    const m = modal(x.id ? 'Редагування позиції' : 'Нова позиція', `<form class="form" id="ed">
      <div class="form__row">${sel('kind', 'Розділ', KIND_UA, x.kind)}<label class="field"><span>Категорія</span><select name="category"></select></label></div>
      ${f('title', 'Назва *', x.title, { attrs: 'required maxlength="200"' })}
      ${f('summary', 'Короткий опис (для картки, 1–2 речення)', x.summary, { type: 'textarea', attrs: 'rows="2" style="min-height:70px"' })}
      ${f('description', 'Повний опис', x.description, { type: 'textarea', attrs: 'rows="10" style="min-height:220px"', hint: 'Абзаци — через порожній рядок. Пункт списку — рядок, що починається з «• » або «- ». Короткий рядок із двокрапкою в кінці стане підзаголовком.' })}
      <div class="ed-sec"><h4>Фото</h4><div class="imgs" id="imgs"></div><input type="file" accept="image/*" multiple hidden id="imgIn"><small style="color:var(--muted)">Перше фото — обкладинка. До 12 фото, стискаються автоматично. Без фото для виробів сайт малює ілюстрацію.</small></div>
      <div class="ed-sec"><h4>Ціна і наявність</h4>
        <div class="form__row--3 form__row">${sel('price_type', 'Тип ціни', PRICE_T, x.price_type)}${f('price', 'Ціна, ₴', x.price, { type: 'number', attrs: 'min="0" step="1"' })}${f('unit', 'Одиниця', x.unit, { ph: 'шт., м², пог. м' })}</div>
        ${f('price_note', 'Примітка до ціни', x.price_note, { ph: 'напр., від 35 000 до 40 000 ₴ залежно від комплектації' })}
        <div class="form__row">${sel('availability', 'Наявність', AVAIL, x.availability)}${f('lead_time', 'Термін виготовлення', x.lead_time, { ph: 'від 14 робочих днів' })}</div>
        <div style="display:flex;gap:18px;flex-wrap:wrap">${chk('rent', 'Можна в оренду', x.rent)}${chk('custom', 'Робимо під параметри замовника', x.custom)}${chk('featured', 'Хіт / на головній', x.featured)}${chk('published', 'Показувати на сайті', x.published)}</div>
      </div>
      <div class="ed-sec"><h4>Сторінка товару: розповідь</h4>
        ${f('ex_tagline', 'Головна думка (великий слоган під фото)', (x.extra || {}).tagline, { ph: 'Перший крок будь-якої переробки…' })}
        <div class="field"><span>Як це працює — кроки</span><div class="rows" id="howRows"></div><button type="button" class="btn btn--xs" id="howAdd" style="justify-self:start">${C.icon('plus', 14)} Крок</button></div>
        <div class="field"><span>Для кого — аудиторії</span><div class="rows" id="useRows"></div><button type="button" class="btn btn--xs" id="useAdd" style="justify-self:start">${C.icon('plus', 14)} Аудиторія</button></div>
        <div class="form__row">${f('ex_makes', 'Що можна виготовляти (кожен пункт з нового рядка)', ((x.extra || {}).makes || []).join('\n'), { type: 'textarea' })}${f('ex_kit', 'Що входить (кожен пункт з нового рядка)', ((x.extra || {}).kit || []).join('\n'), { type: 'textarea' })}</div>
        <div class="field"><span>Часті питання</span><div class="rows" id="faqRows"></div><button type="button" class="btn btn--xs" id="faqAdd" style="justify-self:start">${C.icon('plus', 14)} Питання</button></div>
      </div>
      <div class="ed-sec"><h4>Ключові цифри на картці (до 4)</h4><div class="rows" id="hlRows"></div><button type="button" class="btn btn--xs" id="hlAdd" style="justify-self:start">${C.icon('plus', 14)} Додати</button></div>
      <div class="ed-sec"><h4>Характеристики</h4><div class="rows" id="spRows"></div><button type="button" class="btn btn--xs" id="spAdd" style="justify-self:start">${C.icon('plus', 14)} Додати рядок</button></div>
      <div class="ed-sec"><h4>Додатково</h4>
        <div class="form__row">${f('plastic_kg', 'Пластику на 1 виріб, кг (для лічильника кришечок)', x.plastic_kg, { type: 'number', attrs: 'min="0" step="0.1"', hint: 'Порожньо — лічильник не показується' })}${f('sort', 'Порядок (менше — вище)', x.sort, { type: 'number' })}</div>
        <div class="form__row">${f('slug', 'Адреса сторінки', x.slug, { ph: 'створиться з назви', hint: 'латиниця, цифри, дефіси' })}${f('source_url', 'Посилання на джерело (Prom тощо)', x.source_url)}</div>
        <details class="tr"><summary>Переклади (RU / EN)</summary><div style="display:grid;gap:12px;margin-top:12px">
          <div class="form__row">${f('title_ru', 'Назва RU', x.title_ru)}${f('title_en', 'Назва EN', x.title_en)}</div>
          <div class="form__row">${f('summary_ru', 'Короткий опис RU', x.summary_ru, { type: 'textarea', attrs: 'rows="2" style="min-height:70px"' })}${f('summary_en', 'Короткий опис EN', x.summary_en, { type: 'textarea', attrs: 'rows="2" style="min-height:70px"' })}</div>
          <div class="form__row">${f('description_ru', 'Опис RU', x.description_ru, { type: 'textarea' })}${f('description_en', 'Опис EN', x.description_en, { type: 'textarea' })}</div>
          <small style="color:var(--muted)">Якщо переклад порожній — показується український текст.</small></div></details>
      </div>
      <div class="form__msg err hidden"></div>
      <div class="form__foot">${x.id ? '<button type="button" class="btn btn--sm btn--ghost btn--danger" id="delIt">Видалити позицію</button>' : '<span></span>'}<button class="btn btn--acc" type="submit">Зберегти</button></div>
    </form>`, { wide: true });
    const form = $('#ed', m.el);
    const fillCats = () => { const k = form.kind.value; form.category.innerHTML = cats(k).map((c) => `<option value="${c.slug}" ${c.slug === x.category ? 'selected' : ''}>${C.esc(c.uk)}</option>`).join(''); };
    form.kind.addEventListener('change', fillCats); fillCats();
    const syncPrice = () => { form.price.disabled = form.price_type.value === 'request'; };
    form.price_type.addEventListener('change', syncPrice); syncPrice();

    // рядки пар
    const pairRows = (box, data, ph, max) => {
      const draw = () => {
        box.innerHTML = data.map(([a, b], i) => `<div class="row"><input value="${C.esc(a)}" placeholder="${ph[0]}" data-i="${i}" data-j="0"><input value="${C.esc(b)}" placeholder="${ph[1]}" data-i="${i}" data-j="1"><button type="button" class="btn btn--xs btn--ghost" data-rm="${i}" aria-label="Прибрати">${C.icon('x', 14)}</button></div>`).join('');
      };
      box.addEventListener('input', (e) => { const el = e.target; if (el.dataset.i != null) data[el.dataset.i][el.dataset.j] = el.value; });
      box.addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { data.splice(Number(b.dataset.rm), 1); draw(); } });
      draw();
      return () => { if (data.length < max) { data.push(['', '']); draw(); $$('input', box).at(-2)?.focus(); } };
    };
    const specs = (x.specs || []).map((p) => [...p]);
    const hls = (x.highlights || []).map((p) => [...p]);
    $('#spAdd', m.el).addEventListener('click', pairRows($('#spRows', m.el), specs, ['Параметр', 'Значення'], 60));
    const ex0 = x.extra || {};
    const how = (ex0.how || []).map((q) => [...q]), uses = (ex0.uses || []).map((q) => [...q]), faq = (ex0.faq || []).map((q) => [...q]);
    $('#howAdd', m.el).addEventListener('click', pairRows($('#howRows', m.el), how, ['Крок (Подрібнення)', 'Що відбувається'], 8));
    $('#useAdd', m.el).addEventListener('click', pairRows($('#useRows', m.el), uses, ['Кому (Школи)', 'Яку задачу вирішує'], 8));
    $('#faqAdd', m.el).addEventListener('click', pairRows($('#faqRows', m.el), faq, ['Питання', 'Відповідь'], 10));
    $('#hlAdd', m.el).addEventListener('click', pairRows($('#hlRows', m.el), hls, ['Значення (40 кг/год)', 'Підпис (продуктивність)'], 4));

    // фото
    const imgBox = $('#imgs', m.el), imgIn = $('#imgIn', m.el);
    const drawImgs = () => {
      imgBox.innerHTML = imgs.map((u, i) => `<div class="im"><img src="${C.esc(u)}" alt="">${i === 0 ? '<span class="cover">ОБКЛАДИНКА</span>' : ''}<div class="ctl"><button type="button" data-mv="${i}" data-d="-1" aria-label="Ліворуч">${C.icon('chevL', 16)}</button><button type="button" data-del="${i}" aria-label="Видалити">${C.icon('x', 16)}</button><button type="button" data-mv="${i}" data-d="1" aria-label="Праворуч">${C.icon('chevR', 16)}</button></div></div>`).join('')
        + (imgs.length < 12 ? `<button type="button" class="add" id="imgAdd">${C.icon('upload', 20)}<br>Додати фото</button>` : '');
      $('#imgAdd', imgBox)?.addEventListener('click', () => imgIn.click());
    };
    imgBox.addEventListener('click', (e) => {
      const mv = e.target.closest('[data-mv]'); const del = e.target.closest('[data-del]');
      if (mv) { const i = Number(mv.dataset.mv), j = i + Number(mv.dataset.d); if (j >= 0 && j < imgs.length) { [imgs[i], imgs[j]] = [imgs[j], imgs[i]]; drawImgs(); } }
      if (del) { imgs.splice(Number(del.dataset.del), 1); drawImgs(); }
    });
    imgIn.addEventListener('change', async () => {
      const filesArr = [...imgIn.files].slice(0, 12 - imgs.length); imgIn.value = '';
      for (const file of filesArr) {
        try { const data = await compress(file); const r = await C.api('/api/admin/upload', { method: 'POST', body: JSON.stringify({ data }) }); imgs.push(r.url); drawImgs(); }
        catch (e) { C.toast(`Фото ${C.esc(file.name)}: ${C.esc(e.message)}`); }
      }
    });
    drawImgs();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('.form__msg', form); err.classList.add('hidden');
      const fd = new FormData(form);
      const body = Object.fromEntries([...fd.entries()]);
      for (const k of ['rent', 'custom', 'featured', 'published']) body[k] = form[k].checked;
      const lines = (v) => String(v || '').split('\n').map((q) => q.trim()).filter(Boolean);
      body.extra = { tagline: body.ex_tagline, how: how.filter((q) => q[0] || q[1]), uses: uses.filter((q) => q[0] || q[1]), faq: faq.filter((q) => q[0] || q[1]), makes: lines(body.ex_makes), kit: lines(body.ex_kit) };
      delete body.ex_tagline; delete body.ex_makes; delete body.ex_kit;
      body.images = imgs; body.specs = specs.filter((p) => p[0] || p[1]); body.highlights = hls.filter((p) => p[0] || p[1]);
      if (body.price_type === 'request') body.price = '';
      try {
        await C.api(x.id ? `/api/admin/items/${x.id}` : '/api/admin/items', { method: x.id ? 'PUT' : 'POST', body: JSON.stringify(body) });
        C.toast('Збережено'); m.close(); onSaved();
      } catch (e2) { err.textContent = e2.message; err.classList.remove('hidden'); err.scrollIntoView({ block: 'nearest' }); }
    });
    $('#delIt', m.el)?.addEventListener('click', async () => {
      if (!confirm(`Видалити «${x.title}» з каталогу? Цю дію не можна скасувати. Якщо лише тимчасово — краще вимкніть «Показувати на сайті».`)) return;
      await C.api(`/api/admin/items/${x.id}`, { method: 'DELETE' });
      C.toast('Видалено'); m.close(); onSaved();
    });
  }

  // ═══ ВАКАНСІЇ
  async function vacancies() {
    const pane = $('#pane');
    const { vacancies: list } = await C.api('/api/admin/vacancies');
    pane.innerHTML = `<div class="adm-filters"><p style="color:var(--muted)">Вакансії показуються на сторінці «Вакансії» та в Google (розмітка JobPosting). Порожня зарплата — «за домовленістю».</p><button class="btn btn--acc btn--sm" id="addV" style="margin-left:auto">${C.icon('plus', 16)} Додати вакансію</button></div>
      ${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Назва</th><th class="hide-m">Графік</th><th class="hide-m">Оплата</th><th>Сайт</th><th></th></tr></thead><tbody>${list.map((v) => `<tr data-id="${v.id}"><td><b>${C.esc(v.title)}</b>${v.kind === 'internship' ? ' <span class="chip chip--acc">стажування</span>' : ''}</td><td class="hide-m">${C.esc(v.schedule)}</td><td class="hide-m">${C.esc(v.salary || 'за домовленістю')}</td><td>${v.published ? '✓' : '—'}</td><td><button class="btn btn--xs" data-edit>Змінити</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><h3>Вакансій немає</h3></div>'}`;
    $('#addV').addEventListener('click', () => editVac({ kind: 'job', published: 1, sort: 100, duties: [], requirements: [], offer: [] }));
    $$('tr[data-id]', pane).forEach((tr) => $('[data-edit]', tr).addEventListener('click', () => editVac(list.find((v) => v.id === Number(tr.dataset.id)))));
  }
  function editVac(v) {
    const ta = (n, l, arr) => `<label class="field"><span>${l}</span><textarea name="${n}" rows="4">${C.esc((arr || []).join('\n'))}</textarea><small>Кожен пункт — з нового рядка</small></label>`;
    const m = modal(v.id ? 'Редагування вакансії' : 'Нова вакансія', `<form class="form" id="vf">
      <label class="field"><span>Назва *</span><input name="title" value="${C.esc(v.title || '')}" required></label>
      <div class="form__row"><label class="field"><span>Тип</span><select name="kind"><option value="job" ${v.kind !== 'internship' ? 'selected' : ''}>Робота</option><option value="internship" ${v.kind === 'internship' ? 'selected' : ''}>Стажування</option></select></label>
        <label class="field"><span>Графік</span><input name="schedule" value="${C.esc(v.schedule || '')}" placeholder="Повна зайнятість, Пн–Пт"></label></div>
      <div class="form__row"><label class="field"><span>Оплата</span><input name="salary" value="${C.esc(v.salary || '')}" placeholder="від 25 000 ₴ або порожньо"></label><label class="field"><span>Порядок</span><input name="sort" type="number" value="${v.sort ?? 100}"></label></div>
      <label class="field"><span>Коротко</span><textarea name="summary" rows="2" style="min-height:70px">${C.esc(v.summary || '')}</textarea></label>
      ${ta('duties', 'Що робити', v.duties)}${ta('requirements', 'Що важливо', v.requirements)}${ta('offer', 'Що пропонуємо', v.offer)}
      <label class="check"><input type="checkbox" name="published" ${v.published ? 'checked' : ''}> Показувати на сайті</label>
      <div class="form__msg err hidden"></div>
      <div class="form__foot">${v.id ? '<button type="button" class="btn btn--sm btn--ghost btn--danger" id="delV">Видалити</button>' : '<span></span>'}<button class="btn btn--acc" type="submit">Зберегти</button></div></form>`);
    const form = $('#vf', m.el);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(form).entries());
      body.published = form.published.checked;
      for (const k of ['duties', 'requirements', 'offer']) body[k] = body[k].split('\n');
      try { await C.api(v.id ? `/api/admin/vacancies/${v.id}` : '/api/admin/vacancies', { method: v.id ? 'PUT' : 'POST', body: JSON.stringify(body) }); C.toast('Збережено'); m.close(); vacancies(); }
      catch (x) { const err = $('.form__msg', form); err.textContent = x.message; err.classList.remove('hidden'); }
    });
    $('#delV', m.el)?.addEventListener('click', async () => { if (!confirm('Видалити вакансію?')) return; await C.api(`/api/admin/vacancies/${v.id}`, { method: 'DELETE' }); m.close(); vacancies(); });
  }

  // ═══ НАЛАШТУВАННЯ
  async function settings() {
    const pane = $('#pane');
    const { settings: s } = await C.api('/api/admin/settings');
    const f = (n, l, { ph = '', hint = '', type = 'text' } = {}) => `<label class="field"><span>${l}</span>${type === 'textarea' ? `<textarea name="${n}" rows="3">${C.esc(s[n] || '')}</textarea>` : `<input name="${n}" type="${type}" value="${C.esc(s[n] || '')}" placeholder="${C.esc(ph)}">`}${hint ? `<small>${hint}</small>` : ''}</label>`;
    pane.innerHTML = `<form class="form form-card" id="sf" style="max-width:860px">
      <h3>Контакти</h3><p style="color:var(--muted);margin-top:-6px">Порожні поля на сайті не показуються.</p>
      <div class="form__row">${f('phone', 'Телефон', { ph: '+380 XX XXX XX XX', type: 'tel' })}${f('phone_label', 'Як показувати номер', { ph: '(095) 000-00-00' })}</div>
      <div class="form__row">${f('telegram', 'Telegram (username без @)', { ph: 'bh_ceh' })}${f('viber', 'Viber (номер)', { ph: '+380…' })}</div>
      <div class="form__row">${f('email', 'Email', { type: 'email' })}${f('hours', 'Графік роботи', { ph: 'Пн–Пт 8:00–17:00' })}</div>
      <div class="form__row">${f('city', 'Місто')}${f('address', 'Адреса')}</div>
      ${f('map_url', 'Посилання на Google Maps', { ph: 'https://maps.app.goo.gl/…' })}
      <h3 style="margin-top:12px">Компанія</h3>
      <div class="form__row">${f('brand', 'Назва (у шапці)')}${f('brand_sub', 'Підпис під назвою')}</div>
      <div class="form__row">${f('legal', 'Юридична назва / ЄДРПОУ (у підвалі)', { ph: 'ТОВ «…», ЄДРПОУ …' })}${f('marketplace_url', 'Посилання на маркетплейс Gobsek', { ph: 'https://…' })}</div>
      ${f('caps_note', 'Умови прийому кришечок (сторінка «Кришечки»)', { type: 'textarea' })}
      <h3 style="margin-top:12px">Пароль адмінки</h3>
      ${me.envPassword ? '<p style="color:var(--muted)">Пароль задано змінною <span class="mono">ADMIN_PASSWORD</span> на сервері — змінюйте його там.</p>' : '<label class="field"><span>Новий пароль (від 8 символів)</span><input name="newPassword" type="password" autocomplete="new-password"></label>'}
      <h3 style="margin-top:12px">Сповіщення</h3>
      <p style="color:var(--text-2)">${me.telegram ? '✓ Заявки надсилаються в Telegram.' : 'Telegram не налаштовано: додайте на сервері TELEGRAM_BOT_TOKEN і TELEGRAM_CHAT_ID (див. README).'}</p>
      <div class="form__msg err hidden"></div>
      <div class="form__foot"><span></span><button class="btn btn--acc" type="submit">Зберегти</button></div></form>`;
    $('#sf').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target).entries());
      const newPassword = body.newPassword; delete body.newPassword;
      try {
        const r = await C.api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ settings: body, newPassword: newPassword || undefined }) });
        Object.assign(C.META.settings, r.settings);
        C.toast('Збережено. Оновіть сайт, щоб побачити зміни.');
      } catch (x) { const err = $('.form__msg', e.target); err.textContent = x.message; err.classList.remove('hidden'); }
    });
  }

  return { mount };
})();
