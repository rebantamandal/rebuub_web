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
  /* Page transitions. Where the browser supports view transitions and motion is on,
     the page fades and slides, and a shelf poster or project thumbnail morphs into the
     large image on its detail page (and back). Elsewhere pages switch instantly. */
  const visible = selector => $$(selector).find(el => el.getClientRects().length);
  const cardMedia = route => visible(`#main a[data-route="${CSS.escape(route)}"] :is(.poster, .project-thumb)`);
  const entryMedia = () => visible('#entry-content :is(.shelf-poster .gallery-open, .shelf-poster .poster, .case-figure .gallery-open)');
  function navigate(route, options = {}) {
    const next = C.resolve(route, config), previous = current;
    if (current) scrollMemory.set(current.route, scrollY);
    if (options.push && current?.route !== next.route) history.pushState({ route: next.route }, '', C.href(next.route, local));
    const animate = previous && options.focus && moving && !document.hidden && previous.route !== next.route && typeof document.startViewTransition === 'function';
    if (!animate) return applyRoute(next, previous, options);
    const from = next.view === 'entry' ? cardMedia(next.route) : previous.view === 'entry' ? entryMedia() : null;
    if (from) from.style.viewTransitionName = 'hero-media';
    const transition = document.startViewTransition(() => {
      if (from) from.style.viewTransitionName = '';
      applyRoute(next, previous, options);
      const to = from && (next.view === 'entry' ? entryMedia() : cardMedia(previous.route));
      if (to) to.style.viewTransitionName = 'hero-media';
    });
    transition.finished.finally(() => $$('#main [style*="view-transition-name"]').forEach(el => { el.style.viewTransitionName = ''; }));
  }
  function applyRoute(next, previous, { focus = false, restore = false } = {}) {
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
      syncTracks();
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
    if (typeof queueLift === 'function') queueLift();
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
  document.addEventListener('click', e => {
    // Code blocks: copy the snippet, then confirm briefly on the button.
    const copy = e.target.closest('[data-copy-code]');
    if (copy) {
      const text = copy.closest('.code-block')?.querySelector('code')?.textContent || '';
      const done = ok => { copy.textContent = ok ? 'Copied' : 'Copy failed'; setTimeout(() => { copy.textContent = 'Copy'; }, 1600); };
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
      else done(false);
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
  /* Song previews: one shared audio element, created on first play so nothing loads
     before then. Playback carries on across page changes; every button and progress
     bar with the same track id reflects it. */
  /* The now-playing card floats on every page and follows whatever was last played:
     the featured song until something else is chosen, remembered for this visitor. */
  let audio = null, trackId = '', progressFrame = 0, cardId = '', cardMode = 'idle';
  const trackItem = id => shelf.find(s => s.id === id && C.safeUrl(s.preview, ['https:']));
  const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function showCard(id) {
    if (!shelf.some(s => s.id === id) || id === cardId) return;
    cardId = id; cardMode = 'idle';
    $('#now-playing-slot').innerHTML = C.nowPlaying(config, local, id);
    html.classList.toggle('has-now-playing', !!$('#now-playing-slot').children.length);
    linkify($('#now-playing-slot'));
    storage.set('rebuub-now-playing', id);
  }
  showCard(storage.get('rebuub-now-playing') || config.nowPlaying);
  if (!cardId) showCard(config.nowPlaying);
  // Below Home the card floats at the bottom; it rises whenever the footer scrolls into view.
  let liftFrame = 0;
  function liftPlayer() {
    liftFrame = 0;
    const footer = $('.footer'), slot = $('#now-playing-slot');
    if (!footer || !slot) return;
    slot.style.setProperty('--np-lift', Math.max(0, Math.round(innerHeight - footer.getBoundingClientRect().top)) + 'px');
  }
  const queueLift = () => { if (!liftFrame) liftFrame = requestAnimationFrame(liftPlayer); };
  // Liquid glass sheen on the player follows the pointer, like the site's other glass.
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  document.addEventListener('pointermove', e => {
    if (!moving || !fine.matches) return;
    const glass = e.target.closest?.('.np-bar, .np-panel, .track-player');
    if (!glass) return;
    const r = glass.getBoundingClientRect();
    glass.style.setProperty('--light-x', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    glass.style.setProperty('--light-y', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  }, { passive: true });
  window.addEventListener('scroll', queueLift, { passive: true });
  window.addEventListener('resize', queueLift, { passive: true });
  function syncTracks() {
    const playing = !!(audio && !audio.paused);
    const share = audio && audio.duration ? audio.currentTime / audio.duration : 0;
    const label = $('[data-np-label]');
    if (label) label.textContent = playing && trackId === cardId ? 'Now playing' : cardMode === 'preview' && trackId === cardId ? 'Paused' : (shelf.find(s => s.id === cardId)?.status || 'On repeat');
    $$('[data-track]').forEach(b => {
      const on = playing && b.dataset.track === trackId, item = trackItem(b.dataset.track);
      b.setAttribute('aria-pressed', String(on));
      if (item) b.setAttribute('aria-label', `${on ? 'Pause' : 'Play'} preview: ${item.title}${item.artist ? ' by ' + item.artist : ''}`);
    });
    $$('[data-track-host]').forEach(host => {
      const mine = host.dataset.trackHost === trackId;
      host.classList.toggle('is-playing', playing && mine);
      host.style.setProperty('--progress', mine ? share.toFixed(4) : '0');
      const time = $('[data-track-time]', host);
      if (time) time.textContent = mine && audio?.duration ? clock(Math.max(0, audio.duration - audio.currentTime)) : '0:30';
    });
  }
  /* Beat: while a preview plays, the Home lettering jumps on each kick drum and breathes
     with the bass, and the player's equaliser bars follow the real frequencies. The clip is
     requested with CORS so the browser may analyse it; if that fails it still plays, just
     without the pulse. Nothing pulses when motion is reduced. */
  let audioCtx = null, analyser = null, bins = null, corsFailed = false;
  const beat = { avg: 0, pulse: 0, last: 0, t: 0, prev: null, flux: [] };
  function connectAnalyser() {
    if (analyser || corsFailed || !audio || audio.crossOrigin !== 'anonymous') return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      audioCtx = new Context();
      const source = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = .15;
      source.connect(analyser); analyser.connect(audioCtx.destination);
      bins = new Uint8Array(analyser.frequencyBinCount);
    } catch { analyser = null; }
  }
  function updateBeat(now) {
    const playing = !!(analyser && audio && !audio.paused), bars = $$('.np-eq i');
    $('.now-playing')?.classList.toggle('has-levels', playing);
    if (!playing) {
      beat.pulse = 0; beat.t = 0; beat.prev = null; beat.flux.length = 0; scene?.setPulse(0);
      bars.forEach(i => i.style.removeProperty('height'));
      return;
    }
    analyser.getByteFrequencyData(bins);
    const hz = audioCtx.sampleRate / analyser.fftSize;
    const band = (lo, hi) => { let sum = 0, n = 0; for (let i = Math.max(1, Math.floor(lo / hz)); i <= Math.ceil(hi / hz) && i < bins.length; i++) { sum += bins[i]; n++; } return n ? sum / n / 255 : 0; };
    const bass = band(40, 160), dt = beat.t ? Math.min(.1, (now - beat.t) / 1000) : 1 / 60;
    beat.t = now;
    beat.avg += (bass - beat.avg) * Math.min(1, dt * 2);
    // Onset detection: a kick is a sudden jump in low-frequency energy (spectral flux),
    // measured against the song's own recent flux rather than its overall loudness, so
    // heavy sustained bass does not hold the lettering enlarged. Repeats within 230 ms are ignored.
    const lo = Math.max(1, Math.floor(40 / hz)), hi = Math.min(bins.length - 1, Math.ceil(160 / hz));
    let flux = 0;
    if (beat.prev) for (let i = lo; i <= hi; i++) flux += Math.max(0, bins[i] - beat.prev[i]);
    flux /= (hi - lo + 1) * 255;
    beat.prev = (beat.prev && beat.prev.length === bins.length) ? beat.prev : new Uint8Array(bins.length);
    beat.prev.set(bins);
    const recent = beat.flux, mean = recent.reduce((a, b) => a + b, 0) / (recent.length || 1);
    const spread = Math.sqrt(recent.reduce((a, b) => a + (b - mean) ** 2, 0) / (recent.length || 1));
    if (recent.length > 20 && flux > mean + spread * 1.4 && flux > .015 && now - beat.last > 230) { beat.pulse = 1; beat.last = now; }
    recent.push(flux); if (recent.length > 45) recent.shift();
    beat.pulse *= Math.exp(-dt * 8);
    // Between kicks the lettering only breathes with bass that rises above its recent level.
    const breath = Math.min(.35, Math.max(0, bass - beat.avg) * 1.2);
    scene?.setPulse(moving && current?.view === 'home' ? Math.max(beat.pulse, breath) : 0);
    [band(40, 160), band(160, 600), band(600, 2400), band(2400, 8000)].forEach((v, i) => { if (bars[i]) bars[i].style.height = Math.round(18 + v * 82) + '%'; });
  }
  function tick(now) { syncTracks(); updateBeat(now || performance.now()); progressFrame = audio && !audio.paused ? requestAnimationFrame(tick) : 0; }
  function toggleTrack(id) {
    const item = trackItem(id);
    if (!item) return;
    if (!audio) {
      audio = new Audio(); audio.preload = 'none'; audio.crossOrigin = 'anonymous';
      audio.addEventListener('play', () => { audioCtx?.resume(); cancelAnimationFrame(progressFrame); tick(); });
      audio.addEventListener('playing', connectAnalyser);
      audio.addEventListener('pause', () => { syncTracks(); updateBeat(performance.now()); });
      audio.addEventListener('ended', () => { audio.currentTime = 0; syncTracks(); updateBeat(performance.now()); });
      audio.addEventListener('error', () => {
        // Retry once without CORS (no beat analysis) before giving up on the clip.
        if (audio.crossOrigin && !analyser && !corsFailed) {
          corsFailed = true; audio.removeAttribute('crossorigin');
          const src = audio.src; audio.src = src; audio.play().catch(() => syncTracks());
          return;
        }
        trackId = ''; syncTracks(); updateBeat(performance.now());
      });
    }
    showCard(id); cardMode = 'preview';
    if (trackId !== id) {
      audio.src = C.safeUrl(item.preview, ['https:']); trackId = id;
      const cover = C.images(item)[0];
      if ('mediaSession' in navigator && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: item.title, artist: item.artist || '', album: item.album || '', artwork: cover ? [{ src: new URL(cover.src, document.baseURI).href, sizes: '900x900' }] : [] });
    }
    if (audio.paused) audio.play().catch(() => syncTracks()); else audio.pause();
  }
  document.addEventListener('click', e => {
    const button = e.target.closest('[data-track]');
    if (button) { toggleTrack(button.dataset.track); return; }
    // The album panel on the now-playing card: the cover toggles it; outside clicks close it.
    const cover = e.target.closest('.np-cover'), panel = $('#np-panel');
    if (!panel) return;
    if (cover) { const open = panel.hidden; panel.hidden = !open; cover.setAttribute('aria-expanded', String(open)); return; }
    if (!panel.hidden && !e.target.closest('.now-playing')) { panel.hidden = true; $('.np-cover')?.setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('keydown', e => {
    const panel = $('#np-panel');
    if (e.key === 'Escape' && panel && !panel.hidden && !$('dialog[open]')) { panel.hidden = true; $('.np-cover')?.setAttribute('aria-expanded', 'false'); $('.np-cover')?.focus(); }
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
