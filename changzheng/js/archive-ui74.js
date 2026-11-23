/* Paper archive navigation. Reads existing progress; never grants rewards or completes chapters. */
window.ArchiveUI74={
 categories:[['all','全部档案'],['stories','剧情见证'],['workshops','教学工坊'],['battles','战役练习'],['replays','重玩记录'],['heritage','传承徽章']],
 battleRows:[
  ['guard',2,'湘江阻击','XiangjiangGuard67','xjg67_2'],['bluff',4,'声东击西','SiduBluff67','sidu67_4'],['scout',5,'夜探渡口','Scout67','scout67_5'],['drum',12,'会师腰鼓','HuishiDrum67','drum67_12'],
  ['mortar',6,'强渡大渡河 · 炮手','MortarGame','mortar_6'],['mortar',7,'泸定桥 · 炮火掩护','MortarGame','mortar_7'],['lob',10,'腊子口 · 火力准备','Lazikou68','lazikou68_10'],['fire',9,'夜营守火种','Campfire68','fire68_9'],['snow',8,'雪山速降','SnowRun68','snow68_8'],['final',11,'切尾巴之战','Wuqi68','wuqi68_11'],['ration',9,'草地三十天','Grassland30','g30_9'],
  ['collect',9,'青稞采集','GrasslandCollect',''],['sniper',2,'敌后狙击 · 1937番外','Sniper1937','']
 ],
 state(){return typeof GameState!=='undefined'?GameState:window.GameState;},
 owner(){return typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null;},
 date(value){const n=typeof value==='number'?value:typeof value==='string'?Date.parse(value):NaN;return Number.isFinite(n)&&n>0&&n<=864e13?new Date(n).toLocaleString('zh-CN',{hour12:false}):'未记录时间';},
 score(record){const v=record?.bestScore??record?.score;return Number.isFinite(v)?Math.max(0,Math.min(100,v)):null;},
 records(){
  const g=this.state(),sp=g?.storyPreparations||{},rows=[];
  for(const e of window.StarfireBook73?.entries||[]){rows.push({...e,id:'story-'+e.icon,group:'stories',record:sp[e.key],hard:sp[e.key+'_hard']});}
  for(const e of window.OptionalLab71?.entries||[])for(const node of e.nodes){const key='mini71_'+e.id+'_'+node;rows.push({id:'workshop-'+e.id+'-'+node,icon:e.id,node,key,title:e.name||e.title,kind:'可选教学',group:'workshops',host:e.host,record:sp[key],hint:e.desc||'完成练习后成绩保存在本机。'});}
  for(const [icon,node,title,host,key]of this.battleRows){let record=sp[key];if(!key){record=(Array.isArray(g?.battleScores)?g.battleScores:[]).find(r=>r&&Number(r.nodeId)===node);}rows.push({id:'battle-'+icon+'-'+node,icon,node,title,host,key,group:'battles',kind:icon==='sniper'?'1937番外':'教学推演',record,hint:'可选练习。此入口只回看或重玩，不直接完成主线章节。'});}
  for(const [id,attempts]of Object.entries(sp.replays56?.chapters||{})){if(!Array.isArray(attempts)||!attempts.length)continue;const node=Number(id);if(!Number.isInteger(node)||node<1||node>12)continue;const valid=attempts.filter(r=>r&&typeof r==='object'&&!Array.isArray(r));if(!valid.length)continue;const last=valid.at(-1);rows.push({id:'chapter-'+node,node,title:'第'+node+'章 · 历次决策',group:'replays',kind:'主线记录',record:{score:last.score,completedAt:last.finished||last.started,rating:last.status},history:valid.map(r=>({...r,completedAt:r.finished||r.started,rating:r.status})),hint:'对照每一次游玩的岗位、选择与资源变化。旧记录按实际存档呈现，不补造未记录的决策。'});}
  return rows.map(e=>({...e,title:e.title||'教学练习',score:this.score(e.record),hardScore:this.score(e.hard),locked:typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(e.node),history:(e.history||(Array.isArray(e.record?.history)?e.record.history:[])).filter(r=>r&&typeof r==='object')}));
 },
 select(rows,category,query=''){
  const text=String(query).trim().toLocaleLowerCase();return rows.filter(e=>(category==='all'||category===e.group||category==='replays'&&e.history.length||category==='heritage'&&e.hardScore!==null)&&(!text||[e.title,e.kind,String(e.node)].join(' ').toLocaleLowerCase().includes(text)));
 },
 launch(entry){
  const node=typeof GAME_NODES!=='undefined'?GAME_NODES.find(n=>n.id===entry.node):{id:entry.node};
  if(entry.group==='replays'&&typeof ChapterReplays56!=='undefined'){ChapterReplays56.compare(node);return true;}
  if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(entry.node)){this.notice('尚未抵达此站，请先继续主线。');return false;}
  if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(entry.node)){NpcStory.pendingTask={nodeId:entry.node,run:()=>this.launch(entry)};NpcStory.startGate(node);return false;}
  if(entry.group==='stories')return window.StarfireBook73.launch(entry.icon,node);
  if(entry.group==='workshops')return window.OptionalLab71.launch(entry.icon,entry.node);
  const host=window[entry.host];if(!host?.open){this.notice('该玩法暂未载入，请刷新后重试。');return false;}
  host.open(['collect','sniper'].includes(entry.icon)?entry.node:node,()=>this.notice('本次练习已结束，记录以玩法结算为准。'));return true;
 },
 notice(text){if(typeof GameUI!=='undefined')GameUI.showToast(text);},
 close(){this.closeActive?.();},
 open(category='all'){
  if(this.dialog?.open){this.dialog.focus();return this.dialog;}
  const trigger=document.activeElement,owner=this.owner(),demo=!!window.MainlineDemo?.active;
  const d=document.createElement('dialog');d.className='archive74-dialog';d.id='archive74Dialog';d.setAttribute('aria-labelledby','archive74-title');d.tabIndex=-1;
  d.innerHTML='<header class="a74-header"><div><p class="a74-eyebrow">长征 · 星火 / WITNESS ARCHIVE</p><h2 id="archive74-title">征途档案</h2></div><button type="button" data-close aria-label="关闭征途档案">关闭 <span aria-hidden="true">×</span></button></header><p class="a74-intro">把走过的路、做过的选择，留在这一册。记录保存在当前玩家的本机存档。</p><div class="a74-layout"><nav class="a74-tabs" aria-label="档案分类"></nav><main class="a74-main"><div class="a74-tools"><div><span class="a74-count"></span><small data-summary></small></div><label class="a74-search"><span>查找档案</span><input type="search" maxlength="80" placeholder="名称、玩法或站点编号"></label></div><div class="a74-table-wrap"><table><caption class="a74-sr">研学场景与练习记录</caption><thead><tr><th scope="col">档案名称</th><th scope="col">类别</th><th scope="col">记录状态</th><th scope="col">收录时间</th></tr></thead><tbody></tbody></table></div><p class="a74-empty" hidden>暂无这类记录。继续主线或换一个关键词查找。</p><footer class="a74-pagination"><button type="button" data-prev aria-label="上一页">← 上一页</button><span role="status" aria-live="polite" data-page></span><button type="button" data-next aria-label="下一页">下一页 →</button></footer><section class="a74-detail" aria-label="档案详情"></section></main></div>';
  document.body.append(d);const q=s=>d.querySelector(s);let page=0,selected=null,closed=false,lastFocus='',rows=this.records();this.dialog=d;this._view={category,page:0};
  const close=()=>{if(closed)return;closed=true;observer.disconnect();window.removeEventListener('cz-profile-changed',check);document.removeEventListener('visibilitychange',check);d.remove();this.dialog=null;this.closeActive=null;if(trigger?.isConnected)trigger.focus({preventScroll:true});};this.closeActive=close;
  const check=()=>{if(owner!==this.owner()||demo!==!!window.MainlineDemo?.active)close();};
  const observer=new MutationObserver(()=>{if(!d.isConnected)close();else check();});observer.observe(document.body,{childList:true});
  const cell=(tr,text,cls)=>{const td=document.createElement('td');td.textContent=text;if(cls)td.className=cls;tr.append(td);return td;};
  const detail=e=>{
   const box=q('.a74-detail');box.replaceChildren();if(!e)return;
   const meta=document.createElement('p');meta.className='a74-eyebrow';meta.textContent='第'+e.node+'站 · '+e.kind;
   const h=document.createElement('h3');h.textContent=e.title;const hint=document.createElement('p');hint.textContent=e.hint||'成绩记录用于回望本次练习，不评价历史人物，也不替代史实档案。';
   const action=document.createElement('button');action.type='button';action.className='a74-primary';action.disabled=e.locked&&e.group!=='replays';action.textContent=e.group==='replays'?'打开历次决策对比':e.locked?'尚未抵达':e.score!==null?'重温这一程':'走进这一程';action.onclick=()=>{check();if(closed)return;close();this.launch(e);};box.append(meta,h,hint,action);
   if(e.history.length){const title=document.createElement('h4');title.textContent='本档案的历次记录';box.append(title);const list=document.createElement('ol');list.className='a74-history';for(const r of e.history.slice().reverse()){const li=document.createElement('li');li.textContent=this.date(r.completedAt)+' · '+(this.score(r)??'—')+'分 · '+String(r.rating||'练习记录')+(r.mode==='hardcore'?' · 传承难度':'')+(Array.isArray(r.decisions)?' · '+r.decisions.length+'项决策':'');list.append(li);}box.append(list);}
   if(e.hardScore!==null){const badge=document.createElement('p');badge.className='a74-badge';badge.textContent='✦ 传承见证 · '+e.hardScore+'分';box.append(badge);}
  };
  const render=()=>{
   check();if(closed)return;rows=this.records();const matches=this.select(rows,category,q('input').value),pages=Math.max(1,Math.ceil(matches.length/6));page=Math.min(page,pages-1);this._view={category,page,total:matches.length};
   const nav=q('.a74-tabs');if(!nav.childElementCount)for(const [id,label]of this.categories){const b=document.createElement('button');b.type='button';b.dataset.category=id;const name=document.createElement('span'),count=document.createElement('small');name.textContent=label;b.append(name,count);b.onclick=()=>{category=id;page=0;selected=null;render();};nav.append(b);}
   for(const b of nav.children){const count=this.select(rows,b.dataset.category).length;b.querySelector('small').textContent=String(count);b.classList.toggle('active',b.dataset.category===category);b.setAttribute('aria-current',b.dataset.category===category?'page':'false');}
   q('.a74-count').textContent=matches.length+' 份档案';q('[data-summary]').textContent='已见证 '+rows.filter(e=>e.score!==null).length+' / '+rows.length;q('[data-page]').textContent=(page+1)+' / '+pages;q('[data-prev]').disabled=page===0;q('[data-next]').disabled=page===pages-1;q('.a74-empty').hidden=matches.length>0;
   const visible=matches.slice(page*6,page*6+6);if(!visible.some(e=>e.id===selected))selected=visible[0]?.id||null;const body=q('tbody');body.replaceChildren();
   for(const e of visible){const tr=document.createElement('tr');tr.classList.toggle('selected',e.id===selected);const td=cell(tr,'');const b=document.createElement('button');b.type='button';b.className='a74-row-open';b.textContent=e.title;b.setAttribute('aria-expanded',String(e.id===selected));b.onclick=()=>{selected=e.id;lastFocus=e.id;render();q('.a74-detail').scrollIntoView?.({block:'nearest'});};b.dataset.record=e.id;td.append(b);cell(tr,e.kind,'a74-kind');cell(tr,e.locked?'尚未抵达':e.score===null?'待见证':e.score+'分 · '+(e.record?.rating||'已收录'),'a74-state');cell(tr,this.date(e.record?.completedAt||e.record?.last?.completedAt),'a74-date');body.append(tr);}
   detail(visible.find(e=>e.id===selected));if(lastFocus){body.querySelector('[data-record="'+lastFocus+'"]')?.focus({preventScroll:true});lastFocus='';}
  };
  q('input').oninput=()=>{page=0;selected=null;render();};q('[data-prev]').onclick=()=>{page--;render();};q('[data-next]').onclick=()=>{page++;render();};q('[data-close]').onclick=close;
  d.addEventListener('cancel',ev=>{ev.preventDefault();close();});d.addEventListener('close',close);window.addEventListener('cz-profile-changed',check);document.addEventListener('visibilitychange',check);
  render();d.showModal();q('[data-close]').focus();return d;
 },
 install(){
  if(this.installed)return;this.installed=true;
  if(window.StarfireBook73){this.previousCatalog=window.StarfireBook73.catalog;window.StarfireBook73.catalog=()=>this.open('stories');}
  const header=document.querySelector('#journalPanel .journal-header');if(header&&!header.querySelector('[data-archive74]')){const b=document.createElement('button');b.type='button';b.dataset.archive74='';b.textContent='打开研学档案';b.onclick=()=>this.open();header.append(b);}
 }
};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>window.ArchiveUI74.install(),{once:true});else window.ArchiveUI74.install();}
