// GDE Groningen – marketingpagina: slideshow en click-to-load trailer.
// Geen externe bronnen bij het laden: de YouTube-iframe wordt pas gemaakt als de
// bezoeker op de trailer klikt (youtube-nocookie). Werkt ook zonder JavaScript:
// de slideshow is dan horizontaal scrollbaar en de trailer linkt naar YouTube.
(() => {
  'use strict';

  // ---------------------------------------------------------------- slideshow
  for (const slider of document.querySelectorAll('[data-slider]')) {
    const viewport = slider.querySelector('.slider-viewport');
    const track = slider.querySelector('[data-slider-track]');
    const controls = slider.querySelector('[data-slider-controls]');
    const dotsBox = slider.querySelector('[data-slider-dots]');
    if (!viewport || !track || !dotsBox) continue;
    const slides = [...track.children];
    if (slides.length < 2) continue;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let index = 0;
    let scrollTimer = 0;

    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'slider-dot';
      dot.setAttribute('aria-label', `Highlight ${i + 1} van ${slides.length}`);
      dot.addEventListener('click', () => ga(i));
      dotsBox.append(dot);
      return dot;
    });
    if (controls) controls.hidden = false;

    function ga(i) {
      index = Math.max(0, Math.min(slides.length - 1, i));
      const first = slides[0].offsetLeft;
      viewport.scrollTo({ left: slides[index].offsetLeft - first, behavior: reduce.matches ? 'auto' : 'smooth' });
      zetActief();
    }

    function zetActief() {
      dots.forEach((dot, i) => dot.setAttribute('aria-current', i === index ? 'true' : 'false'));
    }

    function uitScroll() {
      const first = slides[0].offsetLeft;
      let dichtst = 0;
      let kleinste = Infinity;
      slides.forEach((slide, i) => {
        const afstand = Math.abs(slide.offsetLeft - first - viewport.scrollLeft);
        if (afstand < kleinste) { kleinste = afstand; dichtst = i; }
      });
      index = dichtst;
      zetActief();
    }

    viewport.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(uitScroll, 90);
    }, { passive: true });

    viewport.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); ga(index - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); ga(index + 1); }
    });

    slider.querySelector('[data-slider-prev]')?.addEventListener('click', () => ga(index - 1));
    slider.querySelector('[data-slider-next]')?.addEventListener('click', () => ga(index + 1));
    zetActief();
  }

  // ------------------------------------------------------- mobiel menu
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  if (navToggle && siteNav) {
    document.documentElement.classList.add('js');
    navToggle.hidden = false;
    const zetMenu = (open) => {
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      siteNav.classList.toggle('is-open', open);
    };
    navToggle.addEventListener('click', () => zetMenu(navToggle.getAttribute('aria-expanded') !== 'true'));
    siteNav.addEventListener('click', (event) => {
      if (event.target.closest('a')) zetMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        zetMenu(false);
        navToggle.focus();
      }
    });
  }

  // ------------------------------------------------------- slideshow-categorieën
  const tabList = document.querySelector('[data-showcase-tabs]');
  const tabs = [...document.querySelectorAll('[data-slideshow-tab]')];
  const panels = [...document.querySelectorAll('[data-slideshow-panel]')];
  if (tabList && tabs.length && panels.length) {
    const toon = (id) => {
      for (const tab of tabs) {
        const actief = tab.dataset.slideshowTab === id;
        tab.setAttribute('aria-selected', actief ? 'true' : 'false');
        tab.tabIndex = actief ? 0 : -1;
      }
      for (const panel of panels) panel.hidden = panel.dataset.slideshowPanel !== id;
    };
    for (const [i, tab] of tabs.entries()) {
      tab.addEventListener('click', () => toon(tab.dataset.slideshowTab));
      tab.addEventListener('keydown', (event) => {
        let doel = -1;
        if (event.key === 'ArrowRight') doel = (i + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') doel = (i - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') doel = 0;
        else if (event.key === 'End') doel = tabs.length - 1;
        if (doel < 0) return;
        event.preventDefault();
        tabs[doel].focus();
        toon(tabs[doel].dataset.slideshowTab);
      });
    }
    toon(tabs[0].dataset.slideshowTab);
  }

  // ------------------------------------------------------- click-to-load video
  for (const embed of document.querySelectorAll('[data-video]')) {
    const button = embed.querySelector('[data-video-play]');
    if (!button) continue;
    button.addEventListener('click', () => {
      const id = embed.dataset.video;
      if (!/^[A-Za-z0-9_-]{6,20}$/.test(id || '')) return;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      iframe.title = embed.dataset.videoTitle || 'GDE Groningen-trailer';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      button.replaceWith(iframe);
      iframe.focus();
    });
  }
  // ---------------------------------------------------------------- deel-knop
  const kopieer = document.querySelector('[data-share-kopieer]');
  const status = document.querySelector('[data-share-status]');
  if (kopieer) {
    kopieer.addEventListener('click', async () => {
      const url = 'https://natuspella.github.io/GDE-Groningen/';
      try {
        await navigator.clipboard.writeText(url);
        if (status) status.textContent = 'Link gekopieerd.';
      } catch {
        if (status) status.textContent = url;
      }
    });
  }
})();
