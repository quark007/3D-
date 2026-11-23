/* Bounded contrast repair for rendered DOM text in legacy panels. No render loop or Canvas recolouring. */
(() => {
 'use strict';let timer=null;const pending=new Set();
 const surfaces='dialog[open],#charSelectOverlay.open,.npc-overlay.open,.command-overlay.open,.learning-overlay.open,.telegram-overlay.open,.settings-panel,.journal-panel,.archive74-dialog';
 const rgba=value=>{const m=value.match(/[\d.]+/g);return m?[+m[0],+m[1],+m[2],m[3]===undefined?1:+m[3]]:null;};
 const blend=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3]));
 function backdrop(node){let c=[18,23,19];const stack=[];for(let p=node;p;p=p.parentElement)stack.push(p);for(const p of stack.reverse()){const v=rgba(getComputedStyle(p).backgroundColor);if(v)c=blend(v,c);}return c;}
 const luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
 const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 function scan(root){let repaired=0;for(const n of [...root.querySelectorAll('*')].slice(0,1800)){
  if(n.closest('canvas,svg,[aria-hidden=true]')||!n.getClientRects().length)continue;
  if(![...n.childNodes].some(t=>t.nodeType===3&&t.textContent.trim())&&!n.matches('input,textarea,select'))continue;
  const s=getComputedStyle(n);if(s.visibility==='hidden'||Number(s.opacity)===0)continue;
  if(parseFloat(s.fontSize)<14)n.style.setProperty('font-size','14px','important');
  const bg=backdrop(n),fg=rgba(s.color);if(!fg)continue;const effective=blend(fg,bg);
  if(ratio(effective,bg)<4.5){const light=[244,237,221],dark=[28,40,30],ink=ratio(light,bg)>=ratio(dark,bg)?light:dark;n.style.setProperty('color','rgb('+ink.join(',')+')','important');n.style.setProperty('text-shadow','none','important');n.dataset.contrast93='repaired';repaired++;}
 }
 return repaired;}
 function schedule(root){if(root?.isConnected)pending.add(root);if(timer)return;timer=setTimeout(()=>{timer=null;for(const n of pending){if(n.isConnected)scan(n);}pending.clear();},100);}
 function collect(){
  const hud=document.querySelector('.hud-right');if(hud){let group=hud.querySelector('.records93');for(const b of document.querySelectorAll('body>.spark69-fab,body>.corr69-fab')){if(!group){group=document.createElement('details');group.className='records93';const title=document.createElement('summary');title.textContent='更多记录';const list=document.createElement('div');group.append(title,list);hud.append(group);}group.lastElementChild.append(b);}}
  document.querySelectorAll(surfaces).forEach(schedule);
 }
 const observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length)){collect();}});
 function install(){observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('click',collect,{passive:true});document.addEventListener('toggle',collect,true);window.addEventListener('resize',collect,{passive:true});collect();}
 window.Readability93={scan,ratio,collect};
 if(window.CZBoot92)window.CZBoot92.whenReady(install);else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 window.addEventListener('pagehide',()=>{observer.disconnect();clearTimeout(timer);pending.clear();},{once:true});
})();
