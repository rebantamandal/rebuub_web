"""Home glass regression checks. Optional development dependency: Playwright.
Run after build_site.js and build_preview.py. Uses Chromium and system fonts.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, shutil

ROOT=Path(__file__).resolve().parent.parent
PREVIEW=ROOT.parent/'rebuub-home-glass-preview.html'
results=[]
def check(name, passed, details=None):
    item={'check':name,'pass':bool(passed)}
    if details is not None: item['details']=details
    results.append(item)
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)
    assert passed,item

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('chromium-browser'),args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(reduced_motion='reduce',viewport={'width':1440,'height':1000})
    page.route('https://rsms.me/**',lambda r:r.abort())
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(PREVIEW.read_text(),wait_until='load')
    for width in [320,360,390,520,600,760,768,1024,1440,1920]:
        page.set_viewport_size({'width':width,'height':844})
        signatures=[]
        for route in ['home','projects','journal','shelf','about']:
            page.evaluate('(r)=>rebuub.navigate(r)',route)
            page.wait_for_timeout(60)
            signatures.append(page.locator('.navigation').evaluate('''e=>{
              const s=getComputedStyle(e),r=e.getBoundingClientRect();
              return [s.backgroundImage,s.backdropFilter,s.borderRadius,s.padding,r.x,r.y,r.width,r.height,
                getComputedStyle(document.querySelector('#search-toggle')).backgroundColor,
                getComputedStyle(document.querySelector('.motion-toggle')).backgroundImage];
            }'''))
        check(f'Home navigation/search/motion style matches all sections at {width}px',all(x==signatures[0] for x in signatures))
        page.evaluate("rebuub.navigate('home')")
        page.wait_for_function("""() => {
          const lens=document.querySelector('.nav-lens').getBoundingClientRect();
          const active=document.querySelector('.navigation [aria-current]').getBoundingClientRect();
          return Math.abs(lens.left-active.left)<1 && Math.abs(lens.width-active.width)<1;
        }""")
        layout=page.evaluate('''()=>{
          const box=s=>document.querySelector(s).getBoundingClientRect();
          const dock=box('.hero-meta'),owner=box('.hero-owner'),button=box('.hero-explore'),nav=box('.navigation');
          const lens=box('.nav-lens'),active=box('.navigation [aria-current]');
          const inDock=r=>r.left>=dock.left&&r.right<=dock.right&&r.top>=dock.top&&r.bottom<=dock.bottom;
          return {noOverflow:document.documentElement.scrollWidth<=innerWidth,
            dockContained:dock.left>=0&&dock.right<=document.body.clientWidth,
            copyContained:inDock(owner)&&inDock(button)&&owner.right+5<button.left,
            targets:[...document.querySelectorAll('.navigation a,.hero-explore,#motion-toggle,#search-toggle')].every(e=>e.getBoundingClientRect().height>=44),
            navContained:[...document.querySelectorAll('.navigation a')].every(e=>{const r=e.getBoundingClientRect();return r.left>=nav.left+4&&r.right<=nav.right-4}),
            lensAligned:Math.abs(lens.left-active.left)<1&&Math.abs(lens.width-active.width)<1,
            glass:getComputedStyle(document.querySelector('.hero-meta')).backdropFilter==='blur(24px) saturate(1.25)'};
        }''')
        check(f'Home glass, content, touch targets and active lens fit at {width}px',all(layout.values()),layout)
    page.set_viewport_size({'width':1440,'height':1000})
    page.locator('.hero-explore').click()
    check('Glass project button opens Projects',page.evaluate("rebuub.page==='projects'"))
    page.locator('.navigation [data-route="home"]').click()
    page.wait_for_timeout(100)
    check('Returning Home keeps the glass lens visible',page.locator('.nav-lens').is_visible())
    check('Original scene initializes with spheres',page.evaluate('!!rebuub.scene && rebuub.scene.sculpture.items.length>0'))
    hit=page.locator('#sculpture-interaction')
    hit.focus(); hit.press('ArrowRight')
    before=page.evaluate('rebuub.scene.sculpture.popped')
    hit.press('Enter')
    check('Keyboard sphere interaction works through the new interface',page.evaluate('rebuub.scene.sculpture.popped')==before+1)
    hit.press('Home')
    check('Sphere reset remains available',page.evaluate('rebuub.scene.sculpture.items.length>0'))
    check('Reduced-motion preference initializes all motion paused',page.evaluate("!rebuub.moving && document.documentElement.dataset.motion==='off'"))
    check('Home controls do not animate in reduced-motion mode',page.locator('.hero-explore').evaluate("e=>getComputedStyle(e).transitionDuration==='0s'"))
    page.emulate_media(reduced_motion='no-preference')
    if not page.evaluate('rebuub.moving'): page.locator('#motion-toggle').click()
    check('Shared motion toggle can enable scene',page.evaluate('rebuub.moving'))
    box=page.locator('.hero-meta').bounding_box()
    page.mouse.move(box['x']+60,box['y']+30);page.wait_for_timeout(70)
    check('Home glass responds to the pointer',page.locator('.hero-meta').evaluate("e=>Boolean(e.style.getPropertyValue('--light-x'))"))
    page.locator('#motion-toggle').click()
    check('Shared motion toggle pauses scene and updates its state',page.evaluate("!rebuub.moving && document.querySelector('#motion-toggle').getAttribute('aria-pressed')==='true'"))
    page.emulate_media(forced_colors='active',reduced_motion='reduce')
    check('Home glass stays readable in high contrast',page.locator('.hero-meta').evaluate("e=>getComputedStyle(e).backdropFilter==='none' && getComputedStyle(e).borderTopStyle==='solid'"))
    page.emulate_media(forced_colors='none')
    session=page.context.new_cdp_session(page)
    session.send('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-transparency','value':'reduce'},{'name':'prefers-reduced-motion','value':'reduce'}]})
    supported=page.evaluate("matchMedia('(prefers-reduced-transparency: reduce)').matches")
    if supported:
        check('Reduced transparency makes Home glass solid',page.locator('.hero-meta').evaluate("e=>getComputedStyle(e).backdropFilter==='none' && getComputedStyle(e).backgroundImage==='none'"))
    session.send('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'reduce'}]})
    check('No uncaught JavaScript errors',not errors,errors)
    touch=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,reduced_motion='reduce')
    touch.route('https://rsms.me/**',lambda r:r.abort())
    touch.set_content(PREVIEW.read_text(),wait_until='load')
    touch.locator('.hero-explore').tap()
    check('Home glass CTA works with touch',touch.evaluate("rebuub.page==='projects'"))
    touch.locator('.navigation [data-route="home"]').tap()
    check('Touch navigation returns Home',touch.evaluate("rebuub.page==='home'"))
    browser.close()
(ROOT/'tests/home-glass.json').write_text(json.dumps({'checks':len(results),'passed':all(r['pass'] for r in results),'method':'Chromium embedded preview; remote font blocked; viewport/touch/media emulation','results':results},indent=2))
print(f'{len(results)} Home glass checks passed.',flush=True)
