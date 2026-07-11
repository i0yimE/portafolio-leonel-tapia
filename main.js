(function () {
  "use strict";

  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  /* ---------- Nav ---------- */
  function initNav() {
    const nav = $("[data-nav]");
    if (!nav) return;
    const onScroll = () => {
      if (scrollY > 60) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function initMobileNav() {
    const toggle = $("[data-nav-toggle]");
    const panel = $("[data-nav-mobile]");
    if (!toggle || !panel) return;
    const links = $$("[data-nav-mobile-link]", panel);

    function open() {
      panel.dataset.open = "true";
      panel.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
    }
    function close() {
      panel.dataset.open = "false";
      panel.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", () => {
      panel.dataset.open === "true" ? close() : open();
    });
    links.forEach(a => a.addEventListener("click", close));
  }

  /* ---------- Smooth anchors (native) ---------- */
  function initSmoothAnchors() {
    document.addEventListener("click", e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const navOffset = 84;
      window.scrollTo({
        top: el.getBoundingClientRect().top + scrollY - navOffset,
        behavior: reduced ? "auto" : "smooth",
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveals() {
    const els = $$("[data-reveal]");
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
    els.forEach(el => io.observe(el));

    setTimeout(() => {
      $$("[data-reveal]:not(.is-revealed)").forEach(el => {
        if (el.getBoundingClientRect().top < innerHeight) el.classList.add("is-revealed");
      });
    }, 6000);
  }

  /* ---------- Custom cursor ---------- */
  function initCursor() {
    const root = $("[data-cursor-root]");
    if (!root || !fineHover) return;
    document.documentElement.classList.add("has-cursor");
    const ring = $(".cursor-ring", root);
    const dot = $(".cursor-dot", root);
    let tx = 0, ty = 0, rx = 0, ry = 0, firstMove = false;

    window.addEventListener("mousemove", e => {
      tx = e.clientX; ty = e.clientY;
      if (dot) dot.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      if (!firstMove) {
        firstMove = true;
        rx = tx; ry = ty;
        if (ring) ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        root.classList.add("is-ready");
      }
    }, { passive: true });

    function tick() {
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      if (ring) ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    const HOVERABLES = "a, button, .work-card, .btn";
    document.addEventListener("mouseover", e => { if (e.target.closest(HOVERABLES)) root.classList.add("is-interactive"); });
    document.addEventListener("mouseout", e => {
      if (e.target.closest(HOVERABLES) && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(HOVERABLES)))
        root.classList.remove("is-interactive");
    });
  }

  /* ---------- Tilt on cards ---------- */
  function initTilt() {
    if (!fineHover) return;
    $$("[data-tilt]").forEach(card => {
      const MAX = 6;
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      card.classList.add("has-tilt");
      card.addEventListener("mousemove", e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tx = -py * MAX; ty = px * MAX;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      card.addEventListener("mouseleave", () => {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      function loop() {
        cx += (tx - cx) * 0.15;
        cy += (ty - cy) * 0.15;
        card.style.setProperty("--rx", cx.toFixed(2) + "deg");
        card.style.setProperty("--ry", cy.toFixed(2) + "deg");
        raf = (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) ? requestAnimationFrame(loop) : null;
      }
    });
  }

  /* ---------- Print / PDF ---------- */
  function initPrintButton() {
    $$("[data-print-btn]").forEach(btn => {
      btn.addEventListener("click", () => window.print());
    });
    window.addEventListener("beforeprint", () => {
      $$("[data-reveal]").forEach(el => el.classList.add("is-revealed"));
      $$("[data-count-to]").forEach(el => { el.textContent = el.dataset.countTo; });
    });
  }

  /* ---------- Hover preview video ---------- */
  function initHoverPreview() {
    $$("[data-preview]").forEach(card => {
      const video = $("video", card);
      if (!video) return;
      let started = false;
      const enter = () => {
        card.classList.add("is-playing");
        if (!started) { started = true; video.load(); }
        video.play().catch(() => {});
      };
      const leave = () => {
        card.classList.remove("is-playing");
        video.pause();
        video.currentTime = 0;
      };
      card.addEventListener("mouseover", e => { if (!card.contains(e.relatedTarget)) enter(); });
      card.addEventListener("mouseout", e => { if (!card.contains(e.relatedTarget)) leave(); });
      card.addEventListener("touchstart", enter, { passive: true });
    });
  }

  /* ---------- Count up ---------- */
  function initCountUp() {
    const els = $$("[data-count-to]");
    if (!els.length) return;
    els.forEach(el => {
      const target = parseFloat(el.dataset.countTo);
      const trigger = () => {
        if (window.gsap) {
          const obj = { v: 0 };
          gsap.to(obj, {
            v: target, duration: 1.3, ease: "power2.out",
            onUpdate: () => { el.textContent = Math.round(obj.v); },
          });
        } else {
          el.textContent = target;
        }
      };
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) { trigger(); io.unobserve(entry.target); } });
      }, { threshold: 0.4 });
      io.observe(el);
    });
  }

  function boot() {
    safe(initNav, "initNav");
    safe(initMobileNav, "initMobileNav");
    safe(initPrintButton, "initPrintButton");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(initReveals, "initReveals");
    safe(initCursor, "initCursor");
    safe(initTilt, "initTilt");
    safe(initHoverPreview, "initHoverPreview");
    safe(initCountUp, "initCountUp");

    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
    }

    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
