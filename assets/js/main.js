/* ==========================================================================
   Blueprint portfolio. Plain JavaScript, no dependencies.
   1. Theme toggle (remembers the choice, otherwise follows the system)
   2. Mobile menu
   3. Scroll spine: progress, one tick per sheet, current section in the nav
   4. Heading rules draw once when they first scroll into view
   5. The robot arm in the intro (inverse kinematics, pointer following, idle loop)
   Every part checks that its elements exist, so this file is safe on every page.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- 1. Theme ---------- */
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var themeButtons = document.querySelectorAll('[data-theme-toggle]');

  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return darkQuery.matches ? 'dark' : 'light';
  }
  function syncThemeButtons() {
    var dark = currentTheme() === 'dark';
    themeButtons.forEach(function (b) {
      var label = dark ? 'Switch to light theme' : 'Switch to dark theme';
      b.setAttribute('aria-label', label);
      b.setAttribute('title', label);
    });
  }
  themeButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.classList.add('theme-fade');
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncThemeButtons();
      window.setTimeout(function () { root.classList.remove('theme-fade'); }, 260);
    });
  });
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', syncThemeButtons);
  syncThemeButtons();

  /* ---------- 2. Mobile menu ---------- */
  var header = document.getElementById('site-header');
  var menuBtn = document.querySelector('[data-menu-toggle]');
  var nav = document.getElementById('site-nav');

  function setMenu(open) {
    if (!header || !menuBtn) return;
    if (open) header.setAttribute('data-open', ''); else header.removeAttribute('data-open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (menuBtn && header) {
    menuBtn.addEventListener('click', function () {
      setMenu(!header.hasAttribute('data-open'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.hasAttribute('data-open')) { setMenu(false); menuBtn.focus(); }
    });
    if (nav) nav.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setMenu(false);
    });
  }

  /* ---------- 3. Scroll spine ---------- */
  var progress = document.querySelector('.progress');
  var sheets = Array.prototype.slice.call(document.querySelectorAll('main .sheet[id]'));
  var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]')) : [];

  if (progress && sheets.length) {
    var ticks = sheets.map(function (s, i) {
      var t = document.createElement('i');
      t.className = 'tick';
      t.setAttribute('data-n', (i < 9 ? '0' : '') + (i + 1));
      progress.appendChild(t);
      return t;
    });

    var maxScroll = 1;
    var layoutSpine = function () {
      maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
      sheets.forEach(function (s, i) {
        var at = Math.min(0.985, Math.max(0, s.getBoundingClientRect().top + window.scrollY - 0) / maxScroll);
        ticks[i].style.setProperty('--at', at.toFixed(4));
      });
    };

    var activeIndex = -1;
    var updateSpine = function () {
      var y = window.scrollY;
      progress.style.setProperty('--p', Math.min(1, Math.max(0, y / maxScroll)).toFixed(4));

      var probe = y + window.innerHeight * 0.35;
      var idx = 0;
      for (var i = 0; i < sheets.length; i++) {
        if (sheets[i].getBoundingClientRect().top + y <= probe) idx = i;
      }
      if (window.innerHeight + y >= root.scrollHeight - 4) idx = sheets.length - 1;
      if (idx !== activeIndex) {
        activeIndex = idx;
        ticks.forEach(function (t, k) { t.classList.toggle('on', k === idx); });
        var id = sheets[idx].id;
        navLinks.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + id;
          if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      }
    };

    var scheduled = false;
    var onScroll = function () {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () { scheduled = false; updateSpine(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { layoutSpine(); updateSpine(); });
    window.addEventListener('load', function () { layoutSpine(); updateSpine(); });
    layoutSpine();
    updateSpine();
  }

  /* ---------- 4. Heading rules ---------- */
  var heads = document.querySelectorAll('.sheet-head');
  if (heads.length) {
    if ('IntersectionObserver' in window) {
      var headObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); headObserver.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
      heads.forEach(function (h) { headObserver.observe(h); });
    } else {
      heads.forEach(function (h) { h.classList.add('in'); });
    }
  }

  /* ---------- 5. Robot arm ---------- */
  var svg = document.querySelector('[data-arm]');
  if (!svg) return;

  // Geometry in SVG units. These match the drawing in index.html.
  var BASE = { x: 150, y: 360 };
  var L1 = 150, L2 = 130;
  var GRASP = 36;            // distance from the wrist pin to the grasp point, along the gripper
  var GROUND = 420;
  var BLOCK_Y = GROUND - 14; // block centre when it rests on the ground
  var HOVER_Y = 330;         // tip height while travelling
  var PICK_A = 300, PICK_B = 400;
  var GRIP_OPEN = 40, GRIP_CLOSED = 28;
  var DEG = 180 / Math.PI;

  var j1 = svg.querySelector('#j1');
  var j2 = svg.querySelector('#j2');
  var j3 = svg.querySelector('#j3');
  var fingerL = svg.querySelector('#finger-l');
  var fingerR = svg.querySelector('#finger-r');
  var blockEl = svg.querySelector('#block');
  var targetEl = svg.querySelector('#target');
  var r1 = svg.querySelector('#r1');
  var r2 = svg.querySelector('#r2');
  var r3 = svg.querySelector('#r3');
  var rmode = svg.querySelector('#rmode');
  if (!(j1 && j2 && j3 && fingerL && fingerR && blockEl)) return;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function wrap180(d) { return ((d + 540) % 360) - 180; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function fmt(a) { return (a < 0 ? '\u2212' : '+') + Math.abs(a).toFixed(1) + '\u00B0'; }

  // Two link inverse kinematics for the wrist pin. The gripper always points straight down,
  // so the third angle is whatever keeps it vertical. The elbow bends upward.
  function solve(tx, ty) {
    var wx = Math.max(BASE.x + 30, tx);
    var wy = ty - GRASP;
    var dx = wx - BASE.x, dy = wy - BASE.y;
    var d = Math.hypot(dx, dy);
    var max = L1 + L2 - 1, min = Math.abs(L1 - L2) + 6;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    if (d < min) { dx *= min / d; dy *= min / d; d = min; }
    var phi = Math.atan2(dy, dx);
    var alpha = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    var beta = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    var a1 = phi - alpha;
    var a2 = beta;
    var a3 = Math.PI / 2 - a1 - a2;
    return { a1: a1 * DEG, a2: a2 * DEG, a3: wrap180(a3 * DEG) };
  }

  // Current state
  var tip = { x: PICK_A, y: HOVER_Y };
  var grip = 1;                 // 1 = open, 0 = closed
  var blockX = PICK_A;          // where the block rests
  var carrying = false;
  var lastReadout = 0;

  function render(withReadout) {
    var a = solve(tip.x, tip.y);
    j1.setAttribute('transform', 'translate(' + BASE.x + ' ' + BASE.y + ') rotate(' + a.a1.toFixed(2) + ')');
    j2.setAttribute('transform', 'translate(' + L1 + ' 0) rotate(' + a.a2.toFixed(2) + ')');
    j3.setAttribute('transform', 'translate(' + L2 + ' 0) rotate(' + a.a3.toFixed(2) + ')');
    var gap = GRIP_CLOSED + (GRIP_OPEN - GRIP_CLOSED) * grip;
    fingerL.setAttribute('transform', 'translate(26 ' + (-gap / 2).toFixed(2) + ')');
    fingerR.setAttribute('transform', 'translate(26 ' + (gap / 2).toFixed(2) + ')');
    var bx = carrying ? tip.x : blockX;
    var by = carrying ? tip.y : BLOCK_Y;
    blockEl.setAttribute('transform', 'translate(' + bx.toFixed(2) + ' ' + by.toFixed(2) + ')');
    if (withReadout) {
      if (r1) r1.textContent = fmt(a.a1);
      if (r2) r2.textContent = fmt(a.a2);
      if (r3) r3.textContent = fmt(a.a3);
    }
  }

  // Reduced motion: show one still pose and stop.
  if (reduceMotion.matches) { render(true); return; }

  /* Idle loop: pick the block up at one mark and put it down at the other, then reverse. */
  var seq = null;      // { steps, i, t, from }
  var from = { x: tip.x, y: tip.y, g: grip };
  var pickX = PICK_A, placeX = PICK_B;

  function buildSteps() {
    return [
      { d: 1.1, x: pickX,  y: HOVER_Y, g: 1 },
      { d: 0.7, x: pickX,  y: BLOCK_Y, g: 1 },
      { d: 0.5, x: pickX,  y: BLOCK_Y, g: 0, grab: true },
      { d: 0.7, x: pickX,  y: HOVER_Y, g: 0 },
      { d: 1.2, x: placeX, y: HOVER_Y, g: 0 },
      { d: 0.7, x: placeX, y: BLOCK_Y, g: 0 },
      { d: 0.5, x: placeX, y: BLOCK_Y, g: 1, release: true },
      { d: 0.7, x: placeX, y: HOVER_Y, g: 1 }
    ];
  }
  function startSeq() {
    // The block stays where it rests; the loop picks it up from there.
    carrying = false;
    pickX = blockX;
    placeX = blockX === PICK_A ? PICK_B : PICK_A;
    seq = { steps: buildSteps(), i: 0, t: 0 };
    from = { x: tip.x, y: tip.y, g: grip };
  }
  function stepSeq(dt) {
    var s = seq.steps[seq.i];
    seq.t += dt;
    var k = clamp(seq.t / s.d, 0, 1), e = ease(k);
    tip.x = from.x + (s.x - from.x) * e;
    tip.y = from.y + (s.y - from.y) * e;
    grip = from.g + (s.g - from.g) * e;
    if (k >= 1) {
      if (s.grab) carrying = true;
      if (s.release) { carrying = false; blockX = placeX; }
      from = { x: s.x, y: s.y, g: s.g };
      seq.i += 1; seq.t = 0;
      if (seq.i >= seq.steps.length) {
        var tmp = pickX; pickX = placeX; placeX = tmp;
        seq.steps = buildSteps(); seq.i = 0;
      }
    }
  }

  /* Pointer following (mouse only). Touch devices keep the idle loop. */
  var heroEl = document.getElementById('top') || svg;
  var pointer = { active: false, x: 0, y: 0, lastMove: 0, inside: false };
  var FOLLOW_TIMEOUT = 2500;

  function toSvg(clientX, clientY) {
    var ctm = svg.getScreenCTM();
    if (!ctm) return null;
    var p = svg.createSVGPoint();
    p.x = clientX; p.y = clientY;
    var q = p.matrixTransform(ctm.inverse());
    return { x: q.x, y: q.y };
  }
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var r = heroEl.getBoundingClientRect();
    var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    pointer.inside = inside;
    if (!inside) return;
    var q = toSvg(e.clientX, e.clientY);
    if (!q) return;
    pointer.x = clamp(q.x, BASE.x + 40, BASE.x + L1 + L2);
    pointer.y = clamp(q.y, 120, BLOCK_Y);
    pointer.lastMove = performance.now();
  }, { passive: true });

  function setMode(following) {
    if (following === pointer.active) return;
    pointer.active = following;
    svg.classList.toggle('is-following', following);
    if (rmode) rmode.textContent = following ? 'Following pointer' : 'Pick and place';
    if (following) {
      // Drop the block where it would land, then let the pointer steer.
      if (carrying) { carrying = false; blockX = placeX; }
    } else {
      startSeq();
    }
  }

  /* Main loop. Runs only while the intro is on screen and the tab is visible. */
  var running = false, rafId = 0, prev = 0, started = false;
  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;

    var following = pointer.inside && (now - pointer.lastMove) < FOLLOW_TIMEOUT;
    setMode(following);

    if (pointer.active) {
      tip.x += (pointer.x - tip.x) * 0.14;
      tip.y += (pointer.y - tip.y) * 0.14;
      grip += (0.55 - grip) * 0.1;
      from = { x: tip.x, y: tip.y, g: grip };
    } else {
      stepSeq(dt);
    }
    var showReadout = now - lastReadout > 90;
    if (showReadout) lastReadout = now;
    render(showReadout);
    rafId = requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true;
    prev = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  // Begin after the strokes have finished drawing.
  var visible = true;
  window.setTimeout(function () {
    started = true;
    startSeq();
    if (visible && !document.hidden) start();
  }, 1900);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (!started) return;
      if (visible && !document.hidden) start(); else stop();
    }, { threshold: 0.05 }).observe(svg);
  }
  document.addEventListener('visibilitychange', function () {
    if (!started) return;
    if (document.hidden) stop(); else if (visible) start();
  });
  reduceMotion.addEventListener && reduceMotion.addEventListener('change', function (e) {
    if (e.matches) { stop(); tip = { x: PICK_A, y: HOVER_Y }; grip = 1; carrying = false; blockX = PICK_A; render(true); }
  });

  render(true);
})();
