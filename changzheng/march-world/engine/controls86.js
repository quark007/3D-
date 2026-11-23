/* Always-visible, mutually exclusive joystick/D-pad. Pointer and physical keyboard share one vector. */
(() => {
 'use strict';const M=window.CZMarchWorld._;
 function create(container,hooks){
  let mode='joystick';try{if(localStorage.getItem('cz_march_control86')==='directions')mode='directions';}catch{}
  const keys=new Set(),held=new Map(),captures=new Map(),listeners=[],state={enabled:true,joy:{x:0,y:0}},map={KeyW:'n',ArrowUp:'n',KeyS:'s',ArrowDown:'s',KeyA:'w',ArrowLeft:'w',KeyD:'e',ArrowRight:'e'};
  const on=(node,type,fn,opts)=>{node.addEventListener(type,fn,opts);listeners.push(()=>node.removeEventListener(type,fn,opts));};
  const panel=document.createElement('section');panel.className='czmw-controls86';panel.dataset.czmwUi='true';panel.setAttribute('aria-label','角色移动控制');
  const switcher=document.createElement('div');switcher.className='czmw-switch86';switcher.setAttribute('role','group');switcher.setAttribute('aria-label','选择移动方式');
  const buttons={};for(const [id,label]of [['joystick','摇杆'],['directions','方向键']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.moveMode=id;buttons[id]=b;switcher.append(b);on(b,'click',()=>setMode(id));}
  const stick=document.createElement('div');stick.className='czmw-stick86';stick.setAttribute('role','group');stick.setAttribute('aria-label','按住并拖动摇杆移动，也可使用键盘方向键');
  const knob=document.createElement('span');knob.className='czmw-knob86';stick.append(knob);
  const pad=document.createElement('div');pad.className='czmw-pad86';pad.setAttribute('aria-label','按住方向按钮移动');
  for(const [dir,label,symbol]of [['n','向上移动','↑'],['w','向左移动','←'],['e','向右移动','→'],['s','向下移动','↓']]){
   const b=document.createElement('button');b.type='button';b.textContent=symbol;b.dataset.moveDir=dir;b.setAttribute('aria-label',label);pad.append(b);
   on(b,'pointerdown',e=>{if(!state.enabled||e.button!==0)return;e.preventDefault();e.stopPropagation();b.setPointerCapture?.(e.pointerId);captures.set(e.pointerId,b);held.set(e.pointerId,dir);hooks.onDir?.();});
   const release=e=>{held.delete(e.pointerId);captures.delete(e.pointerId);e.stopPropagation();};on(b,'pointerup',release);on(b,'pointercancel',release);on(b,'lostpointercapture',release);
   on(b,'keydown',e=>{if(!['Space','Enter'].includes(e.code)||!state.enabled)return;e.preventDefault();e.stopPropagation();held.set('key-'+dir,dir);hooks.onDir?.();});on(b,'keyup',e=>{if(['Space','Enter'].includes(e.code)){held.delete('key-'+dir);e.preventDefault();e.stopPropagation();}});on(b,'blur',()=>held.delete('key-'+dir));
  }
  const touch=navigator.maxTouchPoints>0&&innerWidth<=900,settings=document.createElement('details');settings.className='czmw-settings90';settings.dataset.czmwUi='true';
  const summary=document.createElement('summary');summary.textContent='移动设置';settings.append(summary);
  const hand=document.createElement('button');hand.type='button';hand.textContent='切换左右手';
  const size=document.createElement('button');size.type='button';size.textContent='调整摇杆尺寸';
  const toggle=document.createElement('button');toggle.type='button';toggle.textContent='显示 / 隐藏触屏操作';
  let handed='left',large=false,shown=touch;try{handed=localStorage.getItem('cz_march_hand90')||'left';large=localStorage.getItem('cz_march_large90')==='1';}catch{}
  const layout=()=>{panel.dataset.hand=handed;panel.classList.toggle('czmw-large90',large);panel.classList.toggle('czmw-input-hidden90',!shown);};
  on(hand,'click',()=>{handed=handed==='left'?'right':'left';layout();try{localStorage.setItem('cz_march_hand90',handed);}catch{}});
  on(size,'click',()=>{large=!large;layout();try{localStorage.setItem('cz_march_large90',large?'1':'0');}catch{}});
  on(toggle,'click',()=>{shown=!shown;layout();reset();});
  const hint=document.createElement('small');hint.textContent='点地面寻路 · WASD / ↑↓←→';hint.className='czmw-control-hint86';settings.append(switcher,hand,size,toggle);panel.append(stick,pad,hint);container.append(settings);layout();hint.textContent=touch?'拖动摇杆或点地面前往':'右键锁定视角 · 单击寻路 · WASD 移动 · C 步行 · Shift 冲刺';
  const action=document.createElement('button');action.type='button';action.className='czmw-act';action.dataset.czmwUi='true';action.hidden=true;action.textContent='交互';container.append(panel,action);
  on(action,'click',()=>{if(state.enabled)hooks.onInteract?.();});
  let joyId=null,tap=null,shiftHeld=false,touchRun=false,walkToggle=false;
  const finePointer=matchMedia('(pointer: fine)').matches&&typeof container.requestPointerLock==='function';
  const locked=()=>document.pointerLockElement===container;
  const unlock=()=>{if(locked())document.exitPointerLock?.();};
  const lock=()=>{if(!finePointer||locked())return;try{const request=container.requestPointerLock();request?.catch?.(()=>{});}catch{}};
  const center=()=>{touchRun=false;state.joy={x:0,y:0};knob.style.transform='translate(-50%,-50%)';};
  const reset=()=>{shiftHeld=false;walkToggle=false;keys.clear();held.clear();for(const[id,node]of captures){try{node.releasePointerCapture?.(id);}catch{}}captures.clear();joyId=null;center();tap=null;};
  function setMode(value){mode=value==='directions'?'directions':'joystick';hint.textContent=touch?(mode==='directions'?'按方向按钮或点地面前往':'拖动摇杆或点地面前往'):'右键锁定视角 · 单击寻路 · WASD 移动 · C 步行 · Shift 冲刺';reset();hooks.onDir?.();stick.hidden=mode!=='joystick';pad.hidden=mode!=='directions';for(const [id,b]of Object.entries(buttons))b.setAttribute('aria-pressed',String(id===mode));try{localStorage.setItem('cz_march_control86',mode);}catch{}}
  const updateJoy=e=>{const r=stick.getBoundingClientRect(),radius=Math.max(1,Math.min(r.width,r.height)*.34);let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,l=Math.hypot(x,y);touchRun=e.pointerType==='touch'&&y<0&&l>=radius*1.25;if(l>radius){x*=radius/l;y*=radius/l;}if(l<radius*.13)x=y=0;state.joy={x:x/radius,y:y/radius};knob.style.transform=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;if(x||y)hooks.onDir?.();};
  on(stick,'pointerdown',e=>{if(!state.enabled||e.button!==0||joyId!==null)return;e.preventDefault();e.stopPropagation();joyId=e.pointerId;stick.setPointerCapture?.(e.pointerId);captures.set(e.pointerId,stick);hooks.onDir?.();updateJoy(e);});
  on(stick,'pointermove',e=>{if(e.pointerId===joyId&&state.enabled){e.preventDefault();e.stopPropagation();updateJoy(e);}});
  const stopJoy=e=>{captures.delete(e.pointerId);if(e.pointerId===joyId){joyId=null;center();}e.stopPropagation();};on(stick,'pointerup',stopJoy);on(stick,'pointercancel',stopJoy);on(stick,'lostpointercapture',stopJoy);
  const ownUI=e=>e.target?.closest?.('[data-czmw-ui]');
  const isEditing = e => e.target?.closest?.('input,textarea,select,[contenteditable]');
  on(window,'focusin',e=>{if(isEditing(e))reset();});
  on(window,'keydown',e=>{if(e.code==='Escape'&&locked()){e.preventDefault();unlock();}});
  on(window,'keydown',e=>{
    if(!state.enabled || isEditing(e) || e.ctrlKey || e.metaKey)return;
    shiftHeld=e.shiftKey;
    if(e.code==='KeyC'&&!e.repeat&&!ownUI(e)){walkToggle=!walkToggle;e.preventDefault();return;}
    if(map[e.code]) {
      e.preventDefault();
      if(!e.repeat){keys.add(e.code);hooks.onDir?.();}
    } else if(!ownUI(e) && !e.altKey && !e.repeat) {
      if(e.code==='Space' && hooks.onJump){e.preventDefault();hooks.onJump();}
      if(e.code==='KeyE' || e.code==='Enter'){e.preventDefault();hooks.onInteract?.();}
    }
  });
  on(window,'keyup',e=>{shiftHeld=e.shiftKey;keys.delete(e.code);});
  on(window,'blur',reset);
  on(document,'visibilitychange',()=>{if(document.hidden)reset();});
  on(document,'pointerlockchange',()=>{tap=null;});
  on(container,'pointermove',e=>{
    if(!state.enabled || ownUI(e))return;
    if(e.pointerType==='mouse' && (locked()||e.altKey)) {
      hooks.onLook?.(e.movementX,e.movementY);
    } else if(e.pointerType==='touch' && tap?.id===e.pointerId) {
      if(!tap.dragged && Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<8)return;
      const dx=e.clientX-(tap.lastX??tap.x),dy=e.clientY-(tap.lastY??tap.y);
      tap.dragged=true;
      tap.lastX=e.clientX;tap.lastY=e.clientY;
      hooks.onLook?.(dx,dy);
    }
  });
  on(container,'contextmenu',e=>{if(finePointer)e.preventDefault();});
  on(container,'pointerdown',e=>{
    if(!state.enabled||ownUI(e)||e.isPrimary===false)return;
    if(e.pointerType==='mouse'&&finePointer&&e.button===2){tap=null;e.preventDefault();lock();return;}
    if(e.button!==0||locked()){tap=null;return;}
    tap={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()};
  });
  on(container,'pointerup',e=>{if(locked()){tap=null;return;}const start=tap;tap=null;if(!start||start.dragged||start.id!==e.pointerId||!state.enabled||ownUI(e))return;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)<8&&performance.now()-start.time<500){const r=container.getBoundingClientRect();hooks.onTap?.(e.clientX-r.left,e.clientY-r.top);}});on(container,'pointercancel',()=>tap=null);
  setMode(mode);
  return {
   vector(){if(!state.enabled)return {x:0,y:0};const dirs=new Set([...Array.from(keys,k=>map[k]),...held.values()]);let x=Number(dirs.has('e'))-Number(dirs.has('w'))+state.joy.x,y=Number(dirs.has('s'))-Number(dirs.has('n'))+state.joy.y;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}return{x,y};},
   hasKeyboard:()=>keys.size>0,wantsBack:movement=>movement.y>0,wantsRun:()=>shiftHeld||(!keys.size&&touchRun),wantsWalk:()=>walkToggle,pointerLocked:locked,
   showAction(show,label){action.hidden=!show;if(label)action.textContent=label;},
   setEnabled(v){if(state.enabled===!!v)return;state.enabled=!!v;if(!v){reset();unlock();}panel.setAttribute('aria-disabled',String(!v));for(const b of panel.querySelectorAll('button'))b.disabled=!v;action.disabled=!v;},
   isTouch:()=>navigator.maxTouchPoints>0,get mode(){return mode;},setMode,
   dispose(){reset();unlock();listeners.forEach(f=>f());panel.remove();settings.remove();action.remove();}
  };
 }
 M.controls86={create};
})();
