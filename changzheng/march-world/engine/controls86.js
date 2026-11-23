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
  const hint=document.createElement('small');hint.textContent='点地面寻路 · WASD / ↑↓←→';hint.className='czmw-control-hint86';settings.append(switcher,hand,size,toggle);panel.append(stick,pad,hint);container.append(settings);layout();hint.textContent=touch?'拖动摇杆或点地面前往':'方向键移动 · E 交谈';
  const action=document.createElement('button');action.type='button';action.className='czmw-act';action.dataset.czmwUi='true';action.hidden=true;action.textContent='交互';container.append(panel,action);
  on(action,'click',()=>{if(state.enabled)hooks.onInteract?.();});
  let joyId=null,tap=null,shiftHeld=false,walkSelected=false,touchRun=false;
  let lookCanvas = hooks.lookCanvas;
  const desktop = () => Boolean(lookCanvas && !touch);
  let wasLocked = false, programmaticUnlock = false;
  const sensitivityKey = 'cz_march_mouse_sensitivity';
  let sensitivity = 1;
  try { sensitivity = Math.max(.25, Math.min(2.5, Number(localStorage.getItem(sensitivityKey)) || 1)); } catch {}
  const look = (dx, dy, pointerType) => {
    const scale = pointerType === 'mouse' ? sensitivity : 1;
    hooks.onLook?.(dx * scale, dy * scale);
  };
  const center=()=>{touchRun=false;state.joy={x:0,y:0};knob.style.transform='translate(-50%,-50%)';};
  const altKeys = new Set();
  function releaseFreeLook() {
    if (!altKeys.size) return;
    altKeys.clear();
    hooks.onFreeLook?.(false);
  }
  const reset=()=>{releaseFreeLook();shiftHeld=false;keys.clear();held.clear();for(const[id,node]of captures){try{node.releasePointerCapture?.(id);}catch{}}captures.clear();joyId=null;center();tap=null;};
  function setMode(value){mode=value==='directions'?'directions':'joystick';hint.textContent=touch?(mode==='directions'?'按方向按钮或点地面前往':'拖动摇杆或点地面前往'):'方向键移动 · E 交谈';reset();hooks.onDir?.();stick.hidden=mode!=='joystick';pad.hidden=mode!=='directions';for(const [id,b]of Object.entries(buttons))b.setAttribute('aria-pressed',String(id===mode));try{localStorage.setItem('cz_march_control86',mode);}catch{}}
  const updateJoy=e=>{const r=stick.getBoundingClientRect(),radius=Math.max(1,Math.min(r.width,r.height)*.34);let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,l=Math.hypot(x,y);touchRun=e.pointerType==='touch'&&y<0&&l>=radius*1.25;if(l>radius){x*=radius/l;y*=radius/l;}if(l<radius*.13)x=y=0;state.joy={x:x/radius,y:y/radius};knob.style.transform=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;if(x||y)hooks.onDir?.();};
  on(stick,'pointerdown',e=>{if(!state.enabled||e.button!==0||joyId!==null)return;e.preventDefault();e.stopPropagation();joyId=e.pointerId;stick.setPointerCapture?.(e.pointerId);captures.set(e.pointerId,stick);hooks.onDir?.();updateJoy(e);});
  on(stick,'pointermove',e=>{if(e.pointerId===joyId&&state.enabled){e.preventDefault();e.stopPropagation();updateJoy(e);}});
  const stopJoy=e=>{captures.delete(e.pointerId);if(e.pointerId===joyId){joyId=null;center();}e.stopPropagation();};on(stick,'pointerup',stopJoy);on(stick,'pointercancel',stopJoy);on(stick,'lostpointercapture',stopJoy);
  const ownUI=e=>e.target?.closest?.('[data-czmw-ui]');
  const isEditing = e => e.target?.closest?.('input,textarea,select,[contenteditable]');
  on(window,'focusin',e=>{if(isEditing(e))reset();});
  on(window,'keydown',e=>{
    if (e.code === 'Escape' && desktop()) {
      if (e.repeat) return;
      if (dialog.open || state.enabled) {
        e.preventDefault();
        if (dialog.open) closeSettings();
        else openSettings();
      }
      return;
    }
    if(!state.enabled || isEditing(e) || e.ctrlKey || e.metaKey)return;
    shiftHeld=e.shiftKey;
    if (desktop() && (e.code === 'AltLeft' || e.code === 'AltRight')) {
      e.preventDefault();
      if (e.repeat) return;
      if (!altKeys.size) hooks.onFreeLook?.(true);
      altKeys.add(e.code);
      return;
    }
    if (e.code === 'KeyC' && !e.altKey) {
      e.preventDefault();
      if (!e.repeat) walkSelected = !walkSelected;
      return;
    }
    if(map[e.code]) {
      e.preventDefault();
      if(!e.repeat){keys.add(e.code);hooks.onDir?.();}
    } else if(!ownUI(e) && !e.altKey && !e.repeat) {
      if(e.code==='Space' && hooks.onJump){e.preventDefault();hooks.onJump();}
      if(e.code==='KeyE' || e.code==='Enter'){e.preventDefault();hooks.onInteract?.();}
    }
  });
  on(window,'keyup',e=>{
    shiftHeld=e.shiftKey;
    keys.delete(e.code);
    if (altKeys.delete(e.code)) {
      e.preventDefault();
      if (!altKeys.size) hooks.onFreeLook?.(false);
    }
  });
  on(window,'blur',reset);
  on(document,'visibilitychange',()=>{if(document.hidden)reset();});
  const locked = () => Boolean(lookCanvas && document.pointerLockElement === lookCanvas);
  const unlock = () => {
    releaseFreeLook();
    if (!locked()) return;
    programmaticUnlock = true;
    document.exitPointerLock();
  };
  function requestLock() {
    if (!desktop() || !state.enabled || dialog.open || !lookCanvas.requestPointerLock) return;
    try {
      lookCanvas.requestPointerLock()?.catch(() => {});
    } catch { /* Right-button drag remains usable when the host denies lock. */ }
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'czmw-pause';
  dialog.dataset.czmwUi = 'true';
  dialog.setAttribute('aria-label', '移动设置');
  const title = document.createElement('h2');
  title.textContent = '移动设置';
  const resume = document.createElement('button');
  resume.type = 'button';
  resume.className = 'czmw-resume';
  resume.textContent = '继续游戏';
  const label = document.createElement('label');
  label.className = 'czmw-sensitivity';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '.25'; slider.max = '2.5'; slider.step = '.05'; slider.value = String(sensitivity);
  const value = document.createElement('output');
  const showSensitivity = () => { value.textContent = Math.round(sensitivity * 100) + '%'; };
  showSensitivity();
  label.append('鼠标视角灵敏度', value, slider);
  on(slider, 'input', () => {
    sensitivity = slider.valueAsNumber;
    showSensitivity();
    try { localStorage.setItem(sensitivityKey, String(sensitivity)); } catch {}
  });
  const shortcuts = document.createElement('p');
  shortcuts.textContent = 'WASD 移动 · Shift 冲刺 · C 切换慢走 · 按住 Alt 自由环视 · E 交互 · 左键锁定视角 · Esc 设置 · Ctrl + 点击寻路';
  const touchOptions = document.createElement('div');
  touchOptions.className = 'czmw-touch-options';
  dialog.append(title, resume, label, shortcuts, touchOptions);
  const sound = document.querySelector('#settingsPanel input[data-key="sound"]');
  if (sound) {
    const soundButton = document.createElement('button');
    soundButton.type = 'button';
    const syncSound = () => {
      soundButton.textContent = sound.checked ? '音效：开' : '音效：关';
      soundButton.setAttribute('aria-pressed', String(sound.checked));
    };
    syncSound();
    on(sound, 'change', syncSound);
    on(soundButton, 'click', () => sound.click());
    dialog.append(soundButton);
  }
  container.append(dialog);
  function openSettings() {
    if (!desktop() || !state.enabled || dialog.open) return;
    touchOptions.append(switcher, hand, size, toggle);
    dialog.showModal();
    hooks.onSettings?.(true);
    resume.focus();
  }
  function closeSettings(relock = false) {
    if (!dialog.open) return;
    dialog.close();
    settings.append(switcher, hand, size, toggle);
    hooks.onSettings?.(false);
    if (relock) requestLock();
  }
  on(resume, 'click', () => closeSettings(true));
  on(dialog, 'cancel', e => { e.preventDefault(); closeSettings(); });
  on(summary, 'click', e => {
    if (!desktop()) return;
    e.preventDefault();
    openSettings();
  });
  const clickGround = (x, y) => {
    const rect = container.getBoundingClientRect();
    hooks.onTap?.(x - rect.left, y - rect.top);
  };
  const cancelDrag = () => { tap = null; };
  on(document, 'pointerlockchange', () => {
    cancelDrag();
    const previouslyLocked = wasLocked;
    wasLocked = locked();
    if (wasLocked && !state.enabled) {
      unlock();
    } else if (previouslyLocked && !wasLocked) {
      releaseFreeLook();
      const userReleased = !programmaticUnlock && !document.pointerLockElement;
      programmaticUnlock = false;
      if (userReleased) openSettings();
    }
  });
  on(document, 'mousemove', e => {
    if (state.enabled && locked()) look(e.movementX, e.movementY, 'mouse');
  });
  on(container, 'contextmenu', e => {
    if (lookCanvas && e.target === lookCanvas) e.preventDefault();
  });
  on(container, 'pointerdown', e => {
    if (!state.enabled || ownUI(e) || tap || (e.button !== 0 && (e.button !== 2 || !lookCanvas))) return;
    if (locked()) {
      if (e.button === 0 && e.ctrlKey) {
        const rect = lookCanvas.getBoundingClientRect();
        clickGround(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      return;
    }
    const surface = lookCanvas && e.target === lookCanvas;
    if (surface && desktop() && e.pointerType === 'mouse' && e.button === 0 && !e.ctrlKey) {
      requestLock();
      return;
    }
    tap = { id: e.pointerId, x: e.clientX, y: e.clientY, surface, time: performance.now() };
    if (surface) lookCanvas.setPointerCapture?.(e.pointerId);
  });
  on(container, 'pointermove', e => {
    if (!state.enabled || locked() || !tap?.surface || tap.id !== e.pointerId) return;
    if (!tap.dragged && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 5) return;
    look(e.clientX - (tap.lastX ?? tap.x), e.clientY - (tap.lastY ?? tap.y), e.pointerType);
    tap.dragged = true;
    tap.lastX = e.clientX;
    tap.lastY = e.clientY;
  });
  on(container, 'pointerup', e => {
    if (tap?.id !== e.pointerId) return;
    const start = tap;
    cancelDrag();
    if (!state.enabled || ownUI(e) || start.dragged || e.button !== 0 ||
        Math.hypot(e.clientX - start.x, e.clientY - start.y) >= 8 || performance.now() - start.time >= 500) return;
    clickGround(e.clientX, e.clientY);
  });
  on(container, 'pointercancel', e => { if (tap?.id === e.pointerId) cancelDrag(); });
  on(container, 'lostpointercapture', e => { if (tap?.id === e.pointerId) cancelDrag(); });
  setMode(mode);
  return {vector(){if(!state.enabled)return {x:0,y:0};const dirs=new Set([...Array.from(keys,k=>map[k]),...(keys.size ? [] : held.values())]);let x=Number(dirs.has('e'))-Number(dirs.has('w'))+(keys.size ? 0 : state.joy.x),y=Number(dirs.has('s'))-Number(dirs.has('n'))+(keys.size ? 0 : state.joy.y);const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}return{x,y};},hasKeyboard:()=>keys.size>0,unlock,disableCamera(){unlock();closeSettings();lookCanvas=null;},wantsWalk:()=>walkSelected,wantsRun:()=>shiftHeld||(!keys.size&&touchRun),showAction(show,label){action.hidden=!show;if(label)action.textContent=label;},setEnabled(v){if(state.enabled===!!v)return;state.enabled=!!v;if(!v){reset();unlock();}panel.setAttribute('aria-disabled',String(!v));for(const b of panel.querySelectorAll('button'))b.disabled=!v;action.disabled=!v;},isTouch:()=>navigator.maxTouchPoints>0,get mode(){return mode;},setMode,dispose(){unlock();reset();listeners.forEach(f=>f());dialog.remove();panel.remove();settings.remove();action.remove();}};
 }
 M.controls86={create};
})();
