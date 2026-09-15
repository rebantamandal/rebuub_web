"""Check removal of redundant bottom links and preservation of core navigation.

Run: python tools/test_bottom_navigation.py [preview.html] [previous-preview.html]
Optional test dependency: Playwright with Chromium. The website itself has none.
"""
from pathlib import Path
import json
import shutil
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
arguments = [a for a in sys.argv[1:] if not a.startswith('--')]
PREVIEW = Path(arguments[0]).resolve() if arguments else ROOT.parent / 'rebuub-clean-preview.html'
BASELINE = Path(arguments[1]).resolve() if len(arguments) > 1 else None
REMOVED = '.hero-explore, .page-end, .entry-tail, .next-entry, .about-paths'
ROUTES = ['home', 'projects', 'journal', 'shelf', 'about', 'projects/website', 'projects/glass', 'shelf/death-stranding', 'shelf/cyberpunk', 'not-found']
results = []
shots = ROOT.parent / 'qa-bottom-navigation'
shots.mkdir(exist_ok=True)

def check(name, passed, details=None):
    row = {'check': name, 'passed': bool(passed)}
    if details is not None:
        row['details'] = details
    results.append(row)
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)
    if not passed:
        raise AssertionError(row)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('chromium-browser'), args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce')
    context.route('https://**/*', lambda r:r.abort())
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e:errors.append(str(e)))
    page.set_content(PREVIEW.read_text(), wait_until='load')
    page.wait_for_function('window.rebuub && rebuub.scene')
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900 if width >= 768 else 844})
        for route in ROUTES:
            page.evaluate('r => rebuub.navigate(r)', route)
            page.wait_for_timeout(70)
            check(f'{width}px {route}: no bottom shortcuts', page.locator(REMOVED).count() == 0)
            check(f'{width}px {route}: no horizontal overflow', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
            check(f'{width}px {route}: main navigation intact', page.locator('.navigation a').count() == 5)
            if route != 'home':
                check(f'{width}px {route}: footer breathing room', page.evaluate('''() => { const e = document.querySelector('[data-view]:not([hidden])'); return parseFloat(getComputedStyle(e).paddingBottom) >= 32; }'''))
            if '/' in route:
                check(f'{width}px {route}: top back link retained', page.locator('.entry-breadcrumb a').is_visible())
            if '--screenshots' in sys.argv and width in [320,1440] and route in ['home','projects','about','shelf/death-stranding']:
                page.screenshot(path=str(shots / f'{width}-{route.replace("/","-")}.png'), full_page=True)
    # Check every top-level destination through an actual click.
    page.set_viewport_size({'width':1440,'height':900})
    for route in ['home','projects','journal','shelf','about']:
        page.locator(f'.navigation [data-route="{route}"]').click()
        check(f'Header click opens {route}', page.evaluate('rebuub.page') == route)
    page.locator('.navigation [data-route="projects"]').click()
    page.locator('#projects-grid a').first.click()
    check('Project cards still open detail', page.locator('#entry-title').inner_text() == 'Personal website')
    page.locator('.entry-breadcrumb a').click()
    check('Top breadcrumb returns to collection', page.evaluate('rebuub.page') == 'projects')
    page.locator('.navigation [data-route="shelf"]').click()
    page.locator('#shelf-grid a').first.click()
    check('Shelf cards still open detail', page.locator('#entry-title').inner_text() == 'Death Stranding')
    page.locator('#search-toggle').click()
    page.locator('#site-search').fill('Rain on glass')
    page.locator('.search-result').first.click()
    check('Search still opens project', page.evaluate('rebuub.page') == 'projects/glass')
    page.evaluate('rebuub.navigate("not-a-real-page")')
    page.locator('.lost-page a').click()
    check('404 recovery retained', page.evaluate('rebuub.page') == 'home')
    check('Name remains plain text', page.evaluate('''() => {
      const e = document.querySelector('.hero-meta'), s = getComputedStyle(e);
      return e.innerText.trim() === 'Rebanta Mandal' && !e.querySelector('a') &&
        s.backgroundImage === 'none' && s.backdropFilter === 'none' && s.boxShadow === 'none';
    }'''))
    check('Glass header and footer controls remain', page.evaluate('''() =>
      ['.navigation','#search-toggle','#motion-toggle'].every(s =>
        getComputedStyle(document.querySelector(s)).backdropFilter.includes('blur'))'''))
    page.locator('#motion-toggle').click()
    check('Motion can still be enabled', page.evaluate('rebuub.moving') is True)
    page.locator('#motion-toggle').click()
    check('Motion can still be reduced', page.evaluate('rebuub.moving') is False)
    target = page.locator('#sculpture-interaction')
    target.focus()
    target.press('ArrowRight')
    before = page.evaluate('rebuub.scene.sculpture.popped')
    target.press('Enter')
    check('Keyboard sphere interaction retained', page.evaluate('rebuub.scene.sculpture.popped') == before+1)
    # Verify the plain name has not shifted after removing its adjacent link.
    if BASELINE:
        baseline = context.new_page()
        baseline.set_content(BASELINE.read_text(), wait_until='load')
        baseline.wait_for_function('window.rebuub')
        def box(p):
            return p.locator('.hero-owner').bounding_box()
        for width in [320,390,768,1440]:
            size = {'width':width,'height':844}
            for view in [page,baseline]:
                view.set_viewport_size(size)
                view.evaluate('rebuub.navigate("home")')
                view.wait_for_timeout(80)
            a,b = box(page),box(baseline)
            check(f'{width}px original name position retained', all(abs(a[k]-b[k]) < 1 for k in ['x','y','width','height']), {'before':b,'after':a})
        baseline.close()
    # Future journal entries use the same render helper but must not restore a tail.
    check('Future journal articles have no bottom navigation', page.evaluate('''() => {
      const item = {id:'test-only',title:'Test only',body:['Not published.']};
      const html = RebuubContent.entry({section:'journal',item}, {journal:[item]});
      const t = document.createElement('template'); t.innerHTML = html;
      return !t.content.querySelector('.entry-tail, .next-entry') && !!t.content.querySelector('.entry-breadcrumb');
    }'''))
    # Parse each generated page to verify removal from its actual static markup.
    for file in [ROOT/'index.html',ROOT/'404.html',*sorted((ROOT/'pages').rglob('*.html'))]:
        check(f'Static markup {file.relative_to(ROOT)}: no bottom links', page.evaluate('''({text,selector}) => !new DOMParser().parseFromString(text,'text/html').querySelector(selector)''', {'text':file.read_text(),'selector':REMOVED}))
    touch = browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce')
    touch.route('https://**/*', lambda r:r.abort())
    mobile = touch.new_page()
    mobile.set_content(PREVIEW.read_text(),wait_until='load')
    mobile.locator('.navigation [data-route="projects"]').tap()
    check('Mobile header navigation works', mobile.evaluate('rebuub.page') == 'projects')
    check('No uncaught script errors', not errors, errors)
    browser.close()

(ROOT/'tests/bottom-navigation.json').write_text(json.dumps({'passed':True,'checks':len(results),'method':'Chromium; self-contained HTML injected with set_content; static markup parsed; remote requests blocked; reduced motion except toggle check','results':results},indent=2))
print(f'Passed {len(results)} checks. Screenshots: {shots}')
