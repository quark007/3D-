/* The modern terrain scene owns its engine objects; legacy artistic GLSL stays WebGL. */
const Graphics40={module:null,
 install(){const legacy=LongMarchGeo.mount;LongMarchGeo.mount=function(host,id){
  let alive=true,actual;const stub={dispose(){if(!alive)return;alive=false;const owned=actual;actual=null;owned?.dispose();if(LongMarch3D.instances.get(host)===stub)LongMarch3D.instances.delete(host);delete host.dataset.sceneReady;}};
  host.dataset.chapterId=String(id);host.dataset.sceneStarted=String(performance.now());
  LongMarch3D.instances.set(host,stub);host.dataset.sceneReady='false';
  const view=host.querySelector('.world3d-view')||host;view.textContent='正在读取 SRTM 地形与渲染后端…';
  const ready=(Graphics40.module??=import('../assets/webgpu40/src/game-view40.js'));ready.catch(()=>{if(Graphics40.module===ready)Graphics40.module=null;});
  ready.then(async module=>{const [data,,water]=await LongMarchGeo.data(id);if(!alive||!host.isConnected)return;actual=await module.mountGameTerrain({host,view,id,data,water,budget:RenderBudget,isCurrent:()=>alive&&host.isConnected});if(!alive)actual.dispose();})
   .catch(error=>{if(!alive)return;console.warn('Terrain backend:',error.message);host.dataset.sceneError='新渲染后端未就绪，正在尝试兼容地形视图。';const fallback=legacy.call(LongMarchGeo,host,id);actual=LongMarch3D.instances.get(host);if(actual===stub)actual=null;LongMarch3D.instances.set(host,stub);Promise.resolve(fallback).then(()=>{if(!alive)actual?.dispose();}).catch(()=>{if(alive)host.dataset.sceneReady='error';});});
  return stub;
 };}
};Graphics40.install();
