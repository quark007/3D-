/* R6 2026-10-28: 手机端底栏收拢——功能条(experience-dock)原封搬进「更多功能」弹窗。
   桌面(≥701px)完全不变：触发钮隐藏、dock 仍留在 .map-footer-secondary。
   弹窗打开时把 dock 整体移动进来（DOM 搬移保留全部监听），关闭时移回原位。
   星火/记者悬浮入口在弹窗收起期间提供等价触发。 */
const DockR6={
 dialog:null,prevParent:null,prevNext:null,
 openDialog(){
  if(this.dialog)return;
  const dock=document.querySelector('.experience-dock');if(!dock)return;
  const d=document.createElement('dialog');d.className='dock-r6-dialog';d.setAttribute('aria-label','更多功能');
  const header=document.createElement('header');
  const h=document.createElement('h2');h.textContent='更多功能';header.append(h);
  const close=document.createElement('button');close.type='button';close.className='dock-r6-close';close.textContent='完成';close.setAttribute('aria-label','关闭更多功能');close.onclick=()=>d.close();header.append(close);
  d.append(header);
  this.prevParent=dock.parentNode;this.prevNext=dock.nextSibling;
  d.append(dock);
  /* 星火/记者是 fixed 悬浮钮（spark69/correspondent69），弹窗期间给出等价入口：
     直接 click 原 FAB，复用其全部打开逻辑，不复制实现。 */
  const extra=document.createElement('div');extra.className='dock-r6-extra';
  for(const [sel,label] of [['.spark69-fab','星火传承 ✦'],['.corr69-fab','随军记者 ✍']]){
   const fab=document.querySelector(sel);if(!fab)continue;
   const b=document.createElement('button');b.type='button';b.textContent=label;
   b.setAttribute('aria-label',fab.getAttribute('aria-label')||label);
   b.onclick=()=>{d.close();requestAnimationFrame(()=>fab.click());};
   extra.append(b);
  }
  if(extra.children.length)d.append(extra);
  const note=document.createElement('p');note.className='dock-r6-note';note.textContent='本内容仅供历史教育使用 · 体验数值不代表历史统计';d.append(note);
  d.addEventListener('close',()=>{if(dock.isConnected&&dock.parentElement===d)this.prevParent.insertBefore(dock,this.prevNext);d.remove();this.dialog=null;},{once:true});
  document.body.append(d);d.showModal();this.dialog=d;
  (d.querySelector('.experience-dock button')||close).focus?.({preventScroll:true});
 }
};
document.addEventListener('DOMContentLoaded',()=>{
 const nodeNav=document.querySelector('.node-nav');
 if(!nodeNav||document.getElementById('dockToggleR6'))return;
 const b=document.createElement('button');b.type='button';b.className='node-nav-btn map-dock-toggle-r6';b.id='dockToggleR6';
 b.textContent='更多 ▾';b.setAttribute('aria-haspopup','dialog');
 b.onclick=()=>DockR6.openDialog();
 nodeNav.append(b);
});
