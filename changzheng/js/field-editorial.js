/* Editorial chapter frontispiece. Pure presentation; no save or resource mutations. */
const FieldEditorial={
  summaries:['把行装扎紧，与同行的人相互照应。\n从这里，走向漫长的征途。','江岸与硝烟之间，每一次照应都很重要。\n越是艰难，越要守住同行的队伍。','在转折处，重新审视来路。\n实事求是，从认真核对一条消息开始。','山路回转，消息未明。\n把握时机，也记得身后的战友。','江流不息，渡运有序。\n有限的时间，留给周全的安排。','急流在前，接应在后。\n勇气，也在每一项细致的保障中。','铁索横江，彼此照应。\n向前的每一步，都有人一起承担。','风雪中，脚步不能只顾自己。\n把一份力气，留给身旁的人。','口粮渐少，前路仍长。\n在艰难取舍中，理解互助的分量。','山口逼仄，行动需要默契。\n把消息传清，把同伴接上。','远路之后，终于得以落脚。\n整理行装，也记下同行的名字。','不同来路，在这里相逢。\n回望征程，信念与团结始终相连。'],
  install(){
    const banner=document.getElementById('chapterBanner');if(!banner||banner.dataset.editorial)return;banner.dataset.editorial='true';
    const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
    this.number=make('span','field-chapter-number');this.date=make('p','field-chapter-date');this.copy=make('p','field-chapter-copy');
    banner.querySelector('.chapter-label').after(this.number);banner.append(this.date,this.copy);
    this.enter=make('button','field-chapter-enter');this.enter.type='button';this.enter.onclick=()=>{const node=GAME_NODES[RouteMap.focusIndex]||GAME_NODES[0];GameUI.showDungeonPanel(node);};banner.append(this.enter);
    const demo=banner.querySelector('.showcase-entry');if(demo){demo.textContent='快速体验（3 分钟）';banner.append(demo);}
    banner.append(make('small','field-chapter-foot','坚定信念 · 实事求是 · 团结互助\n画面为艺术创作'));
    const caption=make('div','field-map-heading');caption.innerHTML='<strong>长征路线</strong><span>1934 — 1936</span>';document.getElementById('mapContainer').append(caption);
    const old=RouteMap.updateNavButtons;RouteMap.updateNavButtons=function(){const result=old.apply(this,arguments);FieldEditorial.update();return result;};
    const route=document.createElement('button');route.type='button';route.className='map-control-btn node-nav-btn';route.textContent='路线';route.setAttribute('aria-label','聚焦长征路线');route.onclick=()=>MapView.fitRoute();document.querySelector('.map-tools')?.prepend(route);
    this.update();requestAnimationFrame(()=>MapView.fitRoute());
    if(typeof ResizeObserver!=='undefined'){let frame,last='';this.resize=new ResizeObserver(entries=>{const r=entries[0]?.contentRect,key=r?`${r.width}:${r.height}`:'';if(key===last)return;last=key;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>MapView.refit());});(()=>{const host=document.querySelector('.map-view');if(host)this.resize.observe(host);})();}
    const previous=ExperienceSystem.open;ExperienceSystem.open=function(channel){const r=previous.apply(this,arguments);const i=['radio','tree','bonds','poster','trailer'].indexOf(channel);this.panel?.querySelectorAll('nav button').forEach((b,j)=>{if(i===j)b.setAttribute('aria-current','page');});return r;};
  },
  update(){if(!this.enter)return;const node=GAME_NODES[RouteMap.focusIndex]||GAME_NODES[0];document.getElementById('chapterName').textContent=node.name;this.number.textContent=String(node.id).padStart(2,'0')+' / 12';this.date.textContent=node.date+' · '+node.location;this.copy.textContent=this.summaries[node.id-1];this.enter.replaceChildren(document.createTextNode(RouteMap.isNodeLocked(node.id)?'查看这一程':RouteMap.isNodeCompleted(node.id)?'重温这一程':'走进这一程'));const arrow=document.createElement('span');arrow.textContent='→';arrow.setAttribute('aria-hidden','true');this.enter.append(arrow);}
};
document.addEventListener('DOMContentLoaded',()=>FieldEditorial.install());
