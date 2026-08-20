/* ==================================================================
   Himanshu Laddhad — portfolio behaviour + motion
   Motion system
     120ms  pointer feedback
     260ms  cards and hover
     700ms  entrances
     1200ms+ ambient
     ease: expo-out, no bounce
   Content is visible by default; motion only hides what it is about
   to animate, so a failed CDN or reduced-motion leaves the page whole.
   ================================================================== */
(function () {
  'use strict';

  var mq       = new URLSearchParams(location.search).get('motion');
  var osReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reduce   = mq === 'full' ? false : (mq === 'off' ? true : osReduce);
  var fine     = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var isMobile = matchMedia('(max-width:900px)').matches;
  var hasGSAP  = typeof window.gsap !== 'undefined';
  var EASE     = 'expo.out';

  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---- experience accordion ---- */
  document.querySelectorAll('.role').forEach(function (role) {
    var head = role.querySelector('.role-head');
    if (!head) return;
    head.addEventListener('click', function () {
      var open = role.getAttribute('data-open') === 'true';
      role.setAttribute('data-open', String(!open));
      head.setAttribute('aria-expanded', String(!open));
      if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });

  /* ---- nav ---- */
  var navEl  = document.getElementById('nav');
  var menu   = document.getElementById('navlinks');
  var scrim  = document.getElementById('scrim');
  var burger = document.getElementById('burger');
  var links  = [].slice.call(document.querySelectorAll('#navlinks a'));

  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('open', open);
    if (navEl) navEl.classList.toggle('menu-open', open);
    if (scrim) { scrim.classList.toggle('open', open); scrim.hidden = !open; }
    if (burger) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    document.body.classList.toggle('locked', open);
  }
  if (burger) burger.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
  if (scrim)  scrim.addEventListener('click', function () { setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  links.forEach(function (a) {
    a.addEventListener('click', function () { if (innerWidth <= 1080) setMenu(false); });
  });

  /* ---- scroll spy ---- */
  var spyLinks = links.filter(function (a) {
    var h = a.getAttribute('href') || '';
    return h.charAt(0) === '#' && h.length > 1;
  });
  var secs = spyLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if ('IntersectionObserver' in window && secs.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        spyLinks.forEach(function (a) {
          a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id));
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { spy.observe(s); });
  }

  var lastY = 0;
  function navChrome(y) {
    if (!navEl) return;
    navEl.classList.toggle('scrolled', y > 40);
    var open = menu && menu.classList.contains('open');
    if (y > 320 && y > lastY + 4 && !open) navEl.classList.add('nav-hidden');
    else if (y < lastY - 4 || y < 120) navEl.classList.remove('nav-hidden');
    lastY = y;
  }

  if (!hasGSAP) {
    addEventListener('scroll', function () { navChrome(scrollY); }, { passive: true });
    navChrome(scrollY);
    return;
  }

  /* ---- calm mode ----
     prefers-reduced-motion asks for less motion, not none. Keep the
     entrances as short opacity fades with no travel, and drop
     parallax, ambient drift, smooth scrolling and the custom cursor.
     ?motion=full previews the full set, ?motion=off forces calm.
  ------------------------------------------------------------------ */
  if (reduce) {
    addEventListener('scroll', function () { navChrome(scrollY); }, { passive: true });
    navChrome(scrollY);

    var CALM = [
      '.band > h2', '.role', '.pcard', '.repo', '.tl-item',
      '.sk', '.sk-key', '.cred-split > div', '.post',
      '.contact-lede', '.contact-mail', '.contact-links'
    ].join(',');

    gsap.utils.toArray(CALM).forEach(function (el) {
      gsap.set(el, { opacity: 0 });
      gsap.to(el, {
        opacity: 1, duration: 0.45, ease: 'power1.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });

    var intro = document.querySelectorAll(
      '.landing-name, .landing-links, .landing-acts, .scroll-cue,' +
      '.about-copy h1, .about-lede, .about-copy > div, .about-acts, .about-media'
    );
    gsap.set(intro, { opacity: 0 });
    gsap.to(intro, { opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power1.out' });

    setTimeout(function () {
      if (gsap.ticker.frame > 20) return;
      gsap.set(CALM + ',' + '.landing-name,.landing-links,.landing-acts,.scroll-cue,' +
        '.about-copy h1,.about-lede,.about-copy > div,.about-acts,.about-media',
        { clearProps: 'all' });
    }, 2200);
    return;
  }

  /* ---- scrolling stays native ----
     No smooth-scroll library: the wheel maps 1:1 to the page with no
     momentum or drift. Anchor jumps use the browser's own smooth
     behaviour and offset for the fixed nav.
  ------------------------------------------------------------------ */
  addEventListener('scroll', function () { navChrome(scrollY); }, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var href = a.getAttribute('href') || '';
    if (href.length < 2) return;
    a.addEventListener('click', function (e) {
      var t = document.querySelector(href);
      if (!t) return;
      e.preventDefault();
      var y = t.getBoundingClientRect().top + scrollY - 80;
      scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---- split headline words into masked spans ---- */
  document.querySelectorAll('[data-reveal="words"]').forEach(function (el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) { if (n.nodeValue.trim()) nodes.push(n); }
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (tok) {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
        var outer = document.createElement('span');
        outer.className = 'w-mask';
        var inner = document.createElement('span');
        inner.className = 'w';
        inner.textContent = tok;
        outer.appendChild(inner);
        frag.appendChild(outer);
      });
      node.parentNode.replaceChild(frag, node);
    });
  });

  /* ---- page load sequence ---- */
  var landing = document.querySelector('.landing');
  var load = gsap.timeline({ defaults: { ease: EASE } });

  if (navEl) {
    gsap.set(navEl, { y: -26, opacity: 0 });
    load.to(navEl, { y: 0, opacity: 1, duration: 0.8 }, 0.15);
  }

  if (landing) {
    var name = landing.querySelectorAll('.landing-name .w');
    gsap.set(name, { yPercent: 115 });
    gsap.set(['.landing-links', '.landing-acts', '.scroll-cue'], { opacity: 0, y: 18 });
    load.to(name, { yPercent: 0, duration: 1.0, stagger: 0.055 }, 0.2)
        .to('.landing-links', { opacity: 1, y: 0, duration: 0.7 }, 0.65)
        .to('.landing-acts',  { opacity: 1, y: 0, duration: 0.7 }, 0.75)
        .to('.scroll-cue',    { opacity: 1, y: 0, duration: 0.7 }, 0.9);
  } else {
    var aboutH = document.querySelectorAll('.about-copy h1 .w');
    if (aboutH.length) {
      gsap.set(aboutH, { yPercent: 115 });
      load.to(aboutH, { yPercent: 0, duration: 0.9, stagger: 0.05 }, 0.2);
    }
    gsap.set(['.about-lede', '.about-copy > div', '.about-acts', '.about-media'], { opacity: 0, y: 22 });
    load.to(['.about-lede', '.about-copy > div', '.about-acts'], { opacity: 1, y: 0, duration: 0.75, stagger: 0.09 }, 0.4)
        .to('.about-media', { opacity: 1, y: 0, duration: 0.9 }, 0.5);
  }

  if (landing) {
    gsap.to('.landing-name', {
      yPercent: 24, opacity: 0.3, ease: 'none',
      scrollTrigger: { trigger: landing, start: 'top top', end: 'bottom top', scrub: 0.6 }
    });
  }

  /* ---- scroll choreography: a different behaviour per section ---- */
  function ST(trigger, extra) {
    var base = { trigger: trigger, start: 'top 82%', once: true };
    if (extra) for (var k in extra) base[k] = extra[k];
    return base;
  }

  /* headings wipe upward behind a mask */
  gsap.utils.toArray('.band > h2').forEach(function (h) {
    gsap.set(h, { clipPath: 'inset(0 0 105% 0)', y: 14 });
    gsap.to(h, { clipPath: 'inset(0 0 -5% 0)', y: 0, duration: 0.9, ease: EASE,
      scrollTrigger: ST(h, { start: 'top 88%' }) });
  });

  /* experience rows arrive from the left */
  gsap.utils.toArray('.role').forEach(function (row, i) {
    gsap.set(row, { x: -34, opacity: 0 });
    gsap.to(row, { x: 0, opacity: 1, duration: 0.8, ease: EASE, delay: (i % 4) * 0.06,
      scrollTrigger: ST(row) });
  });

  /* project cards lift and settle, alternating tilt */
  gsap.utils.toArray('.pcard').forEach(function (card, i) {
    gsap.set(card, { y: 54, opacity: 0, rotate: i % 2 ? 1.4 : -1.4 });
    gsap.to(card, { y: 0, opacity: 1, rotate: 0, duration: 0.9, ease: EASE, delay: (i % 3) * 0.08,
      scrollTrigger: ST(card, { start: 'top 86%' }) });
  });

  /* repo tiles ripple in */
  var repos = gsap.utils.toArray('.repo');
  if (repos.length) {
    gsap.set(repos, { y: 20, opacity: 0 });
    gsap.to(repos, { y: 0, opacity: 1, duration: 0.55, ease: EASE, stagger: 0.035,
      scrollTrigger: ST(repos[0].parentNode) });
  }

  /* education: marker pops, then the entry steps in */
  gsap.utils.toArray('.tl-item').forEach(function (item) {
    var mark = item.querySelector('.tl-mark');
    var body = item.querySelector('.tl-body');
    var year = item.querySelector('.tl-year');
    gsap.set([year, body], { x: -26, opacity: 0 });
    gsap.set(mark, { scale: 0.4, opacity: 0 });
    gsap.timeline({ scrollTrigger: ST(item, { start: 'top 84%' }) })
      .to(mark, { scale: 1, opacity: 1, duration: 0.55, ease: EASE })
      .to([year, body], { x: 0, opacity: 1, duration: 0.75, ease: EASE, stagger: 0.06 }, 0.1);
  });

  /* skills scale up in a fast wave */
  var tiles = gsap.utils.toArray('.sk');
  if (tiles.length) {
    gsap.set(tiles, { scale: 0.82, opacity: 0 });
    gsap.to(tiles, { scale: 1, opacity: 1, duration: 0.5, ease: EASE, stagger: 0.012,
      scrollTrigger: ST(tiles[0].parentNode, { start: 'top 84%' }) });
    gsap.set('.sk-key', { opacity: 0, y: 10 });
    gsap.to('.sk-key', { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: EASE,
      scrollTrigger: ST('.sk-legend', { start: 'top 90%' }) });
  }

  /* certifications and awards meet from opposite sides */
  var certCol  = document.querySelector('.cred-split > div:first-child');
  var awardCol = document.querySelector('.cred-split > div:last-child');
  if (certCol && awardCol) {
    gsap.set(certCol,  { x: -30, opacity: 0 });
    gsap.set(awardCol, { x: 30,  opacity: 0 });
    gsap.to(certCol,  { x: 0, opacity: 1, duration: 0.85, ease: EASE, scrollTrigger: ST('.cred-split') });
    gsap.to(awardCol, { x: 0, opacity: 1, duration: 0.85, ease: EASE, delay: 0.1, scrollTrigger: ST('.cred-split') });
  }

  /* articles slide in horizontally */
  gsap.utils.toArray('.post').forEach(function (p, i) {
    gsap.set(p, { x: 40, opacity: 0 });
    gsap.to(p, { x: 0, opacity: 1, duration: 0.8, ease: EASE, delay: i * 0.1, scrollTrigger: ST(p) });
  });

  /* contact close */
  var contact = document.querySelector('.contact');
  if (contact) {
    var cWords = contact.querySelectorAll('h2 .w');
    if (cWords.length) {
      gsap.set(cWords, { yPercent: 110 });
      gsap.to(cWords, { yPercent: 0, duration: 0.85, ease: EASE, stagger: 0.05,
        scrollTrigger: ST(contact, { start: 'top 80%' }) });
    }
    gsap.set(['.contact-lede', '.contact-mail', '.contact-links'], { opacity: 0, y: 20 });
    gsap.to(['.contact-lede', '.contact-mail', '.contact-links'], {
      opacity: 1, y: 0, duration: 0.7, ease: EASE, stagger: 0.09,
      scrollTrigger: ST(contact, { start: 'top 76%' }) });
  }

  /* images drift against the scroll */
  if (!isMobile) {
    gsap.utils.toArray('.about-ph img, .pcard-art img').forEach(function (img) {
      gsap.to(img, { yPercent: -7, ease: 'none',
        scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
    });
  }

  /* ---- experience: animate the disclosure, not just the height ----
     The container height stays on grid-template-rows (cheap, no layout
     thrash). GSAP handles the sign and steps the contents in behind it
     so opening reads as a sequence rather than a jump.
  ------------------------------------------------------------------ */
  document.querySelectorAll('.role').forEach(function (role) {
    var head = role.querySelector('.role-head');
    var sign = role.querySelector('.role-sign');
    var lede = role.querySelector('.role-lede');
    var items = role.querySelectorAll('.role-inner li');
    if (!head) return;

    head.addEventListener('click', function () {
      var open = role.getAttribute('data-open') === 'true';

      if (sign) {
        gsap.to(sign, { rotate: open ? 135 : 0, duration: 0.5, ease: EASE });
        gsap.fromTo(sign, { scale: 0.82 }, { scale: 1, duration: 0.45, ease: EASE });
      }

      if (open) {
        gsap.killTweensOf([lede, items]);
        gsap.fromTo([lede, items],
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55, ease: EASE, stagger: 0.055, delay: 0.12, overwrite: true });
      } else {
        gsap.to([lede, items], { opacity: 0, duration: 0.16, overwrite: true });
      }
    });

    head.addEventListener('mouseenter', function () {
      if (sign) gsap.to(sign, { scale: 1.12, duration: 0.22, ease: EASE });
    });
    head.addEventListener('mouseleave', function () {
      if (sign) gsap.to(sign, { scale: 1, duration: 0.28, ease: EASE });
    });
  });

  /* ---- project cards: drive the flip, lift and settle -------------
     GSAP owns rotationY so the turn can carry a lift and a deepening
     shadow. Inline transforms beat the stylesheet, and the CSS hover
     flip stays as the no-script fallback.
  ------------------------------------------------------------------ */
  if (!isMobile) {
    document.documentElement.classList.add('gsap-flip');

    gsap.utils.toArray('.pcard').forEach(function (card) {
      var inner = card.querySelector('.pcard-3d');
      if (!inner) return;

      var spin = gsap.quickTo(inner, 'rotationY', { duration: 0.78, ease: 'power3.out' });

      function turn(face) {
        spin(face ? -180 : 0);
        gsap.to(card, {
          y: face ? -10 : 0,
          scale: face ? 1.015 : 1,
          duration: face ? 0.42 : 0.5,
          ease: EASE
        });
      }

      card.addEventListener('mouseenter', function () { turn(true); });
      card.addEventListener('mouseleave', function () { turn(false); });
      card.addEventListener('focus', function () { turn(true); });
      card.addEventListener('blur',  function () { turn(false); });
    });
  }

  /* ---- custom cursor + magnetic CTAs (fine pointers only) ---- */
  if (fine && !isMobile) {
    document.documentElement.classList.add('has-cursor');

    var layer = document.createElement('div');
    layer.className = 'cursor-layer';
    layer.setAttribute('aria-hidden', 'true');
    var ring = document.createElement('div');
    ring.className = 'cursor';
    ring.innerHTML = '<span class="cursor-label">VIEW</span>';
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    layer.appendChild(ring);
    layer.appendChild(dot);
    document.body.appendChild(layer);

    var rx = gsap.quickTo(ring, 'x', { duration: 0.42, ease: 'power3' });
    var ry = gsap.quickTo(ring, 'y', { duration: 0.42, ease: 'power3' });
    var dx = gsap.quickTo(dot,  'x', { duration: 0.1,  ease: 'power3' });
    var dy = gsap.quickTo(dot,  'y', { duration: 0.1,  ease: 'power3' });
    var shown = false;

    addEventListener('mousemove', function (e) {
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
      if (!shown) { gsap.to([ring, dot], { opacity: 1, duration: 0.3 }); shown = true; }
    }, { passive: true });
    addEventListener('mouseout', function (e) {
      if (e.relatedTarget) return;
      gsap.to([ring, dot], { opacity: 0, duration: 0.2 }); shown = false;
    });
    addEventListener('mousedown', function () { gsap.to(ring, { scale: '-=0.2', duration: 0.12 }); });
    addEventListener('mouseup',   function () { gsap.to(ring, { scale: '+=0.2', duration: 0.12 }); });

    var rs = gsap.quickTo(ring, 'scale', { duration: 0.3, ease: 'power3' });
    document.querySelectorAll('a, button, .pcard').forEach(function (el) {
      var isCard = el.classList.contains('pcard');
      el.addEventListener('mouseenter', function () {
        ring.classList.add(isCard ? 'is-view' : 'is-link');
        rs(isCard ? 2.05 : 1.5);
      });
      el.addEventListener('mouseleave', function () {
        ring.classList.remove('is-view', 'is-link');
        rs(1);
      });
    });

    document.querySelectorAll('.btn-solid, .nav-cv').forEach(function (btn) {
      var mx = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' });
      var my = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' });
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.28);
        my((e.clientY - (r.top + r.height / 2)) * 0.34);
      });
      btn.addEventListener('mouseleave', function () { mx(0); my(0); });
    });
  }

  /* ---- watchdog ----
     Every entrance starts from a hidden state, so if the ticker never
     advances (stalled rAF, a partially applied library, a tab that is
     not painting) the page would stay blank. If almost no frames have
     run by the time the entrances should be finished, drop every
     inline transform and show the page exactly as authored.
  ------------------------------------------------------------------ */
  var ANIMATED = [
    '.landing-links', '.landing-acts', '.scroll-cue',
    '.about-lede', '.about-copy > div', '.about-acts', '.about-media',
    '.band > h2', '.role', '.pcard', '.repo', '.tl-mark', '.tl-body',
    '.tl-year', '.sk', '.sk-key', '.cred-split > div', '.post',
    '.contact-lede', '.contact-mail', '.contact-links', '.w'
  ].join(',');

  setTimeout(function () {
    if (gsap.ticker.frame > 20) return;
    gsap.set(ANIMATED, { clearProps: 'all' });
    if (navEl) gsap.set(navEl, { clearProps: 'all' });
  }, 2600);

  addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
