"""Browser checks of the delivered, self-contained preview; no remote assets needed."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re, base64, shutil
ROOT=Path(__file__).resolve().parent.parent
PREVIEW=(ROOT.parent/'rebuub-home-glass-preview.html').read_text()
checks=[]
def check(name,fn):
    fn(); checks.append({'check':name,'pass':True}); print('PASS',name,flush=True)
def equal(a,b):
    assert a==b, f'{a!r} != {b!r}'
def visible(page,sel):
    assert page.locator(sel).is_visible(), sel
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('chromium-browser'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page.set_default_timeout(7000)
    page.route('https://rsms.me/**',lambda r:r.abort())
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(PREVIEW,wait_until='load')
    page.locator('.navigation [data-route="projects"]').click()
    check('Navigation changes the actual route and active link',lambda:equal(page.evaluate('rebuub.page'), 'projects'))
    check('Only the selected view is visible',lambda:equal(page.locator('[data-view]:visible').count(),1))
    check('Project card count',lambda:equal(page.locator('#projects-grid .project-card').count(),2))
    check('Navigation lens tracks selected item',lambda:equal(page.evaluate("Math.abs(document.querySelector('.nav-lens').getBoundingClientRect().left-document.querySelector('.navigation [aria-current]').getBoundingClientRect().left)<2"),True))
    page.locator('.project-link').first.click()
    check('Project card opens full detail page',lambda:equal(page.locator('#entry-title').inner_text(),'Personal website'))
    page.locator('.entry-breadcrumb a').click()
    check('Breadcrumb restores focus to the originating card',lambda:equal(page.evaluate('document.activeElement.dataset.route'),'projects/website'))
    page.locator('.project-link').nth(1).click()
    check('Second project detail',lambda:equal(page.locator('#entry-title').inner_text(),'Rain on glass'))
    page.locator('.next-entry').click()
    check('Next project link',lambda:equal(page.locator('#entry-title').inner_text(),'Personal website'))
    page.locator('#search-toggle').click()
    page.locator('#site-search').fill('Cyberpunk')
    check('Search filters to the matching game',lambda:equal(page.locator('.search-result').count(),1))
    page.locator('#site-search').press('Enter')
    check('Search navigates and closes the dialog',lambda:equal((page.evaluate('rebuub.page'),page.locator('#search-dialog').is_visible()),('shelf/cyberpunk',False)))
    page.locator('.next-entry').click()
    check('Next shelf item link',lambda:equal(page.evaluate('rebuub.page'),'shelf/death-stranding'))
    page.locator('.entry-breadcrumb a').click()
    page.locator('[data-shelf-filter="Games"]').click()
    check('Shelf filtering and pressed state',lambda:equal((page.locator('[data-shelf-filter="Games"]').get_attribute('aria-pressed'),page.locator('.shelf-item').count()),('true',2)))
    page.locator('[data-shelf-filter="All"]').click()
    check('All filter restores focus',lambda:equal(page.evaluate('document.activeElement.dataset.shelfFilter'),'All'))
    page.locator('#search-toggle').click();page.locator('#site-search').press('Escape')
    check('Escape closes search and returns focus',lambda:equal(page.evaluate('document.activeElement.id'),'search-toggle'))
    page.keyboard.press('Control+k')
    check('Keyboard search shortcut',lambda:visible(page,'#search-dialog'))
    page.locator('#site-search').fill('zzzzzz-not-an-item')
    check('No-result search state',lambda:equal(page.locator('.search-empty').inner_text(),'No matches.'))
    page.keyboard.press('Escape')
    page.locator('.navigation [data-route="journal"]').click()
    check('Journal is honestly empty',lambda:equal((page.locator('#journal-count').inner_text(),page.locator('.journal-empty h2').inner_text()),('0 entries','No entries yet.')))
    page.locator('#journal-search').fill('nothing')
    check('Empty journal remains readable during search',lambda:visible(page,'.journal-empty'))
    page.locator('.navigation [data-route="about"]').click()
    check('Biography remains original',lambda:equal(page.locator('#about-copy').inner_text(),'I am interested in how digital spaces feel, as much as how they work.'))
    check('Unconfigured social links remain hidden',lambda:equal(page.locator('#elsewhere').is_visible(),False))
    page.locator('#motion-toggle').click()
    check('Motion can be enabled',lambda:equal(page.evaluate('rebuub.moving'),True))
    page.locator('#motion-toggle').click()
    check('Motion reduction pauses decorative animations',lambda:equal(page.evaluate("getComputedStyle(document.querySelector('.identity-sphere')).animationName"),'none'))
    page.locator('.about-paths .glass-button').click()
    check('About call to action',lambda:equal(page.evaluate('rebuub.page'),'projects'))
    page.evaluate("history.back()")
    page.wait_for_timeout(150)
    check('Browser back restores route',lambda:equal(page.evaluate('rebuub.page'),'about'))
    page.evaluate("history.forward()")
    page.wait_for_timeout(150)
    check('Browser forward restores route',lambda:equal(page.evaluate('rebuub.page'),'projects'))
    page.evaluate("rebuub.navigate('invalid-destination')")
    check('Unknown route uses redesigned 404',lambda:visible(page,'.lost-page'))
    page.locator('.lost-page [data-route="home"]').click()
    check('404 home link returns to Home with the shared glass navigation',lambda:equal(page.evaluate("[rebuub.page,getComputedStyle(document.querySelector('.nav-lens')).display]"),['home','block']))
    check('No uncaught JavaScript errors during user interactions',lambda:equal(errors,[]))
    page.close()

    # Temporary QA-only entries. They never go into SITE or exported pages.
    fixture=[{'id':'test-thought','title':'A <thought> & a question','summary':'A searchable design observation.','date':'2026-09-15','tags':['Design'],'body':['This is a temporary browser-test fixture.']*18,'sections':[{'heading':'A closer look','paragraphs':['This exists only in the automated test.']} ]},{'id':'test-code','title':'Building a quiet interface','summary':'Temporary code entry','date':'2026-09-14','tags':['Code'],'body':['Another temporary test.']}]
    text=PREVIEW.replace('journal: [],','journal: '+json.dumps(fixture)+',',1)
    page=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
    page.route('https://rsms.me/**',lambda r:r.abort())
    page.set_content(text,wait_until='load')
    page.locator('.navigation [data-route="journal"]').click()
    check('Future entries render in the redesigned journal',lambda:equal(page.locator('.journal-row').count(),2))
    page.locator('[data-tag="Design"]').click()
    check('Journal tag filter',lambda:equal(page.locator('.journal-row').count(),1))
    page.locator('#journal-search').fill('non-matching-text')
    check('Journal no-match reset control',lambda:visible(page,'#reset-journal'))
    page.locator('#reset-journal').click()
    check('Clear search and filter',lambda:equal(page.locator('.journal-row').count(),2))
    page.locator('.journal-row').first.click()
    check('Text is escaped, not interpreted as HTML',lambda:equal(page.locator('#entry-title').inner_text(),'A <thought> & a question'))
    check('Future journal detail is glass-framed',lambda:visible(page,'.journal-detail.glass-surface'))
    before=page.locator('.journal-detail').evaluate("e=>Number(e.style.getPropertyValue('--reading-progress'))")
    page.evaluate('window.scrollTo(0,900)');page.wait_for_timeout(100)
    after=page.locator('.journal-detail').evaluate("e=>Number(e.style.getPropertyValue('--reading-progress'))")
    check('Article reading progress follows scroll',lambda:equal(after>before,True))
    page.close()

    # Static HTML must also contain the real content without client-side JS.
    mimes={'.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}
    def static_inline(path):
        text=path.read_text()
        for css in ['styles.css','interiors.css']:
            text=text.replace(f'<link rel="stylesheet" href="{css}">','<style>'+ (ROOT/css).read_text()+'</style>')
        text=re.sub(r'<link[^>]+href="https://rsms.me[^>]*>','',text)
        def img(m):
            f=ROOT/m.group(1)
            return 'src="data:'+mimes[f.suffix]+';base64,'+base64.b64encode(f.read_bytes()).decode()+'"'
        text=re.sub(r'src="(assets/[^\"]+)"',img,text)
        return text
    page=browser.new_page(viewport={'width':1024,'height':900},java_script_enabled=False)
    for route in ['projects','journal','shelf','about','projects/website','projects/glass','shelf/death-stranding','shelf/cyberpunk']:
        text=static_inline(ROOT/'pages'/(route+'.html'))
        page.set_content(text,wait_until='load')
        check('Static no-JavaScript content: '+route,lambda:equal(page.locator('[data-view]:visible').count(),1))
        expected='entry' if '/' in route else route
        check('Correct static route: '+route,lambda:equal(page.locator('[data-view]:visible').get_attribute('data-view'),expected))
    page.close()
    browser.close()
(ROOT/'tests/interior-interactions.json').write_text(json.dumps({'pass':True,'checks':checks},indent=2))
print(f'{len(checks)} checks passed.')
