/* ============================================================
   Trấn Biên Web — interactions
   ============================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Navbar: shrink on scroll + mobile toggle ---- */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const overlay = document.getElementById('navOverlay');
  const closeBtn = document.getElementById('navClose');

  const setMenu = (open) => {
    links.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    if (overlay) overlay.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  toggle.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  if (closeBtn) closeBtn.addEventListener('click', () => setMenu(false));
  if (overlay) overlay.addEventListener('click', () => setMenu(false));
  links.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => setMenu(false))
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });

  /* ---- Scroll reveal ---- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.style.transitionDelay = (e.target.dataset.delay || 0) + 'ms';
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    // stagger items within each row
    reveals.forEach((el, i) => {
      const siblings = el.parentElement.parentElement
        ? [...el.parentElement.parentElement.querySelectorAll(':scope > [class*="col"] > .reveal, :scope > .reveal')]
        : [];
      el.dataset.delay = (siblings.indexOf(el) % 4) * 90;
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  /* ---- Animated counters ---- */
  const counters = document.querySelectorAll('[data-count]');
  const runCounter = (el) => {
    const target = +el.dataset.count;
    const dur = 1400;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('vi-VN');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const co = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            runCounter(e.target);
            co.unobserve(e.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((c) => co.observe(c));
  } else {
    counters.forEach((c) => (c.textContent = c.dataset.count));
  }

  /* ---- Hero parallax tilt ---- */
  const art = document.getElementById('heroArt');
  const tilt = art && art.querySelector('.art-tilt');
  if (tilt && !reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    let raf = null;
    art.addEventListener('mousemove', (e) => {
      const r = art.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        tilt.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
      });
    });
    art.addEventListener('mouseleave', () => {
      tilt.style.transform = 'rotateY(0) rotateX(0)';
    });
  }

  /* ---- Glowing particles ---- */
  const canvas = document.getElementById('particles');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let w, h, particles, dpr;
    const COLORS = ['rgba(75,123,255,', 'rgba(245,161,30,', 'rgba(42,91,230,'];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = innerWidth * dpr;
      h = canvas.height = innerHeight * dpr;
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
      const count = Math.min(60, Math.floor(innerWidth / 22));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (Math.random() * 2 + 0.6) * dpr,
        vx: (Math.random() - 0.5) * 0.25 * dpr,
        vy: (Math.random() - 0.5) * 0.25 * dpr,
        a: Math.random() * 0.5 + 0.2,
        c: COLORS[(Math.random() * COLORS.length) | 0],
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c + p.a + ')';
        ctx.shadowBlur = 12 * dpr;
        ctx.shadowColor = p.c + '0.6)';
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      requestAnimationFrame(draw);
    };

    resize();
    draw();
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(resize, 200);
    });
  }

  /* ---- Contact form → Formspree (AJAX) ---- */
  const form = document.getElementById('contactForm');
  if (form) {
    const note = document.getElementById('formNote');
    const btn = form.querySelector('button[type="submit"]');
    const btnText = btn.textContent;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Đang gửi...';
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          note.hidden = false;
          note.textContent = '✓ Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất.';
          note.style.color = '#18a957';
          form.reset();
          btn.textContent = 'Đã gửi ✓';
          setTimeout(() => {
            note.hidden = true;
            btn.textContent = btnText;
            btn.disabled = false;
          }, 5000);
        } else {
          throw new Error('Formspree error');
        }
      } catch (err) {
        note.hidden = false;
        note.textContent = '⚠ Gửi không thành công. Vui lòng gọi/Zalo 0783 296 329.';
        note.style.color = '#E8770C';
        btn.textContent = btnText;
        btn.disabled = false;
      }
    });
  }
})();
