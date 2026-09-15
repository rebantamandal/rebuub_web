/* Independent instances of the original Orbit surface, not bubble sprites.
 * Surface dynamics are Sculpture.update() from the supplied reference, unchanged:
 * pressure spring 70 / damping 10; contact smoothing 7; angular damping 4.2;
 * shader-time speed .58. The sphere geometry has a restrained radial waviness.
 * Only the transport layer below is new: upward travel, spacing and click breakup.
 * Floating metal is an art-directed scene, not a buoyancy/fluid simulation.
 */
(() => {
  'use strict';
  const STEP=1/120,TAU=Math.PI*2;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>t*t*(3-2*t);
  class SphereField {
    constructor(random=Math.random){
      this.random=random;this.items=[];this.bursts=[];this.drips=[];this.shedCount=0;this.clock=0;this.accumulator=0;this.alpha=1;
      this.serial=0;this.popped=0;this.selected=null;this.pointer={x:-1000,y:-1000,active:false};
      this.nextSpawn=2;this.moving=true;this.velocity=[0,0];this.onChange=null;
      this.surface=new window.RebuubSculpture();this.surface.onChange=()=>this.onChange?.();
    }
    get renderer(){return this.surface.renderer;}
    resize(w,h,dpr=1){
      const oldW=this.w,oldH=this.h;this.w=w;this.h=h;this.dpr=dpr;
      this.limit=w<600?5:w<1000?7:9;
      this.frontLimit=w<1000?2:3;this.dripLimit=w<600?9:18;
      // Each object is supersampled; material work scales with the small objects,
      // not with the entire window or the number of high-DPI display pixels.
      this.tile=w<600?192:256;
      if(oldW&&oldH){
        for(const b of this.items){
          const size=(width)=>width<600?.64*(b.front?.74:1):1;
          const ratio=size(w)/size(oldW);
          b.x=b.px=b.x/oldW*w;b.y=b.py=b.y/oldH*h;b.r*=ratio;
          b.mass=Math.max(.25,(b.r/32)**3);b.speed=19+b.r*.33;
        }
        this.items=this.items.slice(0,this.limit);this.bursts=[];this.drips=[];
        for(const b of this.items){b.bud=null;b.budUniform=null;b.neckUniform=0;}
      }else for(let i=0;i<this.limit;i++)this.spawn(true,i);
    }
    spawn(initial=false,index=0){
      if(this.items.length>=this.limit)return null;
      const rand=this.random,mobile=this.w<600;
      let radius=(24+Math.pow(rand(),.8)*29)*(mobile?.64:1);
      // Depth is persistent for the lifetime of a sphere. Never switch layers
      // when it touches a letter: that would visibly snap through the wordmark.
      const front=initial
        ? index===Math.floor(this.limit*.5)||index===this.limit-1||(this.frontLimit===3&&index===2)
        : this.items.filter(b=>b.front).length<this.frontLimit;
      // Keep small-screen foreground silhouettes from swallowing whole letters.
      if(front&&mobile)radius*=.74;
      let x=radius+30+rand()*Math.max(1,this.w-2*radius-60);
      let y=initial?this.h*(.10+(index+.2+rand()*.5)/this.limit*.86):this.h+radius*1.55;
      for(let j=0;j<20&&this.items.some(b=>Math.hypot(b.x-x,b.y-y)<b.r+radius+65);j++){
        x=radius+24+rand()*Math.max(1,this.w-2*radius-48);
      }
      const state=new window.RebuubSculpture(true);
      state.time=3.8+rand()*35;state.yaw=-.2+(rand()-.5)*1.4;state.pitch=-.45+(rand()-.5)*.6;
      const b={id:++this.serial,x,y,px:x,py:y,r:radius,state,front,
        vx:(rand()-.5)*5,vy:initial?-(19+radius*.33):0,speed:19+radius*.33,
        mass:Math.max(.25,(radius/32)**3),phase:rand()*TAU,age:initial?5:0,
        collision:0,contactX:0,contactY:0,tile:null,
        bud:null,budUniform:null,neckUniform:0,
        nextShed:initial?1.1+index*.85+rand()*2.5:2.4+rand()*5.5};
      b.previous=this.snapshot(state);this.items.push(b);return b;
    }
    snapshot(s){return {pressure:s.pressure,time:s.time,yaw:s.yaw,pitch:s.pitch,pointer:s.pointer.slice(),contact:s.contact.slice()};}
    setPointer(x,y,active=true){this.pointer={x,y,active:!!active};}
    setContact(x,y,active){if(!active)this.pointer.active=false;}
    update(dt,moving){
      this.moving=!!moving;
      if(!moving){
        this.accumulator=0;this.alpha=1;
        for(const b of this.items){b.px=b.x;b.py=b.y;b.state.setContact(0,0,false);b.state.update(0,false);b.previous=this.snapshot(b.state);}
        for(const d of this.drips){d.px=d.x;d.py=d.y;d.previous=this.snapshot(d.state);}
        this.bursts=[];return;
      }
      this.accumulator+=clamp(dt,0,.08);
      while(this.accumulator+1e-10>=STEP){this.step(STEP);this.accumulator=Math.max(0,this.accumulator-STEP);}
      this.alpha=clamp(this.accumulator/STEP,0,1);
    }
    step(dt){
      this.clock+=dt;this.nextSpawn-=dt;
      if(this.nextSpawn<=0){this.spawn();this.nextSpawn=2.0+this.random()*1.6;}
      const p=this.pointer;
      for(const b of this.items){
        b.px=b.x;b.py=b.y;b.age+=dt;b.collision=Math.max(0,b.collision-dt);
        const current=Math.sin(this.clock*.30+b.phase)*4.8+Math.sin(this.clock*.17+b.y*.004)*2.0;
        b.vx+=(current-b.vx)*(1-Math.exp(-4.2*dt));
        b.vy+=(-b.speed-b.vy)*(1-Math.exp(-1.2*dt));
        b.x+=b.vx*dt;b.y+=b.vy*dt;
        if(b.x<b.r+10){b.x=b.r+10;b.vx=Math.abs(b.vx)*.35;}
        if(b.x>this.w-b.r-10){b.x=this.w-b.r-10;b.vx=-Math.abs(b.vx)*.35;}
      }
      // Gentle contact impulses between objects, coupled to the SAME local
      // pressure spring as pointer contact rather than stretching a flat sprite.
      for(let i=0;i<this.items.length;i++)for(let j=i+1;j<this.items.length;j++){
        const a=this.items[i],b=this.items[j];
        // Objects on opposite sides of the lettering pass at different depths.
        if(a.front!==b.front)continue;
        const dx=b.x-a.x,dy=b.y-a.y;
        const dist=Math.hypot(dx,dy)||.01,min=(a.r+b.r)*.98;
        if(dist>=min)continue;
        const nx=dx/dist,ny=dy/dist,ia=1/a.mass,ib=1/b.mass,sum=ia+ib;
        const correction=(min-dist)*.48/sum;
        a.x-=nx*correction*ia;a.y-=ny*correction*ia;b.x+=nx*correction*ib;b.y+=ny*correction*ib;
        const closing=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
        if(closing<0){
          const impulse=-closing*1.25/sum;
          a.vx-=impulse*nx*ia;a.vy-=impulse*ny*ia;b.vx+=impulse*nx*ib;b.vy+=impulse*ny*ib;
        }
        a.collision=b.collision=.16;
        a.contactX=nx*.65;a.contactY=-ny*.65;b.contactX=-nx*.65;b.contactY=ny*.65;
      }
      for(const b of this.items){
        const s=b.state,dx=p.x-b.x,dy=p.y-b.y,half=b.r/.69;
        b.previous=this.snapshot(s);
        const touching=p.active&&Math.hypot(dx,dy)<b.r*1.85;
        if(touching)s.setContact(dx/half,-dy/half,true);
        else s.setContact(b.contactX,b.contactY,b.collision>0);
        s.setPointer(p.active?(p.x/this.w*2-1)*.55:0,p.active?(p.y/this.h*2-1)*.55:0);
        // This is literally the source implementation, not a lookalike spring.
        s.update(dt,true);
        this.advanceShedding(b,dt);
      }
      this.items=this.items.filter(b=>b.y>-b.r*1.8);
      for(const b of this.bursts){
        b.age+=dt;b.previous=this.snapshot(b.state);
        b.state.setContact(0,0,b.age<.13);b.state.update(dt,true);
        for(const d of b.drops){
          d.px=d.x;d.py=d.y;d.vx*=Math.exp(-4.2*dt);d.vy=d.vy*Math.exp(-3.2*dt)+36*dt;
          d.x+=d.vx*dt;d.y+=d.vy*dt;
        }
      }
      this.bursts=this.bursts.filter(b=>b.age<.75);
      for(const d of this.drips){
        d.px=d.x;d.py=d.y;d.age+=dt;d.previous=this.snapshot(d.state);
        // Reversed gravity is intentional: lifted liquid metal, not water.
        // Drag smoothly limits the rise speed; surface tension rounds the bead.
        const current=Math.sin(this.clock*.36+d.phase)*5;
        d.vx+=(current-d.vx)*(1-Math.exp(-2.5*dt));
        d.vy+=(-d.speed-d.vy)*(1-Math.exp(-1.8*dt));
        d.x+=d.vx*dt;d.y+=d.vy*dt;
        d.state.setContact(0,-.7,false);d.state.update(dt,true);
      }
      this.drips=this.drips.filter(d=>d.age<d.life&&d.y>-d.r*3);
      if(this.selected&&!this.items.some(b=>b.id===this.selected))this.selected=null;
    }
    startBud(b){
      // No more than two attached beads at once. Each source has a different
      // interval and a slightly different release direction, never a fountain.
      if(this.items.filter(x=>x.bud).length>=(this.w<600?1:2)||this.drips.length>=this.dripLimit)return false;
      const a=(this.random()-.5)*.65;
      b.bud={age:0,duration:1.65+this.random()*.55,nx:Math.sin(a),ny:-Math.cos(a),
        ratio:.125+this.random()*.055};
      return true;
    }
    budShape(b,age=b.bud?.age||0){
      if(!b.bud)return null;
      const u=b.bud,t=clamp(age/u.duration,0,1);
      const grow=ease(clamp(t/.46,0,1)),pull=ease(clamp((t-.35)/.65,0,1));
      const radius=u.ratio*grow;
      const distance=.94+radius*.62+pull*.37;
      const neck=radius*.54*(1-ease(clamp((t-.56)/.44,0,1)));
      return {radius,distance,neck,nx:u.nx,ny:u.ny,t};
    }
    advanceShedding(b,dt){
      if(!b.bud){
        b.nextShed-=dt;
        if(b.nextShed<=0&&b.y>b.r*2.1&&b.y<this.h-b.r*.5){
          if(!this.startBud(b))b.nextShed=.6+this.random();
        }
        return;
      }
      b.bud.age+=dt;
      if(b.bud.age<b.bud.duration)return;
      const shape=this.budShape(b),state=new window.RebuubSculpture(true),parent=b.state;
      state.time=parent.time;state.yaw=parent.yaw;state.pitch=parent.pitch;
      state.pressure=.10;state.pressureVelocity=-.4;
      // Project the shader lobe centre with the SAME camera (z=5, scale=.82).
      // .2706/.345 is the atlas-to-CSS conversion; detachment has no jump.
      const projection=.2706/.345,x=b.x+shape.nx*shape.distance*1.24*projection*b.r,
        y=b.y+shape.ny*shape.distance*1.24*projection*b.r;
      const radius=shape.radius*b.r;
      const d={id:'drop-'+(++this.shedCount),parentId:b.id,small:true,x,y,px:x,py:y,r:radius,
        vx:b.vx+shape.nx*8,vy:Math.min(-12,b.vy-7),speed:43+this.random()*19,
        front:b.front,age:0,life:6.5+this.random()*2.5,phase:this.random()*TAU,
        state,previous:this.snapshot(state),tile:null};
      this.drips.push(d);b.bud=null;b.budUniform=null;b.neckUniform=0;
      b.nextShed=4.2+this.random()*7.6;
      // Small recoil is fed into the reference spring, not an arbitrary scale.
      b.state.pressureVelocity-=.20;
    }
    interpolated(b){
      const s=b.state,p=b.previous,a=this.alpha;
      b.drawState={pressure:mix(p.pressure,s.pressure,a),time:mix(p.time,s.time,a),yaw:mix(p.yaw,s.yaw,a),pitch:mix(p.pitch,s.pitch,a),
        pointer:[mix(p.pointer[0],s.pointer[0],a),mix(p.pointer[1],s.pointer[1],a)],
        contact:[mix(p.contact[0],s.contact[0],a),mix(p.contact[1],s.contact[1],a)]};
      return b;
    }
    prepareFrame(light,source,scroll=0){
      this.scroll=scroll;
      for(const b of this.items){
        const shape=this.budShape(b,Math.max(0,(b.bud?.age||0)-(1-this.alpha)*STEP));
        b.budUniform=shape?[shape.nx*shape.distance*1.24,-shape.ny*shape.distance*1.24,shape.radius*1.24]:null;
        b.neckUniform=shape?shape.neck*1.24:0;
      }
      const objects=[...this.items,...this.bursts,...this.drips].map(b=>this.interpolated(b));
      // One live atlas per frame, shared by BOTH depth passes. No doubled
      // shader/physics work and no rasterized replacement for the material.
      this.atlas=this.surface.renderAtlas(objects,this.tile,light,source);
    }
    drawLayer(c,front,opacity=1){
      const atlas=this.atlas,scroll=this.scroll||0;
      if(!atlas)return;
      const paint=(b,x,y,r,alpha=1)=>{
        if(!b.tile||r<.12||alpha<=0)return;
        const t=b.tile,side=r/(.345*(t.scale||1));
        c.globalAlpha=opacity*alpha;
        c.drawImage(atlas,t.x,t.y,t.side,t.side,x-side*.5,y-side*.5+scroll,side,side);
      };
      c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
      for(const b of this.items){
        if(b.front!==front)continue;
        const x=mix(b.px,b.x,this.alpha),y=mix(b.py,b.y,this.alpha);
        paint(b,x,y,b.r);
        if(this.selected===b.id){
          // Only keyboard focus has an outline; there is no cursor decoration.
          c.globalAlpha=.7;c.strokeStyle='#a7f3e6';c.lineWidth=.8;c.setLineDash([2,5]);
          c.beginPath();c.arc(x,y+scroll,b.r+7,0,TAU);c.stroke();c.setLineDash([]);
        }
      }
      for(const drop of this.drips){
        if(drop.front!==front)continue;
        const fade=1-ease(clamp((drop.age-drop.life+1.3)/1.3,0,1));
        paint(drop,mix(drop.px,drop.x,this.alpha),mix(drop.py,drop.y,this.alpha),drop.r,fade);
      }
      for(const b of this.bursts){
        if(b.front!==front)continue;
        if(b.age<.19){
          const t=clamp(b.age/.19,0,1),scale=1-ease(t)*.98;
          paint(b,b.x,b.y,b.r*scale,1-t*t);
        }
        if(b.age>.075){
          const t=clamp((b.age-.075)/.66,0,1),fade=1-ease(t),grow=ease(clamp((b.age-.075)/.07,0,1));
          for(const d of b.drops)paint(b,mix(d.px,d.x,this.alpha),mix(d.py,d.y,this.alpha),d.r*(.35+.65*fade)*grow,fade);
        }
      }
      c.restore();
    }
    drawLetterShadows(c){
      // Caller clips to the actual letter paths, so the shadow lands on the
      // lettering, never on the distant background or in a letter's counter.
      c.save();
      for(const b of [...this.items,...this.bursts]){
        if(!b.front)continue;
        const burst=!!b.drops,t=burst?clamp(b.age/.19,0,1):0;
        if(t>=1)continue;
        const radius=b.r*(1-ease(t)*.98),x=mix(b.px,b.x,this.alpha),y=mix(b.py,b.y,this.alpha)+(this.scroll||0);
        const r=radius*1.6,g=c.createRadialGradient(x+radius*.13,y+radius*.18,radius*.40,x+radius*.13,y+radius*.18,r);
        g.addColorStop(0,'rgba(1,9,18,.52)');g.addColorStop(.60,'rgba(1,9,18,.24)');g.addColorStop(1,'rgba(1,9,18,0)');
        c.globalAlpha=1-t;c.fillStyle=g;c.fillRect(x-r,y-r,r*2.3,r*2.3);
      }
      c.restore();
    }
    pick(x,y,padding=0,wordOccludes=false){
      // Hit testing follows the same front-to-back order as the rendering.
      // A back-layer sphere hidden by an opaque letter cannot be clicked.
      for(const front of [true,false]){
        if(!front&&wordOccludes)continue;
        let best=null,distance=Infinity;
        for(const b of this.items){
          if(b.front!==front)continue;
          const dx=x-mix(b.px,b.x,this.alpha),dy=y-mix(b.py,b.y,this.alpha),d=Math.hypot(dx,dy);
          if(d<=b.r*1.05+padding&&d/b.r<distance){best=b;distance=d/b.r;}
        }
        if(best)return best;
      }
      return null;
    }
    pop(item,immediate=false){
      if(!item||!this.items.includes(item))return false;
      this.items=this.items.filter(b=>b!==item);this.popped++;
      if(this.selected===item.id)this.selected=null;
      if(!immediate){
        const b={...item,x:mix(item.px,item.x,this.alpha),y:mix(item.py,item.y,this.alpha),age:0,drops:[],bud:null,budUniform:null,neckUniform:0};
        for(let i=0;i<6;i++){
          const angle=(i+.12+this.random()*.4)/6*TAU,speed=26+this.random()*42;
          const x=b.x+Math.cos(angle)*b.r*.22,y=b.y+Math.sin(angle)*b.r*.22;
          b.drops.push({x,y,px:x,py:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-12,r:2.2+this.random()*3.0});
        }
        this.bursts.push(b);
        if(this.bursts.length>4)this.bursts.shift();
      }
      this.nextSpawn=Math.min(this.nextSpawn,.85+this.random()*.65);return true;
    }
    selectNext(direction=1){
      const visible=this.items.filter(b=>b.y>0&&b.y<this.h).sort((a,b)=>a.x-b.x);
      if(!visible.length)return null;
      const i=visible.findIndex(b=>b.id===this.selected),next=visible[(i+direction+visible.length)%visible.length];
      this.selected=next.id;return next;
    }
    popSelected(immediate=false){const b=this.items.find(b=>b.id===this.selected)||this.selectNext();return this.pop(b,immediate);}
    rotate(dx,dy){for(const b of this.items){b.state.rotate(dx,dy);b.state.velocity=[0,0];}}
    reset(){this.items=[];this.bursts=[];this.drips=[];this.selected=null;this.accumulator=0;this.nextSpawn=2;for(let i=0;i<this.limit;i++)this.spawn(true,i);}
    destroy(){this.surface.destroy();this.items=[];this.bursts=[];this.drips=[];this.onChange=null;}
  }
  window.RebuubSphereField=SphereField;
})();
