/* Shared, escaped markup for the live preview and the static-page generator. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RebuubContent = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#${name}"/></svg>`;
  const labels = { home: 'Home', projects: 'Projects', journal: 'Journal', shelf: 'The shelf', about: 'About' };
  const aliases = { library: 'shelf', work: 'projects', notes: 'journal', lab: 'home' };
  const paragraphs = value => (Array.isArray(value) ? value : value ? [value] : []).filter(v => typeof v === 'string' && v.trim());
  const list = value => (Array.isArray(value) ? value : value ? [value] : []).filter(v => typeof v === 'string' && v.trim());
  const safeUrl = (value, protocols = ['https:', 'http:', 'mailto:']) => {
    try { const u = new URL(value); return protocols.includes(u.protocol) ? u.href : ''; } catch { return ''; }
  };
  const asset = value => {
    if (typeof window !== 'undefined' && window.REBUUB_ASSETS?.[value]) return window.REBUUB_ASSETS[value];
    return /^assets\/[a-zA-Z0-9._/-]+$/.test(value || '') && !value.includes('..') ? value : safeUrl(value, ['https:']);
  };
  const accentStyle = value => /^#[0-9a-f]{3,8}$/i.test(value || '') ? ` style="--accent:${value}"` : '';
  // Every image an item has, in order: the single `image` field first, then `images`.
  const images = item => [
    ...(item?.image ? [{ src: item.image, alt: item.imageAlt, caption: item.caption }] : []),
    ...(Array.isArray(item?.images) ? item.images : [])
  ].map(i => typeof i === 'string' ? { src: i } : i || {})
    .map(i => ({ src: asset(i.src), alt: i.alt || '', caption: i.caption || '' }))
    .filter(i => i.src);
  const href = (route, local = false) => local ? '#' + route : route === 'home' ? '/' : '/' + route;
  const itemRoute = (section, item) => `${section}/${encodeURIComponent(item.id)}`;

  /* Shelf types (Games, Books, Music…) come from config.shelfTypes. An item names
     its type with `type`; older items that only have `category` still match by label. */
  const shelfTypes = config => (Array.isArray(config?.shelfTypes) ? config.shelfTypes : []).filter(t => /^[a-z0-9-]+$/.test(t?.id || '') && t.label);
  function shelfType(item, config) {
    const types = shelfTypes(config);
    return types.find(t => t.id === item.type) || types.find(t => t.label === item.category)
      || { id: 'other', label: item.category || 'Other', singular: item.category || 'Item', facts: [] };
  }
  const shelfTabs = config => {
    const items = config?.shelf || [];
    return shelfTypes(config).filter(t => items.some(i => shelfType(i, config).id === t.id));
  };
  // Fact templates such as 'Played on {platform}' appear only when every value is present.
  function shelfFacts(item, config, limit = Infinity) {
    return list(shelfType(item, config).facts).map(t => {
      let complete = true;
      const text = t.replace(/\{(\w+)\}/g, (_, key) => {
        const v = item[key];
        if (v === undefined || v === null || v === '') { complete = false; return ''; }
        return Array.isArray(v) ? v.join(', ') : String(v);
      });
      return complete ? text : '';
    }).filter(Boolean).slice(0, limit);
  }
  const coverRatio = type => /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.test(type.cover || '') ? type.cover.replace(':', ' / ') : '2 / 3';

  function resolve(route, config) {
    const clean = String(route || '').replace(/^#?\/?|\/+$/g, '');
    const segments = clean.split('/').filter(Boolean);
    let section = segments[0] || 'home';
    if (section === 'index.html') section = 'home';
    section = aliases[section] || section;
    if (!Object.hasOwn(labels, section) || segments.length > 2) return { view: 'not-found', route: clean, section: '' };
    if (segments.length < 2) return { view: section, route: section, section };
    if (!['projects', 'journal', 'shelf'].includes(section)) return { view: 'not-found', route: clean, section: '' };
    let id;
    try { id = decodeURIComponent(segments[1]); } catch { return { view: 'not-found', route: clean, section: '' }; }
    const item = (config[section] || []).find(i => i.id === id);
    if (item) return { view: 'entry', route: itemRoute(section, item), section, item };
    const tab = section === 'shelf' && shelfTypes(config).find(t => t.id === id);
    return tab ? { view: 'shelf', route: 'shelf/' + tab.id, section, tab } : { view: 'not-found', route: clean, section: '' };
  }
  function pageTitle(info) {
    if (info.view === 'home') return 'rebuub';
    const title = info.item?.title || (info.tab ? info.tab.label + ' on the shelf' : info.view === 'not-found' ? 'Page not found' : labels[info.section]);
    return title + ' / rebuub';
  }
  function pageDescription(info, fallback) {
    if (info.tab) return `${info.tab.label} on Rebanta Mandal's shelf.`;
    return info.item?.summary || info.item?.note || paragraphs(info.item?.body)[0] || fallback;
  }

  function socialLinks(socials) {
    return (socials || []).map(s => ({ ...s, url: safeUrl(s.url) })).filter(s => s.url && s.label).map(s => {
      const external = !s.url.startsWith('mailto:');
      const label = s.label + (external ? ' (opens in a new tab)' : '');
      return `<a class="social-link" href="${esc(s.url)}"${external ? ' target="_blank" rel="noopener noreferrer me"' : ''} aria-label="${esc(label)}" title="${esc(s.label)}">${icon(/^[a-z]+$/.test(s.icon || '') ? s.icon : 'arrow')}</a>`;
    }).join('');
  }
  function quotes(items) {
    return (items || []).filter(q => q.text && q.author).map(q => `<figure class="quote"><blockquote><p>${esc(q.text)}</p></blockquote><figcaption><span class="quote-author">${esc(q.author)}</span>${q.source ? `<cite>${esc(q.source)}</cite>` : ''}</figcaption></figure>`).join('');
  }
  const tagList = (tags, label) => list(tags).length ? `<ul class="tag-list" aria-label="${esc(label)}">${list(tags).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  const external = (url, text, cls = 'glass-button') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)} ${icon('arrow')}</a>`;

  // Any figure that opens larger in the image viewer. Images in one entry step through together.
  function openable(img, cls, eager = false) {
    return `<figure class="${cls}"><button class="gallery-open" type="button" data-gallery-open aria-label="${esc('View larger: ' + (img.alt || img.caption || 'image'))}"><img src="${esc(img.src)}" alt="${esc(img.alt)}"${eager ? '' : ' loading="lazy"'} decoding="async"></button>${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ''}</figure>`;
  }
  function gallery(list) {
    if (!list.length) return '';
    return `<section class="entry-gallery" aria-label="More images"><p class="gallery-label"><span>More images</span><span>${String(list.length).padStart(2, '0')}</span></p><div class="gallery-grid">${list.map(img => openable(img, 'gallery-item')).join('')}</div></section>`;
  }
  function artHtml(art) {
    if (art === 'city') return '<div class="cover-art city"><i class="mist"></i><div class="skyline">' + [53,77,46,93,69,100,54,75,37,89,67,82].map(h => `<i style="height:${h}%"></i>`).join('') + '</div><i class="foreground"></i></div>';
    return '<div class="cover-art landscape"><i class="ridge"></i><i class="mist"></i><i class="ridge two"></i><i class="monolith"></i><i class="ridge three"></i></div>';
  }
  function emptyJournal() {
    return '<div class="empty-state journal-empty glass-surface"><div class="paper-registration" aria-hidden="true"><span>UNWRITTEN</span><span>00</span></div><div class="empty-mark" aria-hidden="true"><i></i><i></i><i><b></b></i><span class="paper-glint"></span></div><div class="empty-copy"><h2>No entries yet.</h2><p>The next thought starts here.</p></div><div class="paper-bottom" aria-hidden="true"><span>rebuub / journal</span><span>+</span></div></div>';
  }

  /* Projects: content first. */
  const projectMeta = p => [p.year, p.status].filter(v => v !== undefined && v !== null && v !== '').map(String);
  const sortProjects = items => items.map((p, i) => [p, i]).sort((a, b) => (Number(b[0].year) || 0) - (Number(a[0].year) || 0) || a[1] - b[1]).map(([p]) => p);
  function projectCards(items, local = false) {
    return sortProjects(items).map(p => {
      const route = itemRoute('projects', p), cover = images(p)[0], meta = projectMeta(p);
      return `<article class="project-card" data-project="${esc(p.id)}"><a class="project-link glass-surface" href="${href(route, local)}" data-route="${esc(route)}">${cover ? `<div class="project-thumb"><img src="${esc(cover.src)}" alt="" loading="lazy" decoding="async"></div>` : ''}<div class="project-body"><p class="project-kicker">${esc(p.category || '')}${meta.length ? `<span>${meta.map(esc).join(' · ')}</span>` : ''}</p><h2>${esc(p.title)}</h2>${p.summary ? `<p class="project-summary">${esc(p.summary)}</p>` : ''}${tagList(p.stack, 'Built with')}</div><span class="art-arrow">${icon('arrow')}</span></a></article>`;
    }).join('');
  }

  /* Shelf: personal and aesthetic. */
  function shelfCover(item, config, eager = false) {
    const type = shelfType(item, config), cover = images(item)[0];
    if (cover) return `<img src="${esc(cover.src)}" alt=""${eager ? '' : ' loading="lazy"'} decoding="async">`;
    if (item.art) return artHtml(item.art);
    const byline = shelfFacts(item, config, 1)[0] || type.singular || type.label;
    return `<div class="cover-generated" data-motif="${esc(type.id)}"><span class="cover-generated-type">${esc(type.singular || type.label)}</span><span class="cover-generated-title">${esc(item.title)}</span><span class="cover-generated-by">${esc(byline)}</span></div>`;
  }
  function shelfCards(items, allItems, local = false, config = {}) {
    return items.map(item => {
      const route = itemRoute('shelf', item), type = shelfType(item, config), facts = shelfFacts(item, config, 2);
      return `<article class="shelf-item" data-type="${esc(type.id)}"${accentStyle(item.accent)}><a class="shelf-link" href="${href(route, local)}" data-route="${esc(route)}"><div class="poster" style="--ratio:${coverRatio(type)}">${shelfCover(item, config)}${item.status ? `<span class="poster-status">${esc(item.status)}</span>` : ''}</div><div class="shelf-card-text"><h2>${esc(item.title)}</h2>${facts.length ? `<p class="shelf-meta">${facts.map(esc).join(' · ')}</p>` : ''}${item.note ? `<p class="shelf-note">${esc(item.note)}</p>` : ''}</div></a></article>`;
    }).join('');
  }
  function shelfTabLinks(config, active, counts, local = false) {
    const tabs = shelfTabs(config);
    if (!tabs.length) return '';
    const link = (route, label, count, current) => `<a href="${href(route, local)}" data-route="${route}"${current ? ' aria-current="page"' : ''}>${esc(label)}<span class="tab-count">${count}</span></a>`;
    return link('shelf', 'All', counts.all, !active) + tabs.map(t => link('shelf/' + t.id, t.label, counts[t.id] || 0, active === t.id)).join('');
  }
  const stars = n => {
    const r = Math.round(Number(n));
    return r >= 1 && r <= 5 ? `<p class="shelf-rating" aria-label="Rated ${r} out of 5"><span aria-hidden="true">${'★'.repeat(r)}${'☆'.repeat(5 - r)}</span></p>` : '';
  };
  function spotifyEmbed(value) {
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:' || u.hostname !== 'open.spotify.com') return '';
      const m = u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|episode)\/([A-Za-z0-9]+)\/?$/);
      return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0` : '';
    } catch { return ''; }
  }
  /* Song previews: `preview` is a short https audio clip (for example Apple Music's
     30-second preview). Nothing loads until play is pressed; one shared player in
     app.js drives every button with the same data-track id. */
  const trackLabel = item => `${item.title}${item.artist ? ' by ' + item.artist : ''}`;
  const trackButton = (item, cls) => `<button class="${cls}" type="button" data-track="${esc(item.id)}" aria-pressed="false" aria-label="${esc('Play preview: ' + trackLabel(item))}">${icon('play')}${icon('pause')}</button>`;
  const hostName = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
  function listenBlock(item) {
    const url = safeUrl(item.listen, ['https:']), preview = safeUrl(item.preview, ['https:']);
    // `spotify` adds Spotify's player: the full song for listeners signed in to Spotify.
    const embed = spotifyEmbed(item.spotify || (preview ? '' : url));
    if (!url && !preview && !embed) return '';
    const service = /music\.apple\.com$/.test(hostName(url)) ? 'Apple Music' : /spotify\.com$/.test(hostName(url)) ? 'Spotify' : '';
    const player = preview ? `<div class="track-player" data-track-host="${esc(item.id)}">${trackButton(item, 'track-toggle')}<div class="track-meta"><span class="track-caption">Preview</span><div class="track-bar" aria-hidden="true"><i></i></div></div><span class="track-time" data-track-time aria-hidden="true">0:30</span></div>` : '';
    const note = [preview && `The preview streams${service ? ' from ' + service : ''} when you press play.`, embed && 'The Spotify player loads only when you ask for it; signed-in Spotify listeners hear the full song.'].filter(Boolean).join(' ');
    return `<div class="shelf-listen" data-embed-slot>${player}${embed ? `<button class="glass-button" type="button" data-embed="${esc(embed)}">${icon('play')}${preview ? 'Play full song' : 'Play here'}<span class="embed-service">Spotify</span></button>` : ''}${url ? external(url, service ? 'Listen on ' + service : 'Listen', 'quiet-link') : ''}${note ? `<p class="privacy-note">${esc(note)}</p>` : ''}</div>`;
  }
  // Home "now playing" card for the shelf item named by config.nowPlaying.
  function nowPlaying(config, local = false) {
    const item = (config.shelf || []).find(s => s.id === config.nowPlaying);
    if (!item) return '';
    const cover = images(item)[0], preview = safeUrl(item.preview, ['https:']), url = safeUrl(item.listen, ['https:']);
    const route = itemRoute('shelf', item), details = [item.album, item.year].filter(Boolean).join(' · ');
    return `<aside class="now-playing" data-no-scene data-track-host="${esc(item.id)}" aria-label="Now playing"${accentStyle(item.accent)}><div class="np-bar">${cover ? `<button class="np-cover" type="button" aria-expanded="false" aria-controls="np-panel" aria-label="${esc('Show album details for ' + trackLabel(item))}"><img src="${esc(cover.src)}" alt="" width="44" height="44"></button>` : ''}<div class="np-text"><span class="np-label">${esc(item.status || 'Now playing')}</span><strong>${esc(item.title)}</strong>${item.artist ? `<span>${esc(item.artist)}</span>` : ''}</div><span class="np-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${preview ? trackButton(item, 'np-toggle') : ''}<div class="track-bar np-progress" aria-hidden="true"><i></i></div></div>${cover ? `<div class="np-panel" id="np-panel" hidden><img class="np-art" src="${esc(cover.src)}" alt="${esc(cover.alt)}" loading="lazy" decoding="async"><div class="np-panel-text"><strong>${esc(item.title)}</strong><span>${esc([item.artist, details].filter(Boolean).join(' · '))}</span></div><div class="np-links"><a class="quiet-link" href="${href(route, local)}" data-route="${esc(route)}">On the shelf ${icon('arrow')}</a>${url ? external(url, /music\.apple\.com$/.test(hostName(url)) ? 'Apple Music' : 'Listen', 'quiet-link') : ''}${spotifyEmbed(item.spotify) ? external(safeUrl(item.spotify, ['https:']), 'Spotify', 'quiet-link') : ''}</div></div>` : ''}</aside>`;
  }

  function dateLabel(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
    const d = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  function journalRows(items, allItems, local = false) {
    return items.map(n => {
      const route = itemRoute('journal', n), date = dateLabel(n.date);
      return `<article><a class="journal-row glass-surface" href="${href(route, local)}" data-route="${esc(route)}"><span class="entry-number">${String(allItems.indexOf(n) + 1).padStart(2, '0')}</span><div><h2>${esc(n.title)}</h2>${n.summary ? `<p>${esc(n.summary)}</p>` : ''}${n.tags?.length ? `<div class="entry-tags">${n.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div><span class="entry-side">${date ? `<time datetime="${esc(n.date)}">${date}</time>` : ''}${icon('arrow')}</span></a></article>`;
    }).join('');
  }
  function readingTime(item) {
    const words = [...paragraphs(item.body), ...(item.sections || []).flatMap(s => paragraphs(s.paragraphs))].join(' ').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 220));
  }
  function prose(item, fallback = '') {
    return paragraphs(item.body || fallback).map(p => `<p>${esc(p)}</p>`).join('') + (item.sections || []).map((s, i) => `<section id="section-${i + 1}">${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}${paragraphs(s.paragraphs).map(p => `<p>${esc(p)}</p>`).join('')}${images(s).map(img => openable(img, 'section-figure')).join('')}</section>`).join('');
  }
  const searchText = (item, config) => [item.summary, item.note, item.category, item.status, item.role, item.kind, ...list(item.tags), ...list(item.stack), ...list(item.genre), ...list(item.highlights), item.favouriteLine, ...paragraphs(item.body), ...(item.sections || []).flatMap(s => [s.heading, ...paragraphs(s.paragraphs)]), ...shelfFacts(item, config)].filter(Boolean).join(' ');

  function entry(info, config, local = false) {
    const {section, item} = info;
    const title = `<h1 id="entry-title" tabindex="-1">${esc(item.title)}</h1>`;
    const [lead, ...more] = images(item);
    if (section === 'shelf') {
      const type = shelfType(item, config), facts = shelfFacts(item, config);
      const back = shelfTabs(config).length > 1 ? { route: 'shelf/' + type.id, label: type.label } : { route: 'shelf', label: labels.shelf };
      const crumb = `<nav class="entry-breadcrumb" aria-label="Breadcrumb"><a href="${href(back.route, local)}" data-route="${back.route}" data-return="true">${icon('back')}${esc(back.label)}</a><span class="breadcrumb-index">${esc((type.singular || type.label).toUpperCase())}</span></nav>`;
      const poster = lead ? openable(lead, 'shelf-poster', true) : `<figure class="shelf-poster"><div class="poster" style="--ratio:${coverRatio(type)}">${shelfCover(item, config, true)}</div></figure>`;
      const highlights = list(item.highlights);
      return `${crumb}<article class="shelf-entry" data-type="${esc(type.id)}" data-gallery-scope${accentStyle(item.accent)}>${lead ? `<img class="shelf-ambient" src="${esc(lead.src)}" alt="" aria-hidden="true">` : ''}<div class="shelf-entry-grid" style="--ratio:${coverRatio(type)}">${poster}<div class="shelf-entry-text"><p class="entry-category"><i aria-hidden="true"></i>${esc([type.singular || type.label, item.kind].filter(Boolean).join(' · '))}</p>${title}${facts.length ? `<p class="shelf-facts">${facts.map(f => `<span>${esc(f)}</span>`).join('')}</p>` : ''}${item.status || item.rating ? `<div class="shelf-standing">${item.status ? `<span class="status-badge">${esc(item.status)}</span>` : ''}${stars(item.rating)}</div>` : ''}${item.note ? `<p class="shelf-lead">${esc(item.note)}</p>` : ''}${paragraphs(item.body).length || item.sections?.length ? `<div class="reading-copy"><h2 class="take-label">My take</h2>${prose(item)}</div>` : ''}${item.favouriteLine ? `<figure class="shelf-line"><blockquote><p>${esc(item.favouriteLine)}</p></blockquote>${item.favouriteLineSource ? `<figcaption>${esc(item.favouriteLineSource)}</figcaption>` : ''}</figure>` : ''}${highlights.length ? `<div class="shelf-highlights"><h2>Moments that stayed</h2><ul>${highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>` : ''}${listenBlock(item)}</div></div>${gallery(more)}</article>`;
    }
    const index = (config[section] || []).findIndex(p => p.id === item.id);
    const number = String(index + 1).padStart(2, '0');
    const crumb = `<nav class="entry-breadcrumb" aria-label="Breadcrumb"><a href="${href(section, local)}" data-route="${section}" data-return="true">${icon('back')}${labels[section]}</a><span class="breadcrumb-index">${section === 'projects' ? 'PROJECT' : 'ENTRY'} / ${number}</span></nav>`;
    if (section === 'journal') {
      const date = dateLabel(item.date), mins = readingTime(item);
      return `${crumb}<article class="journal-detail glass-surface" data-gallery-scope><div class="reading-progress" aria-hidden="true"><i></i></div><header class="reading-header"><div class="entry-meta">${date ? `<time datetime="${esc(item.date)}">${date}</time><span aria-hidden="true">/</span>` : ''}<span>${mins} min read</span></div>${title}${item.tags?.length ? `<div class="entry-tags">${item.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</header>${lead ? openable(lead, 'journal-figure', true) : ''}<div class="reading-copy">${prose(item)}</div>${gallery(more)}<div class="article-signoff" aria-hidden="true">r.</div></article>`;
    }
    // Projects read as case studies: facts and links up front, then structured sections.
    const meta = [['Year', item.year], ['Role', item.role], ['Status', item.status], ['Duration', item.duration], ...(item.facts || []).map(f => [f.label, f.value])].filter(([k, v]) => k && v !== undefined && v !== null && v !== '');
    const links = [[safeUrl(item.links?.live || item.url, ['https:', 'http:']), 'Visit live site'], [safeUrl(item.links?.source, ['https:', 'http:']), 'View source'], [safeUrl(item.links?.writeup, ['https:', 'http:']), 'Read more']].filter(([u]) => u);
    const sections = (item.sections || []).map((s, i) => ({ id: 'section-' + (i + 1), heading: s.heading })).filter(s => s.heading);
    const route = itemRoute('projects', item);
    const toc = sections.length > 1 ? `<nav class="case-toc" aria-label="On this page"><p>On this page</p><ol>${sections.map(s => `<li><a href="${local ? '#' + route : href(route)}#${s.id}" data-toc="${s.id}">${esc(s.heading)}</a></li>`).join('')}</ol></nav>` : '';
    return `${crumb}<article class="case-study" data-project="${esc(item.id)}" data-gallery-scope><header class="case-header"><p class="case-kicker">${esc(item.category || '')}</p>${title}${item.summary ? `<p class="case-summary">${esc(item.summary)}</p>` : ''}${meta.length ? `<dl class="case-meta">${meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}${tagList(item.stack, 'Built with')}${links.length ? `<div class="case-links">${links.map(([u, t], i) => external(u, t, i ? 'quiet-link' : 'glass-button')).join('')}</div>` : ''}</header>${lead ? openable(lead, 'case-figure', true) : ''}<div class="case-body${toc ? ' has-toc' : ''}">${toc}<div class="case-content reading-copy">${prose(item)}</div></div>${gallery(more)}</article>`;
  }
  return { esc, icon, labels, aliases, paragraphs, list, safeUrl, asset, href, itemRoute, resolve, pageTitle, pageDescription, images, gallery, socialLinks, quotes, artHtml, projectCards, sortProjects, shelfTypes, shelfType, shelfTabs, shelfFacts, shelfCards, shelfTabLinks, spotifyEmbed, nowPlaying, searchText, journalRows, emptyJournal, entry, dateLabel, readingTime };
});
