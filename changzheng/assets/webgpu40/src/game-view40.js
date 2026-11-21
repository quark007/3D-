import * as T from 'three';
import { createRenderer } from './renderer-adapter.js';
import { terrainMesh, waterwaysMesh } from './terrain.js';

export async function mountGameTerrain({host,view,id,data,water,budget,isCurrent=()=>true}){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(43,1,.1,10000),economy=budget.mode==='economy';
 let disposed=false,running=false,frame,controls,handle,observer,badge,info,effects;
 const dispose=()=>{if(disposed)return;disposed=true;budget.cancel(frame);controls?.abort();observer?.disconnect();handle?.dispose();scene.traverse(o=>{o.geometry?.dispose();for(const mat of [o.material].flat().filter(Boolean))mat.dispose();});info?.remove();badge?.remove();};
 try{
 scene.background=new T.Color(id===8?0xa3b8c0:0x607575);
 scene.add(new T.HemisphereLight(0xe2edf1,0x4b5341,1.4));
 const sun=new T.DirectionalLight(0xffe3ad,2.2);sun.position.set(-100,240,120);scene.add(sun);
 const terrain=terrainMesh(data,id===8?'snow':'land',economy?129:193);scene.add(terrain.mesh);
 if(water)scene.add(waterwaysMesh(water,terrain));
 const box=new T.Box3().setFromObject(terrain.mesh),size=box.getSize(new T.Vector3()),target=box.getCenter(new T.Vector3());
 let radius=Math.max(size.x,size.z)*1.12,theta=.5,phi=.84;
 const aim=()=>{camera.position.set(target.x+radius*Math.sin(phi)*Math.sin(theta),target.y+radius*Math.cos(phi),target.z+radius*Math.sin(phi)*Math.cos(theta));camera.lookAt(target);};aim();
 view.replaceChildren();
 badge=document.createElement('span');badge.className='geo-north';view.append(badge);
 const rebind=({backend,renderer})=>{
  host.dataset.sceneReady='false';
  controls?.abort();controls=new AbortController();const canvas=renderer.domElement;view.prepend(canvas);badge.textContent=backend==='webgpu'?'WebGPU · SRTM真实高程':'WebGL兼容 · SRTM真实高程';let drag;
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);},{signal:controls.signal});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;theta-=(e.clientX-drag.x)*.005;phi=T.MathUtils.clamp(phi+(e.clientY-drag.y)*.005,.15,1.5);drag={x:e.clientX,y:e.clientY};aim();budget.invalidate(host,150);},{signal:controls.signal});
  for(const name of ['pointerup','pointercancel'])canvas.addEventListener(name,()=>drag=null,{signal:controls.signal});
  canvas.addEventListener('wheel',e=>{e.preventDefault();radius=T.MathUtils.clamp(radius*Math.exp(e.deltaY*.001),15,Math.max(size.x,size.z)*4);aim();budget.invalidate(host,150);},{passive:false,signal:controls.signal});
  budget.invalidate(host,150);
  if(running){budget.cancel(frame);budget.demand(host,false);frame=budget.schedule(host,tick);}
 };
 handle=await createRenderer({host,scene,RenderBudget:budget,rendererOptions:{antialias:!economy,powerPreference:economy?'low-power':'high-performance'},onBackendChange:rebind});
 if(!isCurrent()){dispose();return {dispose};}
 const renderer=handle.renderer;view.prepend(renderer.domElement);renderer.setPixelRatio(budget.profiles?.[budget.mode]?.ratio??(economy?.7:1));
 // Deferred effects are opt-in; economy uses the same low-cost PBR path for both backends.
 if(!economy&&budget.mode==='cinematic'&&handle.backend==='webgpu'){
  try{const {createGPUEffects}=await import('./gpu-effects.js');effects=createGPUEffects(renderer.raw,scene,camera,{width:size.x,depth:size.z,maxHeight:size.y,anchor:target});handle.setEffects(()=>effects.render(performance.now()),()=>effects.dispose());}catch{effects?.dispose();}
 }
 const resize=()=>{if(!view.clientWidth||!view.clientHeight)return;renderer.setSize(view.clientWidth,view.clientHeight,false);camera.aspect=view.clientWidth/view.clientHeight;camera.updateProjectionMatrix();budget.invalidate(host);};
 observer=new ResizeObserver(resize);observer.observe(view);resize();budget.demand(host,false);
 info=document.createElement('details');info.className='geo-proof';const summary=document.createElement('summary');summary.textContent='高程来源与精度';const note=document.createElement('p');note.textContent=`NASA/NGA SRTM GL1 / OpenTopography · 原始网格256×256，区域采样约200米。高程${data.min}—${data.max}米；现代高程与水系，不是1935年的测绘复原。`;
 const attribution=document.createElement('a');attribution.href='https://www.openstreetmap.org/copyright';attribution.textContent='水系 © OpenStreetMap contributors · ODbL';attribution.target='_blank';attribution.rel='noopener';info.append(summary,note,attribution);host.append(info);
 const caption=host.querySelector('.world3d-caption small');if(caption)caption.textContent='SRTM GL1 / OpenTopography · 水系 © OpenStreetMap · 区域高程';
 function tick(){if(disposed)return;frame=budget.schedule(host,tick);const now=performance.now();if(document.hidden||!budget.allow(host,now))return;const begin=performance.now();renderer.render(scene,camera);host.dataset.sceneReady='true';budget.record(host,now,performance.now()-begin);}running=true;tick();
 return {dispose,scene,camera,data};
 }catch(error){dispose();throw error;}
}
