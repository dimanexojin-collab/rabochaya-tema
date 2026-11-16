// source/content.json + source/images.json → data/*.json (однократно; перезапуск безопасен).
// Цены и названия берутся из источника; структура (раздел/категория/slug/характеристики) — из таблиц ниже.
// Тексты источника НЕ копируются: переписанные описания живут в src/data/copy/*.ts.
// Запуск: node scripts/build-data.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'source');
const OUT = join(ROOT, 'data');
mkdirSync(OUT, { recursive: true });
if (!existsSync(join(SRC, 'content.json'))) {
  console.error('Нет source/content.json — data/*.json уже собраны и лежат в git, перезапуск не нужен.');
  process.exit(1);
}
const content = JSON.parse(readFileSync(join(SRC, 'content.json'), 'utf8'));
const imagesSrc = JSON.parse(readFileSync(join(SRC, 'images.json'), 'utf8'));
const OLD = 'https://www.5ni.ru';

// ---------- разделы и категории ----------
const sections = [
  { slug: 'perchatki', name: 'Перчатки', h1: 'Рабочие перчатки', oldUrl: '/produktciya' },
  { slug: 'rukavicy', name: 'Рукавицы', h1: 'Рукавицы', oldUrl: '/rukavitcy', direct: true },
  { slug: 'siz', name: 'СИЗ', h1: 'Средства индивидуальной защиты', oldUrl: '/siz' },
  { slug: 'obuv', name: 'Обувь', h1: 'Рабочая обувь', oldUrl: '/page' },
];
const categories = [
  { slug: 's-pvh', section: 'perchatki', name: 'Перчатки с ПВХ', h1: 'Перчатки с ПВХ-покрытием', oldUrl: '/produktciya/perchatki-s-pvkh' },
  { slug: 'h-b', section: 'perchatki', name: 'Перчатки х/б', h1: 'Перчатки х/б', oldUrl: '/produktciya/perchatki-kh-b', image: 'cat-h-b' },
  { slug: 's-oblivom', section: 'perchatki', name: 'Перчатки с обливом', h1: 'Перчатки с обливом', oldUrl: '/produktciya/perchatki-s-oblivom', tile: 'tile-s-oblivom' },
  { slug: 'zimnie', section: 'perchatki', name: 'Зимние перчатки', h1: 'Зимние перчатки', oldUrl: '/produktciya/perchatki-zimnie', image: 'cat-zimnie', tile: 'tile-zimnie' },
  { slug: 'odnorazovye', section: 'perchatki', name: 'Одноразовые перчатки', h1: 'Одноразовые перчатки', oldUrl: '/produktciya/perchatki-odnorazovye', tile: 'tile-odnorazovye' },
  { slug: 'vibrozashchitnye', section: 'perchatki', name: 'Виброзащитные перчатки', h1: 'Виброзащитные перчатки', oldUrl: '/produktciya/vibrazaschitnye', tile: 'tile-vibrozashchitnye' },
  { slug: 'zashchita-dyhaniya', section: 'siz', name: 'Защита органов дыхания', h1: 'Защита органов дыхания', oldUrl: '/siz/zaschita-dykhaniya' },
  { slug: 'zashchita-sluha', section: 'siz', name: 'Защита органов слуха', h1: 'Защита органов слуха', oldUrl: '/siz/zashita-organov-slukha' },
  { slug: 'zashchita-zreniya', section: 'siz', name: 'Защита органов зрения', h1: 'Защита органов зрения', oldUrl: '/siz/zaschita-glaz' },
  { slug: 'sapogi', section: 'obuv', name: 'Сапоги', h1: 'Сапоги', oldUrl: '/page/sapogi' },
];

// ---------- товары: старый slug → новая структура ----------
// specs — факты из карточки источника (характеристики, строки описания), без добавлений.
const P = [
  { old: 'perchatki-rabochie-s-pvkh-10-klass-vyazki', slug: 'perchatki-pvh-10-klass-serye', cat: 's-pvh', name: 'Перчатки рабочие с ПВХ 10 класс вязки, серые', short: 'С ПВХ, 10 класс, серые', unit: 'пара',
    specs: [['Класс вязки', '10'], ['Плотность', '3–4 нити'], ['Покрытие', 'ПВХ «точка»'], ['Цвет', 'серый'], ['Применение', 'широкий спектр работ']] },
  { old: 'perchatki-s-dvoynym-lateksnym-oblivom', slug: 'perchatki-dvojnoj-lateksnyj-obliv', cat: 's-oblivom', name: 'Перчатки с двойным латексным обливом', short: 'Двойной латексный облив', unit: 'пара',
    specs: [['Основа', 'хлопок с полиэфирной нитью'], ['Класс вязки', '10 (10 петель на дюйм), 4 нити'], ['Покрытие', 'двойной полный облив латексом, манжета без латекса'], ['Вес', '≈ 45 г']], packaging: ['В мешке 200 пар'] },
  { old: 'perchatki-s-pvkh-7-klass-vyazki-belye', slug: 'perchatki-pvh-7-klass-belye', cat: 's-pvh', name: 'Перчатки рабочие с ПВХ 7 класс вязки, белые', short: 'С ПВХ, 7 класс, белые', unit: 'пара',
    specs: [['Класс вязки', '7'], ['Плотность', '3–7 нитей'], ['Покрытие', 'ПВХ «точка»'], ['Цвет', 'белый'], ['Применение', 'широкий спектр работ']] },
  { old: 'perchatki-rabochie-s-pvkh-10-klass-vyazki-belye', slug: 'perchatki-pvh-10-klass-belye', cat: 's-pvh', name: 'Перчатки рабочие с ПВХ 10 класс вязки, белые', short: 'С ПВХ, 10 класс, белые', unit: 'пара',
    specs: [['Класс вязки', '10'], ['Плотность', '3–4 нити'], ['Покрытие', 'ПВХ «точка»'], ['Цвет', 'белый'], ['Применение', 'широкий спектр работ']] },
  { old: 'perchatki-rabochie-kh-b-7-klass-vyazki-belye', slug: 'perchatki-hb-7-klass-belye', cat: 'h-b', name: 'Перчатки рабочие х/б 7 класс вязки, белые', short: 'Х/б, 7 класс, белые', unit: 'пара',
    specs: [['Класс вязки', '7'], ['Плотность', '3–7 нитей'], ['Покрытие', 'без покрытия'], ['Цвет', 'белый'], ['Применение', 'широкий спектр работ']] },
  { old: 'perchatki-rabochie-kh-b-10-klass-vyazki-belye', slug: 'perchatki-hb-10-klass-belye', cat: 'h-b', name: 'Перчатки рабочие х/б 10 класс вязки, белые', short: 'Х/б, 10 класс, белые', unit: 'пара',
    specs: [['Класс вязки', '10'], ['Плотность', '3–4 нити'], ['Покрытие', 'без покрытия'], ['Цвет', 'белый'], ['Применение', 'широкий спектр работ']] },
  { old: 'perchatki-rabochie-kh-b-7-klass-vyazki-serye', slug: 'perchatki-hb-7-klass-serye', cat: 'h-b', name: 'Перчатки рабочие х/б 7 класс вязки, серые', short: 'Х/б, 7 класс, серые', unit: 'пара',
    specs: [['Класс вязки', '7'], ['Плотность', '3–7 нитей'], ['Цвет', 'серый'], ['Применение', 'широкий спектр работ']] },
  { old: 'perchatki-rabochie-kh-b-10-klass-vyazki-serye', slug: 'perchatki-hb-10-klass-serye', cat: 'h-b', name: 'Перчатки рабочие х/б 10 класс вязки, серые', short: 'Х/б, 10 класс, серые', unit: 'пара',
    specs: [['Класс вязки', '10'], ['Плотность', '3–4 нити'], ['Покрытие', 'без покрытия'], ['Цвет', 'серый'], ['Применение', 'широкий спектр работ']] },
  { old: 'perchatki-s-odinarnym-lateksnym-oblivom', slug: 'perchatki-hb-lateksnyj-obliv', cat: 's-oblivom', name: 'Перчатки х/б с латексным обливом', short: 'Латексный облив', unit: 'пара',
    specs: [['Основа', 'хлопок'], ['Класс вязки', '10, 13'], ['Покрытие', 'латексный облив'], ['Цвет', 'красный или зелёный'], ['Вес перчатки', '≈ 38 г'], ['Манжета', 'край обработан термоспекаемой нитью']] },
  { old: 'perchatki-rabochie-s-pvkh-7-klass-vyazki-serye', slug: 'perchatki-pvh-7-klass-serye', cat: 's-pvh', name: 'Перчатки рабочие с ПВХ 7 класс вязки, серые', short: 'С ПВХ, 7 класс, серые', unit: 'пара',
    specs: [['Класс вязки', '7'], ['Плотность', '3–7 нитей'], ['Покрытие', 'ПВХ «точка»'], ['Цвет', 'серый'], ['Применение', 'широкий спектр работ']] },
  { old: 'perchatki-polusherstyanye-dvoynye', slug: 'perchatki-polusherstyanye-dvojnye', cat: 'zimnie', name: 'Перчатки полушерстяные двойные', short: 'Полушерстяные двойные', unit: 'пара',
    specs: [['Материал', 'полушерсть'], ['Конструкция', 'двойные'], ['Класс вязки', '7'], ['Покрытие', 'без ПВХ']] },
  { old: 'sapogi-arktika-rezinovye-muzhskie-uteplennye', slug: 'sapogi-arktika-uteplennye', cat: 'sapogi', name: 'Сапоги «Арктика» резиновые мужские утеплённые', short: 'Сапоги «Арктика»', unit: 'пара',
    specs: [['Верх', 'вспененный полиуретан'], ['Подошва', 'морозостойкий термопластичный полиуретан'], ['Теплозащита', 'до −50 °С'], ['Голенище', 'регулируется по ширине'], ['Защитный носок', 'композитный (Мун 200)'], ['Антипрокольная прокладка', 'металлическая (1200 Н)'], ['Утеплитель', 'вкладной чулок: металлизированная плёнка + Тинсулейт®'], ['Климатические пояса', 'II, III, IV и особый'], ['Цвет', 'чёрный'], ['Вес брутто', '3,55–4,65 кг'], ['Объём брутто', '0,026 м³']] },
  { old: 'berushi-3m-1110', slug: 'berushi-3m-1110', cat: 'zashchita-sluha', name: 'Беруши 3М 1110', short: 'Беруши 3М 1110', brand: '3М', unit: 'TODO',
    specs: [['Материал', 'полиуретан'], ['Форма', 'конусообразная'], ['Снижение шума (SNR)', '37 дБ'], ['Уход', 'можно мыть водой с мылом'], ['Производитель', '3М']], packaging: ['В упаковке 100 пар'] },
  { old: 'berushi-1100', slug: 'berushi-3m-1100', cat: 'zashchita-sluha', name: 'Беруши 3М 1100', short: 'Беруши 3М 1100', brand: '3М', unit: 'TODO',
    specs: [['Материал', 'полиуретан'], ['Форма', 'конусообразная'], ['Снижение шума (SNR)', '37 дБ'], ['Уход', 'можно мыть водой с мылом'], ['Производитель', '3М']], packaging: ['В упаковке 200 пар'] },
  { old: 'respirator-alina-200', slug: 'respirator-alina-200', cat: 'zashchita-dyhaniya', name: 'Респиратор Алина 200', short: 'Алина 200', unit: 'шт',
    specs: [['Класс защиты', 'FFP2 NR D'], ['Клапан выдоха', 'нет'], ['Защита', 'пыль, дым, туман — до 12 ПДК'], ['Конструкция', 'неформованная полумаска'], ['Гарантийный срок хранения', '5 лет']],
    packaging: ['Индивидуальная упаковка', 'В коробке 250 шт'], extraStandards: ['Подтверждение Минпромторга'] },
  { old: 'respirator-alina-210', slug: 'respirator-alina-210', cat: 'zashchita-dyhaniya', name: 'Респиратор Алина 210', short: 'Алина 210', unit: 'шт',
    specs: [['Класс защиты', 'FFP2 NR D'], ['Клапан выдоха', 'есть'], ['Защита', 'пыль, дым, туман — до 12 ПДК'], ['Конструкция', 'неформованная полумаска'], ['Гарантийный срок хранения', '5 лет']],
    packaging: ['Индивидуальная упаковка', 'В коробке 250 шт'], extraStandards: ['Подтверждение Минпромторга'] },
  { old: 'respirator-alina-310', slug: 'respirator-alina-310', cat: 'zashchita-dyhaniya', name: 'Респиратор Алина 310', short: 'Алина 310', unit: 'шт',
    specs: [['Класс защиты', 'FFP3 NR D'], ['Клапан выдоха', 'есть'], ['Защита', 'пыль, дым, туман — до 50 ПДК'], ['Конструкция', 'неформованная полумаска с пластиковым каркасом'], ['Гарантийный срок хранения', '5 лет']],
    packaging: ['Индивидуальная упаковка', 'В коробке 250 шт'], extraStandards: ['Подтверждение Минпромторга'] },
  { old: 'respirator-alina-211', slug: 'respirator-alina-211', cat: 'zashchita-dyhaniya', name: 'Респиратор Алина 211', short: 'Алина 211', unit: 'шт', note: 'Аналог Алина АВ',
    specs: [['Класс защиты', 'FFP2 NR D'], ['Клапан выдоха', 'есть'], ['Защита', 'аэрозоли до 12 ПДК; органические газы, пары от нагрева металлов, сварочные аэрозоли и озон до 5 ПДК'], ['Технология', '3D FLEX-TO-FIT, универсальный размер'], ['Гарантийный срок хранения', '4 года']],
    packaging: ['Индивидуальная упаковка', 'В коробке 200 шт'] },
  { old: 'perchatki-vibrostat-01', slug: 'perchatki-vibrostat-01', cat: 'vibrozashchitnye', name: 'Перчатки виброзащитные Вибростат-01', short: 'Вибростат-01', unit: 'пара',
    specs: [['Материал верха', 'кожа КРС'], ['Подкладка', '100 % полиэфир'], ['Вибропоглощающий вкладыш', 'вспененный полимер «Airgel®»'], ['Защитные свойства', 'Мв, Ми, Мп, Тхп'], ['Виброзащита', 'тип 2А (100 Н): 16–1000 Гц; тип 2Б (200 Н): 8–1000 Гц'], ['Контакт с холодными поверхностями', 'до −5 °С'], ['Антиэлектростатические свойства', 'есть'], ['Класс риска', '1'], ['Производство', 'Россия']] },
  { old: 'perchatki-vibrostat-03', slug: 'perchatki-vibrostat-03', cat: 'vibrozashchitnye', name: 'Перчатки виброзащитные Вибростат-03', short: 'Вибростат-03', unit: 'пара',
    specs: [['Основа', 'хлопок'], ['Покрытие', 'маслостойкая резина на основе бутадиен-нитрильного латекса'], ['Манжета', 'искусственная кожа, СВТ-лента, эластичная лента'], ['Вкладка', 'флис'], ['Вибропоглощающий вкладыш', 'вспененный полимер «Airgel®»'], ['Защитные свойства', 'Ми, Мв, Мп, Тхп'], ['Уровни EN 388', '3512'], ['Виброзащита', 'тип 2А (100 Н): 63–1000 Гц; тип 2Б (200 Н): 8–250 Гц'], ['Контакт с холодными поверхностями', 'до −5 °С'], ['Класс риска', '1'], ['Производство', 'Россия']] },
  { old: 'respirator-alina-av', slug: 'respirator-alina-av', cat: 'zashchita-dyhaniya', name: 'Респиратор Алина АВ', short: 'Алина АВ', unit: 'шт', note: 'Предлагаем аналог — Алина 211',
    specs: [['Класс защиты', 'FFP2 NR D'], ['Клапан выдоха', 'есть'], ['Защита', 'аэрозоли (в т. ч. сварочные) до 12 ПДК, органические и неорганические газы, пары от нагрева металлов, озон'], ['Сорбирующий слой', 'активированный уголь'], ['Конструкция', 'неформованная полумаска с пластиковым каркасом'], ['Гарантийный срок хранения', '5 лет']],
    packaging: ['Индивидуальная упаковка', 'В коробке 180 шт'], extraStandards: ['Подтверждение Минпромторга'] },
  { old: 'perchatki-morozostoykie-plamya', slug: 'perchatki-morozostojkie-plamya', cat: 'zimnie', name: 'Перчатки морозостойкие «Пламя»', short: 'Морозостойкие «Пламя»', unit: 'пара',
    specs: [['Основа', 'джерси (100 % хлопок) с термоизоляционным слоем'], ['Покрытие', 'полное, многослойное морозостойкое ПВХ, оранжевое'], ['Манжета', 'жёсткая крага'], ['Вес', '0,20 кг']] },
  { old: 'zaschitnye-ochki-uvex-ultravizhn', slug: 'ochki-uvex-ultravizhn', cat: 'zashchita-zreniya', name: 'Защитные очки UVEX Ультравижн', short: 'UVEX Ультравижн', brand: 'UVEX', unit: 'шт',
    specs: [['Конструкция', 'закрытые панорамные, обзор 180°, непрямая вентиляция'], ['Линза', 'ударопрочный ацетат, прозрачная, оптический класс 1'], ['Покрытие линзы', 'Antifog — против запотевания'], ['Защита', 'брызги кислот, щелочей, нефтепродуктов; частицы до 45 м/с; ультрафиолет'], ['Совместимость', 'надеваются на корригирующие очки; сочетаются со щитком 9301317'], ['Масса', '126 г']] },
  { old: 'rukavitcy-khb-s-brezentovym-naladonnikom', slug: 'rukavicy-hb-brezentovyj-naladonnik', section: 'rukavicy', name: 'Рукавицы х/б с брезентовым наладонником', short: 'Рукавицы х/б с брезентом', unit: 'пара',
    specs: [['Материал', 'х/б, наладонник из брезента'], ['Защита', 'от механических и термических повреждений'], ['Применение', 'перемещение грузов, колюще-режущие предметы, сварка']] },
  { old: 'novyy-tovar', slug: 'respirator-lepestok-40-sb', cat: 'zashchita-dyhaniya', name: 'Респиратор Лепесток 40 СБ, FFP2 NR D', short: 'Лепесток 40 СБ', unit: 'шт',
    specs: [['Класс защиты', 'FFP2 NR D (кл. A/B/E)'], ['Конструкция', 'неформованная полумаска в собранном виде (СБ)'], ['Слои', 'нетканый материал, фильтрующий слой, угольный слой, внутренний слой'], ['Клапан выдоха', 'есть'], ['Крепление', 'регулируемые ленты оголовья, алюминиевый носовой зажим']] },
  { old: 'benovy-nitrile', slug: 'perchatki-nitrilovye-benovy', cat: 'odnorazovye', name: 'Перчатки нитриловые Benovy Nitrile, 100 пар', short: 'Нитриловые Benovy', brand: 'Benovy', unit: 'упаковка', pack: '100 пар',
    specs: [['Материал', 'нитрил, текстурированные'], ['Пудра', 'без пудры'], ['Цвет', 'голубой'], ['Назначение', 'смотровые, нестерильные, одноразовые'], ['Форма', 'плоская, универсальная для обеих рук; валик закатан внутрь']],
    standards: ['ГОСТ Р 52239-2004', 'РУ № ФСЗ 2012/12488 от 14.02.2018'], packaging: ['100 пар в упаковке'] },
  { old: 'perchatki-vinilovye-neopudrennye-benovy-golubye', slug: 'perchatki-vinilovye-benovy', cat: 'odnorazovye', name: 'Перчатки виниловые Benovy голубые, 100 пар', short: 'Виниловые Benovy', brand: 'Benovy', unit: 'упаковка', pack: '100 пар',
    specs: [['Материал', 'винил'], ['Пудра', 'без пудры'], ['Цвет', 'голубой'], ['Контакт с пищевыми продуктами', 'разрешён'], ['Форма', 'плоская, универсальная для обеих рук; валик закатан внутрь']], packaging: ['100 пар в упаковке'] },
  { old: 'perchatki-benovy-iz-termoplastichnogo-elastomera-100-par', slug: 'perchatki-benovy-tpe', cat: 'odnorazovye', name: 'Перчатки Benovy из термопластичного эластомера, 100 пар', short: 'Benovy ТПЭ', brand: 'Benovy', unit: 'упаковка', pack: '100 пар',
    specs: [['Материал', 'термопластичный эластомер (ТПЭ)'], ['Свойства', 'эластичные, высокая тактильная чувствительность'], ['Назначение', 'одноразовые: бьюти-сфера, пищевое производство, быт']], packaging: ['100 пар в упаковке'] },
  { old: 'respirator-spiro-312a-ffp2-nr-d', slug: 'respirator-spiro-312a', cat: 'zashchita-dyhaniya', name: 'Респиратор СПИРО-312А FFP2 NR D от сварочных дымов', short: 'СПИРО-312А', unit: 'шт',
    specs: [['Класс защиты', 'FFP2 NR D'], ['Конструкция', 'формованная многослойная полумаска, клапан выдоха'], ['Слои', 'спанбонд, мелтблаун, сорбирующий слой, полиэфирный внутренний слой'], ['Эффективность фильтрации', 'более 94 %'], ['Защита', 'пыль, дым, туман; органические газы и пары (t кип. > 65 °С); сварочные дымы, озон'], ['Размер', 'универсальный']] },
];

const STD_FIX = (s) => s.replace(/^\((.*)\)$/, '$1').replace(/^ТР\/ТС/, 'ТР ТС').trim();
const priceNum = (s) => Number(String(s).replace(/\s/g, '').replace(',', '.'));

const srcProducts = new Map(content.products.map((p) => [p.url.split('/').pop(), p]));
if (srcProducts.size !== 29 || P.length !== 29) throw new Error(`Ожидалось 29 товаров: источник ${srcProducts.size}, таблица ${P.length}`);

const products = P.map((m) => {
  const s = srcProducts.get(m.old);
  if (!s) throw new Error(`Нет товара ${m.old} в источнике`);
  const cat = categories.find((c) => c.slug === m.cat);
  const section = m.section ?? cat?.section;
  const text = s.description_verbatim ?? '';
  const standards = m.standards ?? [
    ...s.standards.filter((x) => !/Эксплуатационные уровни/.test(x)).map(STD_FIX),
    ...(m.extraStandards ?? []),
  ];
  const path = ['katalog', section, cat?.slug, m.slug].filter(Boolean).join('/');
  return {
    id: m.slug,
    slug: m.slug,
    sectionSlug: section,
    categorySlug: cat?.slug ?? null,
    path: `/${path}/`,
    name: m.name,
    shortName: m.short,
    sourceName: s.name,
    ...(m.brand ? { brand: m.brand } : {}),
    ...(m.note ? { note: m.note } : {}),
    price: priceNum(s.price_rub),
    priceFrom: /От\s*\d+\s*р/i.test(text),
    unit: m.unit,
    ...(m.pack ? { packNote: m.pack } : {}),
    hit: /ХИТ ПРОДАЖ/.test(text),
    specs: m.specs,
    standards,
    packaging: m.packaging ?? [],
    image: m.slug,
    sourceUrl: s.url,
  };
});

// ---------- прайс ----------
const rawPrice = content['price_table_/price'].map((r) => r.value ?? r);
const price = { note: 'Цены с НДС, упаковка — мешок п/э', groups: [] };
let group = null;
for (const row of rawPrice.slice(1)) {
  if (row.length === 1) {
    const title = row[0].replace(/:$/, '');
    const m = title.match(/^(.*?)(\d+(?:,\d)?) класс\s*(.*)$/);
    group = {
      id: /Дополнительные/.test(title) ? 'extra' : `kl-${m?.[2].replace(',', '-')}`,
      title: m ? `${m[1]}${m[2]} класс` : title,
      colors: m?.[3] || undefined,
      rows: [],
    };
    price.groups.push(group);
    continue;
  }
  const [name, p, bag] = row;
  const tex = name.match(/\((\d+) текс\)/)?.[1];
  const threads = name.match(/«(\d)»/)?.[1];
  const NAMED = { 'Перчатки рабочие двойные': 'dvojnye', 'Перчатки рабочие двойные с ПВХ': 'dvojnye-pvh', 'Перчатки рабочие п/ш': 'polusherst', 'Перчатки с 50% синтетики, неубиваемые': 'sintetika-50', 'Изготовление перчаток разного размера и цвета': 'pod-zakaz' };
  const key = tex ? `${tex}${/платировк/.test(name) ? '-plat' : ''}` : NAMED[name];
  if (!key) throw new Error(`Нет id для строки прайса «${name}»`);
  const id = `${group.id}-${key}`;
  group.rows.push({
    id, name, ...(tex ? { tex: Number(tex) } : {}), ...(threads ? { threads: Number(threads) } : {}),
    priceFrom: p ? priceNum(p.replace(/^от\s*/, '').replace(/\s*руб\.?$/, '')) : null,
    bag,
  });
}
// «Прочее»: строки 7,5 класса после «7» нитей — двойные, п/ш, 50 % синтетики — выносим в отдельную группу
const g75 = price.groups.find((g) => g.id === 'kl-7-5');
const otherIdx = g75.rows.findIndex((r) => /двойные$/.test(r.name));
if (otherIdx > 0) {
  const other = g75.rows.splice(otherIdx);
  price.groups.splice(price.groups.indexOf(g75) + 1, 0, { id: 'prochee', title: 'Двойные, полушерстяные и усиленные', rows: other.map((r) => ({ ...r, id: r.id.replace('kl-7-5', 'prochee') })) });
}

// ---------- серийные позиции (страницы-заглушки «трикотажные … N-нитка» → фото к строкам прайса) ----------
const serial = [
  { id: 'serial-pvh-10-3-niti', oldUrls: ['/perchatki-trikotazhnye-s-pvkh-10-klass-3-kh-nitka'], caption: 'Перчатки трикотажные с ПВХ, 10 класс, «3 нити»', priceRow: 'kl-10-116' },
  { id: 'serial-pvh-10-4-niti', oldUrls: ['/perchatki-trikotazhnye-s-pvkh-10-klass-4-kh-nitka'], caption: 'Перчатки трикотажные с ПВХ, 10 класс, «4 нити»', priceRow: 'kl-10-132' },
  { id: 'serial-10-3-4-niti', oldUrls: ['/perchatki-trikotazhnye-10-klass-3-kh-nitka', '/perchatki-trikotazhnye-10-klass-4-kh-nitka'], caption: 'Перчатки трикотажные без ПВХ, 10 класс, «3» и «4 нити»' },
  { id: 'serial-pvh-7-4-niti', oldUrls: ['/perchatki-trikotazhnye-s-pvkh-7-klass-4-kh-nitka'], caption: 'Перчатки трикотажные с ПВХ, 7 класс, «4 нити»', priceRow: 'kl-7-5-216' },
  { id: 'serial-7-5-nitej', oldUrls: ['/perchatki-trikotazhnye-7-klass-5-kh-nitka'], caption: 'Перчатки трикотажные без ПВХ, 7 класс, «5 нитей» (пятинитка)' },
];
const allRowIds = new Set(price.groups.flatMap((g) => g.rows.map((r) => r.id)));
if (allRowIds.size !== price.groups.flatMap((g) => g.rows).length) throw new Error('Повторяющиеся id строк прайса');
for (const s of serial) if (s.priceRow && !allRowIds.has(s.priceRow)) throw new Error(`Нет строки прайса ${s.priceRow}`);

// ---------- новости ----------
const NEWS = [
  { old: '2022-03-06/trebuetsya-pryazha', slug: 'trebuetsya-pryazha', title: 'Ищем поставщика пряжи и нити', kind: 'info' },
  { old: '2022-04-19/skidka-za-opt', slug: 'skidka-za-opt-1000-par', title: 'Скидка 10 % при покупке от 1000 пар', kind: 'promo', until: '2022-05-19' },
  { old: '2022-04-29/nalazhen-vypusk-perchatok-10-klassa-s-platirovkoy', slug: 'perchatki-10-klassa-s-platirovkoj', title: 'Начат выпуск перчаток 10 класса с платировкой', kind: 'product' },
  { old: '2022-05-23/plotnye-tolstye-perchatki', slug: 'plotnye-perchatki-seminitka', title: 'Плотные перчатки «семинитка» для тяжёлых работ', kind: 'product', images: ['news-plotnye-perchatki-seminitka', 'news-plotnye-perchatki-seminitka-2'], thumb: 'news-plotnye-perchatki-seminitka-thumb' },
  { old: '2022-06-07/aktciya', slug: 'letnie-skidki-ot-obema', title: 'Летняя акция: скидка до 10 % от 2000 пар', kind: 'promo', thumb: 'news-letnie-skidki-ot-obema-thumb' },
  { old: '2022-06-28/aktciya-dvoynye-perchatki-so-skidkoy-20-do-kontca-iyulya-2022-go', slug: 'skidka-20-na-dvojnye-perchatki', title: 'Двойные перчатки со скидкой 20 % до конца июля 2022', kind: 'promo', until: '2022-07-31', images: ['news-skidka-20-na-dvojnye-perchatki'], thumb: 'news-skidka-20-na-dvojnye-perchatki-thumb' },
  { old: '2022-10-05/dvoynye-perchatki-po-28-rubley', slug: 'dvojnye-perchatki-28-rublej', title: 'Двойные перчатки на холодный сезон — 28 ₽', kind: 'product', images: ['news-dvojnye-perchatki-28-rublej'] },
  { old: '2023-02-25/tcvetnye-perchatki', slug: 'cvetnye-perchatki', title: 'Вяжем цветные перчатки', kind: 'product', images: ['news-cvetnye-perchatki'], thumb: 'news-cvetnye-perchatki-thumb' },
];
const news = NEWS.map((n) => {
  const page = content.pages.find((p) => p.url === `${OLD}/news/${n.old}`);
  if (!page) throw new Error(`Нет новости ${n.old}`);
  return {
    slug: n.slug, date: n.old.slice(0, 10), title: n.title, sourceTitle: page.title, kind: n.kind,
    ...(n.until ? { until: n.until } : {}), images: n.images ?? [], ...(n.thumb ? { thumb: n.thumb } : {}), sourceUrl: page.url,
  };
});

// ---------- изображения: манифест ----------
const byFile = new Map(imagesSrc.images.map((i) => [i.file_name, i]));
const img = [];
const add = (file, e) => {
  const s = byFile.get(file);
  if (!s) throw new Error(`Нет в images.json: ${file}`);
  img.push({ src: `source/images/${file}`, srcW: s.width, srcH: s.height, thumbOnly: s.is_thumbnail_only, ...e });
};
for (const p of products) {
  const file = srcProducts.get(P.find((m) => m.slug === p.slug).old).images[0].replace('images/', '');
  // решения по контактному листу (scripts/images-sheet.mjs): мелкий текст на упаковке ИИ искажает → blend;
  // у СПИРО градиентный студийный фон — не отбеливаем (частичная заливка выглядит хуже)
  const method = ['respirator-alina-200', 'perchatki-nitrilovye-benovy'].includes(p.slug) ? 'blend' : 'esrgan';
  const whiten = p.slug !== 'respirator-spiro-312a';
  add(file, { id: p.slug, kind: 'product', method, ...(whiten ? {} : { whiten: false }), target: `src/assets/products/${p.slug}.png`, alt: p.name, usedBy: [p.path] });
}
const catPath = (slug) => { const c = categories.find((x) => x.slug === slug); return `/katalog/${c.section}/${c.slug}/`; };
add('category-perchatki-kh-b.jpg', { id: 'cat-h-b', kind: 'category', method: 'esrgan', target: 'src/assets/categories/cat-h-b.png', alt: 'Рабочие перчатки х/б', usedBy: ['/katalog/perchatki/', catPath('h-b')] });
add('category-perchatki-zimnie.png', { id: 'cat-zimnie', kind: 'category', method: 'esrgan', target: 'src/assets/categories/cat-zimnie.png', alt: 'Зимние рабочие перчатки', usedBy: ['/katalog/perchatki/', catPath('zimnie')] });
add('category-home-tile-08-png.png', { id: 'tile-zimnie', kind: 'category', method: 'esrgan', target: 'src/assets/categories/tile-zimnie.png', alt: 'Зимние перчатки', usedBy: ['/'] });
add('category-home-tile-2-jpg.jpg', { id: 'tile-s-oblivom', kind: 'category', method: 'esrgan', target: 'src/assets/categories/tile-s-oblivom.png', alt: 'Перчатки с обливом', usedBy: ['/', '/katalog/perchatki/'] });
add('category-home-tile-45-png.png', { id: 'tile-odnorazovye', kind: 'category', method: 'esrgan', target: 'src/assets/categories/tile-odnorazovye.png', alt: 'Одноразовые перчатки', usedBy: ['/', '/katalog/perchatki/'] });
add('category-home-tile-29-png.png', { id: 'tile-vibrozashchitnye', kind: 'category', method: 'esrgan', target: 'src/assets/categories/tile-vibrozashchitnye.png', alt: 'Виброзащитные перчатки', usedBy: ['/', '/katalog/perchatki/'] });
const newsFile = { 'plotnye-perchatki-seminitka': '2022-05-23__plotnye-tolstye-perchatki', 'letnie-skidki-ot-obema': '2022-06-07__aktciya', 'skidka-20-na-dvojnye-perchatki': '2022-06-28__aktciya-dvoynye-perchatki-so-skidkoy-20-do-kontca-iyulya-2022-go', 'dvojnye-perchatki-28-rublej': '2022-10-05__dvoynye-perchatki-po-28-rubley', 'cvetnye-perchatki': '2023-02-25__tcvetnye-perchatki' };
for (const n of news) {
  const base = newsFile[n.slug];
  n.images.forEach((id, i) => add(`news-${base}${i ? `-${i + 1}` : ''}.jpg`, { id, kind: 'news', method: 'normalize', target: `src/assets/news/${id}.jpg`, alt: n.title, usedBy: [`/novosti/${n.slug}/`] }));
  if (n.thumb) add(`news-${base}-thumb.jpg`, { id: n.thumb, kind: 'news-thumb', method: 'esrgan', target: `src/assets/news/${n.thumb}.jpg`, alt: n.title, usedBy: ['/novosti/', `/novosti/${n.slug}/`] });
}
add('production-knitting-machines.jpg', { id: 'ceh', kind: 'production', method: 'normalize', target: 'src/assets/production/ceh.jpg', alt: 'Вязальные машины в цехе «Рабочей темы» в Архангельске', usedBy: ['/', '/proizvodstvo/'] });
const serialFile = { 'serial-pvh-10-3-niti': 'product-perchatki-trikotazhnye-s-pvkh-10-klass-3-kh-nitka.jpg', 'serial-pvh-10-4-niti': 'product-perchatki-trikotazhnye-s-pvkh-10-klass-4-kh-nitka.jpg', 'serial-10-3-4-niti': 'product-perchatki-trikotazhnye-10-klass-3-kh-nitka.jpg', 'serial-pvh-7-4-niti': 'product-perchatki-trikotazhnye-s-pvkh-7-klass-4-kh-nitka.png', 'serial-7-5-nitej': 'product-perchatki-trikotazhnye-7-klass-5-kh-nitka.jpg' };
for (const s of serial) add(serialFile[s.id], { id: s.id, kind: 'serial', method: 'normalize', target: `src/assets/production/${s.id}.jpg`, alt: s.caption, usedBy: ['/optom/', '/proizvodstvo/'] });
add('price-glove-pvkh-80g.jpg', { id: 'price-glove', kind: 'serial', method: 'esrgan', target: 'src/assets/production/price-glove.jpg', alt: 'Рабочая перчатка с ПВХ-покрытием «точка»', usedBy: ['/optom/'] });
add('banner-rabochaya-tema-660x160.jpg', { id: 'banner-wide', kind: 'banner', method: 'esrgan', target: 'src/assets/brand/banner-wide.jpg', alt: 'Баннер «Рабочая тема»: рабочие перчатки с ПВХ', usedBy: ['/kontakty/'] });
add('banner-rabochaya-tema-660x240.jpg', { id: 'banner', kind: 'banner', method: 'esrgan', target: 'src/assets/brand/banner.jpg', alt: 'Баннер «Рабочая тема»: рабочие перчатки с ПВХ', usedBy: ['/proizvodstvo/'] });
add('logo-rabochaya-tema-spetsmarket.jpg', { id: 'logo', kind: 'logo', method: 'esrgan', target: 'src/assets/brand/logo.png', alt: 'Логотип «Рабочая тема»', usedBy: ['все страницы (футер)', 'public/icons'] });
add('favicon.ico', { id: 'favicon-src', kind: 'favicon', method: 'icon', target: null, alt: '', usedBy: ['public/favicon.* (prepare-assets: иконки строятся из эмблемы логотипа; исходный favicon.ico 16 px — эталон цвета)'] });

const missing = imagesSrc.images.filter((i) => !img.some((m) => m.src.endsWith(`/${i.file_name}`)));
if (missing.length) throw new Error(`Не привязаны к страницам: ${missing.map((m) => m.file_name).join(', ')}`);
if (img.length !== imagesSrc.images.length) throw new Error(`Манифест ${img.length} ≠ источник ${imagesSrc.images.length}`);

// результаты прошлого прогона конвейера сохраняем
const manifestPath = join(OUT, 'images.manifest.json');
const prev = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { images: [] };
for (const m of img) {
  const old = prev.images.find((x) => x.id === m.id);
  if (old?.result) m.result = old.result;
  if (old?.method && old.method !== m.method && old.methodLocked) { m.method = old.method; m.methodLocked = true; }
}

// ---------- редиректы ----------
const redirects = [
  { from: '/', to: '/' },
  { from: '/about', to: '/proizvodstvo/' },
  { from: '/service', to: '/kak-kupit/' },
  { from: '/contacts', to: '/kontakty/' },
  { from: '/price', to: '/optom/' },
  { from: '/raschet-tceny', to: '/stati/kak-formiruetsya-cena/' },
  { from: '/v-chyom-razlichie-7-klassa-vyazki-ot-10', to: '/stati/klass-vyazki-7-i-10/' },
  { from: '/kharakteristiki-pryazhi', to: '/stati/teks-i-nomer-pryazhi/' },
  { from: '/news', to: '/novosti/' },
  { from: '/news/page-2', to: '/novosti/' },
  { from: '/Sitemap', to: '/karta-sajta/' },
  { from: '/nedruzhestvennye-gosudarstva', to: null, note: 'не переносится — вопрос заказчику' },
  { from: '/page/botinki', to: '/katalog/obuv/', note: 'пустая категория' },
  ...sections.map((s) => ({ from: s.oldUrl, to: `/katalog/${s.slug}/` })),
  ...categories.map((c) => ({ from: c.oldUrl, to: catPath(c.slug) })),
  ...products.map((p) => ({ from: p.sourceUrl.replace(OLD, ''), to: p.path })),
  ...news.map((n) => ({ from: n.sourceUrl.replace(OLD, ''), to: `/novosti/${n.slug}/` })),
  ...serial.flatMap((s) => s.oldUrls.map((u) => ({ from: u, to: `/optom/#${s.id}` }))),
].map((r) => ({ ...r, from: OLD + r.from }));

const write = (name, data) => writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + '\n');
write('categories.json', { sections, categories: categories.map(({ oldUrl, ...c }) => c) });
write('products.json', products);
write('price.json', { ...price, serial });
write('news.json', news);
write('redirects.json', redirects);
write('images.manifest.json', { note: 'Источник → мастер-файл. method: esrgan | sharp | blend | normalize | icon. result пишет scripts/images-upscale.mjs', images: img });
console.log(`data/: товаров ${products.length}, разделов ${sections.length}, категорий ${categories.length}, групп прайса ${price.groups.length}, новостей ${news.length}, изображений ${img.length}, редиректов ${redirects.length}`);
