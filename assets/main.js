/* =========================================================
   SISI PISI - Site logic (shared across all pages)
   ========================================================= */

(function() {
  'use strict';

  function setLanguage(lang) {
    if (!window.translations || !window.translations[lang]) return;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (window.translations[lang][key]) el.innerHTML = window.translations[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (window.translations[lang][key]) el.placeholder = window.translations[lang][key];
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-alt');
      if (window.translations[lang][key]) el.alt = window.translations[lang][key];
    });
    document.querySelectorAll('.lang-switcher button').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    try { localStorage.setItem('sisipisi_lang', lang); } catch(e) {}
  }
  window.setSisipisiLang = setLanguage;

  function enhanceLabels() {
    document.querySelectorAll('.form-field input, .form-field select, .form-field textarea').forEach(function(el, idx) {
      if (!el.id && el.name) el.id = 'field-' + el.name;
      if (!el.id) el.id = 'field-auto-' + idx;
      var label = el.closest('.form-field') && el.closest('.form-field').querySelector('label');
      if (label && !label.getAttribute('for')) label.setAttribute('for', el.id);
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    enhanceLabels();

    document.querySelectorAll('.lang-switcher button').forEach(function(btn) {
      btn.addEventListener('click', function() { setLanguage(btn.getAttribute('data-lang')); });
    });
    try {
      var savedLang = localStorage.getItem('sisipisi_lang');
      if (savedLang && window.translations && window.translations[savedLang]) setLanguage(savedLang);
    } catch(e) {}

    var menuToggle = document.querySelector('.menu-toggle');
    var primaryNav = document.querySelector('nav.primary');
    if (menuToggle && primaryNav) {
      menuToggle.addEventListener('click', function() {
        var open = primaryNav.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.reveal').forEach(function(el) { observer.observe(el); });

    document.querySelectorAll('.faq-item').forEach(function(item, idx) {
      var q = item.querySelector('.faq-question');
      var a = item.querySelector('.faq-answer');
      if (q) {
        q.setAttribute('role', 'button');
        q.setAttribute('tabindex', '0');
        q.setAttribute('aria-expanded', 'false');
        if (a) { a.id = a.id || 'faq-answer-' + idx; q.setAttribute('aria-controls', a.id); }
        var toggle = function() {
          var open = item.classList.toggle('open');
          q.setAttribute('aria-expanded', open ? 'true' : 'false');
        };
        q.addEventListener('click', toggle);
        q.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      }
    });

    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav.primary a').forEach(function(a) {
      var href = a.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) a.classList.add('active');
    });
  });
})();

/* =========================================================
   BOOKING WIZARD - v1.4 audit corrections
   ========================================================= */
(function() {
  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', function() {
    var wizard = document.querySelector('.wizard');
    if (!wizard) return;

    var currentStep = 1;
    var totalSteps = 7;
    var data = {};

    function getLang() { return document.documentElement.lang || 'ro'; }
    function t(key) { var lang = getLang(); return (window.translations && window.translations[lang] && window.translations[lang][key]) || key; }
    function field(name) { return wizard.querySelector('[name="' + name + '"]'); }
    function value(name) { var el = field(name); return el ? (el.value || '').trim() : ''; }
    function checked(name) { var el = field(name); return !!(el && el.checked); }

    function showStep(n) {
      currentStep = n;
      document.querySelectorAll('.wizard-step').forEach(function(s, i) { s.classList.toggle('active', i === n - 1); });
      document.querySelectorAll('.wizard-progress .step-dot').forEach(function(d, i) {
        d.classList.remove('active', 'complete');
        if (i + 1 < n) d.classList.add('complete');
        if (i + 1 === n) d.classList.add('active');
      });
      window.scrollTo({ top: wizard.offsetTop - 80, behavior: 'smooth' });
    }
    function showError(name, msgKey) {
      var input = field(name); if (!input) return false;
      input.classList.add('error');
      var err = input.parentElement.querySelector('.error-msg');
      if (err) { err.textContent = t(msgKey); err.classList.add('show'); }
      return false;
    }
    function clearError(name) {
      var input = field(name); if (!input) return;
      input.classList.remove('error');
      var err = input.parentElement.querySelector('.error-msg'); if (err) err.classList.remove('show');
    }
    function clearAllErrors() {
      wizard.querySelectorAll('.error').forEach(function(el) { el.classList.remove('error'); });
      wizard.querySelectorAll('.error-msg.show').forEach(function(el) { el.classList.remove('show'); });
      wizard.querySelectorAll('.alert.error').forEach(function(el) { el.style.display = 'none'; });
    }

    function validateStep1() {
      clearAllErrors();
      var ci = value('checkin'), co = value('checkout');
      var ok = true;
      if (!ci) ok = showError('checkin', 'res.err.required') && ok;
      if (!co) ok = showError('checkout', 'res.err.required') && ok;
      var today = new Date(); today.setHours(0,0,0,0);
      var checkinDate = new Date(ci);
      if (ci && checkinDate < today) ok = showError('checkin', 'res.err.pastDate') && ok;
      if (ci && co && new Date(co) <= new Date(ci)) ok = showError('checkout', 'res.err.dateOrder') && ok;
      if (ok) { data.checkin = ci; data.checkout = co; data.checkinTime = value('checkinTime'); data.checkoutTime = value('checkoutTime'); data.nights = Math.ceil((new Date(co) - new Date(ci)) / 86400000); }
      return ok;
    }
    function validateStep2() {
      clearAllErrors();
      var suite = wizard.querySelector('input[name="suite"]:checked');
      if (!suite) { var alert = wizard.querySelector('#suite-error'); if (alert) alert.style.display = 'block'; return false; }
      data.suite = suite.value; data.suitePrice = parseInt(suite.getAttribute('data-price'), 10); data.suiteName = data.suite === 'vip' ? t('suite.vip.title') : t('suite.premium.title'); data.catCount = parseInt(value('catCount') || '1', 10);
      data.secondCatPrice = data.catCount === 2 ? (data.suite === 'vip' ? 90 : 70) : 0;
      return true;
    }
    function validateStep3() {
      clearAllErrors();
      var fields = ['firstname','lastname','email','phone','ci','address','city','county','authName','authPhone','authRelation'];
      var ok = true;
      fields.forEach(function(f) { var v = value(f); if (!v) ok = showError(f, 'res.err.required') && ok; else data[f] = v; });
      if (value('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value('email'))) ok = showError('email', 'res.err.email') && ok;
      if (value('phone') && value('phone').replace(/[^0-9+]/g, '').length < 9) ok = showError('phone', 'res.err.phone') && ok;
      if (value('authPhone') && value('authPhone').replace(/[^0-9+]/g, '').length < 9) ok = showError('authPhone', 'res.err.phone') && ok;
      data.firstvisit = checked('firstvisit'); data.preferredChannel = value('preferredChannel');
      return ok;
    }
    function validateStep4() {
      clearAllErrors();
      var fields = ['catname','birth','sex','breed','sterilized','behavior'];
      var ok = true;
      fields.forEach(function(f) { var v = value(f); if (!v) ok = showError(f, 'res.err.required') && ok; else data[f] = v; });
      if (data.catCount === 2) {
        ['cat2name','cat2birth','cat2sex'].forEach(function(f) { var v = value(f); if (!v) ok = showError(f, 'res.err.required') && ok; else data[f] = v; });
      }
      data.food = value('food'); data.meds = value('meds'); data.behaviorNotes = value('behaviorNotes'); data.personalItems = value('personalItems'); data.cat2notes = value('cat2notes');
      if (data.birth) { var ageMonths = (Date.now() - new Date(data.birth).getTime()) / (1000 * 60 * 60 * 24 * 30); if (ageMonths < 4) ok = showError('birth', 'res.err.age') && ok; }
      return ok;
    }
    function validateStep5() {
      clearAllErrors();
      if (!checked('bookletConfirm')) { var alertBox = wizard.querySelector('#booklet-error'); if (alertBox) alertBox.style.display = 'block'; return false; }
      var ok = true;
      ['rabies','fvrcp','deworm'].forEach(function(f) { if (!value(f)) ok = showError(f, 'res.err.required') && ok; });
      var checkinDate = new Date(data.checkin || Date.now());
      if (value('rabies')) { var r = new Date(value('rabies')); r.setDate(r.getDate() + 365); if (r < checkinDate) ok = showError('rabies', 'res.err.rabies') && ok; }
      if (value('fvrcp')) { var f = new Date(value('fvrcp')); f.setDate(f.getDate() + 365); if (f < checkinDate) ok = showError('fvrcp', 'res.err.fvrcp') && ok; }
      if (ok) { data.rabies = value('rabies'); data.fvrcp = value('fvrcp'); data.deworm = value('deworm'); }
      return ok;
    }
    function collectOptions() {
      var options = [];
      function add(name, key, price, perDay) { if (checked(name)) options.push({ name: t(key), price: price, perDay: !!perDay }); }
      add('optPlay', 'res.opt.play', 50, false);
      add('optMedsSimple', 'res.opt.medsSimple', 25, true);
      add('optMedsExtended', 'res.opt.medsExtended', 35, true);
      add('optGrooming', 'res.opt.grooming', 85, false);
      add('optTransportOne', 'res.opt.transportOne', 80, false);
      add('optTransportRound', 'res.opt.transportRound', 140, false);
      data.options = options; data.transportAddress = value('transportAddress'); data.optionNotes = value('optionNotes');
      return true;
    }
    function validateStep7() {
      clearAllErrors();
      var required = ['terms','gdpr','contract','pickupPolicy','cameraAccess','vetConsent'];
      var ok = required.every(checked);
      data.whatsappConsent = checked('whatsappConsent');
      if (!ok) { var alertBox = wizard.querySelector('#terms-error'); if (alertBox) alertBox.style.display = 'block'; return false; }
      return true;
    }
    function money(n) { return Math.round(n) + ' lei'; }
    function buildSummary() {
      var lang = getLang();
      var fmt = function(d) { return new Date(d).toLocaleDateString(lang === 'ro' ? 'ro-RO' : (lang === 'hu' ? 'hu-HU' : 'en-GB'), { year: 'numeric', month: 'short', day: 'numeric' }); };
      collectOptions();
      var base = data.suitePrice * data.nights;
      var second = data.secondCatPrice * data.nights;
      var optionsTotal = 0;
      (data.options || []).forEach(function(o) { optionsTotal += o.perDay ? o.price * data.nights : o.price; });
      var subtotal = base + second + optionsTotal;
      var discountRate = data.nights > 20 ? 0.10 : (data.nights > 10 ? 0.05 : 0);
      var discount = subtotal * discountRate;
      var total = subtotal - discount;
      var optionsHtml = data.options && data.options.length ? data.options.map(function(o){ return '<dt>' + o.name + '</dt><dd>' + money(o.perDay ? o.price * data.nights : o.price) + '</dd>'; }).join('') : '<dt>' + t('res.s6.noOptions') + '</dt><dd>—</dd>';
      var summary = wizard.querySelector('#summary-content'); if (!summary) return;
      summary.innerHTML =
        '<div class="summary-block"><h4>' + t('res.s6.dates') + '</h4><dl>' +
        '<dt>' + t('res.checkin') + '</dt><dd>' + fmt(data.checkin) + ' · ' + data.checkinTime + '</dd>' +
        '<dt>' + t('res.checkout') + '</dt><dd>' + fmt(data.checkout) + ' · ' + data.checkoutTime + '</dd>' +
        '<dt>' + t('res.nights') + '</dt><dd>' + data.nights + '</dd></dl></div>' +
        '<div class="summary-block"><h4>' + t('res.s6.suite') + '</h4><dl>' +
        '<dt>' + t('res.s6.suite') + '</dt><dd>' + (data.suite === 'vip' ? t('suite.vip.title') : t('suite.premium.title')) + '</dd>' +
        '<dt>' + t('res.s2.catCount') + '</dt><dd>' + data.catCount + '</dd>' +
        '<dt>' + t('res.s6.base') + '</dt><dd>' + money(base) + '</dd>' +
        (data.catCount === 2 ? '<dt>' + t('res.s6.secondCat') + '</dt><dd>' + money(second) + '</dd>' : '') + '</dl></div>' +
        '<div class="summary-block"><h4>' + t('res.s6.owner') + '</h4><dl>' +
        '<dt>' + t('res.s3.firstname') + ' ' + t('res.s3.lastname') + '</dt><dd>' + data.firstname + ' ' + data.lastname + '</dd>' +
        '<dt>' + t('res.s3.email') + '</dt><dd>' + data.email + '</dd>' +
        '<dt>' + t('res.s3.phone') + '</dt><dd>' + data.phone + '</dd>' +
        '<dt>' + t('res.s3.authName') + '</dt><dd>' + data.authName + ' · ' + data.authPhone + '</dd></dl></div>' +
        '<div class="summary-block"><h4>' + t('res.s6.cat') + '</h4><dl>' +
        '<dt>' + t('res.s4.catname') + '</dt><dd>' + data.catname + '</dd>' +
        '<dt>' + t('res.s4.birth') + '</dt><dd>' + fmt(data.birth) + '</dd>' +
        '<dt>' + t('res.s4.sex') + '</dt><dd>' + (data.sex === 'female' ? t('res.s4.female') : t('res.s4.male')) + '</dd>' +
        '<dt>' + t('res.s4.breed') + '</dt><dd>' + data.breed + '</dd>' +
        (data.catCount === 2 ? '<dt>' + t('res.s4.secondTitle') + '</dt><dd>' + data.cat2name + '</dd>' : '') + '</dl></div>' +
        '<div class="summary-block"><h4>' + t('res.step.options') + '</h4><dl>' + optionsHtml + '</dl></div>' +
        '<div class="summary-total"><span class="label">' + t('res.s6.totalLabel') + '</span><span class="value">' + money(total) + '</span></div>' +
        (discount ? '<p style="font-size:12px;color:var(--gray);margin-top:8px;">' + t('res.s6.discountApplied') + ' ' + Math.round(discountRate * 100) + '%</p>' : '') +
        '<p style="font-size:12px;color:var(--gray);margin-top:10px;line-height:1.6;">' + t('res.s6.totalNote') + '</p>';
    }

    wizard.querySelectorAll('input[name="suite"]').forEach(function(input) { input.addEventListener('change', function() { wizard.querySelectorAll('.suite-option').forEach(function(opt) { opt.classList.remove('selected'); }); input.closest('.suite-option').classList.add('selected'); var alertBox = wizard.querySelector('#suite-error'); if (alertBox) alertBox.style.display = 'none'; }); });
    var catCount = field('catCount'); if (catCount) catCount.addEventListener('change', function() { var box = wizard.querySelector('#second-cat-section'); if (box) box.style.display = catCount.value === '2' ? 'block' : 'none'; });
    var bookletConfirm = field('bookletConfirm'); if (bookletConfirm) bookletConfirm.addEventListener('change', function() { var alertBox = wizard.querySelector('#booklet-error'); if (alertBox) alertBox.style.display = 'none'; });
    ['terms','gdpr','contract','pickupPolicy','cameraAccess','vetConsent','whatsappConsent'].forEach(function(name) { var el = field(name); if (el) el.addEventListener('change', function() { var alertBox = wizard.querySelector('#terms-error'); if (alertBox) alertBox.style.display = 'none'; }); });
    wizard.querySelectorAll('input, select, textarea').forEach(function(el) { el.addEventListener('input', function(){ if(el.name) clearError(el.name); }); el.addEventListener('change', function(){ if(el.name) clearError(el.name); }); });

    wizard.querySelectorAll('[data-action="next"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var validators = [validateStep1, validateStep2, validateStep3, validateStep4, validateStep5, collectOptions];
        if (currentStep <= 6 && !validators[currentStep - 1]()) return;
        if (currentStep === 6) buildSummary();
        showStep(currentStep + 1);
      });
    });
    wizard.querySelectorAll('[data-action="back"]').forEach(function(btn) { btn.addEventListener('click', function() { showStep(currentStep - 1); }); });
    var submitBtn = wizard.querySelector('[data-action="submit"]');
    if (submitBtn) submitBtn.addEventListener('click', function() { if (!validateStep7()) return; wizard.querySelectorAll('.wizard-step').forEach(function(s) { s.classList.remove('active'); }); wizard.querySelector('.wizard-progress').style.display = 'none'; var success = wizard.querySelector('#success-step'); if (success) success.classList.add('active'); window.scrollTo({ top: wizard.offsetTop - 80, behavior: 'smooth' }); console.log('Booking request prepared. Backend integration required for real submission.', data); });
    var checkin = field('checkin'); if (checkin) { var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); checkin.min = tomorrow.toISOString().split('T')[0]; checkin.addEventListener('change', function() { var checkout = field('checkout'); if (checkout && checkin.value) { var nextDay = new Date(checkin.value); nextDay.setDate(nextDay.getDate() + 1); checkout.min = nextDay.toISOString().split('T')[0]; if (checkout.value && new Date(checkout.value) <= new Date(checkin.value)) checkout.value = ''; } }); }
  });
})();
