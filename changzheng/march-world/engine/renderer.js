/* Scene renderer: cached artwork, culled sprites, bounded DPR and measured draw budget. */

(() => {

 'use strict';const M=window.CZMarchWorld._;

 function create(container,scene){

  const canvas=document.createElement('canvas');canvas.className='czmw-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',scene.title+' · 可行走手绘立体场景');container.append(canvas);

  const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true}),cam=M.proj.createCamera(),terrain=M.painter.paintTerrain(scene);

  let backdrop=M.painter.paintBackdrop(scene),vignette=null,atmosphere=null,raf=0,last=0,dead=false,dpr=1,cap=2,slow=0,frameFocus=null,pausedPainted=false;

  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const stats={frames:0,renderMs:0,drawn:0,culled:0,dpr:1,adaptive:false,artReady:M.painter.artReady,propsReady:M.painter.propsReady};

  const props=(scene.props||[]).map(original=>{let p={...original};if(['tent','house','houseWood','stoneWall'].includes(p.type)){const b=(scene.blocked||[]).find(b=>b.rect&&p.x>=b.rect[0]&&p.x<=b.rect[0]+b.rect[2]&&p.y>=b.rect[1]&&p.y<=b.rect[1]+b.rect[3]);if(b){p.y=b.rect[1]+b.rect[3];p.w=b.rect[2];}}return {...p,spr:M.painter.spriteFor(p,scene.palette)};}).sort((a,b)=>a.y-b.y),entities=[];

  const staticEntities=props.map(p=>({y:p.y,draw(){

    const pr=M.proj.project(cam,p.x,p.y,0),s=M.proj.depthScale(p.y,scene.world.h)*cam.zoom/5*(p.scale||1),w=(p.spr.wU*M.painter.SPR+8)*s,h=(p.spr.hU*M.painter.SPR+10)*s;

    if(pr.x+w/2<0||pr.x-w/2>cam.viewW||pr.y<0||pr.y-h>cam.viewH){stats.culled++;return;}

    ctx.save();ctx.fillStyle='#27372e25';ctx.beginPath();ctx.ellipse(pr.x+w*.08,pr.y+2*s,w*.35,Math.min(9*s,h*.09),-.12,0,7);ctx.fill();ctx.restore();const actor=scene.focusActor,ap=actor&&M.proj.project(cam,actor.x,actor.y,0);

    const obscures=ap&&p.y>actor.y&&ap.x>pr.x-w*.45&&ap.x<pr.x+w*.45&&ap.y>pr.y-h&&ap.y-3.2*cam.zoom<pr.y&&['tree','pine','house','houseWood','tent','cliff'].includes(p.type);

    ctx.save();if(obscures)ctx.globalAlpha=.42;ctx.drawImage(p.spr.c,pr.x-w/2,pr.y-h+6*s,w,h);ctx.restore();stats.drawn++;

  }}));

  function resize(){

   const r=container.getBoundingClientRect();if(r.width<2||r.height<2)return;

   const low=(navigator.hardwareConcurrency||8)<=4,pixels=low?1200000:2200000;

   dpr=Math.max(.75,Math.min(cap,window.devicePixelRatio||1,Math.sqrt(pixels/(r.width*r.height))));stats.dpr=+dpr.toFixed(2);

   canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';

   M.proj.fitCamera(cam,r.width,r.height,scene.world);

   if(atmosphere)atmosphere.width=atmosphere.height=0;

   atmosphere=document.createElement('canvas');atmosphere.width=Math.ceil(r.width);atmosphere.height=Math.ceil(r.height);

   const haze=atmosphere.getContext('2d');haze.fillStyle=scene.palette.ground;haze.fillRect(0,0,r.width,r.height);haze.globalCompositeOperation='destination-in';

   const fade=haze.createLinearGradient(0,r.height*.20,0,r.height*.60);fade.addColorStop(0,'#00000000');fade.addColorStop(.38,'#00000035');fade.addColorStop(1,'#000000ff');haze.fillStyle=fade;haze.fillRect(0,0,r.width,r.height);if(frameFocus)compose(frameFocus);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='low';

   if(vignette)vignette.width=vignette.height=0;vignette=document.createElement('canvas');vignette.width=Math.ceil(r.width);vignette.height=Math.ceil(r.height);const v=vignette.getContext('2d'),g=v.createRadialGradient(r.width/2,r.height/2,Math.min(r.width,r.height)*.42,r.width/2,r.height/2,Math.max(r.width,r.height)*.78);g.addColorStop(0,'#00000000');g.addColorStop(1,'#18161033');v.fillStyle=g;v.fillRect(0,0,r.width,r.height);

  }

  const ro=new ResizeObserver(resize);ro.observe(container);resize();

  M.painter.prepareArt().then(ready=>{if(ready&&!dead){backdrop=M.painter.paintBackdrop(scene);for(const p of props)p.spr=M.painter.spriteFor(p,scene.palette);stats.artReady=true;stats.propsReady=M.painter.propsReady;}});

  let framed=false,composed=false;function compose(f){const width=cam.viewW-100,height=Math.max(100,cam.viewH-140);const fit=Math.min(width/(Math.abs(f.px-f.x)+12),height/(Math.abs(f.py-f.y)*M.proj.PITCH+12));cam.zoom=Math.max(5.5,Math.min(cam.zoom,fit));cam.x=(f.px+f.x)/2;cam.y=(f.py+f.y)/2-3;M.proj.clampCamera(cam,scene.world);}function frameTarget(player,target){if(composed)return;composed=true;frameFocus={px:player.x,py:player.y,x:target.x,y:target.y};compose(frameFocus);framed=true;}function follow(target,dt){if(composed&&!target.moving)return;if(target.moving)frameFocus=null;if(!framed){cam.x=target.x;cam.y=target.y-6;framed=true;}const k=1-Math.pow(.002,dt);cam.x+=(target.x-cam.x)*k;cam.y+=(target.y-6-cam.y)*k;M.proj.clampCamera(cam,scene.world);}

  function frame(ts){

   if(dead)return;raf=requestAnimationFrame(frame);

   if(document.hidden){last=ts;return;}

   if(scene.pausedDim&&ts-last<1000/15)return;

   const frameGap=last?ts-last:16.7,dt=Math.max(0,Math.min(.1,frameGap/1000));last=ts;const started=performance.now();

   scene.tick?.(dt);if(scene.pausedDim&&pausedPainted)return;pausedPainted=!!scene.pausedDim;stats.drawn=0;stats.culled=0;ctx.setTransform(dpr,0,0,dpr,0,0);

   ctx.fillStyle=scene.palette.ground;ctx.fillRect(0,0,cam.viewW,cam.viewH);

   const bw=cam.viewW*1.2,bh=cam.viewH*.66,bx=-cam.viewW*.1-(cam.x/scene.world.w-.5)*cam.viewW*.16;

   ctx.drawImage(backdrop,bx,0,bw,bh);

   if(atmosphere)ctx.drawImage(atmosphere,0,0,cam.viewW,cam.viewH);

   const z=cam.zoom,pit=M.proj.PITCH;ctx.setTransform(dpr*z,0,0,dpr*z*pit,dpr*(cam.viewW/2-cam.x*z),dpr*(cam.viewH/2-cam.y*z*pit));ctx.drawImage(terrain,0,0,scene.world.w,scene.world.h);ctx.setTransform(dpr,0,0,dpr,0,0);

   scene.drawWater?.(ctx,cam);scene.drawGuide?.(ctx,cam);entities.length=0;entities.push(...staticEntities);if(scene.collectEntities)entities.push(...scene.collectEntities(ctx,cam));entities.sort((a,b)=>a.y-b.y);for(const e of entities)e.draw();

   if(!reduced){scene.drawSmoke?.(ctx,cam);scene.drawOverlay?.(ctx,cam);}if(vignette)ctx.drawImage(vignette,0,0,cam.viewW,cam.viewH);

   if(scene.pausedDim){ctx.fillStyle='#14181635';ctx.fillRect(0,0,cam.viewW,cam.viewH);}

   stats.frames++;stats.renderMs=+(performance.now()-started).toFixed(2);

   if(!scene.pausedDim&&(stats.renderMs>20))slow++;else slow=Math.max(0,slow-1);

   if(slow>=30&&dpr>.76){cap=Math.max(.75,dpr*.8);stats.adaptive=true;slow=0;resize();}

  }

  raf=requestAnimationFrame(frame);

  return {cam,canvas,stats,follow,frameTarget,resize,dispose(){dead=true;cancelAnimationFrame(raf);ro.disconnect();M.painter.releaseScene(scene.sceneId);canvas.width=canvas.height=0;canvas.remove();if(vignette)vignette.width=vignette.height=0;if(atmosphere)atmosphere.width=atmosphere.height=0;entities.length=0;staticEntities.length=0;}};

 }

 M.renderer={create};

})();

