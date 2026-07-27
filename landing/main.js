/* Ponderum · comportamento da landing page
   1. header: fundo navy no hero, fundo claro depois (troca a versão do logo)
   2. menu mobile
   3. revelação no scroll
   4. redline do hero: alterna texto original / sugestão de redação
   5. newsletter: grava e-mail na tabela waitlist do Supabase             */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. header ---------- */
  var hd = document.getElementById('hd');
  function onScroll() {
    hd.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- 2. menu mobile ---------- */
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  function closeDrawer() {
    drawer.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menu');
  }
  burger.addEventListener('click', function () {
    var open = drawer.hidden;
    drawer.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });
  drawer.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') closeDrawer();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !drawer.hidden) { closeDrawer(); burger.focus(); }
  });

  /* ---------- 3. revelação no scroll ---------- */
  var items = document.querySelectorAll('.rv');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 4. redline do hero ---------- */
  var switches = document.querySelectorAll('.sw');
  var clauses = {
    original: document.getElementById('clause-original'),
    sugestao: document.getElementById('clause-sugestao')
  };
  var text = document.querySelector('.doc__text');
  var gutter = document.querySelector('.doc__lines');
  var FIRST_LINE = 12;

  /* a cláusula reflui conforme a largura, então a numeração da margem é
     medida a partir do texto renderizado, nunca fixada na marcação */
  function lineHeight(el) {
    return parseFloat(getComputedStyle(el).lineHeight) || 29;
  }

  function measure() {
    if (!text || !gutter) return;
    var tallest = 0;
    Object.keys(clauses).forEach(function (key) {
      var el = clauses[key];
      var wasHidden = el.hidden;
      if (wasHidden) { el.style.visibility = 'hidden'; el.hidden = false; }
      tallest = Math.max(tallest, el.offsetHeight);
      if (wasHidden) { el.hidden = true; el.style.visibility = ''; }
    });
    text.style.minHeight = tallest + 'px';

    var active = clauses.original.hidden ? clauses.sugestao : clauses.original;
    var count = Math.max(1, Math.round(active.offsetHeight / lineHeight(active)));
    var out = '';
    for (var i = 0; i < count; i++) out += '<span>' + (FIRST_LINE + i) + '</span>';
    gutter.innerHTML = out;
  }

  function show(target) {
    Object.keys(clauses).forEach(function (key) {
      var el = clauses[key];
      if (key === target) {
        el.hidden = false;
        requestAnimationFrame(function () { el.classList.add('is-on'); });
      } else {
        el.classList.remove('is-on');
        el.hidden = true;
      }
    });
    measure();
    switches.forEach(function (btn) {
      var on = btn.dataset.target === target;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  switches.forEach(function (btn) {
    btn.addEventListener('click', function () { show(btn.dataset.target); });
  });

  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener('load', measure);
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(measure, 150);
  });

  /* ---------- 5. newsletter (grava na tabela waitlist do Supabase) ---------- */
  var SUPABASE_URL = 'https://igolxkyahbavripvfeak.supabase.co';
  var SUPABASE_ANON = 'sb_publishable_oujMak_Co0OnlJ30JeLZaw_Qnl85crO';
  var nlForm = document.getElementById('newsletter-form');
  if (nlForm) {
    nlForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('nl-email');
      var btn = nlForm.querySelector('.nl__bt');
      var email = input.value.trim();
      if (!email) return;
      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      fetch(SUPABASE_URL + '/rest/v1/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON,
          'Authorization': 'Bearer ' + SUPABASE_ANON,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ name: email, email: email, source: 'newsletter' })
      }).then(function (res) {
        if (!res.ok && res.status !== 409) throw new Error('Erro ao enviar');
        btn.textContent = 'Recebido ✓';
        input.disabled = true;
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = original;
      });
    });
  }
})();
