/* Wet window compositor.
   One shared, time-varying incident-light field illuminates lettering, metal and
   the water. It is never a random stencil held over the word. Foreground water
   samples the already deformed scene, so the glass itself does not become jelly.
   Real-time screen-space optics / elastic springs; not a physical reconstruction.
*/
(() => {
  'use strict';
  const TAU=Math.PI*2;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  const canvas=()=>document.createElement('canvas');
  function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  function hash(x,y,s){let h=Math.imul(x^s,374761393)+Math.imul(y^s,668265263);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
  function noise(x,y,s){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return lerp(lerp(hash(ix,iy,s),hash(ix+1,iy,s),u),lerp(hash(ix,iy+1,s),hash(ix+1,iy+1,s),u),v);}

  /* A coarse spring sheet. The displacement is smoothly interpolated at full
     resolution; moving off the scene leaves an underdamped, bounded recovery. */
  class ElasticField {
    constructor(w,h){
      this.w=w;this.h=h;this.cols=Math.max(20,Math.round(w/37));this.rows=Math.max(14,Math.round(h/37));
      const n=this.cols*this.rows;this.x=new Float32Array(n);this.y=new Float32Array(n);this.vx=new Float32Array(n);this.vy=new Float32Array(n);
      this.tx=new Float32Array(n);this.ty=new Float32Array(n);this.energy=0;
    }
    update(dt,px,py,active){
      const {cols,rows,w,h}=this,R=Math.min(205,Math.max(120,w*.145)),R2=R*R;
      const steps=Math.max(1,Math.ceil(dt/.016)),step=dt/steps;
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const i=y*cols+x,xx=x/(cols-1)*w,yy=y/(rows-1)*h,dx=xx-px,dy=yy-py,d2=dx*dx+dy*dy;
        const edge=smooth(0,70,Math.min(xx,w-xx,yy,h-yy));
        const k=active?Math.exp(-d2/(R2*.42))*.36*edge:0;
        this.tx[i]=dx*k;this.ty[i]=dy*k;
      }
      for(let s=0;s<steps;s++){
        let energy=0;
        for(let y=1;y<rows-1;y++)for(let x=1;x<cols-1;x++){
          const i=y*cols+x;
          const nx=(this.x[i-1]+this.x[i+1]+this.x[i-cols]+this.x[i+cols])*.25-this.x[i];
          const ny=(this.y[i-1]+this.y[i+1]+this.y[i-cols]+this.y[i+cols])*.25-this.y[i];
          this.vx[i]+=((this.tx[i]-this.x[i])*82+nx*45-this.vx[i]*9.8)*step;
          this.vy[i]+=((this.ty[i]-this.y[i])*82+ny*45-this.vy[i]*9.8)*step;
          this.x[i]=clamp(this.x[i]+this.vx[i]*step,-48,48);this.y[i]=clamp(this.y[i]+this.vy[i]*step,-48,48);
          energy=Math.max(energy,Math.abs(this.x[i]),Math.abs(this.y[i]));
        }
        this.energy=energy;
      }
    }
    reset(){for(const a of [this.x,this.y,this.vx,this.vy,this.tx,this.ty])a.fill(0);this.energy=0;}
    warp(source,out,pw,ph,dpr){
      out.set(source);if(this.energy<.07)return;
      const {cols,rows}=this,dx=this.x,dy=this.y,gx=(cols-1)/pw,gy=(rows-1)/ph;
      // Skip resting cells, rather than re-sampling a full frame after every move.
      for(let ry=0;ry<rows-1;ry++)for(let rx=0;rx<cols-1;rx++){
        const i=ry*cols+rx;
        if(Math.max(Math.abs(dx[i]),Math.abs(dx[i+1]),Math.abs(dx[i+cols]),Math.abs(dx[i+cols+1]),Math.abs(dy[i]),Math.abs(dy[i+1]),Math.abs(dy[i+cols]),Math.abs(dy[i+cols+1]))<.055)continue;
        const xa=Math.ceil(rx/gx),xb=Math.min(pw,Math.ceil((rx+1)/gx));
        const ya=Math.ceil(ry/gy),yb=Math.min(ph,Math.ceil((ry+1)/gy));
        for(let y=ya;y<yb;y++){
          const fy=y*gy-ry,ax=lerp(dx[i],dx[i+cols],fy)*dpr,bx=lerp(dx[i+1],dx[i+cols+1],fy)*dpr;
          const ay=lerp(dy[i],dy[i+cols],fy)*dpr,by=lerp(dy[i+1],dy[i+cols+1],fy)*dpr;
          for(let x=xa;x<xb;x++){
            const fx=x*gx-rx,u=clamp(x-lerp(ax,bx,fx),0,pw-2),v=clamp(y-lerp(ay,by,fx),0,ph-2);
            const ix=u|0,iy=v|0,fx2=u-ix,fy2=v-iy,si=(iy*pw+ix)*4,oi=(y*pw+x)*4;
            for(let k=0;k<3;k++)out[oi+k]=lerp(lerp(source[si+k],source[si+4+k],fx2),lerp(source[si+pw*4+k],source[si+pw*4+4+k],fx2),fy2);
          }
        }
      }
    }
  }

  class WetWindow {
    constructor(display,target){
      this.canvas=display;this.target=target;this.ctx=display.getContext('2d',{alpha:false});
      this.optics=new window.RebuubOptics();
      this.base=canvas();this.b=this.base.getContext('2d',{alpha:false,willReadFrequently:!this.optics.ready});
      this.wordLayer=canvas();this.wc=this.wordLayer.getContext('2d');
      this.ambientWord=canvas();this.litWord=canvas();this.wordHighlight=canvas();
      this.hw=this.wordHighlight.getContext('2d');
      this.bloom=canvas();this.bc=this.bloom.getContext('2d');
      this.mask=canvas();this.mask.width=224;this.mask.height=112;this.mc=this.mask.getContext('2d',{willReadFrequently:true});
      this.maskImage=this.mc.createImageData(this.mask.width,this.mask.height);this.lightField=new Float32Array(this.mask.width*this.mask.height);
      this.sky=canvas();this.sky.width=256;this.sky.height=144;this.sc=this.sky.getContext('2d',{willReadFrequently:true});
      this.glyphs=(window.RebuubWordmark?.glyphs||[]).map(g=>({...g,path:new Path2D(g.d)}));this.wordReady=!!this.glyphs.length;
      this.glyphPath=new Path2D();for(const g of this.glyphs)this.glyphPath.addPath(g.path,new DOMMatrix().translate(g.tx,g.ty));
      this.active=true;this.inView=true;this.visible=!document.hidden;this.moving=true;
      this.seed=(Math.random()*2147483647)|0;this.random=rng(this.seed);this.geometryCache=new Map();
      this.time=0;this.last=0;this.lastDraw=0;this.frameId=0;this.scroll=0;this.exposure=0;
      this.flashStart=-1e9;this.lastFlash=-1e9;this.nextFlash=performance.now()+24000+this.random()*18000;this.flashCount=0;this.flashDuration=1850;this.stormClock=0;this.nextStorm=24+this.random()*18;this.previousInterval=0;
      this.draws=0;this.averageMs=0;this.renderer=this.optics.ready?'webgl-wet-window':'canvas-wet-window';this.pointer={x:-1000,y:-1000,active:false};this.hover=0;
      this.sculpture=new window.RebuubSphereField(this.random);this.sculpture.onChange=()=>this.invalidate();
      this.makeClouds();this.createExposureField(this.seed);
      this.frame=this.frame.bind(this);this.resize=this.resize.bind(this);
      this.observer=new ResizeObserver(this.resize);this.observer.observe(target);
      this.visibilityHandler=()=>{
        this.visible=!document.hidden;this.last=0;
        if(this.visible){this.clearExposure();this.nextStorm=this.stormClock+24+this.random()*18;this.nextFlash=performance.now()+24000;this.kick();}else this.stop();
      };
      document.addEventListener('visibilitychange',this.visibilityHandler);
      this.resize();this.kick();
    }
    makeClouds(){
      this.cloudSize=192;this.cloud=new Float32Array(this.cloudSize*this.cloudSize);
      for(let y=0;y<this.cloudSize;y++)for(let x=0;x<this.cloudSize;x++){
        const u=x/this.cloudSize,v=y/this.cloudSize;
        this.cloud[y*this.cloudSize+x]=noise(u*6,v*6,this.seed)*.54+noise(u*12,v*12,this.seed+3)*.28+noise(u*24,v*24,this.seed+8)*.12+noise(u*48,v*48,this.seed+12)*.06;
      }
      const img=this.sc.createImageData(this.sky.width,this.sky.height);
      for(let y=0;y<this.sky.height;y++)for(let x=0;x<this.sky.width;x++){
        const n=noise(x*.011,y*.017,this.seed)*.62+noise(x*.028,y*.03,this.seed+2)*.38;
        const k=(y*this.sky.width+x)*4;
        img.data[k]=5+n*7;img.data[k+1]=20+n*16;img.data[k+2]=32+n*24;img.data[k+3]=255;
      }
      this.sc.putImageData(img,0,0);
    }
    cloudAt(u,v){
      const s=this.cloudSize,x=((u%1+1)%1)*(s-1),y=((v%1+1)%1)*(s-1),ix=x|0,iy=y|0,fx=x-ix,fy=y-iy,i=iy*s+ix,f=this.cloud;
      return lerp(lerp(f[i],f[i+1],fx),lerp(f[i+s],f[i+s+1],fx),fy);
    }
    invalidate(){if(this.w)this.render(performance.now());}
    resize(){
      const r=this.target.getBoundingClientRect();if(!r.width||!r.height||!this.ctx)return;
      const w=Math.round(r.width),h=Math.round(r.height);if(this.w===w&&this.h===h)return;
      this.w=w;this.h=h;this.dpr=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1200000/(w*h)));
      this.pw=Math.round(w*this.dpr);this.ph=Math.round(h*this.dpr);
      for(const c of [this.canvas,this.base,this.wordLayer,this.ambientWord,this.litWord,this.wordHighlight]){c.width=this.pw;c.height=this.ph;}
      this.output=this.ctx.createImageData(this.pw,this.ph);this.warped=new Uint8ClampedArray(this.output.data.length);
      this.elastic=new ElasticField(w,h);this.geometryCache.clear();this.makeWater();this.prepareSurfaces();
      this.sculpture.resize(w,h,this.dpr);
      const tw=Math.min(w*(w<680?.89:.76),1140),th=tw/(6132.4/1534);
      this.wordBox={x:(w-tw)*.5,y:h*(w<680?.49:.535)-th*.5,w:tw,h:th};
      if(!this.depthComposed){
        // A foreground crossing is visible on arrival, rather than waiting a
        // full rise cycle. Other positions and all later spawns stay random.
        const front=this.sculpture.items.find(b=>b.front&&b.id===Math.floor(this.sculpture.limit*.5)+1);
        if(front){
          front.x=front.px=this.wordBox.x+tw*(.77+(this.random()-.5)*.012);
          front.y=front.py=this.wordBox.y+th*(.72+(this.random()-.5)*.04);
        }
        this.depthComposed=true;
      }
      this.bloom.width=Math.max(1,Math.round(this.pw/3));this.bloom.height=Math.max(1,Math.round(this.ph/3));
      this.prepareWordSurfaces();
      this.render(performance.now());this.kick();
    }
    prepareSurfaces(){
      const {pw,ph}=this;
      const surface=()=>{const a=canvas();a.width=pw;a.height=ph;return [a,a.getContext('2d',{willReadFrequently:true})];};
      const [bg,b]=surface();b.fillStyle='#030406';b.fillRect(0,0,pw,ph);
      b.globalAlpha=.32;b.drawImage(this.sky,0,0,pw,ph);b.globalAlpha=1;
      // Colour belongs to the environment, not a hue filter over the metal.
      // A petrol/cobalt field with a restrained violet counterlight.
      const wash=(x,y,r,color)=>{
        const g=b.createRadialGradient(pw*x,ph*y,0,pw*x,ph*y,Math.max(pw,ph)*r);
        g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');
        b.fillStyle=g;b.fillRect(0,0,pw,ph);
      };
      wash(.17,.30,.68,'rgba(7,54,59,.34)');
      wash(.86,.51,.63,'rgba(12,34,66,.22)');
      wash(.77,.98,.43,'rgba(29,20,64,.12)');
      this.backdrop=bg;
      this.glowMaps=[];
      for(const u of [.15,.85]){
        const [a,g]=surface(),rad=g.createRadialGradient(pw*u,ph*.12,0,pw*u,ph*.12,Math.max(pw,ph)*.95);
        rad.addColorStop(0,u<.5?'rgba(104,222,226,.27)':'rgba(128,161,255,.27)');rad.addColorStop(.52,'rgba(83,143,182,.08)');rad.addColorStop(1,'rgba(7,20,31,0)');
        g.fillStyle=rad;g.fillRect(0,0,pw,ph);this.glowMaps.push(a);
      }
      const [vi,v]=surface(),gradient=v.createRadialGradient(pw*.5,ph*.48,Math.min(pw,ph)*.27,pw*.5,ph*.48,Math.max(pw,ph)*.64);
      gradient.addColorStop(0,'rgba(3,10,21,0)');gradient.addColorStop(1,'rgba(3,10,21,.22)');v.fillStyle=gradient;v.fillRect(0,0,pw,ph);this.vignette=vi;
    }
    makeWater(){
      const r=rng(this.seed+71),area=this.w*this.h;this.beads=[];this.runners=[];
      const count=Math.min(1050,Math.max(220,Math.round(area/1320)));
      for(let i=0;i<count;i++){
        const x=r()*this.w,y=r()*this.h,n=noise(x*.006,y*.008,this.seed+123);
        if(n<.27&&r()>.3)continue;
        const big=i%13===0,hero=i%73===0,rr=hero?8+r()*4.5:big?4.5+r()*3.4:1.1+Math.pow(r(),2)*3.7;
        this.beads.push({x,y,r:rr*(this.w<600?.79:1),ratio:1.02+r()*.40,shape:Math.floor(r()*7),wet:true,wake:0,opacity:.85+r()*.15});
      }
      const countR=Math.min(18,Math.max(5,Math.round(area/82000)));
      for(let i=0;i<countR;i++){
        const d={x:r()*this.w,y:r()*this.h,r:3.1+r()*3.9,speed:12+r()*35,terminal:25+r()*58,pin:r()*3,ratio:1.4,phase:r()*TAU,shape:Math.floor(r()*7),path:[],wet:true,opacity:1};
        for(let j=32;j>=0;j--){const yy=d.y-j*4;if(yy>0)d.path.push({x:d.x+Math.sin(yy*.027+d.phase)*1.1,y:yy,t:this.time-j*.12});}
        this.runners.push(d);
      }
    }
    advanceWater(dt){
      if(dt<=0)return;this.time+=dt;const r=this.random;
      for(const b of this.beads)if(!b.wet&&this.time>b.wake){b.x=r()*this.w;b.y=r()*this.h;b.r=.85+Math.pow(r(),1.8)*4.5;b.wet=true;}
      for(const d of this.runners){
        if(d.pin>0){d.pin-=dt;d.speed*=Math.exp(-dt*4.5);}else{
          d.speed+=(d.terminal-d.speed)*Math.min(1,dt*1.6);
          if(r()<dt*.095){d.pin=.15+r()*1.1;d.terminal=22+r()*62;}
        }
        const oy=d.y;d.y+=d.speed*dt;d.x+=Math.sin(d.y*.023+d.phase)*d.speed*dt*.035;
        d.ratio=1.32+Math.min(.52,d.speed*.006);
        if(!d.path.length||d.y-d.path[d.path.length-1].y>1.5)d.path.push({x:d.x,y:d.y,t:this.time});
        while(d.path.length&&(this.time-d.path[0].t>10||d.y-d.path[0].y>270))d.path.shift();
        if(d.y-oy>.1)for(const b of this.beads){
          if(!b.wet||Math.abs(b.x-d.x)>d.r+b.r)continue;
          if(Math.hypot(b.x-d.x,(b.y-d.y)*.83)<(d.r+b.r)*.75){
            d.r=Math.min(10.2,Math.cbrt(d.r**3+b.r**3));d.speed=Math.min(95,d.speed+3+b.r*2);d.terminal=Math.min(95,d.terminal+b.r*.8);b.wet=false;b.wake=this.time+9+r()*17;
          }
        }
        if(d.y>this.h+40){d.y=-20;d.x=r()*this.w;d.r=2.7+r()*3.5;d.path=[];d.speed=6;d.pin=r()*1.5;}
      }
    }
    /* Each event has a branched channel. Its light sources travel with the
       stepped leader, then decay and shift through the following discharge. */
    createExposureField(seed){
      const r=rng(seed),side=r()>.5?1:-1;
      this.event={seed,side,phase:r()*TAU,offset:[r()*.6,r()*.5],sweep:side*(.27+r()*.22),sx:side>0?.08:.92,sy:-.10+r()*.08,ex:.32+r()*.36,ey:.25+r()*.14};
      const E=this.event;
      const path=(a,b,rough,depth)=>{
        if(depth===0)return[a,b];
        const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,off=(r()-.5)*rough;
        const m=[(a[0]+b[0])*.5-dy/len*off,(a[1]+b[1])*.5+dx/len*off];
        const p=path(a,m,rough*.54,depth-1),q=path(m,b,rough*.54,depth-1);return p.slice(0,-1).concat(q);
      };
      E.main=path([E.sx,E.sy],[E.ex,E.ey],.15,6);E.branches=[];
      for(let j=0;j<6;j++){
        const at=12+Math.floor(r()*39),a=E.main[at];
        const b=[a[0]+side*(.07+r()*.18)*(r()>.4?1:-1),a[1]+.05+r()*.17];
        E.branches.push({points:path(a,b,.07,4),start:at/E.main.length,weight:.28+r()*.25});
      }
      this.lightX=-.55*side;this.lightY=-.72;this.lightZ=.50;this.half=[-.3*side,-.48,.84];this.lightSide=side;
      // Cache the diffuse glow once per event. No full-size blur per frame.
      this.bolt=canvas();this.bolt.width=960;this.bolt.height=600;
      const bc=this.bolt.getContext('2d',{willReadFrequently:true});
      const trace=(points,weight)=>{
        bc.beginPath();bc.moveTo(points[0][0]*960,points[0][1]*600);
        for(let i=1;i<points.length;i++)bc.lineTo(points[i][0]*960,points[i][1]*600);
        bc.lineJoin='miter';bc.lineCap='round';bc.shadowColor='rgba(146,177,199,.40)';bc.shadowBlur=9;
        bc.lineWidth=.9;bc.strokeStyle=`rgba(201,219,231,${weight*.53})`;bc.stroke();
        bc.shadowBlur=0;bc.lineWidth=.35;bc.strokeStyle=`rgba(233,239,244,${weight*.35})`;bc.stroke();
      };
      trace(E.main,1);for(const b of E.branches)trace(b.points,b.weight);
      this.updateLightField(this.flashStart+140);
    }
    updateLightField(now){
      const E=this.event,age=this.moving?clamp((now-this.flashStart)/1000,0,1.5):.22;
      const progress=clamp(age/.50),drift=age*E.sweep*1.5;
      this.sourceU=lerp(E.sx,E.ex,smooth(0,.45,age));this.sourceV=lerp(E.sy,E.ey,progress);
      this.lightX=(this.sourceU-.5)*1.35;this.lightY=-.70+this.sourceV*.3;this.lightZ=.62;
      const l=Math.hypot(this.lightX,this.lightY,this.lightZ);this.lightX/=l;this.lightY/=l;this.lightZ/=l;
      const hl=Math.hypot(this.lightX,this.lightY,this.lightZ+1);this.half=[this.lightX/hl,this.lightY/hl,(this.lightZ+1)/hl];
      const mw=this.mask.width,mh=this.mask.height,data=this.maskImage.data,f=this.lightField;
      for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){
        const u=x/(mw-1),v=y/(mh-1);
        const n=this.cloudAt(u*.57+E.offset[0]+age*.017,v*.52+E.offset[1]-age*.023);
        const n2=this.cloudAt(u*.98+E.offset[1]-age*.055,v*.83+E.offset[0]+age*.024);
        const cx=.22+drift+Math.sin(v*4.3+E.phase)*.13;
        const b1=Math.exp(-Math.pow((u-cx)/.24,2)),b2=Math.exp(-Math.pow((u-(.78-drift*.6)+Math.sin(v*6-E.phase)*.1)/.17,2));
        const caustic=Math.sin(u*14-v*6+E.phase-age*4.7)*.064+Math.sin(u*27+v*8-age*6.1)*.027;
        const e=.55+b1*.34+b2*.23-n*.58-n2*.11+caustic+Math.sin(u*11.0+v*5.1+E.phase-age*7.5)*.15;
        const reflectance=this.moving?Math.pow(smooth(.24,.63,e),1.13):1;
        const i=y*mw+x,j=i*4;
        f[i]=.20+smooth(.02,.8,e)*.80;
        data[j]=Math.round(f[i]*255);data[j+1]=255;data[j+2]=255;data[j+3]=Math.round(reflectance*255);
      }
      this.mc.putImageData(this.maskImage,0,0);this.fieldPhase=age;
    }
    fieldAt(x,y){
      const mw=this.mask.width,mh=this.mask.height,u=clamp(x/this.w)*(mw-1),v=clamp(y/this.h)*(mh-1);
      const x0=Math.min(mw-2,u|0),y0=Math.min(mh-2,v|0),fx=u-x0,fy=v-y0,i=y0*mw+x0,f=this.lightField;
      return lerp(lerp(f[i],f[i+1],fx),lerp(f[i+mw],f[i+mw+1],fx),fy);
    }
    /* Ambient lettering and the storm exposure are separate surfaces. The
       weather can never erase the base word; only its highlights are masked. */
    prepareWordSurfaces(){
      const d=this.dpr,B=this.wordBox,v=window.RebuubWordmark.viewBox,s=B.w/v[2];
      for(const [surface,bright] of [[this.ambientWord,false],[this.litWord,true]]){
        const c=surface.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.pw,this.ph);
        c.setTransform(d,0,0,d,0,0);c.translate(B.x-v[0]*s,B.y-v[1]*s);c.scale(s,s);
        const metal=c.createLinearGradient(300,-1500,5650,100);
        metal.addColorStop(0,bright?'#f7ffff':'#a0e3e3');
        metal.addColorStop(.36,bright?'#ffffff':'#d7eef7');
        metal.addColorStop(.65,bright?'#eff6ff':'#b6d3ee');
        metal.addColorStop(1,bright?'#f2efff':'#a3ade3');
        c.fillStyle=metal;c.fill(this.glyphPath);
        if(!bright){c.strokeStyle='rgba(209,225,241,.16)';c.lineWidth=.65/s;c.stroke(this.glyphPath);}
      }
    }
    prepareWord(light){
      const c=this.wc,d=this.dpr,w=this.w,h=this.h,B=this.wordBox,v=window.RebuubWordmark.viewBox,s=B.w/v[2];
      c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.pw,this.ph);
      c.drawImage(this.ambientWord,0,0);
      if(light>.003){
        const q=this.hw;q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,this.pw,this.ph);
        q.globalCompositeOperation='source-over';q.drawImage(this.litWord,0,0);
        q.globalCompositeOperation='destination-in';q.drawImage(this.mask,0,0,this.pw,this.ph);q.globalCompositeOperation='source-over';
        // Local optical bloom, not a full-screen white flash. A small texture
        // keeps the blur inexpensive; the text itself stays sharply rendered.
        const b=this.bc;b.clearRect(0,0,this.bloom.width,this.bloom.height);
        b.drawImage(this.wordHighlight,0,0,this.bloom.width,this.bloom.height);
        c.save();c.globalCompositeOperation='screen';c.globalAlpha=light*.24;
        c.filter='blur('+Math.max(4,9*d)+'px)';c.drawImage(this.bloom,0,0,this.pw,this.ph);
        c.globalAlpha=light*.10;c.filter='blur('+Math.max(12,26*d)+'px)';c.drawImage(this.bloom,0,0,this.pw,this.ph);c.restore();
        c.globalAlpha=Math.min(1,light*1.28);c.drawImage(this.wordHighlight,0,0);c.globalAlpha=1;
      }

    }
    lightningEnvelope(now){
      if(!this.moving)return{light:0,channel:0,leader:0};
      const a=now-this.flashStart;
      if(a<0||a>=this.flashDuration)return{light:0,channel:0,leader:0};
      // One soft distant discharge, no rapid repeated flashes. Brightness is
      // capped independently of the background so every palette stays dark.
      const primary=smooth(0,180,a)*Math.exp(-Math.max(0,a-205)/330);
      const tail=smooth(80,230,a)*Math.exp(-Math.max(0,a-250)/510)*.20;
      const end=1-smooth(this.flashDuration-380,this.flashDuration,a);
      return {light:Math.min(.16,(primary+tail)*.125)*end,channel:primary*.26*end,leader:0};
    }
    exposureAt(now){return this.lightningEnvelope(now).light;}
    drawLightning(c,now){
      const env=this.lightningEnvelope(now);if(!this.moving||(!env.channel&&!env.leader))return;
      c.save();
      if(env.channel>.008){c.globalAlpha=env.channel;c.drawImage(this.bolt,0,0,this.w,this.h);}
      else if(env.leader>0&&env.leader<1){
        const points=this.event.main,n=Math.max(2,Math.floor(points.length*env.leader));
        c.beginPath();c.moveTo(points[0][0]*this.w,points[0][1]*this.h);
        for(let i=1;i<n;i++)c.lineTo(points[i][0]*this.w,points[i][1]*this.h);
        c.lineWidth=.55;c.strokeStyle='rgba(177,195,209,.07)';c.stroke();
      }
      c.restore();
    }
    prepareSource(light,now){
      const c=this.b,w=this.w,h=this.h,d=this.dpr;
      c.setTransform(d,0,0,d,0,0);c.globalAlpha=1;
      c.drawImage(this.backdrop,0,0,w,h);
      window.RebuubAtmosphere?.drawRegion(c,this.target);
      if(light>.001){
        c.save();c.globalAlpha=light*.30;
        c.drawImage(this.glowMaps[this.lightSide>0?0:1],0,0,w,h);c.restore();
        this.drawLightning(c,now);
      }
      // Render the original material ONCE, then place the same live surfaces
      // on either side of the lettering. Foreground metal is fully opaque.
      this.sculpture.prepareFrame(light*.9,[this.lightX,-this.lightY,this.lightZ],this.scroll);
      this.sculpture.drawLayer(c,false,.76+light*.16);
      if(this.wordReady){
        this.prepareWord(light);c.drawImage(this.wordLayer,0,0,w,h);
        const B=this.wordBox,v=window.RebuubWordmark.viewBox,s=B.w/v[2];
        c.save();c.translate(B.x-v[0]*s,B.y-v[1]*s);c.scale(s,s);c.clip(this.glyphPath);
        c.setTransform(d,0,0,d,0,0);this.sculpture.drawLetterShadows(c);c.restore();
      }
      this.sculpture.drawLayer(c,true,1);

      return this.optics.ready?this.base:c.getImageData(0,0,this.pw,this.ph).data;
    }
    geometry(radius,ratio,shape){
      const r=Math.max(.65,Math.round(radius*this.dpr*2)/2),ry=Math.max(.7,Math.round(radius*ratio*this.dpr*2)/2),key=`${r}/${ry}/${shape}`;
      if(this.geometryCache.has(key))return this.geometryCache.get(key);
      const mx=Math.ceil(r+1),my=Math.ceil(ry+1),points=[],eta=1/1.333,depth=r*3.4+this.dpr*.5;
      for(let yy=-my;yy<=my;yy++)for(let xx=-mx;xx<=mx;xx++){
        const yn=yy/ry,asym=1+yn*.09+Math.sin(shape*1.8)*yn*.045,xn=xx/(r*asym),q=xn*xn+yn*yn;
        const cover=clamp((1-Math.sqrt(q))*Math.min(r,ry)+.5);if(cover<=0)continue;
        const k=.965/Math.max(1,Math.sqrt(q)),nx=xn*k,ny=yn*k,nz=Math.sqrt(Math.max(.012,1-nx*nx-ny*ny));
        const refr=eta*nz-Math.sqrt(Math.max(0,1-eta*eta*(1-nz*nz))),tz=-eta+refr*nz;
        const dx=refr*nx/-tz*depth,dy=refr*ny/-tz*depth*.92;
        const fresnel=.0204+.9796*Math.pow(1-nz,5);
        points.push(xx,yy,dx,dy,nx,ny,nz,cover,fresnel,q);
      }
      const result=new Float32Array(points);this.geometryCache.set(key,result);
      if(this.geometryCache.size>600)this.geometryCache.delete(this.geometryCache.keys().next().value);
      return result;
    }
    lens(drop,src,out,light){
      const {pw,ph,dpr}=this,cx=Math.round(drop.x*dpr),cy=Math.round(drop.y*dpr),g=this.geometry(drop.r,drop.ratio,drop.shape);
      const field=this.fieldAt(drop.x,drop.y),illumination=light*(.28+field*.72),[hx,hy,hz]=this.half;
      for(let i=0;i<g.length;i+=10){
        const x=cx+g[i],y=cy+g[i+1];if(x<0||x>=pw||y<0||y>=ph)continue;
        const u=clamp(x+g[i+2],0,pw-2),v=clamp(y+g[i+3],0,ph-2),ix=u|0,iy=v|0,fx=u-ix,fy=v-iy,si=(iy*pw+ix)*4,oi=(y*pw+x)*4;
        const nx=g[i+4],ny=g[i+5],nz=g[i+6],alpha=g[i+7]*drop.opacity,F=g[i+8],q=g[i+9];
        const H=Math.max(0,nx*hx+ny*hy+nz*hz),spec=Math.pow(H,74),broad=Math.pow(H,12);
        // Fresnel reflection, a directed catchlight, and the dark contact meniscus.
        const top=Math.pow(Math.max(0,-ny*.83+nz*.32+nx*.09),7);
        const window=Math.exp(-Math.pow((nx+.37+ny*.20)/.065,2))*smooth(-.35,.4,-ny)*smooth(.10,.85,nz);
        const rim=F*(17+illumination*117)*Math.max(.10,-ny*.7+.3);
        const gleam=top*12+window*(11+illumination*32)+spec*(8+illumination*212)+broad*illumination*16+rim;
        const contact=smooth(.49,.94,q)*(.22+Math.max(0,ny)*.2);
        const trans=(1-F)*(.98-contact)*(.96+.04*nz);
        const focus=1+illumination*.30*Math.pow(Math.max(0,-nx*hx-ny*hy),3);
        for(let k=0;k<3;k++){
          const sample=lerp(lerp(src[si+k],src[si+4+k],fx),lerp(src[si+pw*4+k],src[si+pw*4+4+k],fx),fy);
          const tint=k===0?.90:k===1?.96:1;
          out[oi+k]=lerp(out[oi+k],sample*trans*focus+gleam*tint,alpha);
        }
      }
    }
    trail(drop,src,out,light){
      const path=drop.path,{pw,ph,dpr}=this;if(path.length<2)return;
      const illum=light*this.fieldAt(drop.x,drop.y);
      for(let j=1;j<path.length;j++){
        const a=path[j-1],b=path[j],age=this.time-b.t,fade=clamp(1-age/10)*.67;
        const steps=Math.max(1,Math.ceil((b.y-a.y)*dpr));
        for(let n=0;n<steps;n++){
          const t=n/steps,cx=lerp(a.x,b.x,t)*dpr,y=Math.round(lerp(a.y,b.y,t)*dpr);if(y<0||y>=ph)continue;
          const halfWidth=Math.max(.7,dpr*(.5+drop.r*.19)*(1-age/15)),start=Math.floor(cx-halfWidth-1),end=Math.ceil(cx+halfWidth+1);
          for(let px=start;px<=end;px++){
            if(px<1||px>=pw-2)continue;const nn=(px-cx)/halfWidth,cover=clamp((1-Math.abs(nn))*halfWidth+.5);if(!cover)continue;
            const normal=clamp(nn,-1,1),sx=clamp(Math.round(px-normal*halfWidth*1.7),0,pw-1),si=(y*pw+sx)*4,oi=(y*pw+px)*4;
            const highlight=Math.exp(-Math.pow((normal+.65)/.17,2))*(3.0+illum*38),edge=.90-.22*Math.abs(normal);
            for(let k=0;k<3;k++)out[oi+k]=lerp(out[oi+k],src[si+k]*edge+highlight,fade*cover);
          }
        }
      }
    }
    beginExposure(now=performance.now()){
      if(!this.moving||!this.active||!this.visible||!this.inView||now-this.lastFlash<30000)return false;
      this.lastFlash=now;this.flashStart=now;this.flashCount++;
      this.flashDuration=1750+this.random()*300;
      this.createExposureField((this.random()*2147483647)|0);
      this.event.echo=0;this.event.echoAt=0;
      const interval=38000+this.random()*40000;
      this.previousInterval=interval;this.nextFlash=now+interval;
      this.nextStorm=this.stormClock+interval/1000;return true;
    }
    setPointer(x,y,active=true){
      this.pointer.x=x;this.pointer.y=y;this.pointer.active=active;
      const q=this.scenePoint(x,y);this.sculpture.setPointer(q.x,q.y,active&&this.moving);
      if(this.moving)this.kick();
    }
    scenePoint(x,y){
      const e=this.elastic;if(!e||e.energy<.07)return{x,y};
      const gx=clamp(x/this.w)*(e.cols-1),gy=clamp(y/this.h)*(e.rows-1);
      const ix=Math.min(e.cols-2,Math.floor(gx)),iy=Math.min(e.rows-2,Math.floor(gy)),fx=gx-ix,fy=gy-iy,i=iy*e.cols+ix;
      const sample=a=>lerp(lerp(a[i],a[i+1],fx),lerp(a[i+e.cols],a[i+e.cols+1],fx),fy);
      return{x:x-sample(e.x),y:y-sample(e.y)};
    }
    wordContains(x,y){
      if(!this.wordReady)return false;
      const B=this.wordBox,v=window.RebuubWordmark.viewBox,s=B.w/v[2],c=this.wc;
      c.save();c.setTransform(1,0,0,1,0,0);
      const hit=c.isPointInPath(this.glyphPath,(x-B.x)/s+v[0],(y-B.y)/s+v[1]);
      c.restore();return hit;
    }
    pickSphere(x,y,padding=0){const q=this.scenePoint(x,y);return this.sculpture.pick(q.x,q.y-this.scroll,padding,this.wordContains(q.x,q.y));}
    popSphere(x,y,padding=0){const item=this.pickSphere(x,y,padding);if(!item)return false;this.sculpture.pop(item,!this.moving);this.updateObject();return true;}
    updateObject(){if(!this.moving)this.render(performance.now());else this.kick();}
    setScroll(value){this.scroll=value;}
    clearExposure(){this.flashStart=-1e9;this.exposure=0;}
    setMoving(value){
      this.moving=!!value;this.last=0;this.clearExposure();this.sculpture.velocity=[0,0];
      if(!this.moving){this.elastic?.reset();this.pointer.active=false;this.hover=0;this.sculpture.setPointer(0,0,false);this.sculpture.setContact?.(0,0,false);this.sculpture.update(0,false);}
      this.nextStorm=this.stormClock+24+this.random()*18;this.nextFlash=performance.now()+24000;
      if(this.w)this.render(performance.now());if(this.moving)this.kick();else this.stop();
    }
    setActive(value){
      const changed=this.active!==!!value;this.active=!!value;this.last=0;
      if(this.active){if(changed){this.clearExposure();this.nextStorm=this.stormClock+24+this.random()*18;this.nextFlash=performance.now()+24000;}this.resize();this.kick();}else this.stop();
    }
    setInView(value){this.inView=!!value;this.last=0;if(value)this.kick();else this.stop();}
    stop(){cancelAnimationFrame(this.frameId);this.frameId=0;}
    kick(){if(this.ctx&&this.active&&this.inView&&this.visible&&this.moving&&!this.frameId)this.frameId=requestAnimationFrame(this.frame);}
    frame(now){
      this.frameId=0;if(!this.active||!this.visible||!this.inView||!this.moving)return;
      // Present on every available display frame; no 30 Hz idle cap.
      const dt=this.last?Math.min((now-this.last)/1000,.065):1/60;this.last=now;
      this.advanceWater(dt);
      const p=this.pointer,q=this.scenePoint(p.x,p.y);
      this.sculpture.setPointer(q.x,q.y-this.scroll,p.active);
      this.sculpture.update(dt,true);
      this.elastic.update(dt,p.x,p.y,p.active);
      // A separate active-time clock prevents an overdue flash on tab return.
      this.stormClock+=dt;
      if(this.stormClock>=this.nextStorm)this.beginExposure(now);
      this.render(now);this.lastDraw=now;this.kick();
    }
    render(now){
      if(!this.ctx||!this.w||!this.active)return;
      const start=performance.now(),light=this.exposureAt(now);this.exposure=light;
      if(light>0)this.updateLightField(now);
      const raw=this.prepareSource(light,now);
      if(this.optics.ready){
        this.ctx.drawImage(this.optics.render(raw,this),0,0);this.draws++;this.averageMs=lerp(this.averageMs,performance.now()-start,.08);return;
      }
      this.elastic.warp(raw,this.warped,this.pw,this.ph,this.dpr);
      const src=this.warped,out=this.output.data;out.set(src);
      for(const d of this.runners)this.trail(d,src,out,light);
      for(const d of this.beads)if(d.wet)this.lens(d,src,out,light);
      for(const d of this.runners)this.lens(d,src,out,light);
      this.ctx.putImageData(this.output,0,0);this.draws++;this.averageMs=lerp(this.averageMs,performance.now()-start,.08);
    }
    destroy(){this.stop();this.observer.disconnect();document.removeEventListener('visibilitychange',this.visibilityHandler);this.sculpture.destroy();this.optics.destroy();}
  }
  window.RebuubScene=WetWindow;
})();
