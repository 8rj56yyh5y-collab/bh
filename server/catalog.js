'use strict';
/*
 * Довідники сайту БХ: розділи каталогу, категорії, типи заявок і статуси.
 * Щоб додати категорію — допишіть рядок у CATEGORIES (slug латиницею, назви трьома мовами,
 * kind — у якому розділі вона показується) і перезапустіть сайт.
 */

const KINDS = {
  equipment: { uk: 'Обладнання', ru: 'Оборудование', en: 'Equipment', path: 'equipment' },
  product: { uk: 'Вироби з вторсировини', ru: 'Изделия из вторсырья', en: 'Recycled products', path: 'products' },
  service: { uk: 'Послуги цеху', ru: 'Услуги цеха', en: 'Workshop services', path: 'services' },
};

const CATEGORIES = [
  // ── Обладнання
  { slug: 'plastic', kind: 'equipment', icon: 'shredder', uk: 'Переробка пластику', ru: 'Переработка пластика', en: 'Plastic recycling' },
  { slug: 'foundry', kind: 'equipment', icon: 'flame', uk: 'Лиття та плавлення', ru: 'Литьё и плавка', en: 'Casting & melting' },
  { slug: 'containers', kind: 'equipment', icon: 'container', uk: 'Контейнери та модулі', ru: 'Контейнеры и модули', en: 'Containers & modules' },
  { slug: 'agro', kind: 'equipment', icon: 'leaf', uk: 'Агро та фітосвітло', ru: 'Агро и фитосвет', en: 'Agro & grow lights' },
  { slug: 'heating', kind: 'equipment', icon: 'heat', uk: 'Обігрів', ru: 'Обогрев', en: 'Heating' },
  { slug: 'other-eq', kind: 'equipment', icon: 'gear', uk: 'Інше обладнання', ru: 'Другое оборудование', en: 'Other equipment' },
  // ── Вироби
  { slug: 'caps', kind: 'product', icon: 'caps', uk: 'З кришечок і пластику', ru: 'Из крышечек и пластика', en: 'From caps & plastic' },
  { slug: 'glass', kind: 'product', icon: 'glass', uk: 'Зі скла', ru: 'Из стекла', en: 'From glass' },
  { slug: 'metal', kind: 'product', icon: 'anvil', uk: 'З металу', ru: 'Из металла', en: 'From metal' },
  { slug: 'concrete', kind: 'product', icon: 'tile', uk: 'Благоустрій', ru: 'Благоустройство', en: 'Landscaping' },
  // ── Послуги
  { slug: 'cnc', kind: 'service', icon: 'cnc', uk: 'Обробка на ЧПУ', ru: 'Обработка на ЧПУ', en: 'CNC machining' },
  { slug: 'engineering', kind: 'service', icon: 'blueprint', uk: 'Проєктування та виготовлення', ru: 'Проектирование и изготовление', en: 'Design & fabrication' },
  { slug: 'print3d', kind: 'service', icon: 'cube', uk: '3D-друк', ru: '3D-печать', en: '3D printing' },
];

// Типи заявок: equipment — замовлення обладнання, product — вироби з вторсировини (кришечки),
// service — послуга цеху, custom — обладнання під задачу, partner — партнерство, job — відгук на вакансію,
// caps — здати кришечки / сировину, contact — загальне питання.
const REQUEST_TYPES = {
  equipment: { uk: 'Обладнання', ru: 'Оборудование', en: 'Equipment' },
  product: { uk: 'Вироби', ru: 'Изделия', en: 'Products' },
  service: { uk: 'Послуга', ru: 'Услуга', en: 'Service' },
  custom: { uk: 'Під задачу', ru: 'Под задачу', en: 'Custom build' },
  partner: { uk: 'Партнерство', ru: 'Партнёрство', en: 'Partnership' },
  job: { uk: 'Вакансія', ru: 'Вакансия', en: 'Job' },
  caps: { uk: 'Сировина', ru: 'Сырьё', en: 'Raw material' },
  contact: { uk: 'Питання', ru: 'Вопрос', en: 'Question' },
};

const REQUEST_STATUSES = {
  new: { uk: 'Нова', ru: 'Новая' },
  work: { uk: 'В роботі', ru: 'В работе' },
  offer: { uk: 'КП надіслано', ru: 'КП отправлено' },
  done: { uk: 'Виконано', ru: 'Выполнено' },
  cancel: { uk: 'Скасовано', ru: 'Отменено' },
};

const PRICE_TYPES = ['fixed', 'from', 'request'];
// Походження позиції: own — власне виробництво БХ, order — збираємо під замовлення, supply — постачаємо (не власне виробництво).
const ORIGINS = ['own', 'order', 'supply'];
const AVAILABILITY = ['stock', 'order', 'preorder'];

module.exports = { KINDS, CATEGORIES, REQUEST_TYPES, REQUEST_STATUSES, PRICE_TYPES, AVAILABILITY, ORIGINS };
