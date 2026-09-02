const WA = '573134695020';
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');

/* Prefetch internal pages on intent (faster navigation). */
const prefetched = new Set();
function prefetch(href) {
  if (!href) return;
  const url = href.split('#')[0].trim();
  if (!url || prefetched.has(url)) return;
  if (/^(https?:|mailto:|tel:|wa\.me)/i.test(url)) return;
  if (!(url.endsWith('.html') || url === 'index.html')) return;
  prefetched.add(url);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  link.as = 'document';
  document.head.appendChild(link);
}
document.querySelectorAll('a[href]').forEach((a) => {
  const href = a.getAttribute('href') || '';
  a.addEventListener('pointerenter', () => prefetch(href), { passive: true });
  a.addEventListener('focus', () => prefetch(href), { passive: true });
});

function setMenu(open) {
  if (!toggle || !nav) return;
  nav.classList.toggle('is-open', open);
  toggle.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
}

toggle?.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
document.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
window.addEventListener('resize', () => { if (innerWidth > 768) setMenu(false); }, { passive: true });

const form = document.querySelector('[data-contact-form], [data-whatsapp-form]');
const CONTACT_EMAIL = 'gerencia@masterexpress.com.co';
const RATE_KEY = 'me-quote-sent';
const RATE_MS = 90000;
const MIN_FILL_MS = 2500;
const formReadyAt = Date.now();
const fechaInput = document.querySelector('#fecha');
if (fechaInput) {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  fechaInput.min = iso;
}

function cleanText(value, max) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function parseCantidad(value) {
  const raw = cleanText(value, 12).replace(/\s/g, '');
  if (!raw) return { ok: true, value: '' };
  if (!/^\d+$/.test(raw)) return { ok: false, value: '' };
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 1 || num > 99999) return { ok: false, value: '' };
  return { ok: true, value: String(num) };
}

function formatFecha(iso) {
  if (!iso) return 'No indicada';
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return iso;
  const [year, month, day] = parts;
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date(year, month - 1, day));
}

function buildSubmitFields(data) {
  return {
    'Nombre completo': data.nombre,
    'Correo electrónico': data.email,
    Teléfono: data.telefono || 'No indicado',
    Institución: data.institucion,
    Ciudad: data.ciudad || 'No indicada',
    'Cantidad aproximada': data.cantidad || 'No indicada',
    'Fecha del acto': formatFecha(data.fecha),
    Servicio: data.servicio,
    'Detalle de la ceremonia': data.mensaje || 'Sin información adicional.',
  };
}

function setFieldState(input, ok) {
  input.closest('.form-field')?.classList.toggle('is-invalid', !ok);
}

function showStatus(el, message, ok) {
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('is-ok', Boolean(ok));
}

function tooSoon() {
  try {
    const last = Number(sessionStorage.getItem(RATE_KEY) || 0);
    return last && Date.now() - last < RATE_MS;
  } catch {
    return false;
  }
}

function markSent() {
  try {
    sessionStorage.setItem(RATE_KEY, String(Date.now()));
  } catch {
    /* ignore quota / private mode */
  }
}

function buildFormData(data) {
  const origin = window.location.href.split('#')[0];
  const fd = new FormData();
  Object.entries(buildSubmitFields(data)).forEach(([label, value]) => fd.append(label, value));
  fd.append('_subject', `Cotización Master Express — ${data.institucion}`);
  fd.append('_template', 'table');
  fd.append('_captcha', 'false');
  fd.append('_replyto', data.email);
  fd.append('_url', origin);
  fd.append('_honey', '');
  return fd;
}

function buildJsonPayload(data) {
  const origin = window.location.href.split('#')[0];
  return {
    ...buildSubmitFields(data),
    _subject: `Cotización Master Express — ${data.institucion}`,
    _template: 'table',
    _captcha: 'false',
    _replyto: data.email,
    _url: origin,
  };
}

function parseSubmitBody(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return { message: String(raw) };
  }
}

function isSubmitOk(response, body) {
  if (body.success === true || body.success === 'true') return true;
  const msg = String(body.message || '').toLowerCase();
  if (msg.includes('activate') || msg.includes('activat') || msg.includes('confirm your')) {
    return 'activate';
  }
  if (body.success === false || body.success === 'false') return false;
  if (response.ok && response.status >= 200 && response.status < 300 && !msg.includes('false')) {
    return true;
  }
  return false;
}

async function postToFormSubmit(bodyInit, asJson) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const headers = { Accept: 'application/json' };
    if (asJson) headers['Content-Type'] = 'application/json';
    const response = await fetch(`https://formsubmit.co/ajax/${CONTACT_EMAIL}`, {
      method: 'POST',
      headers,
      body: bodyInit,
      signal: controller.signal,
    });
    const text = await response.text();
    const body = parseSubmitBody(text);
    const state = isSubmitOk(response, body);
    if (state === 'activate') {
      const err = new Error('ACTIVATE');
      err.detail = body.message || '';
      throw err;
    }
    if (!state) {
      const err = new Error(body.message || `HTTP ${response.status}`);
      err.detail = body.message || text || '';
      throw err;
    }
    return true;
  } finally {
    clearTimeout(timer);
  }
}

async function sendQuote(data) {
  try {
    return await postToFormSubmit(buildFormData(data), false);
  } catch (first) {
    if (first.message === 'ACTIVATE') throw first;
    return postToFormSubmit(JSON.stringify(buildJsonPayload(data)), true);
  }
}

function prepareNativeSubmit(form, data) {
  const replyto = form.elements._replyto;
  if (replyto) replyto.value = data.email;
  const subject = form.elements._subject;
  if (subject) subject.value = `Cotización Master Express — ${data.institucion}`;
  const pageUrl = form.elements._url;
  if (pageUrl) pageUrl.value = window.location.href.split('#')[0];
  const fecha = form.querySelector('#fecha');
  if (fecha && data.fecha) {
    form.dataset.fechaIso = data.fecha;
    fecha.value = formatFecha(data.fecha);
  }
}

function submitFormNatively(form, data) {
  prepareNativeSubmit(form, data);
  form.removeEventListener('submit', handleQuoteSubmit);
  HTMLFormElement.prototype.submit.call(form);
}

async function handleQuoteSubmit(e) {
  e.preventDefault();
  const card = form.closest('.quote-form-card');
  const status = document.querySelector('#quote-status');
  const submit = document.querySelector('#quote-submit');
  const success = document.querySelector('#quote-success');
  if (form.classList.contains('is-busy')) return;

  document.querySelectorAll('.form-status-help').forEach((el) => el.remove());

  if (cleanText(form.elements.website?.value, 80) || form.elements._honey?.value) {
    showStatus(status, 'Solicitud enviada. Te responderemos pronto.', true);
    card?.classList.add('is-sent');
    success?.removeAttribute('hidden');
    return;
  }

  if (Date.now() - formReadyAt < MIN_FILL_MS) {
    showStatus(status, 'Espera un momento e inténtalo de nuevo.');
    return;
  }

  if (tooSoon()) {
    showStatus(status, 'Ya enviamos una solicitud hace un momento. Espera un poco o escríbenos por WhatsApp.');
    return;
  }

  const cantidadInput = form.querySelector('#cantidad');
  const cantidadResult = parseCantidad(cantidadInput?.value);

  const data = {
    nombre: cleanText(form.querySelector('#nombre')?.value, 80),
    email: cleanText(form.querySelector('#email')?.value, 120).toLowerCase(),
    telefono: cleanText(form.querySelector('#telefono')?.value, 20),
    institucion: cleanText(form.querySelector('#institucion')?.value, 120),
    ciudad: cleanText(form.querySelector('#ciudad')?.value, 60),
    cantidad: cantidadResult.value,
    fecha: cleanText(form.querySelector('#fecha')?.value, 20),
    servicio: cleanText(form.querySelector('#servicio')?.value, 60),
    mensaje: cleanText(form.querySelector('#mensaje')?.value, 1200),
  };

  const checks = [
    [form.querySelector('#nombre'), data.nombre.length >= 2],
    [form.querySelector('#email'), isEmail(data.email)],
    [form.querySelector('#institucion'), data.institucion.length >= 2],
  ];
  checks.forEach(([input, ok]) => setFieldState(input, ok));
  if (checks.some(([, ok]) => !ok)) {
    showStatus(status, 'Revisa nombre, correo e institución para continuar.');
    return;
  }

  if (cleanText(cantidadInput?.value, 12) && !cantidadResult.ok) {
    setFieldState(cantidadInput, false);
    showStatus(status, 'La cantidad debe ser un número entero mayor a 0.');
    return;
  }
  setFieldState(cantidadInput, true);

  form.classList.add('is-busy');
  if (submit) {
    submit.disabled = true;
    submit.innerHTML = '<i class="bi bi-hourglass-split"></i> Enviando…';
  }
  showStatus(status, 'Enviando a gerencia@masterexpress.com.co…', true);

  try {
    await sendQuote(data);
    markSent();
    card?.classList.add('is-sent');
    success?.removeAttribute('hidden');
    showStatus(status, '', true);
    form.reset();
    document.querySelectorAll('.form-field.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  } catch (err) {
    if (err?.message === 'ACTIVATE') {
      showStatus(
        status,
        'Activa el formulario una sola vez: revisa gerencia@masterexpress.com.co (bandeja o spam), abre el enlace “Activate Form” de FormSubmit y vuelve a enviar la cotización.',
      );
    } else if (form.action.includes('formsubmit.co')) {
      showStatus(status, 'Completando el envío…', true);
      markSent();
      submitFormNatively(form, data);
      return;
    } else {
      const wa = `https://wa.me/${WA}?text=${encodeURIComponent(
        `Hola, buen día. Quiero cotizar togas y birretes con Master Express.\nNombre: ${data.nombre}\nCorreo: ${data.email}\nInstitución: ${data.institucion}\nCiudad: ${data.ciudad || 'No indicada'}\nCantidad: ${data.cantidad || 'No indicada'}\nFecha: ${data.fecha || 'No indicada'}\nServicio: ${data.servicio}`,
      )}`;
      showStatus(
        status,
        'No se pudo completar el envío automático. Usa WhatsApp con los mismos datos y te respondemos.',
      );
      if (status) {
        const help = document.createElement('p');
        help.className = 'form-status-help';
        help.innerHTML = `<a class="button button--sm button--accent" href="${wa}" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i> Enviar por WhatsApp</a>`;
        status.insertAdjacentElement('afterend', help);
      }
    }
  } finally {
    form.classList.remove('is-busy');
    if (submit) {
      submit.disabled = false;
      submit.innerHTML = '<i class="bi bi-send-fill"></i> Enviar cotización';
    }
  }
}

form?.addEventListener('submit', handleQuoteSubmit);

if (new URLSearchParams(window.location.search).get('sent') === '1') {
  const card = document.querySelector('.quote-form-card');
  const success = document.querySelector('#quote-success');
  card?.classList.add('is-sent');
  success?.removeAttribute('hidden');
  history.replaceState(null, '', window.location.pathname + window.location.hash);
}

document.querySelector('#quote-reset')?.addEventListener('click', () => {
  const card = document.querySelector('.quote-form-card');
  const success = document.querySelector('#quote-success');
  const status = document.querySelector('#quote-status');
  card?.classList.remove('is-sent');
  success?.setAttribute('hidden', '');
  showStatus(status, '');
  form?.querySelector('#nombre')?.focus();
});

/* -------------------------------------------------------------------------- */
/* Anime.js — motion system                                                    */
/* -------------------------------------------------------------------------- */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let animeApi = null;

const ANIME_CDN = [
  'animejs',
  'https://cdn.jsdelivr.net/npm/animejs@4.3.6/+esm',
  'https://esm.sh/animejs@4.3.6',
];

const AUTO_REVEAL = [
  ['.page-hero__inner', 'hero'],
  ['.section-heading', 'copy'],
  ['.proof-item', 'stat'],
  ['.logo-marquee', 'fade'],
  ['.showcase-item:not([data-animate])', 'media'],
  ['.gallery-card', 'card'],
  ['.gallery-filters', 'fade'],
  ['.faq-list > details', 'fade'],
  ['.contact-card__item', 'card'],
  ['.next-steps li', 'fade'],
  ['.footer__brand, .footer__col', 'fade'],
  ['.cta-about__steps li, .cta-final__trust li, .cta-about__trust li', 'fade'],
  ['.gallery-promo__features li', 'card'],
  ['.about-formal-list > li:not([data-animate])', 'card'],
  ['.rentals-features > li:not([data-animate])', 'card'],
];

function markAutoReveals() {
  AUTO_REVEAL.forEach(([selector, type]) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (el.hasAttribute('data-animate')) return;
      const ancestor = el.parentElement?.closest('[data-animate]');
      if (ancestor) return;
      if (type === 'hero' && el.querySelector('[data-animate="hero"]')) return;
      el.setAttribute('data-animate', type);
    });
  });
}

function clearReveal(el) {
  el.classList.remove('reveal-ready', 'is-animating');
  el.classList.add('is-revealed');
  el.style.opacity = '';
  el.style.transform = '';
  el.style.filter = '';
}

function prepareReveals() {
  markAutoReveals();
  document.querySelectorAll('[data-animate]').forEach((el) => {
    if (reduceMotion) {
      clearReveal(el);
      return;
    }
    el.classList.add('reveal-ready');
    el.classList.add(`reveal-${el.dataset.animate || 'fade'}`);
  });
}

function motionFor(type) {
  switch (type) {
    case 'hero':
      return { opacity: [0, 1], y: [36, 0], duration: 920, ease: 'out(4)' };
    case 'hero-image':
      return { opacity: [0, 1], x: [40, 0], scale: [0.96, 1], duration: 1100, ease: 'out(4)' };
    case 'media':
      return { opacity: [0, 1], y: [28, 0], scale: [0.97, 1], duration: 880, ease: 'out(3)' };
    case 'copy':
      return { opacity: [0, 1], y: [22, 0], duration: 760, ease: 'out(3)' };
    case 'card':
      return { opacity: [0, 1], y: [26, 0], scale: [0.98, 1], duration: 700, ease: 'out(3)' };
    case 'stat':
      return { opacity: [0, 1], y: [18, 0], scale: [0.94, 1], duration: 640, ease: 'out(4)' };
    case 'fade':
    default:
      return { opacity: [0, 1], y: [16, 0], duration: 620, ease: 'out(3)' };
  }
}

function playReveal(el, animate, stagger, groupIndex = 0) {
  if (!el || el.classList.contains('is-revealed') || el.classList.contains('is-animating')) return;
  const type = el.dataset.animate || 'fade';
  const base = motionFor(type);
  el.classList.add('is-animating');
  el.classList.remove('reveal-ready');

  const children = type === 'hero'
    ? [...el.children].filter((child) => child.nodeType === 1)
    : null;

  if (children && children.length > 1) {
    children.forEach((child) => {
      child.style.opacity = '0';
    });
    el.style.opacity = '1';
    el.style.transform = 'none';
    animate(children, {
      ...base,
      delay: stagger(90, { start: 40 }),
      onComplete: () => {
        children.forEach((child) => {
          child.style.opacity = '';
          child.style.transform = '';
        });
        clearReveal(el);
      },
    });
    return;
  }

  animate(el, {
    ...base,
    delay: Math.min(groupIndex * 55, 220),
    onComplete: () => clearReveal(el),
  });
}

function observeReveals(animate, stagger, skip = new Set()) {
  const nodes = [...document.querySelectorAll('[data-animate]')].filter((el) => !skip.has(el));
  const groups = new Map();

  nodes.forEach((el) => {
    const parent = el.parentElement;
    if (!parent) return;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      observer.unobserve(el);
      const siblings = groups.get(el.parentElement) || [el];
      const index = Math.max(0, siblings.indexOf(el));
      playReveal(el, animate, stagger, index);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

  nodes.forEach((el) => {
    if (el.dataset.animate === 'hero' || el.dataset.animate === 'hero-image') {
      playReveal(el, animate, stagger, 0);
      return;
    }
    observer.observe(el);
  });
}

function bindHoverMotion(animate) {
  const hoverables = document.querySelectorAll([
    '.audience-card',
    '.service-grid article',
    '.quote-card',
    '.compare-card',
    '.gallery-card',
    '.showcase-item',
    '.contact-card__item',
    '.process-timeline li',
  ].join(','));

  hoverables.forEach((el) => {
    let leaveAnim = null;
    el.addEventListener('pointerenter', () => {
      if (reduceMotion || window.matchMedia('(hover: none)').matches) return;
      leaveAnim?.pause?.();
      animate(el, {
        y: -5,
        duration: 320,
        ease: 'out(3)',
        composition: 'blend',
      });
      const icon = el.querySelector('.audience-card__icon, .service-card__icon, .contact-icon, .process-timeline__icon, .rentals-features__icon');
      if (icon) {
        animate(icon, { scale: [1, 1.08], duration: 380, ease: 'out(3)', composition: 'blend' });
      }
    });
    el.addEventListener('pointerleave', () => {
      if (reduceMotion || window.matchMedia('(hover: none)').matches) return;
      leaveAnim = animate(el, {
        y: 0,
        duration: 420,
        ease: 'out(3)',
        composition: 'blend',
      });
      const icon = el.querySelector('.audience-card__icon, .service-card__icon, .contact-icon, .process-timeline__icon, .rentals-features__icon');
      if (icon) {
        animate(icon, { scale: 1, duration: 420, ease: 'out(3)', composition: 'blend' });
      }
    });
  });
}

function bindButtonMotion(animate) {
  document.querySelectorAll('.button').forEach((btn) => {
    btn.addEventListener('pointerenter', () => {
      if (reduceMotion || window.matchMedia('(hover: none)').matches) return;
      animate(btn, { scale: 1.025, duration: 260, ease: 'out(3)', composition: 'blend' });
    });
    btn.addEventListener('pointerleave', () => {
      if (reduceMotion || window.matchMedia('(hover: none)').matches) return;
      animate(btn, { scale: 1, duration: 320, ease: 'out(3)', composition: 'blend' });
    });
  });
}

function animateIconsInView(animate, stagger) {
  const icons = document.querySelectorAll([
    '.service-card__icon',
    '.audience-card__icon',
    '.contact-icon',
    '.process-timeline__icon',
    '.rentals-features__icon',
    '.catalog-icon',
  ].join(','));
  if (!icons.length) return;

  const io = new IntersectionObserver((entries) => {
    const batch = entries.filter((e) => e.isIntersecting).map((e) => e.target);
    if (!batch.length) return;
    batch.forEach((el) => io.unobserve(el));
    animate(batch, {
      scale: [0.86, 1],
      rotate: [-5, 0],
      delay: stagger(55),
      duration: 680,
      ease: 'out(4)',
    });
  }, { threshold: 0.35 });

  icons.forEach((icon) => {
    io.observe(icon);
  });
}

prepareReveals();

const lightbox = document.querySelector('#lightbox');
const lbImg = document.querySelector('#lightbox-img');
const lbCap = document.querySelector('#lightbox-caption');
const lbCounter = document.querySelector('#lightbox-counter');
let lbIndex = 0;

function getVisibleLbItems() {
  return [...document.querySelectorAll('[data-lightbox]')].filter(
    (el) => !el.classList.contains('is-hidden'),
  );
}

function showLb(i) {
  const items = getVisibleLbItems();
  if (!lightbox || !items.length || !lbImg) return;
  lbIndex = (i + items.length) % items.length;
  const item = items[lbIndex];
  lbImg.src = item.dataset.lightbox;
  lbImg.alt = item.querySelector('img')?.alt || item.dataset.caption || '';
  if (lbCap) lbCap.textContent = item.dataset.caption || '';
  if (lbCounter) lbCounter.textContent = `${lbIndex + 1} / ${items.length}`;

  if (animeApi && !reduceMotion) {
    animeApi.animate(lbImg, {
      opacity: [0, 1],
      scale: [0.94, 1],
      duration: 420,
      ease: 'out(3)',
    });
  }
}

function openLb(i) {
  if (!lightbox) return;
  showLb(i);
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  if (animeApi && !reduceMotion) {
    animeApi.animate(lightbox, {
      opacity: [0, 1],
      duration: 280,
      ease: 'out(2)',
    });
  }
}

function closeLb() {
  if (!lightbox) return;
  const finish = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    if (lbImg) lbImg.src = '';
    if (lbCounter) lbCounter.textContent = '';
    lightbox.style.opacity = '';
  };
  if (animeApi && !reduceMotion && lightbox.classList.contains('is-open')) {
    animeApi.animate(lightbox, {
      opacity: [1, 0],
      duration: 200,
      ease: 'in(2)',
      onComplete: finish,
    });
    return;
  }
  finish();
}

document.querySelectorAll('[data-lightbox]').forEach((item) => {
  item.addEventListener('click', () => {
    const items = getVisibleLbItems();
    const index = items.indexOf(item);
    if (index >= 0) openLb(index);
  });
});
lightbox?.querySelector('.lightbox__close')?.addEventListener('click', closeLb);
lightbox?.querySelector('.lightbox__nav--prev')?.addEventListener('click', (e) => { e.stopPropagation(); showLb(lbIndex - 1); });
lightbox?.querySelector('.lightbox__nav--next')?.addEventListener('click', (e) => { e.stopPropagation(); showLb(lbIndex + 1); });
lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) closeLb(); });
document.addEventListener('keydown', (e) => {
  if (!lightbox?.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLb();
  if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
  if (e.key === 'ArrowRight') showLb(lbIndex + 1);
});

(async () => {
  if (reduceMotion) {
    document.querySelectorAll('[data-animate]').forEach(clearReveal);
    return;
  }

  let mod = null;
  for (const url of ANIME_CDN) {
    try {
      mod = await import(url);
      break;
    } catch {
      mod = null;
    }
  }

  if (!mod?.animate) {
    document.querySelectorAll('[data-animate]').forEach(clearReveal);
    console.warn('Anime.js no pudo cargarse.');
    return;
  }

  const { animate, createTimeline, stagger } = mod;
  animeApi = { animate, createTimeline, stagger };

  const hero = document.querySelector('[data-animate="hero"]');
  const heroImage = document.querySelector('[data-animate="hero-image"]');
  const skip = new Set();

  if (hero && heroImage && createTimeline) {
    skip.add(hero);
    skip.add(heroImage);
    hero.classList.remove('reveal-ready');
    heroImage.classList.remove('reveal-ready');
    const tl = createTimeline({ defaults: { ease: 'out(4)' } });
    const heroKids = [...hero.children];
    heroKids.forEach((child) => { child.style.opacity = '0'; });
    hero.style.opacity = '1';
    heroImage.style.opacity = '0';
    tl.add(heroKids, {
      opacity: [0, 1],
      y: [32, 0],
      duration: 820,
      delay: stagger(100),
    }, 0);
    tl.add(heroImage, {
      opacity: [0, 1],
      x: [36, 0],
      scale: [0.96, 1],
      duration: 980,
    }, 120);
    tl.then(() => {
      heroKids.forEach((child) => {
        child.style.opacity = '';
        child.style.transform = '';
      });
      clearReveal(hero);
      clearReveal(heroImage);
    });
  }

  observeReveals(animate, stagger, skip);
  bindHoverMotion(animate);
  bindButtonMotion(animate);
  animateIconsInView(animate, stagger);

  const header = document.querySelector('.site-header');
  if (header) {
    header.style.opacity = '0';
    animate(header, {
      opacity: [0, 1],
      y: [-12, 0],
      duration: 700,
      ease: 'out(3)',
      onComplete: () => { header.style.opacity = ''; header.style.transform = ''; },
    });
  }

  const waFloat = document.querySelector('.whatsapp-float');
  if (waFloat) {
    waFloat.style.opacity = '0';
    animate(waFloat, {
      opacity: [0, 1],
      scale: [0.7, 1],
      duration: 700,
      delay: 700,
      ease: 'out(4)',
      onComplete: () => { waFloat.style.opacity = ''; waFloat.style.transform = ''; },
    });
  }
})();

document.querySelectorAll('.faq-about .faq-list, .faq-home .faq-list, .faq-contact .faq-list').forEach((list) => {
  list.addEventListener('toggle', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLDetailsElement) || !target.open) return;
    list.querySelectorAll('details').forEach((item) => {
      if (item !== target) item.open = false;
    });
    if (animeApi && !reduceMotion) {
      const panel = target.querySelector('p');
      if (panel) {
        animeApi.animate(panel, {
          opacity: [0, 1],
          y: [8, 0],
          duration: 320,
          ease: 'out(2)',
        });
      }
    }
  }, true);
});

document.querySelectorAll('.gallery-filter').forEach((btn) => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    document.querySelectorAll('.gallery-filter').forEach((b) => {
      const active = b === btn;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
    });
    const cards = [...document.querySelectorAll('.gallery-card[data-category]')];
    const visible = [];
    cards.forEach((card) => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('is-hidden', !show);
      if (show) visible.push(card);
    });
    if (animeApi && !reduceMotion && visible.length) {
      animeApi.animate(visible, {
        opacity: [0, 1],
        y: [18, 0],
        scale: [0.98, 1],
        delay: animeApi.stagger(45),
        duration: 480,
        ease: 'out(3)',
      });
    }
    if (lightbox?.classList.contains('is-open')) {
      const items = getVisibleLbItems();
      if (!items.length) closeLb();
      else showLb(Math.min(lbIndex, items.length - 1));
    }
  });
});
