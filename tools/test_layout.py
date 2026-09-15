from playwright.sync_api import sync_playwright
from pathlib import Path
import json, shutil
ROOT=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('chromium-browser'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=b.new_page(reduced_motion='reduce')
    page.route('https://rsms.me/**',lambda r:r.abort())
    page.set_content((ROOT.parent/'rebuub-clean-preview.html').read_text(),wait_until='load')
    out=[]
    for w in [320,360,390,520,600,768,1024,1280,1920]:
        page.set_viewport_size({'width':w,'height':900})
        for route in ['projects','journal','shelf','about','projects/website','projects/glass','shelf/death-stranding','shelf/cyberpunk','not-found']:
            page.evaluate('(r)=>window.rebuub.navigate(r)',route)
            page.wait_for_timeout(60)
            r=page.evaluate('''() => {
              const width=document.body.clientWidth;
              return {body:width,html:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('.inner:not([hidden]) *')].filter(e=> {const r=e.getBoundingClientRect();return r.width>0&&(r.right>width+1||r.left < -1)&&getComputedStyle(e).position!=='absolute'}).map(e=>({tag:e.tagName,cls:e.className,x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right}))}
            }''')
            if r['scroll']>r['body']+1 or r['offenders']:out.append({'viewport':w,'route':route,**r})
    print(json.dumps(out,indent=2))
    (ROOT/'tests/responsive.json').write_text(json.dumps({'pass':not out,'widths':[320,360,390,520,600,768,1024,1280,1920],'non_home_routes':9,'route_width_checks':81,'issues':out},indent=2))
    assert not out, 'Layout overflow detected'
    b.close()
