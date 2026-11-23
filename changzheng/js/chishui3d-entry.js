/* 四渡赤水 3D 沙盘：可选玩法入口。
   独立于主线剧情与存档，玩家随时可开可关；第 4 章时入口自动高亮。 */
(() => {
 'use strict';
 const SRC = 'chishui-3d-sandbox-demo.html';
 let dialog = null;

 function ensureDialog(){
  if(dialog)return dialog;
  dialog=document.createElement('dialog');
  dialog.className='chishui3d-dialog';
  dialog.setAttribute('aria-label','四渡赤水 · 3D 沙盘推演');
  const head=document.createElement('header');
  const label=document.createElement('span');label.textContent='四渡赤水 · 3D 沙盘推演｜可选玩法';
  const close=document.createElement('button');close.type='button';close.textContent='返回游戏 ✕';
  close.addEventListener('click',()=>dialog.close());
  head.append(label,close);
  const frame=document.createElement('iframe');
  frame.title='四渡赤水 3D 沙盘';frame.setAttribute('allowfullscreen','');
  frame.setAttribute('loading','eager');
  dialog.append(head,frame);
  dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close();});
  // 关闭时卸载，避免 WebGL 上下文在后台继续占资源；下次打开重新从头推演。
  dialog.addEventListener('close',()=>{frame.src='about:blank';});
  document.body.append(dialog);
  return dialog;
 }

 function open(){
  // 标题页下 body.at-title 会把 body 的直接子元素隐藏，此时改用新标签页，
  // 与项目里「十二章实时3D场景」外链的做法保持一致。
  if(document.body.classList.contains('at-title')){
   window.open(SRC,'_blank','noopener');return;
  }
  const d=ensureDialog();
  d.querySelector('iframe').src=SRC;
  if(!d.open)d.showModal();
 }

 function bind(button){
  if(!button||button.dataset.cz3dBound)return;
  button.dataset.cz3dBound='1';
  button.addEventListener('click',open);
 }

 function mount(){
  document.querySelectorAll('[data-chishui3d],#titleChishui3D').forEach(bind);
  // 全局悬浮入口：地图态与行走剧情态都能点开，不依赖某个面板是否可见。
  if(!document.querySelector('button.chishui3d-entry')){
   const b=document.createElement('button');
   b.type='button';b.className='chishui3d-entry';b.dataset.chishui3d='1';
   b.textContent='四渡赤水 · 3D 沙盘';b.title='四渡赤水 · 3D 沙盘推演（可选玩法，不影响主线进度）';
   document.body.append(b);bind(b);
  }
  // 走到第 4 章时给入口一个可见提示，但不强制、不打断剧情。
  const mark=()=>{
   const at=typeof RouteMap!=='undefined'&&Number(RouteMap.currentNodeId)===4;
   document.querySelectorAll('.chishui3d-entry').forEach(b=>b.classList.toggle('is-current',at));
  };
  mark();setInterval(mark,1500);
 }

 window.CZChishui3D={open};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,0),{once:true});
 else setTimeout(mount,0);
})();
