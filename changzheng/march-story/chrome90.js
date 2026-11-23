/* Narrative-first chrome; legacy resource DOM and saved values remain intact. */
(() => {
 'use strict';
 const start=()=>{
  const host=document.querySelector('.hud-right');if(!host||host.dataset.narrative90)return;host.dataset.narrative90='true';
  const place=document.createElement('span');place.className='march90-place';
  const more=document.createElement('button');more.type='button';more.textContent='队伍详情';more.className='march83-entry';
  more.onclick=()=>{const env=window.CZMarchEnv?.();if(!env?.state||!window.CZMarchUI)return;const {body}=CZMarchUI.dialog('队伍与物资 · 相关任务中使用');const copy=document.createElement('p');copy.textContent='这些数值供原有分配、协作与扩展练习使用；在场景中，请先跟随当前任务指引。';body.append(copy);const table=document.createElement('dl');for(const [key,label]of Object.entries({troops:'队伍',food:'补给',morale:'士气',ammo:'原有推演弹药'})){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(env.state.resources?.[key]??'—');table.append(dt,dd);}body.append(table);};
  host.append(place,more);
  let last='';const update=()=>{if(document.hidden)return;let text='选择岗位，开启征程';try{if(typeof RouteMap!=='undefined'&&typeof GAME_NODES!=='undefined'){const node=GAME_NODES.find(n=>n.id===RouteMap.currentNodeId);if(node)text='当前地点 · '+node.name;}}catch{}if(text!==last){place.textContent=text;last=text;}};
  update();const id=setInterval(update,2000);window.addEventListener('pagehide',()=>clearInterval(id),{once:true});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
