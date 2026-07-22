/* ==========================================================================
   مصاعد فرسان — main.js
   --------------------------------------------------------------------------
   ⚙️  الإعدادات كلها في الكائن CONFIG بالأسفل — غيّرها وخلاص.
   ========================================================================== */

const CONFIG = {
  /* رقم الجوال بصيغة دولية بدون + وبدون مسافات */
  phone: '966536600095',

  /* 🔸 رابط خدمة إرسال النموذج للإيميل (Formspree / Web3Forms / FormSubmit).
     اتركه فارغًا وسيتحوّل النموذج تلقائيًا لإرسال البيانات عبر واتساب. */
  formEndpoint: '',

  /* اسم حقل الخدمة الذي يستقبل الإيميل — يختلف حسب المزود */
  endpointType: 'json', // 'json' أو 'formdata'
};

/* ==========================================================================
   1. أدوات مساعدة
   ========================================================================== */

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* دفع حدث إلى dataLayer ليلتقطه GTM */
function track(event, data = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
}

/* تخزين بسيط عبر الكوكيز مع تجاهل الفشل بصمت */
function setCookie(name, value, days) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 864e5);
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  } catch (e) { /* الكوكيز معطّلة */ }
}
function getCookie(name) {
  try {
    return document.cookie.split('; ').find(r => r.startsWith(name + '='))?.split('=')[1] || '';
  } catch (e) { return ''; }
}

/* ==========================================================================
   2. تتبع النقرات (اتصال / واتساب)
   ========================================================================== */

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="tel:"], a[href*="wa.me"]');
  if (!link) return;

  const isCall = link.getAttribute('href').startsWith('tel:');
  track(isCall ? 'click_call' : 'click_whatsapp', {
    location: link.dataset.loc || 'unknown',
    page: document.body.dataset.page || ''
  });
});

/* تحميل بروفايل الشركة — أهم تحويل في صفحة المشاريع */
$$('[data-profile-download]').forEach(el => {
  el.addEventListener('click', () => {
    track('download_profile', { location: el.dataset.loc || 'unknown' });
  });
});

/* روابط الخدمات في الصفحة الرئيسية */
$$('[data-service-link]').forEach(el => {
  el.addEventListener('click', () => {
    track('click_service_' + el.dataset.serviceLink, { page: document.body.dataset.page || '' });
  });
});

/* ==========================================================================
   3. القائمة على الموبايل
   ========================================================================== */

const header = $('.header');
const burger = $('.burger');

if (burger && header) {
  burger.addEventListener('click', () => {
    const open = header.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });

  $$('.nav a').forEach(a => a.addEventListener('click', () => {
    header.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }));
}

/* ==========================================================================
   4. مؤشر البئر — العنصر المميز
   ========================================================================== */

(function shaftIndicator() {
  const shaft = $('.shaft');
  const car = $('.shaft__car');
  if (!shaft || !car) return;

  /* علامات الطوابق = مواقع الأقسام على الصفحة */
  const sections = $$('main > section[id]');
  const docH = () => document.body.scrollHeight - window.innerHeight;

  function drawFloors() {
    $$('.shaft__floor', shaft).forEach(el => el.remove());
    const total = docH();
    if (total <= 0) return;
    sections.forEach(sec => {
      const pct = Math.min(100, (sec.offsetTop / total) * 100);
      const tick = document.createElement('span');
      tick.className = 'shaft__floor';
      tick.style.top = pct + '%';
      shaft.appendChild(tick);
    });
  }

  let ticking = false;
  function update() {
    const total = docH();
    const pct = total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0;
    car.style.top = pct + '%';
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  window.addEventListener('resize', () => { drawFloors(); update(); });
  drawFloors();
  update();
})();

/* ==========================================================================
   5. ظهور الأقسام عند التمرير
   ========================================================================== */

(function revealOnScroll() {
  const items = $$('.reveal');
  if (!items.length || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.08 });

  items.forEach(el => io.observe(el));
})();

/* ==========================================================================
   6. النماذج
   ========================================================================== */

/* تحقق من رقم الجوال السعودي وإرجاعه بصيغة موحّدة */
function normalizePhone(raw) {
  const d = (raw || '').replace(/[^\d]/g, '');
  if (/^05\d{8}$/.test(d))    return '966' + d.slice(1);
  if (/^5\d{8}$/.test(d))     return '966' + d;
  if (/^9665\d{8}$/.test(d))  return d;
  if (/^009665\d{8}$/.test(d)) return d.slice(2);
  return null;
}

function setError(field, on) {
  field.classList.toggle('is-invalid', on);
}

function validate(form) {
  let ok = true;
  let firstBad = null;

  $$('.field', form).forEach(field => {
    const input = $('input, select, textarea', field);
    if (!input || !input.required) return;

    let bad = !input.value.trim();
    if (!bad && input.type === 'tel') bad = !normalizePhone(input.value);
    if (!bad && input.type === 'email') bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());

    setError(field, bad);
    if (bad) { ok = false; if (!firstBad) firstBad = input; }
  });

  if (firstBad) firstBad.focus();
  return ok;
}

/* بناء رسالة واتساب من حقول النموذج */
function buildWhatsAppText(form) {
  const lines = ['السلام عليكم، طلب جديد من الموقع:'];
  $$('.field', form).forEach(field => {
    const input = $('input, select, textarea', field);
    const label = $('label', field);
    if (!input || !label || !input.value.trim()) return;
    const name = label.textContent.replace('*', '').trim();
    lines.push(`${name}: ${input.value.trim()}`);
  });
  lines.push('— ' + (document.body.dataset.pageName || 'الموقع'));
  return encodeURIComponent(lines.join('\n'));
}

$$('form[data-form]').forEach(form => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate(form)) return;

    const btn = $('[type="submit"]', form);
    const original = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الإرسال…'; }

    const data = Object.fromEntries(new FormData(form).entries());
    data.phone_normalized = normalizePhone(data.phone || '') || '';
    data.page = document.body.dataset.page || '';

    const finish = () => {
      track(form.dataset.form, { page: data.page, city: data.city || '' });
      form.closest('[data-form-wrap]')?.classList.add('is-sent');
      if (btn) { btn.disabled = false; btn.textContent = original; }
      form.reset();
    };

    /* لا يوجد endpoint → التحويل لواتساب بالبيانات جاهزة */
    if (!CONFIG.formEndpoint) {
      window.open(`https://wa.me/${CONFIG.phone}?text=${buildWhatsAppText(form)}`, '_blank');
      finish();
      return;
    }

    try {
      const opts = { method: 'POST' };
      if (CONFIG.endpointType === 'json') {
        opts.headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        opts.body = JSON.stringify(data);
      } else {
        opts.body = new FormData(form);
      }
      const res = await fetch(CONFIG.formEndpoint, opts);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      finish();
    } catch (err) {
      /* الإرسال فشل — لا نضيّع العميل، نحوّله لواتساب */
      window.open(`https://wa.me/${CONFIG.phone}?text=${buildWhatsAppText(form)}`, '_blank');
      finish();
    }
  });

  /* إزالة التنبيه بمجرد بدء التصحيح */
  $$('.field input, .field select, .field textarea', form).forEach(input => {
    input.addEventListener('input', () => setError(input.closest('.field'), false));
  });
});

/* ==========================================================================
   7. شريط الكوكيز
   ========================================================================== */

(function cookieBar() {
  const bar = $('.cookie');
  if (!bar) return;
  if (getCookie('fursan_consent') === 'yes') return;

  bar.classList.add('is-open');
  $('[data-cookie-accept]', bar)?.addEventListener('click', () => {
    setCookie('fursan_consent', 'yes', 180);
    bar.classList.remove('is-open');
    track('cookie_consent_granted');
  });
})();
