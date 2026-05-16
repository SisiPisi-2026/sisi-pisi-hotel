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

    // Set max date on date inputs to today (no future dates allowed)
    (function() {
      var todayStr = new Date().toISOString().slice(0, 10);
      ['birth', 'cat2birth', 'rabies', 'fvrcp', 'deworm'].forEach(function(n) {
        var el = wizard.querySelector('[name="' + n + '"]');
        if (el) el.setAttribute('max', todayStr);
      });
    })();

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
      if (data.birth) { var bd = new Date(data.birth); bd.setHours(0,0,0,0); var today = new Date(); today.setHours(0,0,0,0); if (bd > today) ok = showError('birth', 'res.err.futureDate') && ok; }
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
      add('optPlay', 'res.opt.play', 50, true);
      add('optMedsSimple', 'res.opt.medsSimple', 25, true);
      add('optMedsExtended', 'res.opt.medsExtended', 35, true);
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

/* =========================================================
   CUSTOM INPUT WIDGETS v1.5
   Breed combobox · Behavior & Food-brand tag inputs
   Vanilla JS, fără librării externe.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- utilitare comune ---------- */
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function highlight(text, query) {
    if (!query) return escHtml(text);
    var i = text.toLowerCase().indexOf(query.toLowerCase());
    if (i === -1) return escHtml(text);
    return (
      escHtml(text.slice(0, i)) +
      '<mark class="ac-mark">' + escHtml(text.slice(i, i + query.length)) + '</mark>' +
      escHtml(text.slice(i + query.length))
    );
  }

  /* =========================================================
     BREED COMBOBOX
     - Dropdown cu highlight pe literele tastate
     - Navigare: ArrowUp/Down, Enter, Escape
     ========================================================= */
  function initBreedCombobox(wizard) {
    var BREEDS = [
      'Abyssinian', 'American Bobtail', 'American Curl', 'American Shorthair',
      'Balinese', 'Bengal', 'Birman', 'Bombay',
      'British Longhair', 'British Shorthair',
      'Burmese', 'Burmilla',
      'Chartreux', 'Chausie', 'Cornish Rex',
      'Devon Rex', 'Domestic Longhair', 'Domestic Shorthair',
      'Egyptian Mau', 'Europeană', 'Exotic Shorthair',
      'Havana Brown', 'Himalayan',
      'Japanese Bobtail', 'Khao Manee', 'Korat',
      'LaPerm', 'Lykoi',
      'Maine Coon', 'Manx', 'Munchkin',
      'Nebelung', 'Norwegian Forest Cat',
      'Ocicat', 'Oriental Shorthair',
      'Persian', 'Peterbald', 'Pixiebob',
      'Ragamuffin', 'Ragdoll', 'Russian Blue',
      'Savannah', 'Scottish Fold', 'Scottish Straight',
      'Selkirk Rex', 'Siamese', 'Siberian',
      'Singapura', 'Snowshoe', 'Somali', 'Sphynx',
      'Thai', 'Tonkinese',
      'Turkish Angora', 'Turkish Van',
      'York Chocolate'
    ];

    var input = wizard.querySelector('input[name="breed"]');
    if (!input) return;

    /* wrap */
    var wrap = document.createElement('div');
    wrap.className = 'ac-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    /* dropdown */
    var dropdown = document.createElement('ul');
    dropdown.className = 'ac-dropdown';
    dropdown.setAttribute('role', 'listbox');
    dropdown.setAttribute('aria-label', 'Rase disponibile');
    wrap.appendChild(dropdown);

    var activeIdx = -1;

    function openList(query) {
      var q = (query || '').trim().toLowerCase();
      var matches = BREEDS.filter(function (b) {
        return !q || b.toLowerCase().indexOf(q) !== -1;
      });
      dropdown.innerHTML = '';
      activeIdx = -1;
      if (!matches.length) { dropdown.classList.remove('open'); return; }
      matches.forEach(function (breed) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.innerHTML = highlight(breed, q);
        li.dataset.value = breed;
        li.addEventListener('mousedown', function (e) {
          e.preventDefault();
          commit(breed);
        });
        dropdown.appendChild(li);
      });
      dropdown.classList.add('open');
    }

    function commit(value) {
      input.value = value;
      dropdown.classList.remove('open');
      activeIdx = -1;
      input.dispatchEvent(new Event('change'));
    }

    function moveActive(dir) {
      var items = dropdown.querySelectorAll('li');
      if (!items.length) return;
      activeIdx = Math.max(0, Math.min(items.length - 1, activeIdx + dir));
      items.forEach(function (li, i) {
        li.classList.toggle('active', i === activeIdx);
        if (i === activeIdx) li.scrollIntoView({ block: 'nearest' });
      });
    }

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'list');

    input.addEventListener('input',  function () { openList(input.value); input.setAttribute('aria-expanded', 'true'); });
    input.addEventListener('focus',  function () { openList(input.value); });
    input.addEventListener('blur',   function () {
      setTimeout(function () {
        dropdown.classList.remove('open');
        activeIdx = -1;
        input.setAttribute('aria-expanded', 'false');
      }, 160);
    });
    input.addEventListener('keydown', function (e) {
      if (!dropdown.classList.contains('open')) return;
      var items = dropdown.querySelectorAll('li');
      if (e.key === 'ArrowDown')  { e.preventDefault(); moveActive(1); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); moveActive(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIdx >= 0 && items[activeIdx]) { commit(items[activeIdx].dataset.value); }
        else if (items.length === 1)             { commit(items[0].dataset.value); }
      }
      else if (e.key === 'Escape') {
        dropdown.classList.remove('open');
        activeIdx = -1;
        input.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* =========================================================
     TAG INPUT (multi-select cu chips)
     - Click sau Enter adaugă tag
     - × sau Backspace pe câmp gol elimină ultimul tag
     - cfg: { name, placeholder, options[] }
     ========================================================= */
  function initTagInput(wizard, cfg) {
    var hidden = wizard.querySelector('input[name="' + cfg.name + '"]');
    if (!hidden) return;

    /* transformăm input-ul original în câmp hidden —
       rămâne în .form-field pentru ca showError() să funcționeze */
    hidden.type = 'hidden';

    /* ---- construim widget-ul ---- */
    var widget   = document.createElement('div');
    widget.className = 'tag-input-wrap';

    var tagsRow  = document.createElement('div');
    tagsRow.className = 'tag-input-tags';
    tagsRow.setAttribute('role', 'group');

    var textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'tag-input-text';
    textInput.placeholder = cfg.placeholder || 'Caută sau alege...';
    textInput.setAttribute('autocomplete', 'off');
    textInput.setAttribute('aria-label', cfg.ariaLabel || cfg.name);

    var dropdown = document.createElement('ul');
    dropdown.className = 'tag-dropdown';
    dropdown.setAttribute('role', 'listbox');

    tagsRow.appendChild(textInput);
    widget.appendChild(tagsRow);
    widget.appendChild(dropdown);

    /* inserăm widget-ul ÎNAINTE de hidden input (hidden rămâne în .form-field) */
    hidden.parentNode.insertBefore(widget, hidden);

    /* legăm label-ul de noul text input */
    var label = hidden.parentNode.querySelector('label');
    if (label) {
      var tid = 'tag-text-' + cfg.name;
      textInput.id = tid;
      label.setAttribute('for', tid);
    }

    /* ---- stare ---- */
    var selected = [];
    var activeIdx = -1;

    /* ---- sincronizare cu câmpul hidden + curățare erori ---- */
    function syncHidden() {
      hidden.value = selected.join(', ');
      hidden.classList.remove('error');
      var formField = widget.parentNode;
      var errEl = formField && formField.querySelector('.error-msg');
      if (errEl) errEl.classList.remove('show');
      hidden.dispatchEvent(new Event('change'));
    }

    /* ---- tag management ---- */
    function addTag(val) {
      val = (val || '').trim();
      if (!val || selected.indexOf(val) !== -1) return;
      selected.push(val);
      renderTags();
      syncHidden();
      textInput.value = '';
      renderDropdown('');
    }

    function removeTag(val) {
      selected = selected.filter(function (t) { return t !== val; });
      renderTags();
      syncHidden();
    }

    function renderTags() {
      widget.querySelectorAll('.tag-chip').forEach(function (c) { c.remove(); });
      selected.forEach(function (tag) {
        var chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.setAttribute('aria-label', tag);

        var lbl = document.createElement('span');
        lbl.textContent = tag;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tag-remove';
        btn.setAttribute('aria-label', 'Elimină ' + tag);
        btn.innerHTML = '&times;';
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          removeTag(tag);
          textInput.focus();
        });

        chip.appendChild(lbl);
        chip.appendChild(btn);
        tagsRow.insertBefore(chip, textInput);
      });
    }

    /* ---- dropdown ---- */
    function renderDropdown(query) {
      var q = (query || '').trim().toLowerCase();
      var avail = cfg.options.filter(function (o) {
        return selected.indexOf(o) === -1;
      });
      var matches = q
        ? avail.filter(function (o) { return o.toLowerCase().indexOf(q) !== -1; })
        : avail;

      dropdown.innerHTML = '';
      activeIdx = -1;

      if (!matches.length) { dropdown.classList.remove('open'); return; }

      matches.forEach(function (opt) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.innerHTML = highlight(opt, q);
        li.dataset.value = opt;
        li.addEventListener('mousedown', function (e) {
          e.preventDefault();
          addTag(opt);
          textInput.focus();
        });
        dropdown.appendChild(li);
      });
      dropdown.classList.add('open');
    }

    function moveActive(dir) {
      var items = dropdown.querySelectorAll('li');
      if (!items.length) return;
      activeIdx = Math.max(0, Math.min(items.length - 1, activeIdx + dir));
      items.forEach(function (li, i) {
        li.classList.toggle('active', i === activeIdx);
        if (i === activeIdx) li.scrollIntoView({ block: 'nearest' });
      });
    }

    /* ---- event listeners ---- */
    textInput.addEventListener('focus', function () { renderDropdown(textInput.value); });
    textInput.addEventListener('input', function () { renderDropdown(textInput.value); });
    textInput.addEventListener('blur',  function () {
      setTimeout(function () {
        if (!widget.contains(document.activeElement)) {
          dropdown.classList.remove('open');
          activeIdx = -1;
        }
      }, 160);
    });
    textInput.addEventListener('keydown', function (e) {
      var items = dropdown.querySelectorAll('li');
      if (e.key === 'ArrowDown')  { e.preventDefault(); moveActive(1); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); moveActive(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIdx >= 0 && items[activeIdx]) {
          addTag(items[activeIdx].dataset.value);
        } else if (items.length > 0 && textInput.value.trim()) {
          addTag(items[0].dataset.value);
        }
      }
      else if (e.key === 'Escape') {
        dropdown.classList.remove('open');
        activeIdx = -1;
      }
      else if (e.key === 'Backspace' && !textInput.value && selected.length) {
        removeTag(selected[selected.length - 1]);
      }
    });

    /* click pe zona de tag-uri → focus pe câmpul de text */
    tagsRow.addEventListener('click', function (e) {
      if (e.target === tagsRow) textInput.focus();
    });
  }

  /* =========================================================
     INIȚIALIZARE
     ========================================================= */
  document.addEventListener('DOMContentLoaded', function () {
    var wizard = document.querySelector('.wizard');
    if (!wizard) return;

    initBreedCombobox(wizard);

    initTagInput(wizard, {
      name: 'behavior',
      placeholder: 'Caută sau alege...',
      ariaLabel: 'Comportament pisică',
      options: [
        'Timidă', 'Sociabilă', 'Anxioasă', 'Jucăușă', 'Calmă', 'Vocală',
        'Independentă', 'Afectuoasă', 'Fricoasă în medii noi',
        'Se adaptează ușor', 'Tolerantă la manipulare', 'Sensibilă la zgomot'
      ]
    });

    initTagInput(wizard, {
      name: 'foodBrand',
      placeholder: 'Caută marcă...',
      ariaLabel: 'Marcă hrană',
      options: [
        'Royal Canin', 'Purina One', "Hill's Science Plan", 'Orijen', 'Acana',
        'Farmina N&D', 'Brit Care', 'Happy Cat', 'Josera', 'Animonda',
        'Felix', 'Whiskas', 'Schesir', 'Almo Nature', 'Ziwi Peak',
        "Lily's Kitchen", 'Edgard & Cooper', 'Instinct', 'Merrick',
        'Purina Pro Plan', 'Sheba', 'Applaws', 'Bozita', 'Iams'
      ]
    });
  });

})();
