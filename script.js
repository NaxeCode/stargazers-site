// Footer year
document.getElementById('y').textContent = new Date().getFullYear();

// Rotating hero lines (soft crossfade, matches pulsar visuals)
(function () {
  const el = document.getElementById('hero-line');
  if (!el) return;

  const heroLines = [
    "Pull up a nebula and stay awhile.",
    "Signal boosters on. Vibes only.",
    "Late-night builds meet constellations.",
    "Orbit with makers, gamers, and lurkers.",
    "Lo-fi, skywatching, and slow-chat energy.",
    "Welcome to the quiet between galaxies.",
    "We pilot side quests past midnight.",
    "Claim a corner of the cosmos.",
    "The sky is dark, the chat is warm.",
    "Leave the noise; keep the starlight."
  ];

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pick = () => heroLines[Math.floor(Math.random() * heroLines.length)];
  let heroResizeTimer;
  let swapTimer;
  let loopTimer;
  const SWAP_DELAY = 320; // ms to allow fade-out before swapping copy

  function lockHeroHeight() {
    const computed = window.getComputedStyle(el);
    const scope = el.parentElement || el;
    const width = scope.getBoundingClientRect().width || el.getBoundingClientRect().width;
    const probe = el.cloneNode(true);
    probe.removeAttribute('id');
    probe.classList.remove('is-visible');
    Object.assign(probe.style, {
      position: 'absolute',
      left: '-9999px',
      top: '-9999px',
      visibility: 'hidden',
      pointerEvents: 'none',
      opacity: '0',
      transform: 'none',
      transition: 'none',
      width: width ? `${width}px` : computed.width,
      whiteSpace: 'normal',
      display: computed.display,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      letterSpacing: computed.letterSpacing,
      lineHeight: computed.lineHeight
    });
    document.body.appendChild(probe);

    let max = 0;
    for (const line of heroLines) {
      probe.textContent = line;
      max = Math.max(max, probe.getBoundingClientRect().height);
    }

    probe.remove();
    if (max > 0) {
      el.style.minHeight = `${Math.ceil(max)}px`;
    }
  }

  function setLine(text) {
    if (el.textContent === text) return;
    el.classList.remove('is-visible');
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => {
      el.textContent = text;
      // force reflow so the opacity transition restarts consistently
      void el.offsetWidth;
      el.classList.add('is-visible');
    }, SWAP_DELAY);
  }

  lockHeroHeight();
  setLine(pick());
  if (reduce) return;

  (function loop() {
    const nextDelay = 7000 + Math.random() * 4000; // 7-11s
    loopTimer = setTimeout(() => { setLine(pick()); loop(); }, nextDelay);
  })();

  window.addEventListener('resize', () => {
    clearTimeout(heroResizeTimer);
    heroResizeTimer = setTimeout(lockHeroHeight, 200);
  });
  window.addEventListener('load', lockHeroHeight);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => requestAnimationFrame(lockHeroHeight));
  }
})();

// Starfield canvas (Grok-ish)
(function () {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('starfield');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  let w, h, stars = [], frameId;

  const cfg = {
    density: 0.12,          // stars per 1000 px^2
    speed: 0.06,            // base vertical drift (px/ms at DPR=1)
    twinkle: 0.5,           // twinkle strength 0..1
    hueA: 225,              // blue-purple band start
    hueB: 275,              // blue-purple band end
    shootChance: 0.002,     // chance per frame to spawn a shooting star
    maxR: 1.7               // max radius at z=1
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = Math.floor(rect.width * dpr);
    h = Math.floor(rect.height * dpr);
    canvas.width = w; canvas.height = h;

    const areaK = (w * h) / (1000 * 1000); // in kpx^2
    const target = Math.max(80, Math.floor(cfg.density * areaK * 1000));
    if (stars.length === 0) stars = new Array(target).fill(0).map(spawnStar);
    else if (stars.length < target) stars.push(...new Array(target - stars.length).fill(0).map(spawnStar));
    else if (stars.length > target) stars.length = target;
  }

  function rnd(a = 0, b = 1) { return a + Math.random() * (b - a); }

  function spawnStar() {
    return {
      x: rnd(0, w),
      y: rnd(0, h),
      z: rnd(0.2, 1),          // depth/parallax
      r: 0,
      t: rnd(0, Math.PI * 2),  // phase for twinkle
      hue: rnd(cfg.hueA, cfg.hueB),
      vx: rnd(-0.015, 0.015),  // subtle lateral drift
      vy: rnd(-0.02, -0.06)    // upward drift (negative y)
    };
  }

  function spawnShootingStar() {
    const fromLeft = Math.random() < 0.5;
    const y0 = rnd(h * 0.15, h * 0.6);
    stars.push({
      x: fromLeft ? -20 : w + 20,
      y: y0,
      z: 1.2,
      r: 1.4,
      t: 0,
      hue: 200,
      vx: fromLeft ? rnd(0.6, 1.1) : rnd(-1.1, -0.6),
      vy: rnd(-0.15, -0.05),
      shoot: true,
      life: rnd(350, 650)
    });
  }

  function drawStar(s, now) {
    const tw = 0.6 + cfg.twinkle * 0.4 * Math.sin(s.t + now * 0.002 + s.x * 0.001);
    const r = (0.3 + s.z * cfg.maxR) * tw * dpr;
    ctx.beginPath();
    ctx.fillStyle = `hsla(${s.hue}, 80%, ${70 + 20 * (1 - s.z)}%, ${0.85 * tw})`;
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (r > 1.2) { // soft cross-glint
      ctx.globalAlpha = 0.35 * tw; ctx.fillRect(s.x - 1.5 * r, s.y - 0.2, 3 * r, 0.4);
      ctx.fillRect(s.x - 0.2, s.y - 1.5 * r, 0.4, 3 * r); ctx.globalAlpha = 1;
    }
  }

  function drawShoot(s) {
    const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 40, s.y - s.vy * 40);
    grad.addColorStop(0, 'rgba(200,220,255,0.9)');
    grad.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.strokeStyle = grad; ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 40, s.y - s.vy * 40); ctx.stroke();
  }

  function step(now) {
    ctx.clearRect(0, 0, w, h);
    // subtle nebula haze
    const g = ctx.createRadialGradient(w * 0.2, h * -0.1, 0, w * 0.2, h * -0.1, Math.max(w, h) * 0.9);
    g.addColorStop(0, 'rgba(26,31,46,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.x += (s.vx + 0.02 * (s.z - 0.5)) * dpr;
      s.y += (s.vy - cfg.speed * (0.2 + s.z)) * dpr;
      s.t += 0.02;
      if (s.shoot) { s.life -= 16; drawShoot(s); }
      if (s.x < -10) s.x = w + 10; else if (s.x > w + 10) s.x = -10;
      if (s.y < -10) { s.y = h + 10; s.x = rnd(0, w); }
      drawStar(s, now);
    }

    if (Math.random() < cfg.shootChance && stars.length < 2000) spawnShootingStar();
    frameId = requestAnimationFrame(step);
  }

  function start() {
    resize();
    if (prefersReduced) {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < stars.length; i++) drawStar(stars[i], 0);
      return;
    }
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(step);
  }

  window.addEventListener('resize', () => {
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    resize();
  });

  start();
})();

(function () {
  const nodes = document.querySelectorAll('[data-reveal]');
  if (!nodes.length) return;

  const reveal = (target) => target.classList.add('is-revealed');

  if (!('IntersectionObserver' in window)) {
    nodes.forEach(reveal);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -20% 0px' });

  nodes.forEach((node) => observer.observe(node));
})();
