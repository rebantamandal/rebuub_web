/* No dependencies. Generate complete HTML pages from the same safe templates
   used in the browser. Run again after editing site-config.js. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const C = require(path.join(root, 'content.js'));
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'site-config.js'), 'utf8'), sandbox, { timeout: 1500 });
const config = sandbox.window.SITE;
if (!config || typeof config !== 'object') throw new Error('site-config.js must define window.SITE.');
for (const section of ['projects', 'journal', 'shelf']) {
  const ids = new Set();
  if (!Array.isArray(config[section])) throw new Error(section + ' must be an array.');
  for (const item of config[section]) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id || '') || !item.title) throw new Error(section + ': supply a title and a lowercase hyphenated ID.');
    if (ids.has(item.id)) throw new Error('Duplicate ID in ' + section + ': ' + item.id);
    ids.add(item.id);
  }
}
const sceneAssets = {};
for (const [name, mime] of [['wordmark.svg', 'image/svg+xml'], ['sphere-reference.png', 'image/png']]) {
  sceneAssets['assets/' + name] = 'data:' + mime + ';base64,' + fs.readFileSync(path.join(root, 'assets', name)).toString('base64');
}
fs.writeFileSync(path.join(root, 'scene-assets.js'), 'window.REBUUB_ASSETS=Object.assign(' + JSON.stringify(sceneAssets) + ',window.REBUUB_ASSETS||{});\n');
let template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const fill = (id, text) => { template = template.replace(new RegExp('(<(?:div|span)[^>]*id="' + id + '"[^>]*>)([\\s\\S]*?)(</(?:div|span)>)'), (_, a, b, c) => a + text + c); };
fill('project-count', config.projects.length + (config.projects.length === 1 ? ' project' : ' projects'));
fill('projects-grid', C.projectCards(config.projects));
fill('shelf-grid', C.shelfCards(config.shelf, config.shelf));
fill('shelf-count', config.shelf.length + (config.shelf.length === 1 ? ' item' : ' items'));
fill('journal-count', config.journal.length + (config.journal.length === 1 ? ' entry' : ' entries'));
fill('journal-list', config.journal.length ? C.journalRows(config.journal, config.journal) : C.emptyJournal());
fill('about-copy', C.paragraphs(config.about).map(p => '<p>' + C.esc(p) + '</p>').join(''));
const socials = (config.socials || []).map(s => ({ ...s, url: C.safeUrl(s.url) })).filter(s => s.url);
fill('social-links', socials.map(s => `<a href="${C.esc(s.url)}"${s.url.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener noreferrer"'}>${C.esc(s.label)}${C.icon('arrow')}</a>`).join(''));
if (socials.length) template = template.replace('<div id="elsewhere" hidden>', '<div id="elsewhere">');
if (config.name) template = template.replace(/(<h2[^>]*data-field="name"[^>]*>)[^<]*(<\/h2>)/, '$1' + C.esc(config.name) + '$2');
const siteUrl = C.safeUrl(config.siteUrl, ['https:']);
if (!siteUrl) console.warn('siteUrl is not an https address: canonical links, share-image URLs, sitemap.xml and robots.txt are skipped.');
const absolute = pathname => new URL(pathname, siteUrl).href;
// Home renders the scene straight away; other pages fetch it only if a visitor goes Home.
const sceneScripts = ['wordmark', 'sculpture', 'spheres', 'optics', 'scene', 'interaction'].map(name => `<script src="${name}.js"></script>`).join('\n  ');
const sameAs = (config.socials || []).map(s => C.safeUrl(s.url, ['https:'])).filter(Boolean);
const structuredData = siteUrl && JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': absolute('/#website'), url: absolute('/'), name: config.handle || 'rebuub', author: { '@id': absolute('/#person') } },
    { '@type': 'Person', '@id': absolute('/#person'), name: config.name, alternateName: config.handle, url: absolute('/about'), ...(sameAs.length ? { sameAs } : {}) }
  ]
}).replace(/</g, '\\u003c');
const allRoutes = [...Object.keys(C.labels), ...['projects','journal','shelf'].flatMap(s => config[s].map(item => C.itemRoute(s, item)))];
const pagesDir = path.join(root, 'pages');
fs.rmSync(pagesDir, { recursive: true, force: true });
const rewrites = [];
for (const route of [...allRoutes, 'not-found']) {
  const info = C.resolve(route, config);
  const title = info.view === 'home' ? 'rebuub' : (info.item?.title || C.labels[info.section] || 'Page not found') + ' / rebuub';
  const description = info.item?.summary || info.item?.note || C.paragraphs(info.item?.body)[0] || 'Projects, journal and selected games by rebuub.';
  let text = template.replace('<html lang="en" data-page="home">', `<html lang="en" data-page="${info.section || 'not-found'}" data-current-view="${info.view}" data-interior-kind="${info.item?.id || info.view}">`);
  text = text.replace(/<section data-view="([^"]+)"([^>]*)>/g, (_, view, rest) => `<section data-view="${view}"${rest.replace(/\s+hidden(?:="[^"]*")?/g, '')}${view === info.view ? '' : ' hidden'}>`);
  text = text.replace('<div id="entry-content"></div>', '<div id="entry-content">' + (info.item ? C.entry(info, config) : '') + '</div>');
  text = text.replace(/<title>[^<]*<\/title>/, `<title>${C.esc(title)}</title>`);
  text = text.replace(/(<meta name="description" content=")[^"]*(">)/, '$1' + C.esc(description) + '$2');
  text = text.replace(/(<meta property="og:title" content=")[^"]*(">)/, '$1' + C.esc(title) + '$2');
  text = text.replace(/(<meta property="og:description" content=")[^"]*(">)/, '$1' + C.esc(description) + '$2');
  text = text.replace(/<a href="([^"]*)" data-route="([^"]+)"(?: aria-current="page")?>/g, (_, href, name) => `<a href="${href}" data-route="${name}"${info.section === name ? ' aria-current="page"' : ''}>`);
  const destination = route === 'home' ? 'index.html' : route === 'not-found' ? '404.html' : 'pages/' + route + '.html';
  const depth = destination.split('/').length - 1;
  const initial = '<script>window.REBUUB_INITIAL_ROUTE=' + JSON.stringify(route) + ';' + (depth ? `if(location.protocol==='file:'&&!window.REBUUB_PREVIEW){var lb=document.createElement('base');lb.href='${'../'.repeat(depth)}';document.head.appendChild(lb);}` : '') + '</script>';
  text = text.replace('  <script>\n    window.REBUUB_LOCAL', '  ' + initial + '\n  <script>\n    window.REBUUB_LOCAL');
  text = text.replace(/[ \t]*<!-- SCENE_SCRIPTS -->\r?\n/, route === 'home' ? '  ' + sceneScripts + '\n' : '');
  if (siteUrl) {
    text = text.replace('<meta property="og:image" content="assets/og-image.png">', `<meta property="og:image" content="${C.esc(absolute('/assets/og-image.png'))}">`);
    if (info.view !== 'not-found') {
      const url = C.esc(absolute(C.href(route)));
      text = text.replace('</head>', `<link rel="canonical" href="${url}">\n<meta property="og:url" content="${url}">\n</head>`);
    }
    if (route === 'home') text = text.replace('</head>', `<script type="application/ld+json">${structuredData}</script>\n</head>`);
  }
  fs.mkdirSync(path.dirname(path.join(root, destination)), { recursive: true });
  fs.writeFileSync(path.join(root, destination), text);
  if (!['home', 'not-found'].includes(route)) rewrites.push({ source: C.href(route), destination: '/' + destination });
}
const vercel = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  buildCommand: 'node tools/build_site.js', installCommand: '', outputDirectory: '.',
  rewrites,
  redirects: [
    // The generated files are rewrite targets; keep one public address per page.
    { source: '/pages/:path(.*)\\.html', destination: '/:path', permanent: true },
    { source: '/index.html', destination: '/', permanent: true },
    { source: '/library', destination: '/shelf', permanent: true },
    { source: '/work', destination: '/projects', permanent: true },
    { source: '/notes', destination: '/journal', permanent: true },
    { source: '/lab', destination: '/', permanent: true }
  ],
  headers: [{ source: '/(.*)', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
  ] }]
};
fs.writeFileSync(path.join(root, 'vercel.json'), JSON.stringify(vercel, null, 2) + '\n');
for (const file of ['sitemap.xml', 'robots.txt']) fs.rmSync(path.join(root, file), { force: true });
if (siteUrl) {
  const urls = allRoutes.map(route => `  <url><loc>${C.esc(absolute(C.href(route)))}</loc></url>`).join('\n');
  fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${absolute('/sitemap.xml')}\n`);
}
console.log('Generated ' + allRoutes.length + ' pages and 404.html. No dependencies installed.');
