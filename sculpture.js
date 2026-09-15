/* Original Orbit renderer, now using its EXISTING spherical form (u_form = 1).
 * normalAt(), environment() and surface shading are retained verbatim.
 * Shedding adds only a smooth-union lobe and tapering neck to the distance field.
 * Geometry uses the existing sphere branch, with its wave amplitude reduced
 * from .24 to .065 to keep a round silhouette. A tile origin shares one GPU.
 * Each sphere owns an original Sculpture spring state; no pre-rendered animation
 * frames, hand-painted gradients, new metal material or normal-map substitute.
 * A static capture of this same shader is used only when WebGL is unavailable.
 */
(() => {
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const VERTEX=`attribute vec2 a_position; void main(){gl_Position=vec4(a_position,0.0,1.0);}`;
  const FRAGMENT=`
    precision highp float;
    uniform vec2 u_resolution;
    uniform vec2 u_origin;
    uniform vec2 u_pointer;
    uniform vec2 u_rotation;
    uniform vec2 u_contact;
    uniform vec3 u_bud;
    uniform float u_neck;
    uniform float u_pressure;
    uniform float u_time;
    uniform float u_pulse;
    uniform float u_material;
    uniform float u_form;
    uniform float u_scale;
    uniform float u_finish;
    uniform float u_light;
    uniform vec3 u_source;
    mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
    float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
    float torus(vec3 p,float r,float t){return length(vec2(length(p.xy)-r,p.z))-t;}
    float map(vec3 p){
      vec3 world=p;
      // Inverse radial deformation of the implicit surface. Pressure has its
      // own spring so that local volume recovers instead of snapping to rest.
      vec2 delta=p.xy-u_contact*1.80;
      float influence=exp(-dot(delta,delta)/.48)*u_pressure;
      p.xy-=delta*influence*.19;
      p.z+=influence*.10*sin(u_time*2.2+length(delta)*5.);
      p*=1.+sin(u_time*.9)*.011;
      p.xz=rot(u_rotation.x+u_pointer.x*.25+u_time*.075)*p.xz;
      p.yz=rot(u_rotation.y-u_pointer.y*.17)*p.yz;
      p.xy=rot(-.38+sin(u_time*.09)*.13)*p.xy;
      float pulse=sin(length(p)*6.-u_time*3.)*u_pulse*.08;
      if(u_form<.5){
        float angle=atan(p.y,p.x);
        p.z+=.31*sin(angle*3.+u_time*.2);
        float radius=1.24+.06*cos(angle*5.+u_time*.1);
        return length(vec2(length(p.xy)-radius,p.z))-(.33+.065*cos(angle*3.-u_time*.17)+pulse);
      }
      if(u_form<1.5){
        float waves=sin(p.x*3.1+u_time*.1)*sin(p.y*3.1)*sin(p.z*3.1);
        float body=length(p)-1.24-waves*.065-pulse;
        if(u_bud.z>.0001){
          // A rising lobe and a tapering neck are part of the SAME implicit
          // surface. They share normals, environment and the original metal.
          vec3 tip=vec3(u_bud.xy,0.);
          vec3 axis=normalize(tip);
          float bead=length(world-tip)-u_bud.z;
          body=smin(body,bead,.07);
          if(u_neck>.0001){
            vec3 start=axis*1.07;
            vec3 end=tip-axis*u_bud.z*.40;
            vec3 segment=end-start;
            float h=clamp(dot(world-start,segment)/max(.0001,dot(segment,segment)),0.,1.);
            float width=mix(min(u_bud.z*.63,u_neck*3.+.002),u_neck,h);
            float neck=length(world-start-segment*h)-width;
            body=smin(body,neck,.075*(1.-h)+.015);
          }
        }
        return body*.75;
      }
      vec3 q=p;
      p.xy=rot(.38)*p.xy;
      float a=torus(p,1.03,.27+pulse);
      q.yz=rot(1.27)*q.yz;
      q.xz=rot(.45)*q.xz;
      float b=torus(q,1.03,.27+pulse);
      return smin(a,b,.26);
    }
    vec3 normalAt(vec3 p){
      vec2 e=vec2(.0012,-.0012);
      return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));
    }
    vec3 environment(vec3 r){
      vec3 c=vec3(.012,.017,.015);
      c+=vec3(.075,.092,.081)*smoothstep(-.3,.4,r.y);
      float strip=exp(-pow((r.x+.38*r.y-.13)*9.,2.))*smoothstep(-.6,.5,r.z);
      c+=vec3(.64,.72,.67)*strip;
      float ceiling=pow(max(0.,dot(r,normalize(vec3(-.3,.95,.6)))),26.);
      c+=vec3(.76,.81,.77)*ceiling;
      float horizon=exp(-pow((r.y+.18)*26.,2.));
      c+=vec3(.42,.48,.44)*horizon;
      float blackband=smoothstep(-.15,-.05,r.y)-smoothstep(.02,.17,r.y);
      c*=1.-blackband*.88;
      c+=vec3(.46,.49,.47)*exp(-pow((r.x-.69)*20.,2.));
      return c*(u_finish>.5?1.6:1.);
    }
    void main(){
      vec2 uv=(2.*(gl_FragCoord.xy-u_origin)-u_resolution)/u_resolution.y;
      uv/=(u_scale*min(1.,u_resolution.x/u_resolution.y));
      vec3 ro=vec3(0.,0.,5.0);
      vec3 rd=normalize(vec3(uv,-3.3));
      float t=0.;float d=0.;bool hit=false;
      for(int i=0;i<64;i++){
        vec3 p=ro+rd*t;d=map(p);
        if(d<.0018){hit=true;break;}
        t+=d*.8;
        if(t>9.)break;
      }
      if(!hit){gl_FragColor=vec4(0.);return;}
      vec3 p=ro+rd*t;
      vec3 n=normalAt(p);
      vec3 reflected=reflect(rd,n);
      vec3 color=environment(reflected);
      float fresnel=pow(1.-max(0.,dot(n,-rd)),3.);
      float ao=clamp(map(p+n*.20)/.20,.2,1.);
      color*=mix(.62,1.,ao);
      color+=vec3(.22,.25,.23)*fresnel*.22;
      float spec=pow(max(0.,dot(reflected,normalize(vec3(-.7,1.,2.)))),70.);
      color+=vec3(.70,.77,.71)*spec*.45;
      float diffuse=max(0.,dot(n,normalize(vec3(-.4,.9,1.))));
      color+=vec3(.025,.034,.028)*diffuse;
      // The same off-screen light direction used by the glass compositor.
      vec3 reflectedLight=reflect(rd,n);
      float incident=max(0.,dot(n,normalize(u_source)));
      float wetHighlight=pow(max(0.,dot(reflectedLight,normalize(u_source))),55.);
      color+=u_light*(vec3(.038,.045,.042)*incident+vec3(.16,.18,.17)*wetHighlight);
      color=mix(vec3(dot(color,vec3(.2126,.7152,.0722))),color,.15)*vec3(.96,1.,1.035);
      color=pow(color,vec3(.80));
      float grain=fract(sin(dot(gl_FragCoord.xy-u_origin,vec2(12.9898,78.233)))*43758.54)-.5;
      color+=grain*.012;
      gl_FragColor=vec4(color,1.);
    }
  `;

  class Sculpture {
    constructor(stateOnly=false){
      this.yaw=-.2;this.pitch=-.45;this.zoom=1;this.targetZoom=1;
      this.pointer=[0,0];this.targetPointer=[0,0];this.velocity=[0,0];this.dragging=false;
      this.contact=[0,0];this.contactTarget=[0,0];this.contactActive=false;this.pressure=0;this.pressureVelocity=0;
      this.lastInput=0;this.changed=true;this.moving=true;this.time=3.8;this.onChange=null;
      if(stateOnly)return;
      this.canvas=document.createElement('canvas');this.canvas.width=this.canvas.height=560;
      this.poster=new Image();this.posterReady=false;
      this.poster.onload=()=>{this.gradedPoster=this.poster;this.posterReady=true;this.changed=true;this.onChange?.();};
      this.poster.onerror=()=>{this.posterReady=false;};
      this.poster.src=window.REBUUB_ASSETS?.['assets/sphere-reference.png']||'assets/sphere-reference.png';
      this.init();
    }
    init(){
      let gl;
      try{
        gl=this.canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
        if(!gl)throw new Error('WebGL unavailable');
        const compile=(type,source)=>{
          const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
          if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(message);}
          return shader;
        };
        const vs=compile(gl.VERTEX_SHADER,VERTEX),fs=compile(gl.FRAGMENT_SHADER,FRAGMENT);
        const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
        gl.deleteShader(vs);gl.deleteShader(fs);
        if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
        gl.useProgram(program);
        const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
        const attribute=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
        this.u={};
        ['resolution','origin','pointer','rotation','contact','bud','neck','pressure','time','pulse','material','form','scale','finish','light','source'].forEach(name=>this.u[name]=gl.getUniformLocation(program,'u_'+name));
        this.gl=gl;this.program=program;this.buffer=buffer;this.renderer='webgl-orbit-sphere';
        this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.useFallback();this.onChange?.();});
      }catch(error){
        this.failureReason=String(error.message||error);this.useFallback();
      }
    }
    useFallback(){
      const side=this.canvas.width;
      this.gl=null;this.renderer='static-sphere-fallback';
      this.canvas=document.createElement('canvas');this.canvas.width=this.canvas.height=side;
      this.ctx=this.canvas.getContext('2d',{willReadFrequently:true});this.changed=true;
    }
    resize(side){
      // Ray marching has its own budget, independent of the text and glass.
      side=clamp(Math.round(side),280,640);
      if(this.canvas.width===side)return;
      this.canvas.width=this.canvas.height=side;this.changed=true;
    }
    setPointer(x,y){this.targetPointer=[clamp(x,-1,1),clamp(y,-1,1)];this.changed=true;}
    setContact(x,y,active){
      this.contactTarget=[clamp(x,-2,2),clamp(y,-2,2)];this.contactActive=!!active&&Math.hypot(x,y)<1.8;
    }
    rotate(dx,dy,dt=.016){
      this.yaw+=dx;this.pitch=clamp(this.pitch+dy,-1.14,1.14);
      this.velocity=[clamp(dx/Math.max(.012,dt),-5,5),clamp(dy/Math.max(.012,dt),-3,3)];
      this.lastInput=performance.now();this.changed=true;
    }
    reset(){this.yaw=-.2;this.pitch=-.45;this.zoom=1;this.targetZoom=1;this.velocity=[0,0];this.time=3.8;this.changed=true;}
    update(dt,moving){
      this.moving=moving;
      if(!moving){this.pressure=0;this.pressureVelocity=0;this.pointer=this.targetPointer.slice();this.zoom=this.targetZoom;this.velocity=[0,0];return this.changed;}
      const amount=1-Math.exp(-dt*7);
      this.contact[0]+=(this.contactTarget[0]-this.contact[0])*amount;
      this.contact[1]+=(this.contactTarget[1]-this.contact[1])*amount;
      this.pressureVelocity+=((Number(this.contactActive)-this.pressure)*70-this.pressureVelocity*10)*dt;
      this.pressure=clamp(this.pressure+this.pressureVelocity*dt,-.07,1.10);
      this.pointer[0]+=(this.targetPointer[0]-this.pointer[0])*amount;
      this.pointer[1]+=(this.targetPointer[1]-this.pointer[1])*amount;
      this.zoom+=(this.targetZoom-this.zoom)*amount;
      if(!this.dragging){
        this.yaw+=this.velocity[0]*dt;this.pitch=clamp(this.pitch+this.velocity[1]*dt,-1.14,1.14);
        const damp=Math.exp(-dt*4.2);this.velocity=this.velocity.map(v=>Math.abs(v)<.0003?0:v*damp);
        this.time+=dt*.58;
      }
      this.changed=true;return true;
    }
    draw(light,source){
      const g=this.gl,u=this.u;
      if(g){
        g.viewport(0,0,this.canvas.width,this.canvas.height);g.useProgram(this.program);
        g.uniform2f(u.resolution,this.canvas.width,this.canvas.height);g.uniform2f(u.origin,0,0);
        g.uniform3f(u.bud,0,0,0);g.uniform1f(u.neck,0);
        g.uniform2fv(u.contact,this.contact);g.uniform1f(u.pressure,this.pressure);
        g.uniform2fv(u.pointer,this.pointer);g.uniform2f(u.rotation,this.yaw,this.pitch);
        g.uniform1f(u.time,this.time);g.uniform1f(u.pulse,0);g.uniform1f(u.material,0);
        g.uniform1f(u.form,1);g.uniform1f(u.scale,.82*this.zoom);g.uniform1f(u.finish,0);
        g.uniform1f(u.light,light);g.uniform3fv(u.source,source);
        g.drawArrays(g.TRIANGLES,0,6);
      }else this.drawFallback(light);
      this.changed=false;return this.canvas;
    }
    /* Render every moving surface into one live GPU atlas. Positions and
       spring states remain independent; the material/light uniforms are shared. */
    renderAtlas(objects,tile,light,source){
      if(!objects.length)return this.canvas;
      // Fixed capacity prevents allocating a new GPU canvas every time a bead
      // detaches. Tiny daughter drops use small tiles, not a full-size sphere.
      const small=Math.round(tile*.375),width=tile*4,height=tile*4+small*3;
      if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
      let mainIndex=0,smallIndex=0;
      const places=objects.map(item=>{
        if(item.small){
          const cols=Math.floor(width/small),i=smallIndex++;
          return {item,x:(i%cols)*small,y:tile*4+Math.floor(i/cols)*small,side:small};
        }
        const i=mainIndex++;
        return {item,x:(i%4)*tile,y:Math.floor(i/4)*tile,side:tile};
      });
      const g=this.gl,u=this.u;
      if(g){
        g.useProgram(this.program);g.disable(g.SCISSOR_TEST);
        g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.enable(g.SCISSOR_TEST);
        g.uniform1f(u.form,1);g.uniform1f(u.scale,.82);g.uniform1f(u.finish,0);g.uniform1f(u.material,0);
        g.uniform1f(u.light,light);g.uniform3fv(u.source,source);
        for(const {item,x,y,side} of places){
          const state=item.drawState||item.state,gy=height-y-side,padding=item.budUniform?.[2]>.0001?.90:1;
          g.uniform1f(u.scale,.82*padding);
          g.viewport(x,gy,side,side);g.scissor(x,gy,side,side);
          g.uniform2f(u.resolution,side,side);g.uniform2f(u.origin,x,gy);
          g.uniform3fv(u.bud,item.budUniform||[0,0,0]);g.uniform1f(u.neck,item.neckUniform||0);
          g.uniform2fv(u.contact,state.contact);g.uniform1f(u.pressure,state.pressure);
          g.uniform2fv(u.pointer,state.pointer);g.uniform2f(u.rotation,state.yaw,state.pitch);
          g.uniform1f(u.time,state.time);g.uniform1f(u.pulse,0);
          g.drawArrays(g.TRIANGLES,0,6);item.tile={x,y,side,scale:padding};
        }
        g.disable(g.SCISSOR_TEST);
      }else{
        const c=this.ctx;c.clearRect(0,0,width,height);
        for(const {item,x,y,side} of places){
          const padding=item.budUniform?.[2]>.0001?.90:1;
          if(this.posterReady){
            const inset=side*(1-padding)*.5;
            c.drawImage(this.poster,x+inset,y+inset,side*padding,side*padding);
            // Fallback only: same shader capture for the daughter bead, with a
            // clipped bridge. Live WebGL uses the continuous surface above.
            const bud=item.budUniform;
            if(bud&&bud[2]>.0001){
              const k=side*padding*.2706,bx=x+side*.5+bud[0]*k,by=y+side*.5-bud[1]*k;
              const rr=bud[2]*k,dist=Math.hypot(bud[0],bud[1]);
              if(item.neckUniform>.0001&&dist>0){
                const nx=bud[0]/dist,ny=-bud[1]/dist,ax=x+side*.5+nx*1.13*k,ay=y+side*.5+ny*1.13*k;
                const tx=-ny,ty=nx,w0=Math.min(rr*.67,(item.neckUniform*3+.002)*k),w1=item.neckUniform*k;
                c.save();c.beginPath();
                c.moveTo(ax+tx*w0,ay+ty*w0);
                c.bezierCurveTo(ax+nx*rr+tx*w0*.5,ay+ny*rr+ty*w0*.5,bx-nx*rr+tx*w1,by-ny*rr+ty*w1,bx+tx*w1,by+ty*w1);
                c.lineTo(bx-tx*w1,by-ty*w1);
                c.bezierCurveTo(bx-nx*rr-tx*w1,by-ny*rr-ty*w1,ax+nx*rr-tx*w0*.5,ay+ny*rr-ty*w0*.5,ax-tx*w0,ay-ty*w0);
                c.closePath();c.clip();
                const sx=Math.min(ax,bx)-rr,sy=Math.min(ay,by)-rr,sw=Math.abs(bx-ax)+2*rr,sh=Math.abs(by-ay)+2*rr;
                c.drawImage(this.poster,this.poster.width*.22,this.poster.height*.25,this.poster.width*.56,this.poster.height*.5,sx,sy,sw,sh);
                c.restore();
              }
              const d=rr/.345;c.drawImage(this.poster,bx-d*.5,by-d*.5,d,d);
            }
          }
          item.tile={x,y,side,scale:padding};
        }
      }
      return this.canvas;
    }
    drawFallback(light){
      const c=this.ctx;if(!c)return;
      c.clearRect(0,0,this.canvas.width,this.canvas.height);
      if(this.posterReady)c.drawImage(this.poster,0,0,this.canvas.width,this.canvas.height);
    }
    destroy(){if(this.gl){this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);}this.onChange=null;}
  }
  window.RebuubSculpture=Sculpture;
})();
