/* Optional GPU compositor. The CPU compositor in scene.js remains the fallback.
   Uses the exact same simulated water, incident-light map and spring sheet. */
(() => {
  'use strict';
  const VS='attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=(a_position+1.0)*0.5;gl_Position=vec4(a_position,0.,1.);}';
  const FS=`
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_scene,u_water,u_elastic,u_field;
  uniform vec2 u_resolution,u_css;
  uniform vec3 u_half;
  uniform float u_light,u_dpr,u_energy;
  vec3 sceneAt(vec2 uv){
    if(u_energy>.07){vec2 delta=(texture2D(u_elastic,uv).rg*255.-128.)/127.*48.;uv-=delta/u_css;}
    return texture2D(u_scene,clamp(uv,vec2(.001),vec2(.999))).rgb;
  }
  float ss(float a,float b,float v){return smoothstep(a,b,v);}
  void main(){
    // Source textures use top-left canvas coordinates.
    vec2 uv=vec2(v_uv.x,1.-v_uv.y);
    vec3 base=sceneAt(uv);
    vec4 water=texture2D(u_water,uv);
    if(water.a<.001){gl_FragColor=vec4(base,1.);return;}
    vec2 n=water.rg*2.-1.;float nz=sqrt(max(.012,1.-dot(n,n)));
    float eta=1./1.333;
    float refr=eta*nz-sqrt(max(0.,1.-eta*eta*(1.-nz*nz)));
    float tz=-eta+refr*nz;
    float r=water.b*32.;
    vec2 offset=refr*n/-tz*(r*3.4+u_dpr*.5)*vec2(1.,.92);
    vec3 sampleColor=sceneAt(uv+offset/u_resolution)*255.;
    float f=.0204+.9796*pow(1.-nz,5.);
    float q=dot(n,n)/(.965*.965);
    float field=texture2D(u_field,uv).r;
    float illumination=u_light*(.28+field*.72);
    float h=max(0.,dot(vec3(n,nz),u_half));
    float spec=pow(h,74.),broad=pow(h,12.);
    float top=pow(max(0.,-n.y*.83+nz*.32+n.x*.09),7.);
    float strip=exp(-pow((n.x+.37+n.y*.20)/.065,2.))*ss(-.35,.4,-n.y)*ss(.10,.85,nz);
    float rim=f*(17.+illumination*117.)*max(.10,-n.y*.7+.3);
    float gleam=top*12.+strip*(11.+illumination*32.)+spec*(8.+illumination*212.)+broad*illumination*16.+rim;
    float contact=ss(.49,.94,q)*(.22+max(0.,n.y)*.2);
    float trans=(1.-f)*(.98-contact)*(.96+.04*nz);
    float focus=1.+illumination*.30*pow(max(0.,-n.x*u_half.x-n.y*u_half.y),3.);
    vec3 wet=(sampleColor*trans*focus+gleam*vec3(.90,.96,1.))/255.;
    gl_FragColor=vec4(mix(base,wet,water.a),1.);
  }`;
  class Optics {
    constructor(){
      this.canvas=document.createElement('canvas');this.ready=false;
      try{
        const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
        if(!gl)return;this.gl=gl;
        const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
        const v=compile(gl.VERTEX_SHADER,VS),f=compile(gl.FRAGMENT_SHADER,FS),p=gl.createProgram();
        gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
        if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
        this.program=p;gl.useProgram(p);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
        const a=gl.getAttribLocation(p,'a_position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
        this.u={};for(const n of ['scene','water','elastic','field','resolution','css','half','light','dpr','energy'])this.u[n]=gl.getUniformLocation(p,'u_'+n);
        this.textures=[];
        for(let i=0;i<4;i++){
          const t=gl.createTexture();this.textures.push(t);gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        }
        ['scene','water','elastic','field'].forEach((n,i)=>gl.uniform1i(this.u[n],i));
        this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;});this.ready=true;
      }catch(e){this.failureReason=String(e.message||e);this.ready=false;}
    }
    render(source,scene){
      const g=this.gl,u=this.u,{pw,ph,dpr}=scene;
      if(this.canvas.width!==pw||this.canvas.height!==ph){this.canvas.width=pw;this.canvas.height=ph;this.water=new Uint8Array(pw*ph*4);}
      const water=this.water;water.fill(0);
      // A normal/thickness atlas, not hundreds of shader-side droplet loops.
      for(const d of scene.runners){
        for(let j=1;j<d.path.length;j++){
          const a=d.path[j-1],b=d.path[j],age=scene.time-b.t,fade=Math.max(0,1-age/10)*.51;
          const steps=Math.max(1,Math.ceil((b.y-a.y)*dpr));
          for(let n=0;n<steps;n++){
            const t=n/steps,x=(a.x+(b.x-a.x)*t)*dpr,y=Math.round((a.y+(b.y-a.y)*t)*dpr);if(y<0||y>=ph)continue;
            const r=Math.max(.8,dpr*(.5+d.r*.19)*(1-age/15));
            for(let xx=Math.floor(x-r);xx<=Math.ceil(x+r);xx++){
              if(xx<0||xx>=pw)continue;const normal=Math.max(-.94,Math.min(.94,(xx-x)/r)),alpha=Math.max(0,Math.min(1,(1-Math.abs((xx-x)/r))*r+.5))*fade;
              const i=(y*pw+xx)*4;water[i]=(normal*.5+.5)*255;water[i+1]=128;water[i+2]=r/32*255;water[i+3]=alpha*255;
            }
          }
        }
      }
      const deposit=d=>{
        const cx=Math.round(d.x*dpr),cy=Math.round(d.y*dpr),map=scene.geometry(d.r,d.ratio,d.shape);
        for(let n=0;n<map.length;n+=10){
          const x=cx+map[n],y=cy+map[n+1];if(x<0||x>=pw||y<0||y>=ph)continue;const i=(y*pw+x)*4;
          water[i]=(map[n+4]*.5+.5)*255;water[i+1]=(map[n+5]*.5+.5)*255;water[i+2]=Math.min(1,d.r*dpr/32)*255;water[i+3]=map[n+7]*d.opacity*255;
        }
      };
      for(const d of scene.beads)if(d.wet)deposit(d);for(const d of scene.runners)deposit(d);
      const e=scene.elastic,N=e.cols*e.rows;
      if(!this.elastic||this.elastic.length!==N*4)this.elastic=new Uint8Array(N*4);
      for(let i=0;i<N;i++){this.elastic[i*4]=Math.round(e.x[i]/48*127+128);this.elastic[i*4+1]=Math.round(e.y[i]/48*127+128);this.elastic[i*4+2]=0;this.elastic[i*4+3]=255;}
      g.useProgram(this.program);g.viewport(0,0,pw,ph);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);
      const upload=(i,w,h,pixels)=>{g.activeTexture(g.TEXTURE0+i);g.bindTexture(g.TEXTURE_2D,this.textures[i]);if(pixels instanceof HTMLCanvasElement)g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,pixels);else g.texImage2D(g.TEXTURE_2D,0,g.RGBA,w,h,0,g.RGBA,g.UNSIGNED_BYTE,pixels);};
      upload(0,pw,ph,source);upload(1,pw,ph,water);upload(2,e.cols,e.rows,this.elastic);upload(3,scene.mask.width,scene.mask.height,scene.mask);
      g.uniform2f(u.resolution,pw,ph);g.uniform2f(u.css,scene.w,scene.h);g.uniform3fv(u.half,scene.half);g.uniform1f(u.light,scene.exposure);g.uniform1f(u.dpr,dpr);g.uniform1f(u.energy,e.energy);
      g.drawArrays(g.TRIANGLES,0,6);return this.canvas;
    }
    destroy(){if(!this.gl)return;const g=this.gl;for(const t of this.textures||[])g.deleteTexture(t);g.deleteBuffer(this.buffer);g.deleteProgram(this.program);}
  }
  window.RebuubOptics=Optics;
})();
