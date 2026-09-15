(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const C = window.RebuubContent, config = window.SITE || {}, html = document.documentElement;
  const local = !!window.REBUUB_LOCAL, esc = C.esc, icon = C.icon;
  const storage = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const projects = config.projects || [], notes = config.journal || [], shelf = config.shelf || [];
  let moving = !reduced.matches && storage.get('rebuub-rain-motion') !== 'off';
  let current = null, scene = null, releaseInput = () => {}, lastFocus = null, navigating = false;
  let canonical = null, observer = null;
  const scrollMemory = new Map();
  const baseDescription = 'Projects, journal and selected games by rebuub.';
  history.scrollRestoration = 'manual';
  function locationRoute() {
    if (local) return location.hash.replace(/^#\/?/, '') || window.REBUUB_INITIAL_ROUTE || 'home';
    if (location.pathname.startsWith('/pages/') && window.REBUUB_INITIAL_ROUTE) return window.REBUUB_INITIAL_ROUTE;
    return location.pathname.replace(/^\/+|\/+$/g, '').replace(/\/index\.html$/, '') || 'home';
  }
  // The home scene is only needed on Home. Other pages fetch it on demand; the
  // generated index.html already includes these tags, so nothing loads twice.
  const sceneFiles = ['wordmark', 'sculpture', 'spheres', 'optics', 'scene', 'interaction'];
  let sceneScripts = null;
  function loadSceneScripts() {
    if (!sceneScripts) {
      const names = window.RebuubScene && window.bindSculptureInput ? [] : [...sceneFiles];
      // Opened from disk, a file:// image would taint the WebGL canvas; use the embedded copy.
      if (location.protocol === 'file:' && !window.REBUUB_ASSETS?.['assets/sphere-reference.png']) names.unshift('scene-assets');
      sceneScripts = Promise.all(names.map(name => new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = name + '.js'; s.async = false;
        s.onload = resolve; s.onerror = () => reject(new Error(name + '.js failed to load'));
        document.body.append(s);
      }))).catch(error => { sceneScripts = null; throw error; });
    }
    return sceneScripts;
  }
  function ensureScene() {
    return loadSceneScripts().then(() => {
      if (scene) return;
      scene = new window.RebuubScene($('#scene'), $('#scene-target'));
      releaseInput = window.bindSculptureInput(scene, $('#hero'), $('#sculpture-interaction'));
      scene.setMoving(moving);
      observer = new IntersectionObserver(entries => scene.setInView(entries[0].isIntersecting), { threshold: .02 });
      observer.observe($('#hero'));
    });
  }
  function metadata(info) {
    document.title = C.pageTitle(info);
    const description = C.pageDescription(info, baseDescription);
    $('meta[name="description"]').content = description;
    $('meta[property="og:title"]').content = document.title;
    $('meta[property="og:description"]').content = description;
    if (canonical) {
      canonical.href = new URL(C.href(info.route), config.siteUrl).href;
      const ogUrl = $('meta[property="og:url"]'); if (ogUrl) ogUrl.content = canonical.href;
    }
  }
  function linkify(root = document) {
    $$('a[data-route]', root).forEach(a => a.setAttribute('href', C.href(a.dataset.route, local)));
  }
  function navigate(route, { push = false, focus = false, restore = false } = {}) {
    const next = C.resolve(route, config), previous = current;
    if (current) scrollMemory.set(current.route, scrollY);
    if (push && current?.route !== next.route) history.pushState({ route: next.route }, '', C.href(next.route, local));
    navigating = true;
    if ($('dialog[open]')) lastFocus = null;
    $$('dialog[open]').forEach(d => d.close());
    releaseInput();
    current = next;
    html.dataset.page = next.section || 'not-found';
    html.dataset.currentView = next.view;
    $$('[data-view]').forEach(el => el.hidden = el.dataset.view !== next.view);
    // Switching shelf tabs keeps the reader's place instead of jumping to the top.
    const sameShelf = previous?.view === 'shelf' && next.view === 'shelf';
    if (next.view === 'entry') {
      $('#entry-content').innerHTML = C.entry(next, config, local);
      $('#entry-content').dataset.route = next.route;
    }
    if (next.view === 'shelf') {
      if (previous?.route !== next.route) shelfStatus = 'All';
      shelfTab = next.tab?.id || '';
      renderShelf();
    }
    $$('.navigation a').forEach(a => a.dataset.route === next.section ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    metadata(next);
    if (next.view === 'home') {
      ensureScene().then(() => {
        if (current?.view !== 'home') return;
        scene.setActive(!$('#search-dialog').open);
        requestAnimationFrame(() => { if (current?.view === 'home') { scene.resize(); scene.render(performance.now()); } });
      }, error => console.error(error));
    }
    else scene?.setActive(false);
    const top = sameShelf ? scrollY : restore ? scrollMemory.get(next.route) || 0 : 0;
    window.scrollTo({ top, behavior: 'instant' });
    if (focus) {
      $('#route-status').textContent = document.title;
      const returning = restore && previous?.view === 'entry' && next.view !== 'entry';
      const target = sameShelf ? $(`#shelf-tabs a[data-route="${CSS.escape(next.route)}"]`) : returning ? $(`a[data-route="${CSS.escape(previous.route)}"]`, $('#main')) : next.view === 'entry' ? $('#entry-title') : $('#main');
      (target || $('#main')).focus({ preventScroll: true });
    }
    navigating = false;
  }
  // Start fetching the scene as soon as a visitor reaches for a Home link.
  const prefetchScene = e => { if (!scene && e.target.closest?.('a[data-route="home"]')) loadSceneScripts().catch(() => {}); };
  document.addEventListener('pointerover', prefetchScene, { passive: true });
  document.addEventListener('focusin', prefetchScene);
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-route]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0 || a.target === '_blank') return;
    e.preventDefault();
    navigate(a.dataset.route, { push: true, focus: true, restore: a.hasAttribute('data-return') });
  });
  window.addEventListener('popstate', () => navigate(locationRoute(), { focus: true, restore: true }));
  window.addEventListener('hashchange', () => {
    if (location.hash === '#main') { $('#main').focus(); return; }
    if (local && C.resolve(locationRoute(), config).route !== current?.route) navigate(locationRoute(), { focus: true, restore: true });
  });
  $$('[data-field]').forEach(el => { if (config[el.dataset.field]) el.textContent = config[el.dataset.field]; });
  $('#year').textContent = new Date().getFullYear();
  $('#about-copy').innerHTML = C.paragraphs(config.about).map(p => `<p>${esc(p)}</p>`).join('');
  $('#social-links').innerHTML = C.socialLinks(config.socials);
  $('#socials').hidden = !$('#social-links').children.length;
  $('#about-quotes').innerHTML = C.quotes(config.quotes);
  $('#about-quotes-section').hidden = !$('#about-quotes').children.length;
  if (C.safeUrl(config.siteUrl, ['https:'])) {
    canonical = $('link[rel="canonical"]') || document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical);
  }
  function setMotion(value) {
    moving = !!value; storage.set('rebuub-rain-motion', moving ? 'on' : 'off'); html.dataset.motion = moving ? 'on' : 'off'; window.RebuubAtmosphere?.setMoving(moving); scene?.setMoving(moving);
    $('#motion-toggle').setAttribute('aria-pressed', String(!moving)); $('#motion-toggle span').textContent = moving ? 'Reduce motion' : 'Motion reduced';
  }
  $('#motion-toggle').addEventListener('click', () => setMotion(!moving));
  reduced.addEventListener('change', e => { if (e.matches) setMotion(false); });
  window.addEventListener('scroll', () => { if (current?.view === 'home') scene?.setScroll(moving ? Math.min(9, scrollY * .018) : 0); }, { passive: true });
  function openSearch() {
    lastFocus = document.activeElement;
    $('#site-search').value = ''; renderSearch(); $('#search-dialog').showModal();
    document.body.classList.add('modal-open'); $('#search-toggle').setAttribute('aria-expanded', 'true'); scene?.setActive(false); $('#site-search').focus();
  }
  $$('[data-close]').forEach(b => b.addEventListener('click', () => $('#' + b.dataset.close).close()));
  $('#search-dialog').addEventListener('click', e => {
    const d = e.currentTarget; if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
  });
  $('#search-dialog').addEventListener('close', () => {
    document.body.classList.remove('modal-open'); $('#search-toggle').setAttribute('aria-expanded', 'false');
    scene?.setActive(current?.view === 'home');
    if (!navigating && lastFocus?.isConnected && lastFocus.getClientRects().length) lastFocus.focus({ preventScroll: true });
  });
  $('#project-count').textContent = projects.length + ' ' + (projects.length === 1 ? 'project' : 'projects');
  $('#projects-grid').innerHTML = projects.length ? C.projectCards(projects, local) : '<div class="empty-state glass-surface"><h2>No projects published.</h2></div>';
  // Shelf: type tabs are links (/shelf/games); the status filter is a local toggle within a tab.
  let shelfTab = '', shelfStatus = 'All';
  function renderShelf() {
    const inTab = shelf.filter(s => !shelfTab || C.shelfType(s, config).id === shelfTab);
    const statuses = [...new Set(inTab.map(s => s.status).filter(Boolean))];
    if (!statuses.includes(shelfStatus)) shelfStatus = 'All';
    const items = inTab.filter(s => shelfStatus === 'All' || s.status === shelfStatus);
    const counts = { all: shelf.length };
    shelf.forEach(s => { const id = C.shelfType(s, config).id; counts[id] = (counts[id] || 0) + 1; });
    $('#shelf-tabs').innerHTML = C.shelfTabLinks(config, shelfTab, counts, local);
    $('#shelf-tabs-nav').hidden = !C.shelfTabs(config).length;
    const useful = statuses.length > 1 || (statuses.length === 1 && inTab.some(s => !s.status));
    $('#shelf-status').hidden = !useful;
    $('#shelf-status').innerHTML = useful ? ['All', ...statuses].map(s => `<button type="button" data-shelf-status="${esc(s)}" aria-pressed="${shelfStatus === s}">${esc(s)}</button>`).join('') : '';
    $('#shelf-count').textContent = items.length + ' ' + (items.length === 1 ? 'item' : 'items');
    $('#shelf-grid').innerHTML = items.length ? C.shelfCards(items, shelf, local, config) : '<div class="empty-state glass-surface"><h2>Nothing here yet.</h2></div>';
    $('.art-note').hidden = !items.some(i => !C.images(i).length && i.art);
    $$('[data-shelf-status]').forEach(b => b.addEventListener('click', () => {
      shelfStatus = b.dataset.shelfStatus; renderShelf(); $(`[data-shelf-status="${CSS.escape(shelfStatus)}"]`)?.focus();
    }));
  }
  let journalFilter = 'All';
  function renderJournal() {
    const q = $('#journal-search').value.toLowerCase().trim();
    const matches = notes.filter(n => (journalFilter === 'All' || (n.tags || []).includes(journalFilter)) && [n.title, n.summary, ...(n.tags || []), ...C.paragraphs(n.body), ...(n.sections || []).flatMap(s => [s.heading, ...C.paragraphs(s.paragraphs)])].join(' ').toLowerCase().includes(q));
    const tags = ['All', ...new Set(notes.flatMap(n => n.tags || []))];
    $('#journal-count').textContent = matches.length + ' ' + (matches.length === 1 ? 'entry' : 'entries');
    $('#journal-filters').hidden = !notes.length;
    $('#journal-filters').innerHTML = tags.map(t => `<button data-tag="${esc(t)}" aria-pressed="${journalFilter === t}">${esc(t)}</button>`).join('');
    if (!notes.length) $('#journal-list').innerHTML = C.emptyJournal();
    else if (!matches.length) $('#journal-list').innerHTML = '<div class="empty-state glass-surface"><h2>No matching entries.</h2><button class="inline-link" id="reset-journal">Clear search and filters</button></div>';
    else $('#journal-list').innerHTML = C.journalRows(matches, notes, local);
    $$('[data-tag]').forEach(b => b.addEventListener('click', () => { journalFilter = b.dataset.tag; renderJournal(); $(`[data-tag="${CSS.escape(journalFilter)}"]`)?.focus(); }));
    $('#reset-journal')?.addEventListener('click', () => { $('#journal-search').value = ''; journalFilter = 'All'; renderJournal(); $('#journal-search').focus(); });
  }
  $('#journal-search').addEventListener('input', renderJournal);
  const spotifyFrame = src => {
    const iframe = document.createElement('iframe'); iframe.src = src; iframe.title = 'Spotify player'; iframe.loading = 'lazy'; iframe.allow = 'encrypted-media; fullscreen; picture-in-picture'; iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    return iframe;
  };
  const spotify = C.spotifyEmbed(config.spotifyUrl);
  if (spotify) {
    $('#music-section').hidden = false;
    $('#load-spotify').addEventListener('click', () => $('#spotify-player').replaceChildren(spotifyFrame(spotify)));
  }
  document.addEventListener('click', e => {
    // Shelf music: the player loads only when asked.
    const play = e.target.closest('[data-embed]');
    if (play && play.dataset.embed.startsWith('https://open.spotify.com/embed/')) {
      const slot = play.closest('[data-embed-slot]');
      play.replaceWith(spotifyFrame(play.dataset.embed));
      $('.privacy-note', slot)?.remove();
      return;
    }
    // Case-study contents: scroll within the page. A plain #fragment would be read as a route.
    const toc = e.target.closest('[data-toc]');
    const section = toc && document.getElementById(toc.dataset.toc);
    if (section) {
      e.preventDefault();
      section.scrollIntoView({ behavior: moving ? 'smooth' : 'auto', block: 'start' });
      section.setAttribute('tabindex', '-1'); section.focus({ preventScroll: true });
    }
  });
  const destinations = [
    ...Object.entries(C.labels).map(([route, title]) => ({ title, type: 'Page', route })),
    ...C.shelfTabs(config).map(t => ({ title: t.label, type: 'The shelf', route: 'shelf/' + t.id })),
    ...['projects', 'journal', 'shelf'].flatMap(section => (config[section] || []).map(item => ({
      title: item.title, route: C.itemRoute(section, item), terms: C.searchText(item, config),
      type: section === 'projects' ? 'Project' : section === 'journal' ? 'Journal' : C.shelfType(item, config).singular || 'The shelf'
    })))
  ];
  function renderSearch() {
    const q = $('#site-search').value.trim().toLowerCase();
    const items = destinations.filter(d => [d.title, d.type, d.terms].join(' ').toLowerCase().includes(q));
    $('#search-status').textContent = items.length + (items.length === 1 ? ' result' : ' results');
    $('#search-results').innerHTML = items.length ? items.map(d => `<a class="search-result" data-route="${esc(d.route)}" href="${C.href(d.route, local)}"><span>${esc(d.title)}</span><small>${esc(d.type)}</small></a>`).join('') : '<p class="search-empty">No matches.</p>';
  }
  $('#search-toggle').addEventListener('click', openSearch); $('#site-search').addEventListener('input', renderSearch);
  $('#site-search').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); $('.search-result')?.focus(); }
    if (e.key === 'Enter') { e.preventDefault(); $('.search-result')?.click(); }
  });
  $('#search-results').addEventListener('keydown', e => {
    const list = $$('.search-result'), i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (i === 0) $('#site-search').focus(); else list[Math.max(0, i - 1)]?.focus(); }
  });
  // Image viewer for entry galleries: arrow keys or buttons step through, Esc or the backdrop closes.
  const viewer = $('#image-viewer');
  let viewerItems = [], viewerIndex = 0, viewerReturn = null;
  function showImage(index) {
    viewerIndex = (index + viewerItems.length) % viewerItems.length;
    const button = viewerItems[viewerIndex], img = $('img', button), caption = $('figcaption', button.closest('figure'));
    $('#viewer-image').src = img.currentSrc || img.src;
    $('#viewer-image').alt = img.alt;
    $('#viewer-caption').textContent = caption?.textContent || '';
    $('#viewer-caption').hidden = !caption;
    $('#viewer-count').textContent = `${viewerIndex + 1} / ${viewerItems.length}`;
    $$('[data-viewer-step], #viewer-count').forEach(el => el.hidden = viewerItems.length < 2);
  }
  document.addEventListener('click', e => {
    const button = e.target.closest('[data-gallery-open]');
    if (!button) return;
    viewerItems = $$('[data-gallery-open]', button.closest('[data-gallery-scope]') || button.parentElement);
    viewerReturn = button;
    showImage(viewerItems.indexOf(button));
    viewer.showModal(); document.body.classList.add('modal-open');
  });
  $$('[data-viewer-step]').forEach(b => b.addEventListener('click', () => showImage(viewerIndex + Number(b.dataset.viewerStep))));
  viewer.addEventListener('keydown', e => {
    if (viewerItems.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault(); showImage(viewerIndex + (e.key === 'ArrowRight' ? 1 : -1));
  });
  viewer.addEventListener('click', e => { if (e.target === viewer || e.target.classList.contains('viewer-stage')) viewer.close(); });
  viewer.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    if (!navigating && viewerReturn?.isConnected) viewerReturn.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if ($('#search-dialog').open) $('#search-dialog').close(); else openSearch(); }
  });
  linkify(); renderShelf(); renderJournal(); setMotion(moving); navigate(locationRoute());
  // Local inspection only. No visitor logs or external data requests.
  window.rebuub = { get atmosphere() { return window.RebuubAtmosphere; }, get scene() { return scene; }, navigate, get page() { return current?.route; }, get moving() { return moving; } };
})();
