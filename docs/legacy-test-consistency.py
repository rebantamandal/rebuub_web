"""Test shared design contracts, search parity, real routes and home preservation.
Optional: --baseline path/to/previous-preview.html --screenshots output/directory
Requires Playwright, Chromium and Pillow for the optional pixel comparison.
These dependencies are for development tests only.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse, json, shutil, subprocess, sys, time

ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--baseline',type=Path)
parser.add_argument('--screenshots',type=Path)
args=parser.parse_args()
preview=(ROOT.parent/'rebuub-home-glass-preview.html').read_text()
results=[]

def record(name, ok, details=None):
    result={'check':name,'pass':bool(ok)}
    if details is not None: result['details']=details
    results.append(result)
    print(('PASS' if ok else 'FAIL'),name,flush=True)
    assert ok, result

def get_style(page,selector):
    return page.locator(selector).first.evaluate("""e=>{
      const s=getComputedStyle(e),r=e.getBoundingClientRect();
      return {font:s.fontFamily,size:s.fontSize,line:s.lineHeight,weight:s.fontWeight,
      tracking:s.letterSpacing,color:s.color,radius:s.borderRadius,filter:s.backdropFilter,
      height:r.height,x:r.x,y:r.y,width:r.width};}""")

def signature(s,keys):return {k:s[k] for k in keys}

with sync_playwright() as p:
    b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('chromium-browser'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page.route('https://rsms.me/**',lambda r:r.abort())
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(preview,wait_until='load')
    for width in [320,390,600,768,1024,1440,1920]:
        page.set_viewport_size({'width':width,'height':1000})
        headings=[];indices=[];headers=[];controls=[];cards=[]
        for route in ['projects','journal','shelf','about']:
            page.evaluate('(r)=>rebuub.navigate(r)',route);page.wait_for_timeout(60)
            heads=get_style(page,f'[data-view="{route}"] h1')
            headings.append(signature(heads,['font','size','line','weight','tracking','y']))
            indices.append(signature(get_style(page,f'[data-view="{route}"] .page-index'),['font','size','line','tracking','y']))
            headers.append(signature(get_style(page,'.header'),['height','x','y','width']))
            nav=page.locator('.navigation a').evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().height)')
            bounds=page.locator('.navigation').evaluate('e=>{let r=e.getBoundingClientRect();return Array.from(e.querySelectorAll("a")).every(a=>{let q=a.getBoundingClientRect();return q.left>=r.left+4&&q.right<=r.right-4})}')
            record(f'Navigation labels stay inside the capsule: {route} at {width}px',bounds)
            controls.extend(nav)
            controls.append(get_style(page,'#search-toggle')['height'])
            if route in ['projects','shelf']:
                sel='.project-info h2' if route=='projects' else '.shelf-caption h2'
                cards.append(signature(get_style(page,sel),['font','size','line','weight','tracking']))
        record(f'Section heading and label alignment at {width}px',all(x==headings[0] for x in headings) and all(x==indices[0] for x in indices),headings)
        record(f'Header and 44px control contract at {width}px',all(x==headers[0] for x in headers) and min(controls)>=43.9)
        record(f'Gallery and shelf title parity at {width}px',cards[0]==cards[1])
    for route in ['home','projects','journal','shelf','about','projects/glass','shelf/cyberpunk','not-found']:
        page.evaluate('(r)=>rebuub.navigate(r)',route)
        page.locator('#search-toggle').click()
        record('Search expanded state: '+route,page.locator('#search-toggle').get_attribute('aria-expanded')=='true')
        page.locator('#site-search').fill('cyberpunk')
        record('Search status: '+route,page.locator('#search-status').inner_text()=='1 result')
        page.locator('#site-search').press('Escape')
        page.wait_for_function("document.querySelector('#search-toggle').getAttribute('aria-expanded') === 'false'")
        record('One-Escape close and focus: '+route,not page.locator('#search-dialog').is_visible() and page.locator('#search-toggle').get_attribute('aria-expanded')=='false' and page.evaluate('document.activeElement.id')=='search-toggle')
    page.set_viewport_size({'width':1440,'height':1000})
    search_styles=[]
    for route in ['home','projects','journal','shelf','about']:
        page.evaluate('(r)=>rebuub.navigate(r)',route);page.locator('#search-toggle').click()
        search_styles.append(signature(get_style(page,'.search-dialog'),['font','size','radius','filter','width']))
        page.keyboard.press('Escape')
        page.wait_for_function("document.querySelector('#search-toggle').getAttribute('aria-expanded') === 'false'")
    record('Search palette is visually identical across sections',all(x==search_styles[0] for x in search_styles))
    page.emulate_media(forced_colors='active')
    page.evaluate("rebuub.navigate('projects')")
    record('High-contrast headings have visible fill',page.locator('#projects-title').evaluate("e=>getComputedStyle(e).webkitTextFillColor")!='rgba(0, 0, 0, 0)')
    page.emulate_media(forced_colors='none')
    record('No uncaught JavaScript errors',errors==[],errors)
    if args.screenshots:
        args.screenshots.mkdir(parents=True,exist_ok=True)
        for width,height in [(1440,1000),(390,844),(320,844)]:
            page.set_viewport_size({'width':width,'height':height})
            for route in ['projects','journal','shelf','about','projects/website','projects/glass','shelf/death-stranding','shelf/cyberpunk','not-found']:
                page.evaluate('(r)=>rebuub.navigate(r)',route);page.wait_for_timeout(80)
                page.evaluate('document.activeElement.blur()')
                page.screenshot(path=str(args.screenshots/f'{width}-{route.replace("/","-")}.png'),full_page=True)
    page.close()
    if args.baseline:
        from PIL import Image,ImageChops
        import io
        seed='<script>Math.random=(()=>{let s=73921;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};})();</script>'
        for width,height in [(1440,1000),(390,844)]:
            shots=[]
            for document in [args.baseline.read_text(),preview]:
                pg=b.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
                pg.route('https://rsms.me/**',lambda r:r.abort())
                pg.set_content(document.replace('<head>','<head>'+seed,1),wait_until='load')
                pg.wait_for_timeout(300)
                shots.append(Image.open(io.BytesIO(pg.screenshot())).convert('RGB'))
                if document==preview:
                    pg.evaluate("rebuub.navigate('projects');rebuub.navigate('home')")
                    pg.wait_for_timeout(150)
                    back=Image.open(io.BytesIO(pg.screenshot())).convert('RGB')
                    record(f'Homepage unchanged after return at {width}px',ImageChops.difference(shots[-1],back).getbbox() is None)
                pg.close()
            record(f'Homepage pixel preservation at {width}px',ImageChops.difference(*shots).getbbox() is None)
    # Use the included actual HTTP router, rather than claiming a deployment.
    server=subprocess.Popen([sys.executable,str(ROOT/'tools/serve.py'),'8123'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        time.sleep(.4)
        pg=b.new_page(viewport={'width':1024,'height':900},reduced_motion='reduce')
        pg.route('https://rsms.me/**',lambda r:r.abort())
        server_results=[]
        for route in ['/','/projects','/journal','/shelf','/about','/projects/website','/projects/glass','/shelf/death-stranding','/shelf/cyberpunk','/missing-page']:
            res=pg.goto('http://127.0.0.1:8123'+route,wait_until='load',timeout=10000)
            ok=res.status==(404 if route=='/missing-page' else 200) and pg.locator('[data-view]:visible').count()==1
            badimages=pg.locator('img').evaluate_all('(es)=>es.filter(e=>e.getClientRects().length&&(!e.complete||!e.naturalWidth)).length')
            server_results.append({'route':route,'status':res.status,'view':pg.evaluate('rebuub.page'),'broken_visible_images':badimages})
            record('Direct local HTTP route: '+route,ok and not badimages)
        pg.close()
        (ROOT/'tests/consistency-http.json').write_text(json.dumps(server_results,indent=2))
    except Exception as exc:
        # An unsupported execution environment is reported, never called a pass.
        (ROOT/'tests/consistency-http.json').write_text(json.dumps({'tested':False,'limitation':str(exc)},indent=2))
        if 'ERR_BLOCKED_BY_ADMINISTRATOR' not in str(exc):
            raise
        print('SKIP Local HTTP navigation is blocked by the browser environment; no deployment claim.',flush=True)
    finally:
        server.terminate();server.wait(timeout=5)
    b.close()
(ROOT/'tests/consistency.json').write_text(json.dumps({'checks':len(results),'passed':all(r['pass'] for r in results),'results':results},indent=2))
print(f'{len(results)} consistency checks passed.')
