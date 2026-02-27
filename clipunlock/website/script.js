/* ═══════════════════════════════════════════════════════════════════════════
   CopyUnlock — Landing Page Scripts
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Intersection Observer for fade-in animations ───────────────────────
  const fadeEls = document.querySelectorAll('.fade-in');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    fadeEls.forEach((el) => observer.observe(el));
  } else {
    // Fallback: show everything
    fadeEls.forEach((el) => el.classList.add('visible'));
  }

  // ─── Navbar scroll effect ──────────────────────────────────────────────
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  function onScroll() {
    const scrollY = window.scrollY || window.pageYOffset;
    if (scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    lastScroll = scrollY;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial check

  // ─── Mobile menu toggle ────────────────────────────────────────────────
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileToggle.classList.toggle('active');
      mobileMenu.classList.toggle('open');
    });

    // Close mobile menu on link click
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        mobileMenu.classList.remove('open');
      });
    });
  }

  // ─── Smooth scroll for anchor links ────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const navHeight = nav ? nav.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.pageYOffset - navHeight;

      window.scrollTo({
        top: top,
        behavior: 'smooth',
      });
    });
  });

  // ─── Pricing toggle (monthly / yearly) ─────────────────────────────────
  const billingToggle = document.getElementById('billing-toggle');
  const toggleMonthly = document.getElementById('toggle-monthly');
  const toggleYearly = document.getElementById('toggle-yearly');
  const proPrice = document.getElementById('pro-price');
  const proPeriod = document.getElementById('pro-period');

  let isYearly = false;

  if (billingToggle) {
    billingToggle.addEventListener('click', () => {
      isYearly = !isYearly;
      billingToggle.classList.toggle('active', isYearly);
      toggleMonthly.classList.toggle('active', !isYearly);
      toggleYearly.classList.toggle('active', isYearly);

      if (proPrice && proPeriod) {
        if (isYearly) {
          proPrice.textContent = '$19.99';
          proPeriod.textContent = '/ year';
        } else {
          proPrice.textContent = '$1.99';
          proPeriod.textContent = '/ month';
        }
      }
    });
  }

  // ─── Keyboard shortcut hint ─────────────────────────────────────────────
  // Easter egg: pressing Alt+Shift+U shows a subtle toast
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.key === 'U') {
      showToast('CopyUnlock activated! (Well, on the real extension it would.)');
    }
  });

  function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      padding: 12px 24px;
      background: #141416;
      border: 1px solid #6366F1;
      border-radius: 12px;
      color: #FAFAFA;
      font-family: 'Inter', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
})();
