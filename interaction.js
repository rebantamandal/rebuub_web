/* Hover deforms the actual surface; a click or stationary tap breaks a sphere.
 * Nothing here starts a light event. Vertical touch scrolling remains native. */
(() => {
  'use strict';
  window.bindSculptureInput=(scene,hero,hit)=>{
    let touchId=null,press=null;
    const point=e=>{const r=scene.target.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
    const locate=e=>{const p=point(e);scene.setPointer(p.x,p.y,true);return p;};
    const finish=()=>{touchId=null;press=null;scene.setPointer(0,0,false);hit.style.cursor='';};
    hero.addEventListener('pointermove',e=>{
      if(e.target.closest('a,button,input,[data-no-scene]')){finish();return;}
      if(e.pointerType==='mouse'||e.pointerType==='pen'||e.pointerId===touchId){
        const p=locate(e);
        if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>9)press.moved=true;
        hit.style.cursor=scene.pickSphere(p.x,p.y)?'pointer':'';
      }
    },{passive:true});
    hero.addEventListener('pointerleave',finish,{passive:true});
    hero.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('a,button,input,[data-no-scene]'))return;
      if(e.pointerType==='touch')touchId=e.pointerId;
      const p=locate(e),item=scene.pickSphere(p.x,p.y,e.pointerType==='touch'?9:2);
      press={id:e.pointerId,x:e.clientX,y:e.clientY,itemId:item?.id,moved:false,time:performance.now()};
    },{passive:true});
    hero.addEventListener('pointerup',e=>{
      if(press&&press.id===e.pointerId&&!press.moved&&Math.hypot(e.clientX-press.x,e.clientY-press.y)<10&&performance.now()-press.time<700){
        const p=point(e),item=scene.pickSphere(p.x,p.y,e.pointerType==='touch'?12:4);
        if(item&&item.id===press.itemId){scene.sculpture.pop(item,!scene.moving);scene.updateObject();}
      }
      press=null;if(e.pointerType==='touch')finish();
    },{passive:true});
    hero.addEventListener('pointercancel',finish,{passive:true});
    hit.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(e.key)){
        e.preventDefault();scene.sculpture.selectNext(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1);scene.updateObject();
      }else if(e.key===' '||e.key==='Enter'){
        e.preventDefault();scene.sculpture.popSelected(!scene.moving);scene.updateObject();
      }else if(e.key==='Home'){
        e.preventDefault();scene.sculpture.reset();scene.elastic.reset();scene.updateObject();
      }else if(e.key==='Escape'){scene.sculpture.selected=null;scene.updateObject();}
    });
    hit.addEventListener('blur',()=>{scene.sculpture.selected=null;scene.updateObject();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();});
    return ()=>{finish();scene.sculpture.selected=null;};
  };
})();
