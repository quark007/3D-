/* One slow image animation. Moving the pointer does no rendering work. */
(()=>{
 function install(){
  const title=document.getElementById('titleScreen');if(!title||title.dataset.motionInstalled)return;
  title.dataset.motionInstalled='true';
  const light=document.createElement('div');light.className='title-light-viewport';light.setAttribute('aria-hidden','true');const sweep=document.createElement('div');sweep.className='title-light-sweep';light.append(sweep);title.querySelector('.title-landscape')?.append(light);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let enabled=true,focused=document.hasFocus();
  try{enabled=localStorage.getItem('cz_title_motion')!=='off';}catch{}
  const toggle=document.createElement('button');toggle.type='button';toggle.className='title-motion-toggle';title.querySelector('.title-links')?.append(toggle);
  function sync(){
   const running=enabled&&!reduced.matches&&!document.hidden&&focused&&!title.hidden&&document.body.classList.contains('at-title')&&!document.querySelector('.award-demo-overlay,.experience-overlay,dialog[open]');
   title.classList.toggle('title-fx-running',!!running);
   toggle.textContent=reduced.matches?'动态背景：系统已减弱':enabled?'动态背景：轻柔':'动态背景：关';toggle.setAttribute('aria-pressed',String(enabled&&!reduced.matches));
  }
  toggle.onclick=()=>{enabled=!enabled;try{localStorage.setItem('cz_title_motion',enabled?'on':'off');}catch{}sync();};
  window.addEventListener('blur',()=>{focused=false;sync();});window.addEventListener('focus',()=>{focused=true;sync();});document.addEventListener('visibilitychange',sync);if(reduced.addEventListener)reduced.addEventListener('change',sync);else if(reduced.addListener)reduced.addListener(sync);
  let queued=0;const schedule=()=>{if(!queued)queued=requestAnimationFrame(()=>{queued=0;sync();});};
  const titleObserver=new MutationObserver(schedule);titleObserver.observe(title,{attributes:true,attributeFilter:['hidden']});
  const bodyObserver=new MutationObserver(schedule);bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class'],childList:true});
  window.addEventListener('pagehide',()=>{if(reduced.removeEventListener)reduced.removeEventListener('change',sync);else if(reduced.removeListener)reduced.removeListener(sync);titleObserver.disconnect();bodyObserver.disconnect();cancelAnimationFrame(queued);},{once:true});
  document.addEventListener('toggle',sync,true);document.addEventListener('close',sync,true);sync();
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();
