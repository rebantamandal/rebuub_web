const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=require('path').resolve(__dirname,'..')+'/';
const sandbox={window:{},performance:{now:()=>0},console};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(root+'sculpture.js','utf8'),sandbox);
const Original=sandbox.window.RebuubSculpture;
sandbox.window.RebuubSculpture=class extends Original{constructor(){super(true);this.renderer='solver-test';}renderAtlas(){return null;}};
vm.runInContext(fs.readFileSync(root+'spheres.js','utf8'),sandbox);
function random(){let seed=157;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function run(fps){const f=new sandbox.window.RebuubSphereField(random());f.resize(1440,743,1);f.setPointer(710,360,true);for(let i=0;i<fps*24;i++)f.update(1/fps,true);return f;}
const a=run(60),b=run(144),c=run(240);
let maxDiff=0;
for(const other of [b,c]){
 assert.equal(a.items.length,other.items.length);assert.equal(a.serial,other.serial);
 for(let i=0;i<a.items.length;i++)for(const key of ['x','y','vx','vy'])maxDiff=Math.max(maxDiff,Math.abs(a.items[i][key]-other.items[i][key]));
}
assert(maxDiff<1e-8);
const selected=a.items.find(x=>x.front);a.pop(selected);assert(a.bursts.at(-1).front===true);
const clock=a.clock;a.update(1/30,false);assert.equal(a.clock,clock);assert.equal(a.bursts.length,0);
const s=new Original(true);s.setContact(.2,.1,true);for(let i=0;i<120;i++)s.update(1/120,true);const peak=s.pressure;assert(peak>.9&&peak<1.1);s.setContact(.2,.1,false);for(let i=0;i<300;i++)s.update(1/120,true);assert(Math.abs(s.pressure)<1e-4);
console.log(JSON.stringify({fixedStepAcross60_144_240Hz:{pass:true,maxDifference:maxDiff},burstKeepsDepth:true,reduceMotionStopsSolver:true,originalSpringContactPressure:peak,originalSpringSettledPressure:s.pressure},null,2));
