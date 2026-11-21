/* Full-viewport observation, preserving the original scene, camera and handlers. */
window.MapObserver76={
 session:null,
 pairs:[['数据馆','Data museum'],['聚焦长征路线','Focus journey route'],['放大地图','Zoom in'],['缩小地图','Zoom out'],['恢复全图视角','Reset map overview'],['全屏观察','Expand view'],['退出全屏','Close expanded view'],['路线','Route'],['全图','Overview'],['搜索关卡','Find a station'],['收起行记','Hide journal'],['展开行记','Show journal'],['剧情近景','Story scene'],['真实地形','Terrain'],['新模型 · v03','New model / v03'],['平移','Pan'],['旋转','Rotate'],['复位视角','Reset view'],['拉近','Zoom in'],['拉远','Zoom out'],['三维视角控制','3D view controls'],['地图视角','Map controls'],['场景与视角工具栏','Scene and camera controls'],['拖动平移 · 右键旋转 · 滚轮缩放 · 双击看近处 / 双指移动与缩放','Drag to pan / right-drag to rotate / scroll to zoom / double-tap to focus / pinch to zoom'],['艺术复原 · 非测绘地图 / 拖动平移 · 双击聚焦','Artistic reconstruction, not a survey map / drag to pan / double-tap to focus'],['已聚焦 · 可继续拖动观察，点击“复位视角”返回','Focused / drag to explore, or select Reset view'],['向左平移','Pan left'],['向右平移','Pan right'],['向上平移','Pan up'],['向下平移','Pan down']],
 en(){return typeof I18nSnow65!=='undefined'&&I18nSnow65.lang()==='en';},
 label(zh){return this.en()?(this.pairs.find(p=>p[0]===zh)?.[1]||zh):zh;},
 resize(){window.dispatchEvent(new Event('resize'));if(typeof MapView!=='undefined')MapView.refit();},
 open(host,trigger){
  if(this.session||!host?.isConnected)return false;
  const marker=document.createComment('map76 original position');host.before(marker);
  const dialog=document.createElement('dialog');dialog.className='map76-dialog';dialog.setAttribute('aria-label',this.label('全屏观察'));
  const close=document.createElement('button');close.type='button';close.className='map76-close';close.textContent=this.label('退出全屏');close.onclick=()=>this.close();
  const body=document.createElement('div');body.className='map76-body';dialog.append(close,body);document.body.append(dialog);
  this.session={host,marker,dialog,trigger,overflow:document.body.style.overflow};
  dialog.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();this.close();});dialog.addEventListener('close',()=>{if(this.session?.dialog===dialog)this.close();});
  body.append(host);host.classList.add('map76-expanded');document.body.style.overflow='hidden';
  try{dialog.showModal();}catch{this.close();return false;}
  this.resize();close.focus({preventScroll:true});return true;
 },
 close(){const s=this.session;if(!s)return;this.session=null;s.host.classList.remove('map76-expanded');
  if(s.marker.isConnected)s.marker.replaceWith(s.host);else s.host.remove();
  document.body.style.overflow=s.overflow;if(s.dialog.open)s.dialog.close();s.dialog.remove();this.resize();if(s.trigger?.isConnected)s.trigger.focus({preventScroll:true});
 },
 scan(){
  for(const bar of document.querySelectorAll('.world3d-tools,.map-tools')){
   if(bar.querySelector('.map76-open'))continue;const host=bar.closest('.world3d-frame,.map-view,.map-container');if(!host)continue;
   const b=document.createElement('button');b.type='button';b.className='map76-open';b.textContent=this.label('全屏观察');b.setAttribute('data-map76-label','全屏观察');b.onclick=()=>this.open(host,b);bar.append(b);
  }
  if(!this.texts)this.texts=new WeakMap();
  const dict=new Map(this.pairs),rev=new Map(this.pairs.map(([a,b])=>[b,a]));
  for(const root of document.querySelectorAll('.world3d-tools,.world3d-caption small,.world3d-navigation-hint,.map-tools,.map-search,.map-collapse,.map76-close')){
   const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){const prev=this.texts.get(n);const raw=prev&&n.nodeValue===prev.out?prev.zh:n.nodeValue;const zh=rev.get(raw)||raw;const out=this.en()?(dict.get(zh)||zh):zh;if(n.nodeValue!==out)n.nodeValue=out;this.texts.set(n,{zh,out});}
   for(const el of [root,...root.querySelectorAll('[aria-label],[title],[placeholder]')])for(const attr of ['aria-label','title','placeholder']){const raw=el.getAttribute(attr);if(!raw)continue;const zh=rev.get(raw)||raw;const out=this.en()?(dict.get(zh)||zh):zh;if(raw!==out)el.setAttribute(attr,out);}
  }
 },
 install(){if(this.installed)return;this.installed=true;let pending=false;this.observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;this.scan();});});this.observer.observe(document.body,{childList:true,subtree:true,characterData:true});if(typeof I18nSnow65!=='undefined')I18nSnow65.onChange(()=>this.scan());this.scan();}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>MapObserver76.install(),{once:true});else MapObserver76.install();
