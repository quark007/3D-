/* Shared camera navigation for every story and geographic scene. */
const WorldNavigation={
  create({host,canvas,camera,scene,target,radius,theta,phi,minRadius=2,maxRadius=240}){
    const T=THREE,home={target:target.clone(),radius,theta,phi},pointers=new Map();let mode='pan',disposed=false;
    const state={radius,theta,phi,target};
    const bar=document.createElement('div');bar.className='world3d-navigation';bar.setAttribute('aria-label','三维视角控制');
    const hint=document.createElement('div');hint.className='world3d-navigation-hint';hint.textContent='拖动平移 · 右键旋转 · 滚轮缩放 · 双击看近处 / 双指移动与缩放';
    const buttons={};
    const sync=()=>{for(const name of ['pan','orbit'])buttons[name]?.setAttribute('aria-pressed',String(mode===name));};
    const zoom=factor=>{state.radius=Math.max(minRadius,Math.min(maxRadius,state.radius*factor));};
    const reset=()=>{hint.textContent="拖动平移 · 右键旋转 · 滚轮缩放 · 双击看近处 / 双指移动与缩放";target.copy(home.target);Object.assign(state,{radius:home.radius,theta:home.theta,phi:home.phi});};
    function pan(dx,dy){const scale=2*state.radius*Math.tan(camera.fov*Math.PI/360)/Math.max(1,canvas.clientHeight);target.x-=scale*(dx*Math.cos(state.theta)+dy*Math.sin(state.theta));target.z+=scale*(dx*Math.sin(state.theta)-dy*Math.cos(state.theta));}
    function orbit(dx,dy){state.theta-=dx*.006;state.phi=Math.max(.12,Math.min(1.52,state.phi+dy*.004));}
    for(const [name,label,action] of [['pan','平移',()=>{mode='pan';sync();}],['orbit','旋转',()=>{mode='orbit';sync();}],['in','＋',()=>zoom(.8)],['out','－',()=>zoom(1.25)],['left','←',()=>pan(45,0)],['up','↑',()=>pan(0,45)],['down','↓',()=>pan(0,-45)],['right','→',()=>pan(-45,0)],['reset','复位视角',reset]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('data-navigation',name);b.title={left:'向左平移',right:'向右平移',up:'向上平移',down:'向下平移',pan:'指挥棒 · 平移观察',orbit:'罗盘 · 旋转观察',in:'望远镜 · 拉近',out:'望远镜 · 拉远',reset:'指南针 · 恢复视角'}[name];b.setAttribute('aria-label',{in:'拉近',out:'拉远',left:'向左平移',right:'向右平移',up:'向上平移',down:'向下平移'}[name]||label);b.onclick=action;bar.append(b);buttons[name]=b;}sync();(host.querySelector?.('.world3d-tools')||host).append(bar);host.append(hint);
    canvas.style.touchAction='none';canvas.tabIndex=0;canvas.setAttribute('aria-label','三维场景：拖动平移，右键旋转，双击聚焦，方向键移动，R复位');
    const listeners=[];const on=(type,fn,options)=>{canvas.addEventListener(type,fn,options);listeners.push([type,fn,options]);};
    on('contextmenu',e=>e.preventDefault());
    on('pointerdown',e=>{if(e.button>2)return;e.preventDefault();canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button,type:e.pointerType});canvas.setPointerCapture(e.pointerId);canvas.classList.add('is-dragging');});
    on('pointermove',e=>{const previous=pointers.get(e.pointerId);if(!previous)return;
      const before=[...pointers.values()].map(p=>({...p}));const dx=e.clientX-previous.x,dy=e.clientY-previous.y;
      Object.assign(previous,{x:e.clientX,y:e.clientY});
      if(pointers.size>=2){const after=[...pointers.values()],a=before[0],b=before[1],c=after[0],d=after[1];pan((c.x+d.x-a.x-b.x)/2,(c.y+d.y-a.y-b.y)/2);const oldDistance=Math.hypot(a.x-b.x,a.y-b.y),distance=Math.hypot(c.x-d.x,c.y-d.y);if(distance>4&&oldDistance>4)zoom(oldDistance/distance);}
      else if(previous.button===2||(!e.shiftKey&&mode==='orbit'))orbit(dx,dy);else pan(dx,dy);
    });
    const release=e=>{pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(!pointers.size)canvas.classList.remove('is-dragging');};
    on('pointerup',release);on('pointercancel',release);on('lostpointercapture',e=>{pointers.delete(e.pointerId);if(!pointers.size)canvas.classList.remove('is-dragging');});
    on('wheel',e=>{e.preventDefault();zoom(Math.exp(Math.max(-150,Math.min(150,e.deltaY))*.002));},{passive:false});
    on('dblclick',e=>{e.preventDefault();const rect=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects(scene.children,true).find(h=>h.object.isMesh);if(!hit)return;target.copy(hit.point);let parent=hit.object;while(parent&&!parent.userData.navigationFocus)parent=parent.parent;if(parent){target.copy(parent.localToWorld(new T.Vector3(0,1.8,0)));state.radius=Math.max(minRadius,Math.min(maxRadius,parent.userData.navigationFocus));}else zoom(.55);document.dispatchEvent(new CustomEvent('world-inspect',{detail:{nodeId:Number(host.dataset.chapterId||host.dataset.world3d)}}));hint.textContent='已聚焦 · 可继续拖动观察，点击“复位视角”返回';});
    on('keydown',e=>{const step=45;let handled=true;switch(e.key){case 'ArrowLeft':pan(step,0);break;case 'ArrowRight':pan(-step,0);break;case 'ArrowUp':pan(0,step);break;case 'ArrowDown':pan(0,-step);break;case '+':case '=':zoom(.8);break;case '-':zoom(1.25);break;case 'r':case 'R':reset();break;default:handled=false;}if(handled)e.preventDefault();});
    return {state,pan,zoom,reset,update(){if(disposed)return;camera.position.set(target.x+Math.sin(state.theta)*state.radius*Math.sin(state.phi),target.y+Math.cos(state.phi)*state.radius,target.z+Math.cos(state.theta)*state.radius*Math.sin(state.phi));camera.lookAt(target);camera.updateMatrixWorld();},dispose(){disposed=true;for(const [type,fn,options] of listeners)canvas.removeEventListener(type,fn,options);for(const id of pointers.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);pointers.clear();bar.remove();hint.remove();}};
  }
};
