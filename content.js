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
  const safeUrl = (value, protocols = ['https:', 'http:', 'mailto:']) => {
    try { const u = new URL(value); return protocols.includes(u.protocol) ? u.href : ''; } catch { return ''; }
  };
  const asset = value => {
    if (typeof window !== 'undefined' && window.REBUUB_ASSETS?.[value]) return window.REBUUB_ASSETS[value];
    return /^assets\/[a-zA-Z0-9._/-]+$/.test(value || '') && !value.includes('..') ? value : safeUrl(value, ['https:']);
  };
  const href = (route, local = false) => local ? '#' + route : route === 'home' ? '/' : '/' + route;
  const itemRoute = (section, item) => `${section}/${encodeURIComponent(item.id)}`;
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
    return item ? { view: 'entry', route: itemRoute(section, item), section, item } : { view: 'not-found', route: clean, section: '' };
  }
  function socialLinks(socials) {
    return (socials || []).map(s => ({ ...s, url: safeUrl(s.url) })).filter(s => s.url && s.label).map(s => {
      const external = !s.url.startsWith('mailto:');
      const label = s.label + (external ? ' (opens in a new tab)' : '');
      return `<a class="social-link" href="${esc(s.url)}"${external ? ' target="_blank" rel="noopener noreferrer me"' : ''} aria-label="${esc(label)}" title="${esc(s.label)}">${icon(/^[a-z]+$/.test(s.icon || '') ? s.icon : 'arrow')}</a>`;
    }).join('');
  }
  function quotes(items) {
    return (items || []).filter(q => q.text && q.author).map(q => `<figure class="quote"><blockquote><p>${esc(q.text)}</p></blockquote><figcaption>${esc(q.author)}${q.source ? `, <cite>${esc(q.source)}</cite>` : ''}</figcaption></figure>`).join('');
  }
  function artHtml(art) {
    if (art === 'city') return '<div class="cover-art city"><i class="mist"></i><div class="skyline">' + [53,77,46,93,69,100,54,75,37,89,67,82].map(h => `<i style="height:${h}%"></i>`).join('') + '</div><i class="foreground"></i></div>';
    return '<div class="cover-art landscape"><i class="ridge"></i><i class="mist"></i><i class="ridge two"></i><i class="monolith"></i><i class="ridge three"></i></div>';
  }
  function emptyJournal() {
    return '<div class="empty-state journal-empty glass-surface"><div class="paper-registration" aria-hidden="true"><span>UNWRITTEN</span><span>00</span></div><div class="empty-mark" aria-hidden="true"><i></i><i></i><i><b></b></i><span class="paper-glint"></span></div><div class="empty-copy"><h2>No entries yet.</h2><p>The next thought starts here.</p></div><div class="paper-bottom" aria-hidden="true"><span>rebuub / journal</span><span>+</span></div></div>';
  }
  function projectCards(items, local = false) {
    return items.map((p, i) => {
      const route = itemRoute('projects', p), number = String(i + 1).padStart(2, '0');
      return `<article class="project-card" data-project="${esc(p.id)}"><a class="project-link glass-surface" href="${href(route, local)}" data-route="${esc(route)}"><div class="project-card-top"><span class="project-kicker">${esc(p.category)}</span><span class="card-index">${number}</span></div><div class="project-art">${p.id === 'website' ? '<div class="browser-edge" aria-hidden="true"><span><i></i><i></i><i></i></span><span>rebuub</span><span>+</span></div>' : ''}<img src="${esc(asset(p.image))}" alt="" loading="lazy" width="900" height="680"><i class="art-lens" aria-hidden="true"></i>${p.id === 'glass' ? '<i class="small-art-lens" aria-hidden="true"></i>' : ''}</div><div class="project-info"><div><h2>${esc(p.title)}</h2>${p.summary ? `<p>${esc(p.summary)}</p>` : ''}</div><span class="art-arrow">${icon('arrow')}</span></div></a></article>`;
    }).join('');
  }
  function shelfCards(items, allItems, local = false) {
    return items.map(item => {
      const route = itemRoute('shelf', item), number = String(allItems.indexOf(item) + 1).padStart(2, '0');
      const wordArt = item.image ? '' : `<div class="world-type" aria-hidden="true">${esc(item.title)}</div>`;
      return `<article class="shelf-item" data-world="${esc(item.art || item.id)}"><a class="shelf-link glass-surface" href="${href(route, local)}" data-route="${esc(route)}"><div class="cover" aria-hidden="true">${item.image ? `<img src="${esc(asset(item.image))}" alt="" loading="lazy">` : artHtml(item.art)}${wordArt}<span class="cover-number">${number}</span><span class="cover-category">${esc(item.category)}</span></div><div class="shelf-caption"><div><span class="shelf-card-label">${esc(item.category)}</span><h2>${esc(item.title)}</h2>${item.note ? `<p class="shelf-note">${esc(item.note)}</p>` : ''}</div><span class="art-arrow">${icon('arrow')}</span></div></a><div class="shelf-plinth" aria-hidden="true"></div></article>`;
    }).join('');
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
    return paragraphs(item.body || fallback).map(p => `<p>${esc(p)}</p>`).join('') + (item.sections || []).map((s, i) => `<section id="section-${i + 1}">${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}${paragraphs(s.paragraphs).map(p => `<p>${esc(p)}</p>`).join('')}</section>`).join('');
  }
  function entry(info, config, local = false) {
    const {section, item} = info;
    const index = (config[section] || []).findIndex(p => p.id === item.id);
    const number = String(index + 1).padStart(2, '0');
    const crumb = `<nav class="entry-breadcrumb" aria-label="Breadcrumb"><a href="${href(section, local)}" data-route="${section}" data-return="true">${icon('back')}${labels[section]}</a><span class="breadcrumb-index">${section === 'projects' ? 'PROJECT' : section === 'shelf' ? 'COLLECTION' : 'ENTRY'} / ${number}</span></nav>`;
    const title = `<h1 id="entry-title" tabindex="-1">${esc(item.title)}</h1>`;
    if (section === 'shelf') {
      return `${crumb}<article class="shelf-detail" data-world="${esc(item.art || item.id)}"><figure class="shelf-figure">${item.image ? `<img src="${esc(asset(item.image))}" alt="${esc(item.imageAlt || '')}">` : `<div class="detail-cover" role="img" aria-label="Original ${item.art === 'city' ? 'cityscape' : 'landscape'} cover study">${artHtml(item.art)}</div><figcaption>Original cover study</figcaption>`}<span class="detail-world-number" aria-hidden="true">${number}</span></figure><div class="shelf-reading glass-surface"><div class="entry-category"><i aria-hidden="true"></i>${esc(item.category || '')}</div>${title}<div class="reading-copy">${prose(item, item.note)}</div></div></article>`;
    }
    if (section === 'journal') {
      const date = dateLabel(item.date), mins = readingTime(item);
      return `${crumb}<article class="journal-detail glass-surface"><div class="reading-progress" aria-hidden="true"><i></i></div><header class="reading-header"><div class="entry-meta">${date ? `<time datetime="${esc(item.date)}">${date}</time><span aria-hidden="true">/</span>` : ''}<span>${mins} min read</span></div>${title}${item.tags?.length ? `<div class="entry-tags">${item.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</header>${item.image ? `<figure class="journal-figure"><img src="${esc(asset(item.image))}" alt="${esc(item.imageAlt || '')}">${item.caption ? `<figcaption>${esc(item.caption)}</figcaption>` : ''}</figure>` : ''}<div class="reading-copy">${prose(item)}</div><div class="article-signoff" aria-hidden="true">r.</div></article>`;
    }
    const facts = (item.facts || []).filter(f => f.label && f.value);
    return `${crumb}<article class="project-detail" data-project="${esc(item.id)}"><div class="project-detail-hero"><header class="project-detail-heading"><div class="entry-category">${esc(item.category || '')}</div>${title}${item.summary ? `<p class="detail-summary">${esc(item.summary)}</p>` : ''}<div class="detail-heading-line" aria-hidden="true"><i></i><span>${number}</span></div></header>${item.image ? `<figure class="project-figure glass-surface">${item.id === 'website' ? '<div class="browser-edge" aria-hidden="true"><span><i></i><i></i><i></i></span><span>rebuub</span><span>+</span></div>' : ''}<img src="${esc(asset(item.image))}" alt="${esc(item.imageAlt || '')}" width="900" height="680"><i class="figure-lens" aria-hidden="true"></i>${item.caption ? `<figcaption>${esc(item.caption)}</figcaption>` : ''}</figure>` : ''}</div><div class="project-reading">${facts.length ? `<aside class="project-facts glass-surface" aria-label="Project information"><p class="facts-label">At a glance</p><dl>${facts.map(f => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl></aside>` : ''}<div class="reading-copy"><p class="reading-label">About the project</p>${prose(item)}${safeUrl(item.url, ['https:', 'http:']) ? `<p><a class="external-link glass-button" href="${esc(safeUrl(item.url, ['https:', 'http:']))}" target="_blank" rel="noopener noreferrer">Visit project ${icon('arrow')}</a></p>` : ''}</div></div></article>`;
  }
  return { esc, icon, labels, aliases, paragraphs, safeUrl, asset, href, itemRoute, resolve, socialLinks, quotes, artHtml, projectCards, shelfCards, journalRows, emptyJournal, entry, dateLabel, readingTime };
});
