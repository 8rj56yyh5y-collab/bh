'use strict';
/*
 * Сповіщення про нові заявки.
 *  • Telegram: TELEGRAM_BOT_TOKEN (від @BotFather) + TELEGRAM_CHAT_ID (ваш чат або група; кілька — через кому).
 *  • Email (за бажанням): RESEND_API_KEY + NOTIFY_EMAIL (+ EMAIL_FROM).
 * Без ключів заявки просто зберігаються в адмінці.
 */
const { REQUEST_TYPES } = require('./catalog');

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const DETAIL_LABELS = {
  mode: 'Формат', qty: 'Кількість', color: 'Колір', size: 'Розмір', branding: 'Брендування', deadline: 'Термін',
  own_material: 'Своя сировина', material: 'Сировина', volume: 'Обсяг', output: 'Бажаний продукт', budget: 'Бюджет',
  format: 'Формат партнерства', vacancy: 'Вакансія', experience: 'Досвід', weight: 'Вага', pickup: 'Вивіз',
  delivery: 'Доставка', install: 'Монтаж і навчання', service: 'Послуга', product: 'Виріб', org: 'Організація',
};

function formatRequest(r, publicUrl) {
  const items = r.items || [];
  const d = r.details || {};
  const lines = [
    `🆕 <b>Заявка ${esc(r.number)}</b> · ${esc(REQUEST_TYPES[r.type]?.uk || r.type)}`,
    '',
    `👤 ${esc(r.name)}${r.company ? ` · ${esc(r.company)}` : ''}`,
    r.phone ? `📞 ${esc(r.phone)}` : '',
    r.email ? `✉️ ${esc(r.email)}` : '',
    r.city ? `📍 ${esc(r.city)}` : '',
    r.contact_via ? `💬 Зв’язок: ${esc(r.contact_via)}` : '',
  ];
  if (items.length) {
    lines.push('', '<b>Позиції:</b>');
    for (const it of items) lines.push(`• ${esc(it.title)}${it.qty ? ` × ${esc(it.qty)}` : ''}${it.mode ? ` (${esc(it.mode)})` : ''}`);
  }
  const det = Object.entries(d).filter(([, v]) => v !== '' && v != null && v !== false);
  if (det.length) {
    lines.push('');
    for (const [k, v] of det) lines.push(`${esc(DETAIL_LABELS[k] || k)}: ${esc(v === true ? 'так' : v)}`);
  }
  if (r.message) lines.push('', `📝 ${esc(r.message.slice(0, 1500))}`);
  if (r.files?.length) lines.push('', `📎 Файлів: ${r.files.length}`);
  if (publicUrl) lines.push('', `${publicUrl}/admin#requests/${r.id}`);
  return lines.filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
}

async function notifyRequest(r, publicUrl) {
  const text = formatRequest(r, publicUrl);
  const jobs = [];
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chats = String(process.env.TELEGRAM_CHAT_ID || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (token && chats.length) {
    for (const chat_id of chats) {
      jobs.push(fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
        signal: AbortSignal.timeout(10000),
      }).then((res) => { if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`); }));
    }
  }
  if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL) {
    jobs.push(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'БХ <onboarding@resend.dev>',
        to: process.env.NOTIFY_EMAIL.split(',').map((s) => s.trim()),
        subject: `Заявка ${r.number}: ${REQUEST_TYPES[r.type]?.uk || r.type} — ${r.name}`,
        html: `<pre style="font:14px/1.5 system-ui">${text}</pre>`,
      }),
      signal: AbortSignal.timeout(10000),
    }).then((res) => { if (!res.ok) throw new Error(`Resend HTTP ${res.status}`); }));
  }
  const results = await Promise.allSettled(jobs);
  for (const x of results) if (x.status === 'rejected') console.error('Сповіщення не надіслано:', x.reason?.message);
}

module.exports = { notifyRequest, formatRequest };
