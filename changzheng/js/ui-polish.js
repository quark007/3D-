/* Presentation-only affordances; no resource, chapter or save mutations. */
// Anchor the journal toggle beside the measured map boundary, outside the map.
function positionMapCollapse56(){
  const map=document.getElementById('mapContainer'),view=document.querySelector('.map-view');if(!map||!view)return;
  const m=map.getBoundingClientRect(),v=view.getBoundingClientRect();
  map.style.setProperty('--map-collapse-top59',Math.max(14,v.top-m.top+14)+'px');
  map.style.setProperty('--map-collapse-right59',Math.max(14,m.right-v.left+14)+'px');
  view.style.setProperty('--map-search-width59',Math.max(0,v.width-28)+'px');
}
window.addEventListener('cz-game-ready',()=>{positionMapCollapse56();if(typeof ResizeObserver==='function'){const ro=new ResizeObserver(positionMapCollapse56);for(const node of document.querySelectorAll('#mapContainer,.map-view,.map-tools'))ro.observe(node);}window.addEventListener('resize',positionMapCollapse56);const mo=new MutationObserver(positionMapCollapse56);mo.observe(document.body,{childList:true});});
document.addEventListener('DOMContentLoaded',()=>{
  /* [R6 2026-10-28 重构] 原三个 DOMContentLoaded 监听器合并为一个；三块内部逻辑与执行顺序
     （HUD 标签 → 地图工具栏 → --hud-h → --demo-banner-h）逐行保留，行为不变。 */
  for(const [id,name] of [['hudTroops','队伍'],['hudAmmo','弹药'],['hudFood','补给'],['hudMorale','士气']]){
    const stat=document.getElementById(id);if(!stat||stat.querySelector('.hud-stat-name'))continue;
    const label=document.createElement('span');label.className='hud-stat-name';label.textContent=name;stat.prepend(label);
  }
  const map=document.getElementById('mapContainer');
  if(map){
    const tools=document.createElement('div');tools.className='map-tools';tools.setAttribute('role','group');tools.setAttribute('aria-label','地图视角');
    for(const [text,label,run] of [['＋','放大地图',()=>MapView.zoomAt(0,0,1.25)],['－','缩小地图',()=>MapView.zoomAt(0,0,.8)],['全图','恢复全图视角',()=>MapView.fit()]]){
      const button=document.createElement('button');button.type='button';button.className='map-control-btn node-nav-btn';button.textContent=text;button.title=label;button.setAttribute('aria-label',label);button.onclick=run;tools.append(button);
    }
    // [P0 修复 2026-10-26] 工具栏改挂 #mapContainer 直下：.map-world 带 transform（会成为 fixed 后代
    // 的 containing block），.map-view 左 37% 被章节横幅占用且有 overflow:hidden。
    // 定位唯一所有者 = delivery53.css #mapContainer>.map-tools（右下 absolute；窄屏 bottom 锚定，
    // R5 起不再依赖 --map-tools-top59 变量）。
    map.append(tools);
  }
  { /* --hud-h 是「顶部 HUD 实际占多高」的唯一真相：地图区 .map-view、章节面板 .dungeon-panel、
       .demo-banner 都用它算 inset/top。但它是写死的常量（桌面 72px、≤700px 100px），
       而 .hud-left 里的按钮会随文案与视口宽度折行 —— 写死的值一旦小于实际高度，
       地图就会被 HUD 盖住；大于实际高度，地图上方又空一条。
       这里把实测高度回写进去。只在 .hud-top 高度是 auto 的窄屏下会真正发生变化（桌面写死值
       与实测一致，回写等于原值），所以不会引入跳动。 */
    const hud=document.querySelector('.hud-top');
    if(hud&&document.documentElement){
      let last=0;
      const sync=()=>{
        const height=Math.round(hud.getBoundingClientRect().height);
        if(height<=0||height===last)return;
        last=height;
        document.documentElement.style.setProperty('--hud-h',height+'px');
      };
      sync();
      if(typeof ResizeObserver==='function')new ResizeObserver(sync).observe(hud);
      addEventListener('resize',sync,{passive:true});
      addEventListener('orientationchange',()=>setTimeout(sync,120),{passive:true});
    }
  }
  { /* --demo-banner-h 是「内存演示」浮条的实际高度。它是 js/demo-session.js 动态插进 body 的，
       高度随文案折行变化（窄屏 42px、桌面 54px 都实测到过），写死任何值都会在某个宽度下压住正文。
       ≤700px 下 .map-container 用它让出空间（见 css/game-shell.css 末尾）。
       浮条是后来插入的，所以这里既要监听尺寸，也要监听 DOM 插入。 */
    const root=document.documentElement;
    let last=0;
    const sync=()=>{
      const banner=document.querySelector('.demo-banner');
      if(!banner){if(last!==0){last=0;root.style.removeProperty('--demo-banner-h');}return;}
      const height=Math.round(banner.getBoundingClientRect().height);
      if(height<=0||height===last)return;
      last=height;
      root.style.setProperty('--demo-banner-h',height+'px');
    };
    sync();
    if(typeof MutationObserver==='function')new MutationObserver(sync).observe(document.body,{childList:true});
    if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(sync);const attach=()=>{const banner=document.querySelector('.demo-banner');if(banner)observer.observe(banner);};attach();new MutationObserver(attach).observe(document.body,{childList:true});}
    addEventListener('resize',sync,{passive:true});
    addEventListener('orientationchange',()=>setTimeout(sync,120),{passive:true});
  }
});
