/* Shared interface polish. No changes to the homepage renderer or content.
   Work is event-driven: no permanent animation loop and no network requests. */
(() => {
  'use strict';
  const root = document.documentElement;
  const nav = document.querySelector('.navigation');
  const main = document.getElementById('main');
  if (!nav || !main) return;
  const lens = document.createElement('span');
  lens.className = 'nav-lens'; lens.setAttribute('aria-hidden', 'true');
  nav.prepend(lens);
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, point = null, target = null, layoutFrame = 0;
  const canMove = () => fine.matches && !reduce.matches && root.dataset.motion !== 'off';
  function positionLens() {
    const link = nav.querySelector('[aria-current="page"]');
    lens.style.opacity = link ? '1' : '0';
    if (link) {
      const container = nav.getBoundingClientRect(), bounds = link.getBoundingClientRect();
      lens.style.setProperty('--nav-left', (bounds.left - container.left - nav.clientLeft) + 'px');
      lens.style.setProperty('--nav-width', bounds.width + 'px');
      nav.classList.add('lens-ready');
    }
  }
  function routeUpdate() {
    const route = window.rebuub?.page || '';
    root.dataset.interiorKind = route.split('/')[1] || root.dataset.currentView || root.dataset.page;
    if (frame) cancelAnimationFrame(frame);
    frame = 0; point = target = null;
    positionLens();
    if (layoutFrame) cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => { layoutFrame = 0; positionLens(); readingProgress(); });
  }
  new MutationObserver(routeUpdate).observe(root, { attributes: true, attributeFilter: ['data-page', 'data-current-view'] });
  new ResizeObserver(positionLens).observe(nav);
  if (document.fonts) document.fonts.ready.then(positionLens);
  // Light follows the pointer on the material, without tilting or moving text.
  main.addEventListener('pointermove', e => {
    if (!canMove()) return;
    const surface = e.target.closest('.glass-surface, .glass-button, .next-entry');
    if (!surface) return;
    point = {x: e.clientX, y: e.clientY}; target = surface;
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      if (!target?.isConnected || !point || !canMove()) return;
      const r = target.getBoundingClientRect();
      if (!r.width || !r.height) return;
      target.style.setProperty('--light-x', Math.max(0, Math.min(100, (point.x-r.left) / r.width * 100)).toFixed(1) + '%');
      target.style.setProperty('--light-y', Math.max(0, Math.min(100, (point.y-r.top) / r.height * 100)).toFixed(1) + '%');
    });
  }, { passive: true });
  function readingProgress() {
    if (root.dataset.page !== 'journal' || root.dataset.currentView !== 'entry') return;
    const article = document.querySelector('.journal-detail');
    if (!article) return;
    const r = article.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight)));
    article.style.setProperty('--reading-progress', String(progress));
  }
  window.addEventListener('scroll', readingProgress, { passive: true });
  window.addEventListener('resize', readingProgress, { passive: true });
  // A native search input may consume Escape just to clear its value.
  // On every page, one Escape always dismisses the shared search palette.
  document.addEventListener('keydown', e => {
    const dialog = document.getElementById('search-dialog');
    if (e.key === 'Escape' && dialog?.open) {
      e.preventDefault(); e.stopPropagation(); dialog.close();
    }
  }, true);
  routeUpdate();
})();
