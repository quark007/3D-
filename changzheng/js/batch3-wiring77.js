/* Integration-only viewport shell. Engine nodes and listeners retain identity. */
window.Batch3Wiring77={
 scan(){for(const d of document.querySelectorAll('dialog[class*="72"]')){const actions=d.querySelector('[class*="72-actions"]');if(!actions)continue;
 let content=d.querySelector(':scope > .batch77-content');if(!content){content=document.createElement('div');content.className='batch77-content';d.append(content);d.dataset.wiring77='true';}
 if(d.lastElementChild!==actions)d.append(actions);
 for(const child of [...d.children])if(child!==content&&child!==actions&&child.tagName!=='HEADER')content.append(child);
 }},
 install(){if(this.installed)return;this.installed=true;let pending=false;this.observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;this.scan();});});this.observer.observe(document.body,{childList:true,subtree:true});this.scan();}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>Batch3Wiring77.install(),{once:true});else Batch3Wiring77.install();
