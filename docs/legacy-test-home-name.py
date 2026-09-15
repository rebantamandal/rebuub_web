"""Check plain homepage metadata and the retained shared glass controls.

Optional developer dependency: Playwright plus Chromium.
Usage: python tools/test_home_glass.py [preview.html] [original-plain-preview.html]
"""
from pathlib import Path
import json
import shutil
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PREVIEW = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent / 'rebuub-updated-preview.html'
BASELINE = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else None
results = []


def check(name, passed, details=None):
    result = {'check': name, 'pass': bool(passed)}
    if details is not None:
        result['details'] = details
    results.append(result)
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)
    assert passed, result


def signature(page):
    return page.evaluate('''() => ['.hero-meta','.hero-owner','.hero-explore'].map(sel => {
      const s = getComputedStyle(document.querySelector(sel));
      return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight',
        'letterSpacing','color','backgroundColor','backgroundImage','backdropFilter',
        'border','borderRadius','boxShadow','padding','gap','justifyContent','pointerEvents']
        .map(k => [k, s[k]]));
    })''')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('chromium-browser'),
        args=['--no-sandbox', '--disable-dev-shm-usage'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    page.route('https://**/*', lambda r: r.abort())
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(PREVIEW.read_text(), wait_until='load')
    page.wait_for_function('window.rebuub && rebuub.scene')
    old = None
    if BASELINE:
        old = browser.new_page(reduced_motion='reduce')
        old.route('https://**/*', lambda r: r.abort())
        old.set_content(BASELINE.read_text(), wait_until='load')
    for width in [320, 390, 520, 760, 768, 1024, 1440, 1920]:
        page.set_viewport_size({'width': width, 'height': 844})
        page.wait_for_timeout(100)
        check(f'Original unboxed name and link fit at {width}px', page.evaluate('''() => {
          const meta = document.querySelector('.hero-meta'), name = document.querySelector('.hero-owner'),
            link = document.querySelector('.hero-explore'), s = getComputedStyle(meta),
            a = name.getBoundingClientRect(), b = link.getBoundingClientRect(), r = meta.getBoundingClientRect();
          return name.textContent.trim() === 'Rebanta Mandal' && !meta.classList.contains('glass-surface') &&
            s.backdropFilter === 'none' && s.backgroundImage === 'none' && s.boxShadow === 'none' &&
            s.borderTopWidth === '0px' && a.left === r.left && b.right === r.right && a.right + 12 < b.left &&
            a.left >= 0 && b.right <= document.body.clientWidth && b.height >= 44 &&
            document.documentElement.scrollWidth <= innerWidth;
        }'''))
        check(f'Glass navigation and controls retained at {width}px', page.evaluate('''() => {
          const nav = document.querySelector('.navigation'), lens = document.querySelector('.nav-lens'),
            active = nav.querySelector('[aria-current="page"]'), l = lens.getBoundingClientRect(), a = active.getBoundingClientRect();
          return getComputedStyle(nav).backdropFilter.includes('blur') &&
            getComputedStyle(document.querySelector('#search-toggle')).backdropFilter.includes('blur') &&
            getComputedStyle(document.querySelector('#motion-toggle')).backdropFilter.includes('blur') &&
            Math.abs(l.left - a.left) < 1 && Math.abs(l.width - a.width) < 1;
        }'''))
        if old:
            old.set_viewport_size({'width': width, 'height': 844})
            check(f'Name and link styles match the original at {width}px', signature(page) == signature(old))
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.wait_for_timeout(200)
    shots = ROOT / 'tests/name-restored'
    shots.mkdir(exist_ok=True)
    page.screenshot(path=str(shots / 'home-desktop.png'))
    page.set_viewport_size({'width': 320, 'height': 844})
    page.wait_for_timeout(200)
    page.screenshot(path=str(shots / 'home-mobile.png'))
    page.locator('.hero-explore').click()
    check('Plain project link opens Projects', page.evaluate("rebuub.page === 'projects'"))
    for route in ['journal', 'shelf', 'about', 'home']:
        page.locator(f'.navigation [data-route="{route}"]').click()
        check(f'Navigation opens {route}', page.evaluate('r => rebuub.page === r', route))
    page.locator('#search-toggle').click()
    check('Search still opens', page.locator('#search-dialog').evaluate('e => e.open'))
    page.keyboard.press('Escape')
    check('Search dismisses with Escape', page.locator('#search-dialog').evaluate('e => !e.open'))
    check('Reduced motion remains paused', page.evaluate("!rebuub.moving && document.documentElement.dataset.motion === 'off'"))
    target = page.locator('#sculpture-interaction')
    target.focus()
    target.press('ArrowRight')
    popped = page.evaluate('rebuub.scene.sculpture.popped')
    target.press('Enter')
    check('Keyboard sphere interaction still works', page.evaluate('rebuub.scene.sculpture.popped') == popped + 1)
    target.press('Home')
    check('Sphere reset still works', page.evaluate('rebuub.scene.sculpture.items.length > 0'))
    touch = browser.new_page(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, reduced_motion='reduce')
    touch.route('https://**/*', lambda r: r.abort())
    touch.set_content(PREVIEW.read_text(), wait_until='load')
    touch.locator('.hero-explore').tap()
    check('Plain project link works on touch', touch.evaluate("rebuub.page === 'projects'"))
    touch.locator('.navigation [data-route="home"]').tap()
    check('Touch navigation returns Home', touch.evaluate("rebuub.page === 'home'"))
    check('No uncaught script errors', not errors, errors)
    browser.close()

(ROOT / 'tests/home-name-restored.json').write_text(json.dumps({
    'checks': len(results), 'passed': all(r['pass'] for r in results),
    'method': 'Chromium embedded HTML; system fonts; viewport, touch and reduced-motion emulation',
    'original_style_comparison': bool(BASELINE), 'results': results
}, indent=2))
print(f'{len(results)} checks passed.', flush=True)
