/* ==========================================================================
   Asociația Arțarului - main.js
   S1: intro animat cu logo (GSAP) + meniu mobil.
   Intro-ul rulează O dată per sesiune de browsing (sessionStorage),
   se poate sări (click / Esc / buton) și respectă prefers-reduced-motion.
   ========================================================================== */

(function () {
  'use strict';

  var INTRO_KEY = 'aa-intro-v2';

  /* ---------- Meniu mobil (S7): overlay full-screen #mobile-menu ---------- */
  var toggle = document.getElementById('nav-toggle');
  var menu = document.getElementById('mobile-menu');

  if (toggle && menu) {
    var brandLink = document.querySelector('.nav .brand');
    var inertTargets = [];
    var mainEl = document.querySelector('main');
    var footEl = document.querySelector('footer');
    if (mainEl) inertTargets.push(mainEl);
    if (footEl) inertTargets.push(footEl);

    function isOpen() { return menu.classList.contains('is-open'); }

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Închide meniul' : 'Deschide meniul');
      menu.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      /* conținutul din spate iese din tab-order și din accessibility tree */
      for (var i = 0; i < inertTargets.length; i++) {
        try { inertTargets[i].inert = open; } catch (e) {}
      }
    }

    toggle.addEventListener('click', function () { setOpen(!isOpen()); });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;

      if (e.key === 'Escape') {
        setOpen(false);
        toggle.focus();
        return;
      }

      /* focus-trap: brand → X → linkurile overlay-ului, circular */
      if (e.key === 'Tab') {
        var items = [brandLink, toggle].concat(
          Array.prototype.slice.call(menu.querySelectorAll('a[href]'))
        ).filter(Boolean);
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    /* dacă viewportul trece de breakpoint cu meniul deschis, îl închidem */
    var mq = window.matchMedia('(min-width: 901px)');
    function onMq(ev) { if (ev.matches && isOpen()) setOpen(false); }
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  /* ---------- Intro ---------- */
  var intro = document.getElementById('intro');
  if (!intro) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false;
  try { seen = !!sessionStorage.getItem(INTRO_KEY); } catch (e) {}

  // Fără GSAP, cu reduced-motion sau deja văzut: pagina rămâne statică, completă.
  if (!window.gsap || reduced || seen || document.documentElement.classList.contains('no-intro')) {
    intro.remove();
    return;
  }

  try { sessionStorage.setItem(INTRO_KEY, '1'); } catch (e) {}

  /* Logo-ul real rămâne o singură imagine. Măștile SVG dezvăluie regiunile
     separat, fără să redeseneze sau să deformeze identitatea originală. */
  var mark = document.getElementById('intro-mark');
  if (!mark) {
    intro.remove();
    return;
  }

  var ring = mark.querySelector('#im-ring');
  var letter = mark.querySelector('#im-letter');
  var leaves = mark.querySelectorAll('.im-leaf');
  var vine = mark.querySelector('#im-vine');
  var dots = mark.querySelectorAll('#im-dots circle');
  var wordmark = mark.querySelector('#im-wordmark');
  var skipBtn = document.getElementById('intro-skip');
  var nav = document.getElementById('nav');
  var navMark = nav ? nav.querySelector('.brand-mark') : null;
  var heroEls = gsap.utils.toArray('[data-hero-reveal]');
  var navEls = [nav, navMark].filter(Boolean);

  var done = false;
  var tl = null;
  var dockBox = null;

  /* Stări inițiale (doar pe ramura cu intro - CSS-ul implicit lasă totul vizibil) */
  gsap.set(nav, { autoAlpha: 0 });
  if (navMark) gsap.set(navMark, { autoAlpha: 0 });
  gsap.set(heroEls, { autoAlpha: 0, y: 28 });
  /* cercul se „desenează": dasharray pe pathLength=1 */
  gsap.set(ring, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(letter, { autoAlpha: 0, y: 24 });
  /* frunzele înfloresc din pețiol (originea = baza fiecărei frunze, în
     coordonatele viewBox-ului 0-1000) */
  gsap.set(mark.querySelector('#im-leaf-sage'),  { scale: 0.35, rotation: -4, autoAlpha: 0, svgOrigin: '468 442' });
  gsap.set(mark.querySelector('#im-leaf-rose'),  { scale: 0.35, rotation: 5, autoAlpha: 0, svgOrigin: '452 560' });
  gsap.set(mark.querySelector('#im-leaf-olive'), { scale: 0.35, rotation: -3, autoAlpha: 0, svgOrigin: '470 600' });
  /* vrejul curge de sus în jos */
  gsap.set(vine, { scaleY: 0, autoAlpha: 0, svgOrigin: '500 575' });
  gsap.set(dots, { scale: 0, autoAlpha: 0, transformOrigin: '50% 50%' });
  gsap.set(wordmark, { scaleX: 0, autoAlpha: 0, svgOrigin: '500 902' });

  function cleanup() {
    document.removeEventListener('keydown', onIntroKey);
    if (intro.isConnected) intro.remove();
    gsap.set(navEls, { clearProps: 'all' });
    gsap.set(heroEls, { clearProps: 'all' });
  }

  function skip() {
    if (done) return;
    done = true;
    if (tl) tl.kill();
    gsap.killTweensOf([intro, mark, skipBtn].concat(navEls, heroEls));
    gsap.set(navEls, { clearProps: 'all' });
    gsap.to(intro, {
      autoAlpha: 0,
      duration: 0.35,
      ease: 'power2.out',
      onComplete: cleanup
    });
    gsap.to(heroEls, {
      autoAlpha: 1, y: 0,
      duration: 0.65, stagger: 0.07, ease: 'power3.out',
      onComplete: function () { gsap.set(heroEls, { clearProps: 'all' }); }
    });
  }

  skipBtn.addEventListener('click', function (e) { e.stopPropagation(); skip(); });
  intro.addEventListener('pointerdown', function (e) {
    if (e.target !== skipBtn) skip();
  });
  function onIntroKey(e) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip();
  }
  document.addEventListener('keydown', onIntroKey);

  function measureDock() {
    if (!navMark) return null;
    var from = mark.getBoundingClientRect();
    var to = navMark.getBoundingClientRect();
    if (!from.width || !to.width) return null;
    return {
      x: to.left - from.left,
      y: to.top - from.top,
      scale: to.width / from.width
    };
  }

  function play() {
    if (done) return;

    tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete: function () { done = true; cleanup(); }
    });
    /* 1. Orbită → monogramă → frunze → vrej → puncte. */
    tl.to(ring, { strokeDashoffset: 0, duration: 0.85, ease: 'power2.inOut' })
      .to(letter, { autoAlpha: 1, y: 0, duration: 0.65, ease: 'power3.out' }, '-=0.52')
      .to(leaves, {
        scale: 1, rotation: 0, autoAlpha: 1,
        duration: 0.55, stagger: 0.12, ease: 'power3.out'
      }, '-=0.42')
      .to(vine, { scaleY: 1, autoAlpha: 1, duration: 0.55, ease: 'power1.inOut' }, '-=0.35')
      .to(dots, { scale: 1, autoAlpha: 1, duration: 0.24, stagger: 0.06, ease: 'power2.out' }, '-=0.45')

    /* 2. Wordmark original, complet; revelație centru → margini. */
      .to(wordmark, { scaleX: 1, autoAlpha: 1, duration: 0.5, ease: 'power3.inOut' }, '-=0.08')

    /* 3. Respiro */
      .to({}, { duration: 0.65 })

    /* 4. Dock: măsurare la momentul zborului, după orice resize/orientare. */
      .addLabel('dock')
      .add(function () { dockBox = measureDock(); }, 'dock')
      .to(skipBtn, { autoAlpha: 0, duration: 0.2 }, 'dock')
      .to(mark, {
        x: function () { return dockBox ? dockBox.x : 0; },
        y: function () { return dockBox ? dockBox.y : 0; },
        scale: function () { return dockBox ? dockBox.scale : 0.12; },
        transformOrigin: '0 0',
        duration: 0.78,
        ease: 'power3.inOut'
      }, 'dock+=0.01')
      .to(intro, { backgroundColor: 'rgba(247, 239, 232, 0)', duration: 0.52 }, 'dock+=0.16')
      .to(nav, { autoAlpha: 1, duration: 0.38 }, 'dock+=0.30')
      .to(heroEls, {
        autoAlpha: 1, y: 0,
        duration: 0.7, stagger: 0.09, ease: 'power3.out'
      }, 'dock+=0.28')
      .set(navMark, { autoAlpha: 1 }, 'dock+=0.74')
      .to(mark, { autoAlpha: 0, duration: 0.14 }, 'dock+=0.74')
      .to(intro, { autoAlpha: 0, duration: 0.18 }, 'dock+=0.84');
  }

  /* Asset-ul logo este preîncărcat; load + timeout acoperă cache rece și erori. */
  var started = false;
  function start() {
    if (started) return;
    started = true;
    play();
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
  setTimeout(start, 900);
})();

/* ==========================================================================
   S2 - navbar „stuck" pe scroll + scroll-reveal pentru secțiuni.
   Ambele folosesc IntersectionObserver (fără scroll listener).
   Fail-safe: fără JS sau fără IO, tot conținutul rămâne vizibil.
   ========================================================================== */
(function () {
  'use strict';

  var supportsIO = 'IntersectionObserver' in window;

  /* ---------- Navbar: fundal + umbră după ce santinela din vârf iese ---------- */
  var nav = document.getElementById('nav');
  var sentinel = document.getElementById('top-sentinel');
  if (nav && sentinel && supportsIO) {
    new IntersectionObserver(function (entries) {
      nav.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }, { rootMargin: '-90px 0px 0px 0px', threshold: 0 }).observe(sentinel);
  }

  /* ---------- Scroll-reveal ---------- */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = document.querySelectorAll('[data-reveal]');
  if (reduced || !supportsIO || !els.length) return; /* rămân vizibile implicit */

  /* Sub-fold: adăugarea clasei nu produce flash vizibil (elementele sunt sub hero). */
  document.documentElement.classList.add('js-anim');

  var io = new IntersectionObserver(function (entries, obs) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        entries[i].target.classList.add('is-in');
        obs.unobserve(entries[i].target);
      }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

  els.forEach(function (el) { io.observe(el); });
})();

/* ==========================================================================
   S5 - formular de contact: validare client + trimitere asincronă (fetch).
   Progressive enhancement: fără JS, formularul face POST normal către
   contact.php, care redirecționează la #mesaj-trimis / #mesaj-eroare
   (afișate cu :target). Cu JS, rămânem pe pagină și dăm feedback inline.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form || !window.fetch) return;

  var noteOk  = document.getElementById('mesaj-trimis');
  var noteErr = document.getElementById('mesaj-eroare');
  var submit  = form.querySelector('.form-submit');

  var campTs = document.getElementById('form-ts');
  if (campTs) campTs.value = String(Date.now());

  var reguli = {
    serviciu:    function (v) { return v ? '' : 'Alege serviciul dorit.'; },
    tipEntitate: function (v) { return v ? '' : 'Alege tipul entității.'; },
    localitate:  function (v) { return v.trim().length >= 2 ? '' : 'Adaugă localitatea.'; },
    nume:        function (v) { return v.trim().length >= 2 ? '' : 'Te rugăm să îți scrii numele.'; },
    telefon:     function (v) { return /^[0-9+()\s.-]{6,}$/.test(v.trim()) ? '' : 'Adaugă un număr de telefon valid.'; },
    email:       function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Adresa de email nu pare validă.'; },
    mesaj:       function (v) { return v.trim().length >= 10 ? '' : 'Scrie-ne câteva detalii (minim 10 caractere).'; }
  };

  function eroareCamp(nume, mesaj) {
    var input = form.elements[nume];
    var slot = form.querySelector('[data-error-for="' + nume + '"]');
    if (!input) return;
    if (mesaj) {
      input.setAttribute('aria-invalid', 'true');
      if (slot) slot.textContent = mesaj;
    } else {
      input.removeAttribute('aria-invalid');
      if (slot) slot.textContent = '';
    }
  }

  function ascundeNote() {
    if (noteOk) noteOk.classList.remove('is-shown');
    if (noteErr) noteErr.classList.remove('is-shown');
  }

  function arata(note) {
    if (!note) return;
    note.classList.add('is-shown');
    note.focus();
    note.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* Curăță eroarea unui câmp când userul îl corectează. */
  Object.keys(reguli).forEach(function (nume) {
    var input = form.elements[nume];
    if (input) {
      input.addEventListener('input', function () {
        if (input.getAttribute('aria-invalid') === 'true') eroareCamp(nume, '');
      });
    }
  });

  function valideaza() {
    var primulInvalid = null;

    Object.keys(reguli).forEach(function (nume) {
      var input = form.elements[nume];
      if (!input) return;                 // câmp absent în varianta curentă a formularului
      var mesaj = reguli[nume](input.value);
      eroareCamp(nume, mesaj);
      if (mesaj && !primulInvalid) primulInvalid = input;
    });

    var bifa = form.elements.consimtamant;
    if (bifa) {
      var mesajBifa = bifa.checked ? '' : 'Bifează acordul pentru a putea trimite.';
      eroareCamp('consimtamant', mesajBifa);
      if (mesajBifa && !primulInvalid) primulInvalid = bifa;
    }

    if (primulInvalid) primulInvalid.focus();
    return !primulInvalid;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    ascundeNote();
    if (!valideaza()) return;

    submit.setAttribute('aria-busy', 'true');
    var labelEl = submit.querySelector('.form-submit-label');
    var labelText = labelEl ? labelEl.textContent : '';
    if (labelEl) labelEl.textContent = 'Se trimite...';

    fetch(form.action, {
      method: 'POST',
      body: new URLSearchParams(new FormData(form)),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'X-Requested-With': 'fetch',
        'Accept': 'application/json'
      }
    })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
      .then(function (res) {
        if (res.data && res.data.ok) {
          form.reset();
          if (window.turnstile) window.turnstile.reset();
          arata(noteOk);
        } else {
          var erori = (res.data && res.data.erori) || {};
          var primul = null;
          Object.keys(erori).forEach(function (nume) {
            if (nume === 'general') return;
            eroareCamp(nume, erori[nume]);
            if (!primul) primul = form.elements[nume];
          });
          if (primul) primul.focus(); else arata(noteErr);
          if (erori.general) arata(noteErr);
        }
      })
      .catch(function () { arata(noteErr); })
      .finally(function () {
        submit.removeAttribute('aria-busy');
        if (labelEl) labelEl.textContent = labelText;
      });
  });
})();

/* ==========================================================================
   S6 - „Site viu": fundal ambiental reactiv la cursor + petale plutitoare.
   Un singur canvas fixat sub conținut (z-index -1). Totul în paleta exactă
   de brand, la opacități mici. Fără librării; rAF se oprește când tab-ul
   e ascuns și nu pornește deloc cu prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !window.requestAnimationFrame) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'aa-bg';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  var ctx = canvas.getContext('2d');

  var DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  var W = 0, H = 0;
  var small = false;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    small = W < 720;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  /* Paleta exactă de brand, doar la opacități ambientale */
  var TINTS = [
    [210, 164, 162],  /* dusty rose  #D2A4A2 */
    [156, 175, 136],  /* sage        #9CAF88 */
    [247, 231, 206],  /* champagne   #F7E7CE */
    [112, 130, 56]    /* olive       #708238 */
  ];

  /* Aureole moi care respiră și se feresc discret de cursor */
  var blobs = [];
  var NB = small ? 6 : 10;
  for (var i = 0; i < NB; i++) {
    var t = TINTS[i % TINTS.length];
    blobs.push({
      bx: Math.random(), by: Math.random(),
      r: (small ? 120 : 170) + Math.random() * (small ? 130 : 240),
      a: 0.035 + Math.random() * 0.05,
      c: t,
      ph: Math.random() * Math.PI * 2,
      sp: 0.00006 + Math.random() * 0.00008,
      amp: 40 + Math.random() * 90,
      depth: 0.25 + Math.random() * 0.75,
      ox: 0, oy: 0
    });
  }

  /* Petale: frunza roz reală din logo, în miniatură, plutind în derivă */
  var petalImg = new Image();
  petalImg.src = 'assets/img/leaf-rose-480.webp';
  var petals = [];
  var NP = small ? 4 : 7;
  function resetPetal(p, first) {
    p.x = Math.random() * W;
    p.y = first ? Math.random() * H : -40;
    p.s = 14 + Math.random() * 14;            /* lățime în px */
    p.vy = 0.12 + Math.random() * 0.2;
    p.drift = 0.5 + Math.random() * 0.9;
    p.ph = Math.random() * Math.PI * 2;
    p.rot = Math.random() * Math.PI * 2;
    p.vr = (Math.random() - 0.5) * 0.004;
    p.a = 0.22 + Math.random() * 0.2;
  }
  for (var j = 0; j < NP; j++) { var p = { }; resetPetal(p, true); petals.push(p); }

  /* Cursorul, urmărit cu inerție (lerp) - pe touch rămâne în centru */
  var mx = W / 2, my = H / 2, tx = mx, ty = my;
  var fine = window.matchMedia('(pointer: fine)').matches;
  if (fine) {
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
    }, { passive: true });
  }

  var running = true;
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  });

  var last = 0;
  function frame(now) {
    if (!running) return;
    if (now - last < 1000 / 45) { requestAnimationFrame(frame); return; } /* plafon 45fps: ambient, nu joc */
    last = now;

    mx += (tx - mx) * 0.06;
    my += (ty - my) * 0.06;

    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      var x = b.bx * W + Math.cos(now * b.sp + b.ph) * b.amp;
      var y = b.by * H + Math.sin(now * b.sp * 1.3 + b.ph) * b.amp;
      /* parallax discret față de centrul viewport-ului, pe adâncime */
      x += (mx - W / 2) * 0.03 * b.depth;
      y += (my - H / 2) * 0.03 * b.depth;
      /* aureolele foarte apropiate de cursor se retrag ușor */
      var dx = x - mx, dy = y - my;
      var d2 = dx * dx + dy * dy;
      var rr = b.r * 0.9;
      if (d2 < rr * rr && d2 > 0.01) {
        var d = Math.sqrt(d2);
        var push = (rr - d) / rr * 26 * b.depth;
        b.ox += ((dx / d) * push - b.ox) * 0.04;
        b.oy += ((dy / d) * push - b.oy) * 0.04;
      } else {
        b.ox *= 0.96; b.oy *= 0.96;
      }
      x += b.ox; y += b.oy;

      var g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
      g.addColorStop(0, 'rgba(' + b.c[0] + ',' + b.c[1] + ',' + b.c[2] + ',' + b.a + ')');
      g.addColorStop(1, 'rgba(' + b.c[0] + ',' + b.c[1] + ',' + b.c[2] + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, 6.2832);
      ctx.fill();
    }

    if (petalImg.complete && petalImg.naturalWidth) {
      var ar = petalImg.naturalHeight / petalImg.naturalWidth;
      for (var k = 0; k < petals.length; k++) {
        var pt = petals[k];
        pt.y += pt.vy;
        pt.x += Math.sin(now * 0.0004 + pt.ph) * pt.drift * 0.4;
        pt.rot += pt.vr;
        if (pt.y > H + 60) resetPetal(pt, false);
        ctx.save();
        ctx.globalAlpha = pt.a;
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot + Math.sin(now * 0.0005 + pt.ph) * 0.35);
        ctx.drawImage(petalImg, -pt.s / 2, -(pt.s * ar) / 2, pt.s, pt.s * ar);
        ctx.restore();
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ==========================================================================
   S6 - „Bloom" la click: un inel fin + câteva petale de brand care se
   risipesc din punctul de atingere. Canvas separat, deasupra conținutului,
   pointer-events: none; rAF rulează DOAR cât există particule.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !window.requestAnimationFrame) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'aa-fx';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    canvas.width = Math.round(window.innerWidth * DPR);
    canvas.height = Math.round(window.innerHeight * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  var COLORS = ['210,164,162', '156,175,136', '112,130,56', '247,231,206'];
  var parts = [];
  var rafId = null;

  function spawn(x, y) {
    /* inelul */
    parts.push({ kind: 'ring', x: x, y: y, t: 0, life: 620 });
    /* petalele */
    var n = 6;
    for (var i = 0; i < n; i++) {
      var ang = (Math.PI * 2 * i) / n + Math.random() * 0.8;
      var sp = 1.4 + Math.random() * 1.8;
      parts.push({
        kind: 'petal',
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 1.1,
        r: 2.2 + Math.random() * 2.6,
        c: COLORS[i % COLORS.length],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.25,
        t: 0, life: 640 + Math.random() * 260
      });
    }
    if (!rafId) { last = performance.now(); rafId = requestAnimationFrame(tick); }
  }

  var last = 0;
  function tick(now) {
    var dt = Math.min(now - last, 40);
    last = now;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.t += dt;
      var k = p.t / p.life;
      if (k >= 1) { parts.splice(i, 1); continue; }

      if (p.kind === 'ring') {
        var r = 8 + 46 * (1 - Math.pow(1 - k, 3));      /* expo-out */
        ctx.strokeStyle = 'rgba(112,130,56,' + (0.35 * (1 - k)) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, 6.2832);
        ctx.stroke();
      } else {
        p.vy += 0.05 * (dt / 16);                        /* gravitație blândă */
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = 'rgba(' + p.c + ',' + (0.8 * (1 - k)) + ')';
        ctx.beginPath();
        /* petală: elipsă alungită */
        ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      }
    }

    if (parts.length) { rafId = requestAnimationFrame(tick); }
    else { rafId = null; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  }

  window.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    spawn(e.clientX, e.clientY);
  }, { passive: true });
})();

/* ==========================================================================
   S6 - Tilt discret pe vizualul hero (doar pointer fin, fără reduced-motion).
   Lerp în rAF propriu, pornit doar cât cursorul e peste hero.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var hero = document.querySelector('.hero');
  var visual = document.querySelector('.hero-visual');
  if (reduced || !fine || !hero || !visual || !window.requestAnimationFrame) return;

  var cur = { rx: 0, ry: 0 }, target = { rx: 0, ry: 0 };
  var rafId = null;

  function tick() {
    cur.rx += (target.rx - cur.rx) * 0.08;
    cur.ry += (target.ry - cur.ry) * 0.08;
    visual.style.transform = 'perspective(900px) rotateX(' + cur.rx.toFixed(3) + 'deg) rotateY(' + cur.ry.toFixed(3) + 'deg)';
    if (Math.abs(cur.rx - target.rx) > 0.01 || Math.abs(cur.ry - target.ry) > 0.01) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }
  function kick() { if (!rafId) rafId = requestAnimationFrame(tick); }

  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    var nx = (e.clientX - r.left) / r.width - 0.5;
    var ny = (e.clientY - r.top) / r.height - 0.5;
    target.rx = ny * -3.5;
    target.ry = nx * 4.5;
    kick();
  }, { passive: true });

  hero.addEventListener('pointerleave', function () {
    target.rx = 0; target.ry = 0;
    kick();
  });
})();
