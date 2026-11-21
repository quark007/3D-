/* march-world 内部模块：手绘插画风的程序化素材工厂。
   说明：场景使用原创手绘远景图集与按可行走几何绘制的纹理、道具，
   场景定义里的 art 槽位可整体替换为最终美术，无需改引擎。 */
(() => {
  'use strict';
  const NS = window.CZMarchWorld = window.CZMarchWorld || {};
  const M = NS._ = NS._ || {};
  const TEX = 8;              /* 地形离屏分辨率：每世界单位 8px */
  const SPR = 5;              /* 道具/角色精灵分辨率：每世界单位 5px */
  const cache = new Map();

  let atlas=null, propsAtlas=null, figIdle=null, figWalk=null, artPromise=null;
  function prepareArt(){
    if(artPromise)return artPromise;
    if(typeof Image==='undefined')return Promise.resolve(false);
    const load=file=>new Promise(resolve=>{const img=new Image();img.decoding='async';img.onload=()=>resolve(img);img.onerror=()=>resolve(null);const source=document.querySelector('script[src*="engine/painter.js"]');img.src=source?new URL('../../assets/world-art88/'+file,source.src).href:new URL('assets/world-art88/'+file,document.baseURI).href;});
    artPromise=Promise.all([load('landscapes.png'),load('props.png'),load('figures/default-idle.png'),load('figures/default-walk.png')]).then(([background,objects,fi,fw])=>{
      atlas=background;propsAtlas=objects;figIdle=fi;figWalk=fw;
      for(const k of [...cache.keys()])if(k.startsWith('bak:')||k.startsWith('fig:'))cache.delete(k);return !!atlas;
    });return artPromise;
  }
  function artZone(chapterId){return chapterId===8?1:chapterId===9?2:chapterId>=11?3:0;}
  function cacheSprite(key,value){
    cache.set(key,value);
    const keys=[...cache.keys()].filter(k=>k.startsWith('spr:'));while(keys.length>220)cache.delete(keys.shift());
    return value;
  }
  function cv(w, h) { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; }
  function rnd(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function shade(hex, k) { /* k>0 变亮 k<0 变暗 */
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = v => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function speckle(ctx, w, h, color, count, alpha, r0, r1, seed) {
    const R = rnd(seed); ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
    for (let i = 0; i < count; i++) { const r = r0 + R() * (r1 - r0); ctx.beginPath(); ctx.ellipse(R() * w, R() * h, r, r * (0.5 + R() * 0.7), R() * 3, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  /* ========== 地形（世界空间离屏，渲染时经非均匀变换产生斜俯视） ========== */
  function paintTerrain(scene) {
    const key = 'ter:' + scene.sceneId; if (cache.has(key)) return cache.get(key);
    const W = scene.world.w * TEX, H = scene.world.h * TEX, c = cv(W, H), x = c.getContext('2d');
    const P = scene.palette, R = rnd(scene.seed || 7);
    x.fillStyle = P.ground; x.fillRect(0, 0, W, H);
    /* 大块地势色带：北侧高远、颜色略冷 */
    const grad = x.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(70,86,84,0.16)'); grad.addColorStop(0.5, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(122,96,58,0.10)');
    x.fillStyle = grad; x.fillRect(0, 0, W, H);
    /* 地面色斑（草地/土坡/雪斑等，场景可给 patches） */
    for (const p of scene.terrain && scene.terrain.patches || []) {
      x.save(); x.fillStyle = p.color; x.globalAlpha = (p.alpha == null ? 0.55 : p.alpha)*.55;
      blob(x, p.x * TEX, p.y * TEX, p.rx * TEX, p.ry * TEX, 9, R); x.fill();x.clip();
      const slope=x.createLinearGradient(0,(p.y-p.ry)*TEX,0,(p.y+p.ry)*TEX);slope.addColorStop(0,'#f0e4c05e');slope.addColorStop(.48,'#ece1c000');slope.addColorStop(1,'#334c3a77');x.fillStyle=slope;x.fillRect((p.x-p.rx*1.4)*TEX,(p.y-p.ry*1.4)*TEX,p.rx*TEX*2.8,p.ry*TEX*2.8);
      x.strokeStyle=scene.chapterId===8?'#ebeee18c':'#e4d2a747';x.lineWidth=.8;for(let j=0;j<4;j++){const y=(p.y-p.ry*.6+j*p.ry*.36)*TEX;x.beginPath();x.moveTo((p.x-p.rx)*TEX,y);x.bezierCurveTo((p.x-p.rx*.3)*TEX,y-8,(p.x+p.rx*.3)*TEX,y+7,(p.x+p.rx)*TEX,y-2);x.stroke();}x.restore();
    }
    speckle(x, W, H, scene.palette.speckle || '#5d5a42', 460, 0.07, 2, 9, (scene.seed || 7) + 11);
    speckle(x, W, H, '#f4ecd8', 300, 0.05, 2, 7, (scene.seed || 7) + 23);
    /* 道路：深色底边 + 主色 + 车辙两条 */
    for (const road of scene.terrain && scene.terrain.roads || []) {
      strokePath(x, road.pts, road.w * TEX + 2.6, P.roadEdge || shade(P.road, -0.28), 0.9);
      strokePath(x, road.pts, road.w * TEX, P.road, 1);
      strokePath(x, road.pts, road.w * TEX * 0.24, shade(P.road, -0.12), 0.5, true);
      const off = road.w * TEX * 0.3;
      strokePath(x, offsetPath(road.pts, -off), 1.1, shade(P.road, -0.3), 0.5, true);
      strokePath(x, offsetPath(road.pts, off), 1.1, shade(P.road, -0.3), 0.5, true);
    }
    /* Relief is authored from existing collision geometry: no new invisible walls. */
    for(const b of scene.blocked||[]){
      if(!b.poly)continue;const pts=b.poly;
      const water=(scene.terrain?.waters||[]).some(w=>JSON.stringify(w.pts)===JSON.stringify(pts));
      if(water)continue;
      x.save();poly(x,pts,TEX);x.clip();
      const minY=Math.min(...pts.map(p=>p[1])),maxY=Math.max(...pts.map(p=>p[1]));
      const g=x.createLinearGradient(0,minY*TEX,0,maxY*TEX);g.addColorStop(0,scene.chapterId===8?'#f0f1e2':'#96946b');g.addColorStop(1,scene.chapterId===8?'#667c7c':'#4d6151');x.globalAlpha=.7;x.fillStyle=g;x.fillRect(0,minY*TEX,W,(maxY-minY)*TEX);
      x.strokeStyle='#ede3c477';x.lineWidth=1.2;for(let y=minY+2;y<maxY;y+=2.4){x.beginPath();x.moveTo(0,y*TEX);x.bezierCurveTo(W*.3,(y-2)*TEX,W*.6,(y+2)*TEX,W,y*TEX);x.stroke();}x.restore();
    }
    /* 水域 */
    for (const wpoly of scene.terrain && scene.terrain.waters || []) {
      x.save(); poly(x, wpoly.pts, TEX);
      const wg = x.createLinearGradient(0, wpoly.top * TEX, 0, wpoly.bottom * TEX);
      wg.addColorStop(0, shade(P.water, 0.12)); wg.addColorStop(1, P.waterDeep || shade(P.water, -0.25));
      x.fillStyle = wg; x.fill();
      x.clip(); speckle(x, W, H, '#ffffff', 160, 0.10, 1.5, 5, (scene.seed || 7) + 31); x.restore();
      x.save();poly(x,wpoly.pts,TEX);x.strokeStyle='#cbb98a';x.lineWidth=TEX*.6;x.stroke();x.restore();x.save(); poly(x, wpoly.pts, TEX); x.strokeStyle = shade(P.water, -0.4); x.globalAlpha = 0.6; x.lineWidth = 2; x.stroke(); x.restore();
    }
    /* 陡崖/高差暗边 */
    for (const cl of scene.terrain && scene.terrain.cliffs || []) {
      strokePath(x, cl.pts, (cl.w || 2.2) * TEX, shade(P.rock || '#7a7668', -0.35), 0.85);
      strokePath(x, cl.pts, (cl.w || 2.2) * TEX * 0.45, shade(P.rock || '#7a7668', 0.1), 0.8);
    }
    /* Static, geometry-aligned detail, painted once, never during the game loop. */
    const snow=scene.chapterId===8, town=scene.chapterId===3||scene.chapterId>=11;
    x.save();x.globalAlpha=snow?.22:.17;x.lineWidth=.8;
    for(let i=0;i<1800;i++){
      const px=R()*W,py=R()*H;x.strokeStyle=i%3?'#f0e5cb':'#475d3c';
      x.beginPath();x.moveTo(px,py);x.lineTo(px+(R()-.5)*8,py-(snow?1:3+R()*6));x.stroke();
    }x.restore();
    for(const road of scene.terrain?.roads||[]){
      x.save();x.lineCap='round';x.lineWidth=road.w*TEX*.82;x.beginPath();road.pts.forEach((p,i)=>i?x.lineTo(p[0]*TEX,p[1]*TEX):x.moveTo(p[0]*TEX,p[1]*TEX));
      /* Path2D stroke is used as a mask on a small temporary canvas, so details stay on roads. */
      const marks=cv(W,H),m=marks.getContext('2d');m.lineCap='round';m.lineJoin='round';m.lineWidth=road.w*TEX*.82;m.strokeStyle='#fff';m.beginPath();road.pts.forEach((p,i)=>i?m.lineTo(p[0]*TEX,p[1]*TEX):m.moveTo(p[0]*TEX,p[1]*TEX));m.stroke();m.globalCompositeOperation='source-in';m.fillStyle=town?'#d7c8a5':snow?'#d7dce0':'#d0bd91';m.fillRect(0,0,W,H);m.globalCompositeOperation='source-atop';m.strokeStyle='#685c4555';m.lineWidth=.8;
      for(let j=1;j<road.pts.length;j++){const a=road.pts[j-1],b=road.pts[j],length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(length*(town?2:1));for(let i=0;i<count;i++){const t=i/count,px=(a[0]+(b[0]-a[0])*t)*TEX,py=(a[1]+(b[1]-a[1])*t)*TEX;m.beginPath();m.moveTo(px-road.w*TEX*.5,py);m.lineTo(px+road.w*TEX*.5,py+3);m.stroke();}}
      x.globalAlpha=town?.65:.35;x.drawImage(marks,0,0);marks.width=marks.height=0;x.restore();
    }
    if(scene.ironBridge){
      const b=scene.ironBridge,left=b.x0*TEX,right=b.x1*TEX,top=(b.y-b.width/2)*TEX,height=b.width*TEX;
      x.save();x.fillStyle='#263d3a55';x.fillRect(left,top+height+TEX,right-left,TEX*1.4);
      x.strokeStyle='#252b2b';x.lineWidth=1.8;
      for(let i=0;i<b.deckChains;i++){const yy=top+(i+.5)/b.deckChains*height;x.beginPath();x.moveTo(left,yy);x.lineTo(right,yy);x.stroke();}
      for(let px=left;px<right;px+=TEX*.95){x.fillStyle=R()>.5?'#b49a6d':'#927751';x.fillRect(px,top,TEX*.79,height);x.strokeStyle='#4f493a';x.lineWidth=.7;x.strokeRect(px,top,TEX*.79,height);x.strokeStyle='#ddc7a288';x.beginPath();x.moveTo(px+TEX*.25,top+2);x.lineTo(px+TEX*.3,top+height-2);x.stroke();}
      x.restore();
    }
    x.save();x.globalCompositeOperation='destination-in';const edge=x.createLinearGradient(0,0,0,TEX*7);edge.addColorStop(0,'#ffffff00');edge.addColorStop(1,'#ffffffff');x.fillStyle=edge;x.fillRect(0,0,W,H);x.restore();
    /* Fade cached side boundaries into the same ground atmosphere; no camera or collision changes. */
    x.save();x.globalCompositeOperation='destination-in';const side=x.createLinearGradient(0,0,W,0),fraction=Math.min(.09,TEX*6/W);side.addColorStop(0,'#ffffff00');side.addColorStop(fraction,'#ffffffff');side.addColorStop(1-fraction,'#ffffffff');side.addColorStop(1,'#ffffff00');x.fillStyle=side;x.fillRect(0,0,W,H);x.restore();
    cache.set(key, c); return c;
  }
  function blob(x, cx, cy, rx, ry, n, R) {
    x.beginPath();
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, k = 0.75 + R() * 0.4; const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.closePath();
  }
  function poly(x, pts, k) { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0] * k, p[1] * k) : x.moveTo(p[0] * k, p[1] * k)); x.closePath(); }
  function strokePath(x, pts, w, color, alpha, dash) {
    x.save(); x.strokeStyle = color; x.globalAlpha = alpha; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round';
    if (dash) x.setLineDash([w * 2.2, w * 1.6]);
    x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0] * TEX, p[1] * TEX) : x.moveTo(p[0] * TEX, p[1] * TEX)); x.stroke(); x.restore();
  }
  function offsetPath(pts, off) {
    return pts.map((p, i) => {
      const q = pts[Math.min(pts.length - 1, i + 1)], r = pts[Math.max(0, i - 1)];
      const dx = q[0] - r[0], dy = q[1] - r[1], l = Math.hypot(dx, dy) || 1;
      return [p[0] - dy / l * off / TEX, p[1] + dx / l * off / TEX];
    });
  }

  /* ========== 远景幕布：天空 + 三层山峦（空气透视） ========== */
  function paintBackdrop(scene) {
    const key = 'bak:' + scene.sceneId; if (cache.has(key)) return cache.get(key);
    const W = 1600, H = 620, c = cv(W, H), x = c.getContext('2d'), P = scene.palette, R = rnd((scene.seed || 7) + 101);
    if(atlas){const zone=artZone(scene.chapterId),sw=atlas.naturalWidth/2,sh=atlas.naturalHeight/2;
      x.drawImage(atlas,(zone%2)*sw,Math.floor(zone/2)*sh,sw,sh,0,0,W,H);
      x.fillStyle=scene.chapterId===2?'#596f7622':scene.chapterId===4?'#8f69551a':scene.chapterId===5?'#b1956d18':'#ffffff05';x.fillRect(0,0,W,H);cache.set(key,c);return c;
    }
    const sky = x.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, P.sky0); sky.addColorStop(0.62, P.sky1); sky.addColorStop(1, shade(P.sky1, 0.08));
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    if (P.sun) { const g = x.createRadialGradient(W * 0.72, H * 0.2, 8, W * 0.72, H * 0.2, 190); g.addColorStop(0, 'rgba(255,238,196,0.75)'); g.addColorStop(1, 'rgba(255,238,196,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    /* 云 */
    x.save(); x.globalAlpha = 0.5;
    for (let i = 0; i < 6; i++) { const cx0 = R() * W, cy0 = H * (0.06 + R() * 0.2), s = 30 + R() * 70; x.fillStyle = 'rgba(246,242,232,0.8)'; blob(x, cx0, cy0, s * 1.9, s * 0.42, 8, R); x.fill(); }
    x.restore();
    /* 三层山：越远越淡越蓝 */
    const layers = [P.mtn2, P.mtn1, P.mtn0];
    layers.forEach((col, li) => {
      const base = H * (0.34 + li * 0.16), amp = H * (0.2 - li * 0.045);
      x.fillStyle = col; x.globalAlpha = 1 - li * 0.08; x.beginPath(); x.moveTo(0, H);
      for (let px = 0; px <= W; px += 14) {
        const t = px / W * Math.PI * (2.1 + li * 0.7) + li * 1.7;
        const y = base + Math.sin(t) * amp * 0.4 + Math.sin(t * 2.7 + 1) * amp * 0.22 - amp * 0.55 - Math.abs(Math.sin(t * 0.5)) * amp * 0.35;
        x.lineTo(px, y);
      }
      x.lineTo(W, H); x.closePath(); x.fill(); x.globalAlpha = 1;
      if (P.snowcaps && li < 2) { /* 雪山顶 */
        x.save(); x.clip(); x.fillStyle = 'rgba(244,247,250,0.85)';
        x.fillRect(0, 0, W, base - amp * 0.62); x.restore();
      }
    });
    cache.set(key, c); return c;
  }

  /* ========== 道具精灵（屏幕空间直立，底部为锚点） ========== */
  function spriteFor(prop, P) {
    const key = 'spr:' + (propsAtlas?'atlas:':'native:') + JSON.stringify([prop.type,prop.variant||'',prop.seed||0,prop.w||4,prop.h||4,P]);
    if (cache.has(key)) return cache.get(key);
    const fn = PROPS[prop.type] || PROPS.rock;
    const wU = prop.w || 4, hU = prop.h || 4;
    const c = cv((wU * SPR + 8)*2, (hU * SPR + 10)*2), x = c.getContext('2d');
    x.scale(2,2);x.translate(4, 4); x.lineJoin = 'round'; x.lineCap = 'round';
    const zones={tree:0,pine:0,house:1,tent:2,boat:3},zone=zones[prop.type];
    if(propsAtlas&&zone!==undefined){
      // Transparent gutters measured from the delivered atlas, not an assumed equal-height split.
      const cutX=propsAtlas.naturalWidth*682/1374,cutY=propsAtlas.naturalHeight*607/1145,sx=zone%2?cutX:0,sy=zone>=2?cutY:0,sw=zone%2?propsAtlas.naturalWidth-cutX:cutX,sh=zone>=2?propsAtlas.naturalHeight-cutY:cutY;
      x.filter='saturate(.65) contrast(.92)';x.drawImage(propsAtlas,sx,sy,sw,sh,0,0,wU*SPR,hU*SPR);x.filter='none';x.globalCompositeOperation='source-atop';x.fillStyle=P.snowyTree&&['tree','pine'].includes(prop.type)?'#e6e9da99':'#d6c59622';x.fillRect(0,0,wU*SPR,hU*SPR);x.globalCompositeOperation='source-over';return cacheSprite(key,{c,wU,hU,pixelRatio:2});
    }
    fn(x, wU * SPR, hU * SPR, P, rnd((prop.seed || 1) * 977 + 13), prop);
    /* Paper-grain glaze clips to the existing silhouette; collision footprints do not change. */
    x.globalCompositeOperation='source-atop';const light=x.createLinearGradient(0,0,wU*SPR,hU*SPR);light.addColorStop(0,'#fff1c62b');light.addColorStop(.6,'#ffffff00');light.addColorStop(1,'#23352d38');x.fillStyle=light;x.fillRect(-4,-4,wU*SPR+8,hU*SPR+10);
    speckle(x,wU*SPR,hU*SPR,'#f6ebcf',Math.ceil(wU*hU*2),.13,.2,.7,(prop.seed||1)*37);x.globalCompositeOperation='source-over';
    const out = { c, wU, hU, pixelRatio:2 };return cacheSprite(key,out);
  }
  function outline(x, P, w) { x.strokeStyle = 'rgba(46,42,34,0.55)'; x.lineWidth = w || 1.6; x.stroke(); }

  const PROPS = {
    tree(x, w, h, P, R) { /* 阔叶树：近景遮挡主力 */
      x.fillStyle = '#5b4632'; x.fillRect(w * 0.42, h * 0.42, w * 0.16, h * 0.58);
      const greens = [P.leaf || '#5f6f46', shade(P.leaf || '#5f6f46', -0.15), shade(P.leaf || '#5f6f46', 0.12)];
      for (let i = 0; i < 7; i++) { x.fillStyle = greens[i % 3]; x.beginPath(); x.ellipse(w * (0.2 + R() * 0.6), h * (0.08 + R() * 0.34), w * (0.2 + R() * 0.14), h * (0.13 + R() * 0.1), 0, 0, 7); x.fill(); }
      x.beginPath(); x.ellipse(w * 0.5, h * 0.24, w * 0.46, h * 0.28, 0, 0, 7); outline(x, P);
    },
    pine(x, w, h, P, R) {
      x.fillStyle = '#4d3d2c'; x.fillRect(w * 0.45, h * 0.6, w * 0.1, h * 0.4);
      for (let i = 0; i < 4; i++) { const y0 = h * (0.12 + i * 0.17), ww = w * (0.62 - i * 0.1); x.fillStyle = shade(P.pine || '#4a5d48', i * -0.06); x.beginPath(); x.moveTo(w * 0.5, y0 - h * 0.16); x.lineTo(w * 0.5 - ww / 2, y0 + h * 0.12); x.lineTo(w * 0.5 + ww / 2, y0 + h * 0.12); x.closePath(); x.fill(); }
      x.beginPath(); x.moveTo(w * 0.5, 0); x.lineTo(w * 0.24, h * 0.3); x.lineTo(w * 0.76, h * 0.3); x.closePath(); outline(x, P);
      if (P.snowyTree) { x.fillStyle = 'rgba(245,248,250,0.85)'; x.beginPath(); x.moveTo(w * 0.5, 0); x.lineTo(w * 0.32, h * 0.22); x.lineTo(w * 0.68, h * 0.22); x.closePath(); x.fill(); }
    },
    deadTree(x, w, h, P, R) {
      x.strokeStyle = '#4a3a2b'; x.lineWidth = w * 0.09; x.beginPath(); x.moveTo(w * 0.5, h); x.lineTo(w * 0.52, h * 0.3); x.stroke();
      x.lineWidth = w * 0.05;
      for (const [a, b, c2, d] of [[0.52, 0.3, 0.2, 0.08], [0.52, 0.42, 0.82, 0.2], [0.51, 0.55, 0.3, 0.38]]) { x.beginPath(); x.moveTo(w * a, h * b); x.lineTo(w * c2, h * d); x.stroke(); }
    },
    stoneWall(x, w, h, P, R) { /* 石墙段：近景遮挡/碰撞 */
      x.fillStyle = P.wall || '#8a8577'; x.fillRect(0, h * 0.18, w, h * 0.82); outline(x, P);
      x.fillStyle = shade(P.wall || '#8a8577', 0.18); x.fillRect(0, h * 0.18, w, h * 0.14);
      x.strokeStyle = 'rgba(46,42,34,0.35)'; x.lineWidth = 1;
      for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(0, h * (0.18 + i * 0.2)); x.lineTo(w, h * (0.18 + i * 0.2)); x.stroke(); }
      for (let i = 0; i < 5; i++) { const xx = w * (0.1 + R() * 0.8), yy = h * (0.24 + R() * 0.66); x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx, yy + h * 0.12); x.stroke(); }
    },
    rock(x, w, h, P, R) {
      x.fillStyle = P.rock || '#7d7a6e'; blob2(x, w * 0.5, h * 0.62, w * 0.48, h * 0.4, R); x.fill(); outline(x, P);
      x.fillStyle = shade(P.rock || '#7d7a6e', 0.2); blob2(x, w * 0.42, h * 0.48, w * 0.26, h * 0.18, R); x.fill();
      if (P.snowyRock) { x.fillStyle = 'rgba(245,248,250,0.9)'; blob2(x, w * 0.46, h * 0.3, w * 0.34, h * 0.16, R); x.fill(); }
    },
    cliff(x,w,h,P,R){
      const pts=[[0,h*.9],[w*.04,h*.55],[w*.2,h*.28],[w*.36,h*.32],[w*.48,h*.08],[w*.69,h*.2],[w*.83,h*.38],[w,h*.66],[w,h]];
      x.beginPath();pts.forEach((p,i)=>i?x.lineTo(...p):x.moveTo(...p));x.closePath();const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,P.snowyRock?'#c5d0cb':'#a29f82');g.addColorStop(1,P.rock||'#6a7769');x.fillStyle=g;x.fill();x.strokeStyle='#4c594a';x.lineWidth=.8;x.stroke();x.save();x.clip();for(let i=0;i<13;i++){const xx=R()*w;x.strokeStyle=i%2?'#e1dab277':'#344a3e77';x.lineWidth=.55;x.beginPath();x.moveTo(xx,h*.2);x.bezierCurveTo(xx-w*.1,h*.4,xx+w*.05,h*.7,xx-w*.06,h);x.stroke();}x.restore();
    },
    house(x, w, h, P, R) { /* 坡顶瓦房（看得到侧面=斜俯视要点） */
      x.fillStyle = P.houseWall || '#b09a72'; x.fillRect(w * 0.08, h * 0.42, w * 0.84, h * 0.58); outline(x, P);
      x.fillStyle = shade(P.houseWall || '#b09a72', -0.18); x.fillRect(w * 0.66, h * 0.42, w * 0.26, h * 0.58);
      x.fillStyle = P.roof || '#6e6a5e'; x.beginPath(); x.moveTo(0, h * 0.44); x.lineTo(w * 0.5, h * 0.06); x.lineTo(w, h * 0.44); x.lineTo(w * 0.92, h * 0.52); x.lineTo(w * 0.08, h * 0.52); x.closePath(); x.fill(); outline(x, P);
      x.fillStyle = shade(P.roof || '#6e6a5e', -0.25); x.beginPath(); x.moveTo(w * 0.5, h * 0.06); x.lineTo(w, h * 0.44); x.lineTo(w * 0.92, h * 0.52); x.lineTo(w * 0.5, h * 0.18); x.closePath(); x.fill();
      x.strokeStyle='#c5c0a255';x.lineWidth=.65;
      for(let i=1;i<13;i++){const t=i/13;x.beginPath();x.moveTo(w*.5+(t-.5)*w*.7,h*.2);x.lineTo(w*t,h*.46);x.stroke();}
      x.strokeStyle='#302c2666';for(let i=0;i<5;i++){x.beginPath();x.moveTo(w*.12,h*(.6+i*.08));x.lineTo(w*.9,h*(.6+i*.08));x.stroke();}
      x.fillStyle = '#4a3b2a'; x.fillRect(w * 0.4, h * 0.66, w * 0.18, h * 0.34);
      x.fillStyle = 'rgba(240,230,200,0.85)'; x.fillRect(w * 0.14, h * 0.56, w * 0.14, h * 0.14); x.fillRect(w * 0.68, h * 0.56, w * 0.14, h * 0.14);
    },
    houseWood(x, w, h, P, R) { /* 两层木楼（遵义/市镇） */
      x.fillStyle = P.wood || '#7a5c40'; x.fillRect(w * 0.06, h * 0.3, w * 0.88, h * 0.7); outline(x, P);
      x.fillStyle = shade(P.wood || '#7a5c40', -0.2); x.fillRect(w * 0.62, h * 0.3, w * 0.32, h * 0.7);
      x.fillStyle = P.roof || '#5d5950'; x.beginPath(); x.moveTo(0, h * 0.32); x.lineTo(w * 0.5, h * 0.02); x.lineTo(w, h * 0.32); x.closePath(); x.fill(); outline(x, P);
      x.strokeStyle = 'rgba(40,32,24,0.5)'; x.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) { const xx = w * (0.12 + i * 0.19); x.beginPath(); x.moveTo(xx, h * 0.3); x.lineTo(xx, h); x.stroke(); }
      x.beginPath(); x.moveTo(w * 0.06, h * 0.62); x.lineTo(w * 0.94, h * 0.62); x.stroke();
      x.fillStyle = 'rgba(238,226,196,0.9)'; for (const [fx, fy] of [[0.16, 0.4], [0.4, 0.4], [0.66, 0.4], [0.16, 0.72], [0.66, 0.72]]) x.fillRect(w * fx, h * fy, w * 0.15, h * 0.14);
      x.fillStyle = '#42321f'; x.fillRect(w * 0.42, h * 0.7, w * 0.16, h * 0.3);
    },
    yaodong(x, w, h, P, R) { /* 陕北窑洞：黄土崖+拱门窗 */
      x.fillStyle = P.loess || '#b48f57'; blob2(x, w * 0.5, h * 0.5, w * 0.52, h * 0.5, R); x.fill(); outline(x, P);
      x.fillStyle = shade(P.loess || '#b48f57', -0.12); blob2(x, w * 0.5, h * 0.66, w * 0.5, h * 0.32, R); x.fill();
      x.fillStyle = '#3c2f21'; x.beginPath(); x.moveTo(w * 0.36, h); x.lineTo(w * 0.36, h * 0.62); x.arc(w * 0.5, h * 0.62, w * 0.14, Math.PI, 0); x.lineTo(w * 0.64, h); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(240,225,190,0.7)'; x.lineWidth = 1.6; x.stroke();
      x.fillStyle = 'rgba(238,226,196,0.85)'; x.beginPath(); x.arc(w * 0.24, h * 0.6, w * 0.05, 0, 7); x.fill(); x.beginPath(); x.arc(w * 0.76, h * 0.6, w * 0.05, 0, 7); x.fill();
    },
    gate(x, w, h, P, R) { /* 门楼/牌坊：村庄与集镇入口 */
      x.fillStyle = P.wood || '#6d5138';
      x.fillRect(w * 0.1, h * 0.3, w * 0.12, h * 0.7); x.fillRect(w * 0.78, h * 0.3, w * 0.12, h * 0.7);
      x.fillRect(0, h * 0.2, w, h * 0.12); x.fillRect(w * 0.06, h * 0.36, w * 0.88, h * 0.08);
      x.fillStyle = P.roof || '#5d5950'; x.beginPath(); x.moveTo(-w * 0.04, h * 0.2); x.lineTo(w * 0.5, 0); x.lineTo(w * 1.04, h * 0.2); x.closePath(); x.fill(); outline(x, P);
      x.fillStyle = 'rgba(238,226,196,0.92)'; x.fillRect(w * 0.3, h * 0.22, w * 0.4, h * 0.08);
    },
    archGate(x, w, h, P, R) { /* 石拱门关卡（参考图核心物） */
      x.fillStyle = P.wall || '#8a8577'; x.fillRect(0, 0, w, h); outline(x, P);
      x.fillStyle = '#2e2a24'; x.beginPath(); x.moveTo(w * 0.3, h); x.lineTo(w * 0.3, h * 0.45); x.arc(w * 0.5, h * 0.45, w * 0.2, Math.PI, 0); x.lineTo(w * 0.7, h); x.closePath(); x.fill();
      x.fillStyle = shade(P.wall || '#8a8577', 0.16); x.fillRect(0, 0, w, h * 0.12);
      x.strokeStyle = 'rgba(46,42,34,0.3)'; x.lineWidth = 1;
      for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(0, h * i / 5); x.lineTo(w, h * i / 5); x.stroke(); }
    },
    tent(x, w, h, P, R) {
      x.fillStyle = P.tent || '#a3946f'; x.beginPath(); x.moveTo(w * 0.02, h * 0.98); x.lineTo(w * 0.5, h * 0.06); x.lineTo(w * 0.98, h * 0.98); x.closePath(); x.fill(); outline(x, P);
      x.fillStyle = shade(P.tent || '#a3946f', -0.2); x.beginPath(); x.moveTo(w * 0.5, h * 0.06); x.lineTo(w * 0.98, h * 0.98); x.lineTo(w * 0.62, h * 0.98); x.closePath(); x.fill();
      x.strokeStyle = '#3f3423'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(w * 0.5, h * 0.98); x.lineTo(w * 0.5, h * 0.3); x.stroke();
    },
    tower(x, w, h, P, R) { /* 瞭望/碉楼（防御遗迹感，不作战斗表现） */
      x.fillStyle = P.wall || '#857f70'; x.fillRect(w * 0.16, h * 0.34, w * 0.68, h * 0.66); outline(x, P);
      x.fillStyle = shade(P.wall || '#857f70', -0.2); x.fillRect(w * 0.58, h * 0.34, w * 0.26, h * 0.66);
      x.fillStyle = P.roof || '#57534a'; x.beginPath(); x.moveTo(w * 0.04, h * 0.36); x.lineTo(w * 0.5, h * 0.04); x.lineTo(w * 0.96, h * 0.36); x.closePath(); x.fill(); outline(x, P);
      x.fillStyle = '#33291d'; x.fillRect(w * 0.42, h * 0.5, w * 0.16, h * 0.14);
    },
    sandbag(x, w, h, P, R) {
      for (let r = 0; r < 3; r++) for (let i = 0; i <= 3 - r; i++) {
        const bx = w * (0.14 + i * 0.24 + r * 0.12), by = h * (0.94 - r * 0.3);
        x.fillStyle = shade(P.sand || '#9c8a62', -r * 0.08); x.beginPath(); x.ellipse(bx, by, w * 0.14, h * 0.16, 0, 0, 7); x.fill();
        x.strokeStyle = 'rgba(46,42,34,0.4)'; x.lineWidth = 1; x.stroke();
      }
    },
    crate(x, w, h, P, R) {
      x.fillStyle = '#7d6040'; x.fillRect(w * 0.08, h * 0.22, w * 0.84, h * 0.78); outline(x, P);
      x.strokeStyle = 'rgba(40,30,18,0.6)'; x.lineWidth = 1.4;
      x.strokeRect(w * 0.16, h * 0.3, w * 0.68, h * 0.62);
      x.beginPath(); x.moveTo(w * 0.16, h * 0.3); x.lineTo(w * 0.84, h * 0.92); x.moveTo(w * 0.84, h * 0.3); x.lineTo(w * 0.16, h * 0.92); x.stroke();
    },
    grain(x, w, h, P, R) { /* 粮囤 */
      x.fillStyle = '#b3925c'; x.beginPath(); x.ellipse(w * 0.5, h * 0.72, w * 0.42, h * 0.28, 0, 0, 7); x.fill(); outline(x, P);
      x.fillStyle = '#8a6f42'; x.beginPath(); x.moveTo(w * 0.1, h * 0.66); x.lineTo(w * 0.5, h * 0.08); x.lineTo(w * 0.9, h * 0.66); x.closePath(); x.fill(); outline(x, P);
    },
    cart(x, w, h, P, R) { /* 独轮车 */
      x.strokeStyle = '#5d4630'; x.lineWidth = w * 0.05;
      x.beginPath(); x.moveTo(w * 0.1, h * 0.4); x.lineTo(w * 0.62, h * 0.62); x.moveTo(w * 0.1, h * 0.6); x.lineTo(w * 0.62, h * 0.66); x.stroke();
      x.fillStyle = '#6d5138'; x.fillRect(w * 0.34, h * 0.3, w * 0.4, h * 0.3); outline(x, P);
      x.fillStyle = '#3f3423'; x.beginPath(); x.arc(w * 0.78, h * 0.72, w * 0.16, 0, 7); x.fill();
      x.fillStyle = '#8a6f42'; x.beginPath(); x.arc(w * 0.78, h * 0.72, w * 0.07, 0, 7); x.fill();
    },
    lantern(x, w, h, P, R) {
      x.strokeStyle = '#4d3b28'; x.lineWidth = 2; x.beginPath(); x.moveTo(w * 0.5, h); x.lineTo(w * 0.5, h * 0.1); x.stroke();
      x.fillStyle = '#b4452f'; x.beginPath(); x.ellipse(w * 0.5, h * 0.26, w * 0.2, h * 0.16, 0, 0, 7); x.fill(); outline(x, P);
      x.fillStyle = 'rgba(255,214,140,0.85)'; x.beginPath(); x.ellipse(w * 0.5, h * 0.26, w * 0.08, h * 0.07, 0, 0, 7); x.fill();
    },
    flagPole(x, w, h, P, R) { /* 红旗（静态帧；动态由 ambient 叠加） */
      x.strokeStyle = '#4d3b28'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(w * 0.3, h); x.lineTo(w * 0.3, h * 0.04); x.stroke();
      x.fillStyle = P.flag || '#a03a2c'; x.beginPath(); x.moveTo(w * 0.3, h * 0.06); x.quadraticCurveTo(w * 0.72, h * 0.02, w * 0.94, h * 0.14); x.quadraticCurveTo(w * 0.7, h * 0.2, w * 0.3, h * 0.24); x.closePath(); x.fill(); outline(x, P);
      x.fillStyle = 'rgba(240,200,90,0.9)'; x.beginPath(); x.arc(w * 0.4, h * 0.12, w * 0.045, 0, 7); x.fill();
    },
    prayerFlags(x, w, h, P, R) { /* 雪山经幡串 */
      x.strokeStyle = '#4d3b28'; x.lineWidth = 2; x.beginPath(); x.moveTo(w * 0.06, h); x.lineTo(w * 0.06, h * 0.2); x.moveTo(w * 0.94, h); x.lineTo(w * 0.94, h * 0.2); x.stroke();
      x.strokeStyle = 'rgba(60,50,36,0.8)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(w * 0.06, h * 0.22); x.quadraticCurveTo(w * 0.5, h * 0.42, w * 0.94, h * 0.22); x.stroke();
      const cols = ['#c8a13a', '#b4503a', '#3f6d8e', '#dad3c0', '#4a7a52'];
      for (let i = 0; i < 9; i++) { const t = (i + 0.5) / 9, fx = w * (0.06 + t * 0.88), fy = h * (0.22 + Math.sin(t * Math.PI) * 0.16); x.fillStyle = cols[i % 5]; x.fillRect(fx - w * 0.028, fy, w * 0.056, h * 0.12); }
    },
    boat(x, w, h, P, R) {
      x.fillStyle = '#5f4a32'; x.beginPath(); x.moveTo(w * 0.04, h * 0.4); x.quadraticCurveTo(w * 0.5, h * 0.98, w * 0.96, h * 0.4); x.lineTo(w * 0.86, h * 0.3); x.quadraticCurveTo(w * 0.5, h * 0.72, w * 0.14, h * 0.3); x.closePath(); x.fill(); outline(x, P);
      x.strokeStyle = '#3f3423'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(w * 0.5, h * 0.34); x.lineTo(w * 0.5, h * 0.05); x.stroke();
      x.fillStyle = 'rgba(220,210,180,0.75)'; x.beginPath(); x.moveTo(w * 0.5, h * 0.06); x.lineTo(w * 0.72, h * 0.26); x.lineTo(w * 0.5, h * 0.3); x.closePath(); x.fill();
    },
    bridge(x, w, h, P, R) { /* 木板桥/浮桥单元 */
      x.fillStyle = '#6d5138'; x.fillRect(0, h * 0.28, w, h * 0.44); outline(x, P);
      x.strokeStyle = 'rgba(40,30,18,0.55)'; x.lineWidth = 1.2;
      for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(w * i / 6, h * 0.28); x.lineTo(w * i / 6, h * 0.72); x.stroke(); }
      x.strokeStyle = '#4d3b28'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, h * 0.2); x.lineTo(w, h * 0.2); x.moveTo(0, h * 0.8); x.lineTo(w, h * 0.8); x.stroke();
    },
    chainBridge(x, w, h, P, R, prop) { /* 可辨识的铁链链接；桥板由场景地面统一绘制 */
      if(prop?.variant==='rail'){
        for(const level of [.14,.61]){
          x.strokeStyle='#272c2b';x.lineWidth=2.3;x.beginPath();x.moveTo(0,h*level);x.quadraticCurveTo(w*.5,h*(level+.2),w,h*level);x.stroke();
          const count=Math.ceil(w/4);for(let i=0;i<=count;i++){const t=i/count,yy=h*(level+.4*t*(1-t));x.strokeStyle=i%2?'#9b9e92':'#444f4c';x.lineWidth=.85;x.beginPath();x.ellipse(w*t,yy,2.5,1.25,i%2?.2:-.2,0,Math.PI*2);x.stroke();}
        }
        x.strokeStyle='#4e5145';x.lineWidth=1.3;for(let i=0;i<=12;i++){const t=i/12;x.beginPath();x.moveTo(w*t,h*(.14+.4*t*(1-t)));x.lineTo(w*t,h*.94);x.stroke();}return;
      }
      x.strokeStyle = '#3a332c'; x.lineWidth = 2.6;
      x.beginPath(); x.moveTo(0, h * 0.16); x.quadraticCurveTo(w * 0.5, h * 0.3, w, h * 0.16); x.stroke();
      x.beginPath(); x.moveTo(0, h * 0.86); x.quadraticCurveTo(w * 0.5, h * 0.72, w, h * 0.86); x.stroke();
      x.fillStyle = '#7d6040';
      for (let i = 0; i < 8; i++) x.fillRect(w * (i + 0.12) / 8, h * 0.34, w * 0.09, h * 0.34);
      x.strokeStyle = 'rgba(40,34,26,0.6)'; x.lineWidth = 1;
      for (let i = 0; i < 8; i++) x.strokeRect(w * (i + 0.12) / 8, h * 0.34, w * 0.09, h * 0.34);
    },
    stele(x, w, h, P, R) { /* 石碑/木告示牌：任务锚点用 */
      x.fillStyle = P.wood || '#6d5138'; x.fillRect(w * 0.44, h * 0.4, w * 0.12, h * 0.6);
      x.fillStyle = '#8a6f4a'; x.fillRect(w * 0.12, h * 0.08, w * 0.76, h * 0.4); outline(x, P);
      x.strokeStyle = 'rgba(240,230,200,0.75)'; x.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(w * 0.22, h * (0.18 + i * 0.1)); x.lineTo(w * 0.78, h * (0.18 + i * 0.1)); x.stroke(); }
    },
    campfire(x, w, h, P, R) {
      x.fillStyle = '#5d4630'; x.beginPath(); x.ellipse(w * 0.5, h * 0.82, w * 0.4, h * 0.14, 0, 0, 7); x.fill();
      x.strokeStyle = '#4a3826'; x.lineWidth = w * 0.07;
      x.beginPath(); x.moveTo(w * 0.2, h * 0.86); x.lineTo(w * 0.8, h * 0.68); x.moveTo(w * 0.8, h * 0.86); x.lineTo(w * 0.2, h * 0.68); x.stroke();
      x.fillStyle = '#d98a3a'; x.beginPath(); x.moveTo(w * 0.5, h * 0.1); x.quadraticCurveTo(w * 0.72, h * 0.5, w * 0.5, h * 0.68); x.quadraticCurveTo(w * 0.28, h * 0.5, w * 0.5, h * 0.1); x.fill();
      x.fillStyle = '#f2c66a'; x.beginPath(); x.moveTo(w * 0.5, h * 0.28); x.quadraticCurveTo(w * 0.62, h * 0.52, w * 0.5, h * 0.62); x.quadraticCurveTo(w * 0.38, h * 0.52, w * 0.5, h * 0.28); x.fill();
    },
    well(x, w, h, P, R) {
      x.fillStyle = P.wall || '#8a8577'; x.beginPath(); x.ellipse(w * 0.5, h * 0.68, w * 0.42, h * 0.26, 0, 0, 7); x.fill(); outline(x, P);
      x.fillStyle = '#2e2a24'; x.beginPath(); x.ellipse(w * 0.5, h * 0.62, w * 0.3, h * 0.16, 0, 0, 7); x.fill();
      x.strokeStyle = '#4d3b28'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(w * 0.18, h * 0.62); x.lineTo(w * 0.18, h * 0.18); x.moveTo(w * 0.82, h * 0.62); x.lineTo(w * 0.82, h * 0.18); x.moveTo(w * 0.12, h * 0.2); x.lineTo(w * 0.88, h * 0.2); x.stroke();
    },
    table(x, w, h, P, R) {
      x.fillStyle = '#6d5138'; x.fillRect(w * 0.08, h * 0.34, w * 0.84, h * 0.12); outline(x, P);
      x.fillRect(w * 0.16, h * 0.46, w * 0.08, h * 0.5); x.fillRect(w * 0.76, h * 0.46, w * 0.08, h * 0.5);
      x.fillStyle = 'rgba(238,226,196,0.9)'; x.fillRect(w * 0.3, h * 0.2, w * 0.4, h * 0.14);
    },
    stairs(x, w, h, P, R) { /* 石阶 */
      x.fillStyle = P.wall || '#8a8577';
      for (let i = 0; i < 5; i++) { x.fillRect(w * 0.08, h * (0.2 + i * 0.16), w * 0.84, h * 0.12); x.fillStyle = shade(P.wall || '#8a8577', -0.06); }
      outline(x, P, 1.2);
    },
    marker(x, w, h, P, R) { /* 任务地点标识柱（不含文字，文字由HTML层负责） */
      x.strokeStyle = '#4d3b28'; x.lineWidth = 2; x.beginPath(); x.moveTo(w * 0.5, h); x.lineTo(w * 0.5, h * 0.16); x.stroke();
      x.fillStyle = '#b4452f'; x.beginPath(); x.moveTo(w * 0.5, h * 0.02); x.lineTo(w * 0.82, h * 0.16); x.lineTo(w * 0.5, h * 0.3); x.lineTo(w * 0.18, h * 0.16); x.closePath(); x.fill(); outline(x, P, 1.2);
    }
  };
  function blob2(x, cx, cy, rx, ry, R) {
    x.beginPath();
    for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI * 2, k = 0.8 + R() * 0.35; const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.closePath();
  }

  /* ========== 人物：行走/待机帧，四方向 ========== */
  const DIRS = ['s', 'w', 'e', 'n']; /* 基准朝向集合（对角线就近归并） */
  function figureFrames(style) {
    const key = 'fig:' + JSON.stringify(style); if (cache.has(key)) return cache.get(key);
    const W = style.role?38:30, H = 40, out = {};
    for (const dir of DIRS) {
      out[dir] = { idle: [], walk: [] };
      for (let f = 0; f < 2; f++) out[dir].idle.push(drawFigure(W, H, dir, 'idle', f, style));
      for (let f = 0; f < 4; f++) out[dir].walk.push(drawFigure(W, H, dir, 'walk', f, style));
    }
    cache.set(key, out); return out;
  }
  /* Editable ink-and-wash figures: 3x rasterization, four directions, cloth folds and role silhouettes. */
  function drawFigure(W,H,dir,mode,f,S){
    const c=cv(W*3,H*3),x=c.getContext('2d');x.scale(3,3);
    const swing=mode==='walk'?Math.sin(f*Math.PI/2):0,side=dir==='w'?-1:dir==='e'?1:0,back=dir==='n';
    x.translate(W/2,mode==='walk'?Math.abs(swing)*-.6:0);x.lineJoin='round';x.lineCap='round';
    const ink='#41463a',coat=S.coat||'#69705b',leg=S.leg||'#646650';
    function shape(points,fill){x.beginPath();points.forEach((p,i)=>i?x.lineTo(...p):x.moveTo(...p));x.closePath();x.fillStyle=fill;x.fill();x.strokeStyle=ink;x.lineWidth=.45;x.stroke();}
    for(const sign of [-1,1]){const foot=sign*(2.3+swing*2.2);shape([[sign*2,24],[sign*4,25],[foot+1.4,36.6],[foot-1.2,36.6]],leg);x.strokeStyle='#b0ab8b';x.lineWidth=.5;for(let y=30;y<36;y+=1.5){x.beginPath();x.moveTo(foot-1.2,y);x.lineTo(foot+1.1,y-.4);x.stroke();}shape([[foot-1.5,36],[foot+1.3,36],[foot+2.5,38],[foot-1.8,38]],'#46483c');}
    shape([[-4,12],[-2,10.5],[2,10.5],[4.7,13],[4.4,26],[1,27],[-4.5,26]],coat);
    const wash=x.createLinearGradient(-5,12,5,27);wash.addColorStop(0,'#eee1b84d');wash.addColorStop(1,'#24372f55');x.fillStyle=wash;x.fillRect(-3.6,13,7,12);
    x.strokeStyle='#d5cdb177';x.lineWidth=.5;x.beginPath();x.moveTo(-2,13);x.lineTo(0,16);x.lineTo(2,13);x.moveTo(.3,17);x.lineTo(.3,24);x.moveTo(-3,21);x.lineTo(-1,22);x.stroke();
    for(const sign of [-1,1]){const dx=side?side*swing:sign*swing;shape([[sign*4,13],[sign*5.7,14],[sign*6.4+dx,23],[sign*4.5+dx,24]],coat);shape([[sign*4.5+dx,23],[sign*6.1+dx,23],[sign*5.8+dx,25.5],[sign*4.7+dx,25.5]],S.skin||'#c2a27d');}
    shape([[-2,8.5],[2,8.5],[1.6,12],[-1.6,12]],'#b59a79');
    shape([[-3.1+side,4.5],[2.4+side,4],[3.1+side,7.5],[side*4,8],[2+side,10],[-2+side,9.5]],back?'#5b5748':S.skin||'#c9ad87');
    if(!back){x.fillStyle=ink;x.fillRect(side?side*2.4:-1.7,6.3,.6,.6);if(!side)x.fillRect(1.3,6.3,.6,.6);}
    shape([[-4,4],[-3,1.7],[0,.7],[3.3,1.8],[4,4.6],[side*5.2,5.6],[-3.7,5.1]],S.hat||'#58634f');
    if(!back&&!S.civilian){x.fillStyle='#9c3d30';x.beginPath();x.arc(side*.7,3, .75,0,7);x.fill();}
    if(back){shape([[-4,14],[4,14],[4.3,22],[-4.2,22]],S.pack||'#827556');x.strokeStyle='#c9bc98';x.beginPath();x.moveTo(-3,13);x.lineTo(-3,24);x.moveTo(3,13);x.lineTo(3,24);x.stroke();}
    const role=S.role;
    if(role==='logistics'){shape([[-9,11],[-4,11],[-4,27],[-9,27]],'#8b7752');shape([[-10,10],[2,10],[2,13],[-10,13]],'#b8aa7d');x.strokeStyle='#d8c79a';x.beginPath();x.moveTo(-7,11);x.lineTo(-7,26);x.stroke();}
    if(role==='commander'){shape([[3,21],[10,20],[10,28],[3,29]],'#896743');shape([[4,21],[9,21],[9,24],[4,24]],'#e3d8b5');}
    if(role==='soldier'){shape([[-7,11],[6,11],[6,14],[-7,14]],'#a6a386');x.strokeStyle='#ccc1a1';x.beginPath();x.moveTo(-4,13);x.lineTo(4,26);x.stroke();}
    if(role==='medic'){shape([[3,20],[11,20],[11,28],[3,28]],'#e4dbbd');x.fillStyle='#a84437';x.fillRect(6.3,21.5,1.4,5);x.fillRect(4.5,23.3,5,1.4);for(const a of [-4,4]){x.strokeStyle='#514737';x.lineWidth=1.4;x.beginPath();x.moveTo(a,7);x.lineTo(a,12);x.stroke();}}
    return c;
  }

  /* 场景卸载时释放本章缓存 */
  function releaseScene(sceneId) {
    for (const k of [...cache.keys()]) if (k.endsWith(sceneId)) { cache.delete(k); }
  }
  function releaseAll() { cache.clear(); }

  M.painter = { paintTerrain, paintBackdrop, spriteFor, figureFrames, releaseScene, releaseAll, shade, TEX, SPR,prepareArt,artZone,get artReady(){return !!atlas;},get propsReady(){return !!propsAtlas;},get cacheSize(){return cache.size;} };
})();
