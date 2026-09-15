/* Deterministic simulation tests; this does not measure real display FPS. */
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),sandbox={window:{},performance:{now:()=>0},console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'sculpture.js'),'utf8'),sandbox);
const Original=sandbox.window.RebuubSculpture;
sandbox.window.RebuubSculpture=class extends Original{constructor(){super(true);this.renderer='solver-test';}renderAtlas(){return null;}};
vm.runInContext(fs.readFileSync(path.join(root,'spheres.js'),'utf8'),sandbox);
const random=()=>{let s=7247;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);};
function run(fps,seconds=60,w=1440){
 const f=new sandbox.window.RebuubSphereField(random());f.resize(w,743);let maxDrops=0,maxBuds=0;
 for(let i=0;i<fps*seconds;i++){
  f.update(1/fps,true);maxDrops=Math.max(maxDrops,f.drips.length);maxBuds=Math.max(maxBuds,f.items.filter(x=>x.bud).length);
  assert(f.items.length<=f.limit&&f.drips.length<=f.dripLimit);
  for(const d of f.drips){assert(d.vy<0);for(const k of ['x','y','r','vx','vy','age'])assert(Number.isFinite(d[k]));}
 }
 assert(f.shedCount>8);return {f,maxDrops,maxBuds};
}
const a=run(60),b=run(144),c=run(240);let maxDiff=0;
for(const test of [b,c]){
 assert.equal(a.f.serial,test.f.serial);assert.equal(a.f.shedCount,test.f.shedCount);
 for(const type of ['items','drips']){
  assert.equal(a.f[type].length,test.f[type].length);
  for(let i=0;i<a.f[type].length;i++)for(const key of ['x','y','vx','vy'])maxDiff=Math.max(maxDiff,Math.abs(a.f[type][i][key]-test.f[type][i][key]));
 }
}
assert(maxDiff<1e-8);assert(a.maxBuds<=2);
const mobile=run(60,60,390);assert(mobile.maxBuds<=1);
const f=a.f,clock=f.clock,old=JSON.stringify(f.drips.map(d=>[d.x,d.y,d.age]));f.update(1,false);
assert.equal(f.clock,clock);assert.equal(JSON.stringify(f.drips.map(d=>[d.x,d.y,d.age])),old);
f.resize(390,600);assert.equal(f.drips.length,0);assert(f.items.every(x=>!x.bud));
f.update(1/60,true);f.reset();assert.equal(f.drips.length,0);assert.equal(f.bursts.length,0);
const isolated=new sandbox.window.RebuubSphereField(random());isolated.resize(1440,743);
const parent=isolated.items.find(b=>b.front);parent.y=parent.py=430;parent.x=parent.px=500;
isolated.startBud(parent);parent.bud.age=parent.bud.duration;
const shape=isolated.budShape(parent),factor=.2706/.345;
const expected={x:parent.x+shape.nx*shape.distance*1.24*factor*parent.r,y:parent.y+shape.ny*shape.distance*1.24*factor*parent.r};
isolated.advanceShedding(parent,0);const d=isolated.drips[0];assert(d);assert.equal(d.front,parent.front);
const releaseError=Math.hypot(d.x-expected.x,d.y-expected.y);assert(releaseError<1e-8);
const result={pass:true,comparisonSeconds:60,simulatedFrameRates:[60,144,240],maxPositionDifference:maxDiff,upwardOnly:true,
 desktop:{shed:a.f.shedCount,maxDrops:a.maxDrops,maxAttached:a.maxBuds},mobile:{shed:mobile.f.shedCount,maxDrops:mobile.maxDrops,maxAttached:mobile.maxBuds},
 releasePositionError:releaseError,daughterKeepsDepth:true,pauseFreezesDrops:true,resizeAndResetClearTransientGeometry:true};
console.log(JSON.stringify(result,null,2));
