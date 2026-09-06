(function () {
  'use strict';
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var docEl = document.documentElement;

  /* header height var for the mobile menu */
  function setHdr() {
    var h = document.querySelector('.site-header');
    if (h) docEl.style.setProperty('--hdr-h', h.offsetHeight + 'px');
  }
  setHdr();
  window.addEventListener('resize', setHdr);

  /* header shadow on scroll + back-to-top */
  var header = document.querySelector('.site-header');
  var toTop = document.querySelector('.to-top');
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 10);
    if (toTop) toTop.classList.toggle('show', y > 560);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' }); });

  /* notice bar dismiss */
  var notice = document.querySelector('.notice-bar');
  if (notice) {
    var closed;
    try { closed = sessionStorage.getItem('vesna-notice') === 'x'; } catch (e) {}
    if (closed) notice.hidden = true;
    var btn = notice.querySelector('button');
    if (btn) btn.addEventListener('click', function () {
      notice.hidden = true;
      try { sessionStorage.setItem('vesna-notice', 'x'); } catch (e) {}
      setHdr();
    });
  }

  /* mobile nav */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* varied reveal on scroll */
  function initReveal() {
    var els = [].slice.call(document.querySelectorAll('.reveal'));
    if (!els.length) return;
    docEl.classList.add('mo');

    // tag a reveal variant by content
    els.forEach(function (el) {
      if (el.matches('img') || el.classList.contains('card__img') || el.classList.contains('feature__media') || el.classList.contains('hero__media')) el.classList.add('r-img');
      else if (el.matches('h1, h2') || el.querySelector('h1, h2')) el.classList.add('r-head');
      else if (el.classList.contains('btn')) el.classList.add('r-pop');
    });

    var vh = function () { return window.innerHeight || docEl.clientHeight || 800; };
    function show(el, quick) {
      if (el.__s) return; el.__s = 1;
      if (!quick) {
        var sib = el.parentElement ? [].slice.call(el.parentElement.children).filter(function (c) { return c.classList.contains('reveal'); }) : [];
        var i = sib.indexOf(el);
        if (i > 0) el.style.setProperty('--rd', Math.min(i, 6) * 65 + 'ms');
      }
      el.classList.add('in');
    }

    if (REDUCE || !('IntersectionObserver' in window)) { els.forEach(function (e) { show(e, true); }); return; }

    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0.02 });

    // reveal everything within ~1.6 screens on load — only far-below content animates in
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh() * 1.6 && r.bottom > -50) show(el, true);
      else io.observe(el);
    });

    // scroll sweep — reveal anything that reaches the lower part of the viewport
    var pending = els.filter(function (e) { return !e.__s; });
    function sweep() {
      var h = vh();
      pending = pending.filter(function (el) {
        if (el.__s) return false;
        var r = el.getBoundingClientRect();
        if (r.top < h * 1.15) { show(el); io.unobserve(el); return false; }
        return true;
      });
      if (!pending.length) window.removeEventListener('scroll', onSweep);
    }
    var raf;
    var onSweep = function () { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; sweep(); }); };
    window.addEventListener('scroll', onSweep, { passive: true });
    setTimeout(sweep, 300);
    setTimeout(function () { pending.forEach(function (e) { show(e, true); }); }, 2500);
  }

  /* image slider */
  function initSliders() {
    document.querySelectorAll('[data-slider]').forEach(function (s) {
      var track = s.querySelector('.slider__track');
      var slides = track.children.length;
      if (slides < 2) return;
      var dots = s.querySelectorAll('.slider__dot');
      var i = 0;
      function go(n) {
        i = (n + slides) % slides;
        track.style.transform = 'translateX(' + (-i * 100) + '%)';
        dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); });
      }
      var prev = s.querySelector('.slider__nav--prev');
      var next = s.querySelector('.slider__nav--next');
      if (prev) prev.addEventListener('click', function () { go(i - 1); });
      if (next) next.addEventListener('click', function () { go(i + 1); });
      dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); }); });
      // basic swipe
      var x0 = null;
      s.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      s.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        x0 = null;
      });
    });
  }

  /* contact form -> Formspree */
  function initForm() {
    var form = document.querySelector('form[data-formspree]');
    if (!form) return;
    var status = document.createElement('p');
    status.className = 'form__status'; status.hidden = true;
    status.setAttribute('role', 'status');
    form.appendChild(status);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      status.hidden = true;
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error();
          form.reset();
          status.textContent = 'Thank you — your message has been sent. We usually reply within a day.';
          status.classList.remove('form__status--error');
        })
        .catch(function () {
          status.textContent = 'That didn’t send. Please call 672 755 3339 or email relax@vesnaspa.ca.';
          status.classList.add('form__status--error');
        })
        .finally(function () { status.hidden = false; if (btn) { btn.disabled = false; btn.textContent = label; } });
    });
  }

  /* cookie consent -> GTM */
  function loadGTM(id) {
    if (window.__gtm) return; window.__gtm = 1;
    (function (w, d, s, l, i) {
      w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var f = d.getElementsByTagName(s)[0], j = d.createElement(s);
      j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i;
      f.parentNode.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', id);
  }
  function initConsent() {
    var id = docEl.getAttribute('data-gtm-id');
    var c;
    try { c = localStorage.getItem('vesna-consent'); } catch (e) {}
    if (c === 'accepted') { if (id) loadGTM(id); return; }
    if (c === 'declined') return;
    var bar = document.createElement('div');
    bar.className = 'cookie-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie notice');
    bar.innerHTML = '<p>We use a few cookies to see which pages people find useful. Nothing else.</p>' +
      '<div class="cookie-bar__row"><button class="decline" type="button">Decline</button>' +
      '<button class="accept" type="button">Accept</button></div>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      if (e.target.classList.contains('accept')) { try { localStorage.setItem('vesna-consent', 'accepted'); } catch (x) {} if (id) loadGTM(id); bar.remove(); }
      if (e.target.classList.contains('decline')) { try { localStorage.setItem('vesna-consent', 'declined'); } catch (x) {} bar.remove(); }
    });
  }

  function ready(fn) { document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(function () { setHdr(); initReveal(); initSliders(); initForm(); initConsent(); });
})();
