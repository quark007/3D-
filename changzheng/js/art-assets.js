/* Locally cached CC0 Poly Haven assets; all maps recorded in assets/pbr/manifest.json. */
const WorldArtAssets={
  manifest:null,
  init(){if(!this.manifest)this.manifest=fetch('assets/pbr/manifest.json').then(r=>r.json()).catch(()=>({}));return this.manifest;},
  async apply(material,key,repeat=1){const manifest=await this.init(),entry=manifest[key];if(!entry)return;const T=THREE,loader=new T.TextureLoader();for(const [channel,info] of Object.entries(entry.maps)){if((material.isMeshLambertMaterial||material.userData.czSkipDetailMaps)&&channel!=='diffuse')continue;loader.load(info.webPath||info.path,tx=>{if(material.userData.czDisposed){tx.dispose();return;}material.userData.czOwnTextures??=[];material.userData.czOwnTextures.push(tx);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(repeat,repeat);tx.anisotropy=material.isMeshLambertMaterial?1:4;if(channel==='diffuse'){tx.colorSpace=T.SRGBColorSpace;material.map=tx;}if(channel==='normal'){material.normalMap=tx;material.normalScale=new T.Vector2(.55,.55);}if(channel==='roughness')material.roughnessMap=tx;material.needsUpdate=true;if(typeof RenderBudget!=='undefined')RenderBudget.invalidateAll();});}},
};
