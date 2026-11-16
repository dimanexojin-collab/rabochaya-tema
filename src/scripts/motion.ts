/**
 * Движение: reveal (с повтором), count-up цен, hero (повтор входа, ротатор, параллакс), 3D-лента категорий,
 * шапка/прогресс, ripple, магнитные пилюли, tilt карточек.
 * Работает только при html.m (ставит инлайн-скрипт в <head>, если нет reduced-motion).
 * Анимируются transform/translate/opacity/filter. Контент и итоговые цены всегда есть в HTML.
 */
const root = document.documentElement;
(window as unknown as { __rt: number }).__rt = 1;
const mq = (q: string) => matchMedia(q).matches;
const small = mq('(max-width: 767px)');
const $$ = <T extends Element = HTMLElement>(s: string, c: ParentNode = document) => [...c.querySelectorAll<T>(s)];
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s);
const on = (t: EventTarget, e: string, f: EventListener) => t.addEventListener(e, f, { passive: true });

if (root.classList.contains('m')) {
  // ---------- count-up (итоговый текст цены — в HTML, после счёта возвращается он же) ----------
  // Ширина текста не меняется: недостающие разряды — невидимые нули (tabular-nums) → CLS = 0.
  const tokens = new WeakMap<HTMLElement, number>();
  const reset = (el: HTMLElement) => {
    tokens.set(el, (tokens.get(el) ?? 0) + 1);
    if (el.dataset.orig !== undefined) el.textContent = el.dataset.orig;
  };
  const countUp = (el: HTMLElement) => {
    reset(el);
    const txt = (el.dataset.orig ??= el.textContent ?? '');
    const tok = tokens.get(el);
    const target = Number(el.dataset.price);
    const m = txt.match(/\d[\d\s  ]*\d|\d/);
    if (!m || !target || Number(m[0].replace(/\D/g, '')) !== target) return;
    const pre = txt.slice(0, m.index), post = txt.slice(m.index! + m[0].length);
    const sep = m[0].match(/\D/)?.[0] ?? ' ', len = String(target).length;
    const pad = document.createElement('span');
    pad.className = 'pz';
    const t0 = performance.now();
    const step = (t: number) => {
      if (tokens.get(el) !== tok) return;
      const p = Math.min(1, (t - t0) / 900);
      if (p >= 1) return reset(el);
      const v = String(Math.round(target * (1 - (1 - p) ** 3)));
      const s = v.padStart(len, '0').replace(/\B(?=(\d{3})+(?!\d))/g, sep);
      const k = s.length - v.replace(/\B(?=(\d{3})+(?!\d))/g, sep).length;
      pad.textContent = s.slice(0, k);
      el.replaceChildren(pre, pad, s.slice(k) + post);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const prices = (el: HTMLElement) => (el.matches('.price[data-price]') ? [el] : $$('.price[data-price]', el));

  // ---------- reveal: повторяется при каждом возврате блока в экран ----------
  // io запускает (с отступом снизу), out сбрасывает, когда блок целиком ушёл с экрана.
  const io = new IntersectionObserver((entries) => {
    let n = 0;
    for (const e of entries) {
      const el = e.target as HTMLElement;
      if (!e.isIntersecting || el.classList.contains('in')) continue;
      const d = Math.min(n++, 6) * 80;
      el.style.setProperty('--d', `${d}ms`);
      el.classList.add('in');
      for (const p of prices(el)) setTimeout(() => el.classList.contains('in') && countUp(p), 250 + d);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  const out = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      el.classList.remove('in');
      prices(el).forEach(reset);
    }
  });
  $$('[data-reveal]').forEach((el) => { io.observe(el); out.observe(el); });
  // цена на странице товара — без reveal-обёртки
  $$('.product__price .price[data-price]').forEach((el) => setTimeout(() => countUp(el), 200));

  // ---------- hero: вход повторяется (ушёл с экрана → .is-off снимает анимации → вернулся) ----------
  const hero = $('.hero');
  if (hero) {
    new IntersectionObserver(([e]) => {
      hero.classList.toggle('is-off', !e.isIntersecting);
      if (e.isIntersecting) prices(hero).forEach((p) => setTimeout(() => countUp(p), 300));
    }).observe(hero);
  }

  // ---------- ротатор категорий: размытие/сдвиг → печать с кареткой ----------
  for (const rot of $$('[data-rot]')) {
    const t = rot.querySelector<HTMLElement>('.rot__t');
    const list = (rot.dataset.rot ?? '').split('|');
    if (!t || list.length < 2) continue;
    let i = 0;
    const type = (s: string, k = 0) => {
      t.textContent = s.slice(0, k);
      if (k < s.length) setTimeout(() => type(s, k + 1), 45);
      else setTimeout(next, 2200);
    };
    const next = () => {
      if (document.hidden) return void setTimeout(next, 1000);
      t.classList.add('is-out');
      setTimeout(() => { t.classList.remove('is-out'); type(list[(i = (i + 1) % list.length)]); }, 300);
    };
    setTimeout(next, 2600);
  }

  // ---------- лента категорий: бесконечная 3D-карусель (без JS — обычный скролл) ----------
  for (const track of $$('.ribbon')) {
    const items = [...track.children] as HTMLElement[];
    if (items.length < 3) continue;
    track.classList.add('is-3d');
    const speed = small ? 24 : 34;
    let nat: number[] = [], W = 0, step = 0, w = 0, vw = 0, off = NaN, v = 0, target = speed;
    let visible = false, raf = 0, last = 0;
    const measure = () => {
      // offsetLeft/offsetWidth не зависят от transform — сбрасывать его перед замером не нужно (лишний reflow)
      nat = items.map((it) => it.offsetLeft);
      w = items[0].offsetWidth;
      step = w + parseFloat(getComputedStyle(track).columnGap || '0');
      W = step * items.length;
      vw = track.clientWidth;
      if (off !== off) off = -step; // первый кадр совпадает с исходной раскладкой
    };
    const render = () => {
      for (let k = 0; k < items.length; k++) {
        const x = ((((nat[k] - off) % W) + W) % W) - step;
        const d = Math.max(-1.2, Math.min(1.2, (x + w / 2 - vw / 2) / (vw / 2)));
        const a = Math.abs(d), it = items[k];
        it.style.transform = `translateX(${(x - nat[k]).toFixed(1)}px) rotateY(${(-d * (small ? 16 : 26)).toFixed(1)}deg) scale(${(1 - 0.14 * d * d).toFixed(3)})`;
        if (!small) it.style.filter = a > 0.55 ? `blur(${((a - 0.55) * 5).toFixed(1)}px)` : '';
      }
    };
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      v += (target - v) * Math.min(1, dt * 4);
      off += v * dt;
      render();
      raf = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
    };
    const start = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    measure();
    render();
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(track);
    on(document, 'visibilitychange', start);
    on(window, 'resize', () => { measure(); render(); });
    const pause = (p: boolean) => () => (target = p ? 0 : speed);
    on(track, 'pointerenter', pause(true));
    on(track, 'pointerleave', pause(false));
    on(track, 'focusin', (e) => {
      pause(true)();
      const k = items.findIndex((it) => it.contains(e.target as Node));
      if (k >= 0) { off = nat[k] - (vw - w) / 2 - step; render(); }
    });
    on(track, 'focusout', pause(false));
  }

  // ---------- шапка прячется вниз / появляется вверх; прогресс скролла (фолбэк без scroll-timeline) ----------
  const header = $('.site-header');
  const bar = $('.scroll-progress');
  const cssProgress = CSS.supports('animation-timeline: scroll()');
  let lastY = scrollY, ticking = false;
  on(window, 'scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      if (header) {
        const busy = header.matches(':focus-within') || !!header.querySelector('details[open]');
        if (y > lastY + 6 && y > 240 && !busy) header.classList.add('is-hidden');
        else if (y < lastY - 6 || y < 120) header.classList.remove('is-hidden');
      }
      if (bar && !cssProgress) bar.style.setProperty('--sp', String(y / Math.max(1, root.scrollHeight - innerHeight)));
      lastY = y;
      ticking = false;
    });
  });

  // ---------- ripple на пилюлях (сплошной круг, без градиента) ----------
  on(document, 'pointerdown', (e) => {
    const btn = (e.target as Element).closest?.<HTMLElement>('.btn');
    if (!btn) return;
    const r = btn.getBoundingClientRect(), pe = e as PointerEvent;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `left:${pe.clientX - r.left}px;top:${pe.clientY - r.top}px;--rs:${(Math.max(r.width, r.height) * 2.4) / 16}`;
    btn.append(s);
    on(s, 'animationend', () => s.remove());
  });

  if (mq('(hover: hover) and (pointer: fine)')) {
    // ---------- магнитные CTA ----------
    for (const b of $$('[data-magnetic]')) {
      on(b, 'pointermove', (e) => {
        const r = b.getBoundingClientRect(), pe = e as PointerEvent;
        b.style.setProperty('--mx', `${((pe.clientX - r.left - r.width / 2) * 0.2).toFixed(1)}px`);
        b.style.setProperty('--my', `${((pe.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`);
      });
      on(b, 'pointerleave', () => { b.style.removeProperty('--mx'); b.style.removeProperty('--my'); });
    }

    // ---------- tilt карточек товаров/новостей ----------
    const TILT = '.product-card, .news-card';
    on(document, 'pointermove', (e) => {
      const pe = e as PointerEvent;
      const c = (pe.target as Element).closest?.<HTMLElement>(TILT);
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty('--ry', `${(((pe.clientX - r.left) / r.width - 0.5) * 6).toFixed(2)}deg`);
      c.style.setProperty('--rx', `${((0.5 - (pe.clientY - r.top) / r.height) * 6).toFixed(2)}deg`);
    });
    on(document, 'pointerout', (e) => {
      const c = (e.target as Element).closest?.<HTMLElement>(TILT);
      const to = (e as PointerEvent).relatedTarget as Node | null;
      if (c && !(to && c.contains(to))) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
    });

    // ---------- лёгкий параллакс hero-карточек от курсора ----------
    if (hero) {
      on(hero, 'pointermove', (e) => {
        const r = hero.getBoundingClientRect(), pe = e as PointerEvent;
        hero.style.setProperty('--px', (((pe.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
        hero.style.setProperty('--py', (((pe.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
      });
      on(hero, 'pointerleave', () => { hero.style.removeProperty('--px'); hero.style.removeProperty('--py'); });
    }
  }
}

// ---------- заявка: mailto + копирование шаблона (работает и без анимаций) ----------
for (const form of $$<HTMLFormElement>('form[data-lead]')) {
  const email = form.dataset.email ?? '';
  const out = form.querySelector<HTMLElement>('[data-template]');
  const build = () => {
    const f = new FormData(form);
    const val = (k: string) => String(f.get(k) ?? '').trim();
    const subject = `Заявка с сайта: ${val('item') || 'рабочие перчатки'}`;
    const body = [
      `Что нужно: ${val('item')}`,
      `Количество: ${val('qty')}`,
      `Организация и реквизиты: ${val('org')}`,
      `Доставка: ${val('delivery')}`,
      `Контакт: ${val('contact')}`,
      val('comment') && `Комментарий: ${val('comment')}`,
    ].filter(Boolean).join('\n');
    return { subject, body };
  };
  const refresh = () => { if (out) out.textContent = `Тема: ${build().subject}\n\n${build().body}`; };
  on(form, 'input', refresh);
  refresh();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { subject, body } = build();
    // данные никуда не отправляются со страницы: открывается почтовый клиент пользователя
    location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  form.querySelector<HTMLButtonElement>('[data-copy]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const { subject, body } = build();
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      btn.textContent = 'Скопировано';
    } catch {
      btn.textContent = 'Не удалось скопировать — выделите текст ниже';
    }
  });
}
