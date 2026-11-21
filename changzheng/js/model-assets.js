/* CC0 scanned props. Cache sources once; scene clones own their materials. */
const WorldModelAssets = {
  cache:new Map(),
  material(source){if(Array.isArray(source))return source.map(m=>this.material(m));return source.clone();},
  async load(key){
    const economy=typeof RenderBudget!=='undefined'&&['economy','fluent'].includes(RenderBudget.mode),cacheKey=key+(economy?':economy':':full');
    if(!this.cache.has(cacheKey))this.cache.set(cacheKey,(async()=>{
      const {GLTFLoader}=await import('./vendor/loaders/GLTFLoader.js');
      const url=key==='tree_small_02'?`assets/models/tree_small_02/${economy?'tree-economy.glb':'tree-cinema.glb'}`:`assets/models/${key}/model.gltf`;
      const gltf=await new GLTFLoader().loadAsync(url);
      return gltf.scene;
    })().catch(error=>{this.cache.delete(cacheKey);throw error;}));
    return this.cache.get(cacheKey);
  },
  async forest(key,parent,placements,alive=()=>true){
    const source=await this.load(key);if(!alive())return;
    source.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(source),extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),dummy=new THREE.Object3D();
    source.traverse(part=>{if(!part.isMesh)return;
      const material=this.material(part.material);for(const m of Array.isArray(material)?material:[material]){m.side=THREE.DoubleSide;if(m.transparent){m.alphaTest=.45;m.transparent=false;}if('envMapIntensity' in m)m.envMapIntensity=.45;}
      const batch=new THREE.InstancedMesh(part.geometry.clone(),material,placements.length);batch.castShadow=batch.receiveShadow=true;
      placements.forEach((p,i)=>{const factor=p.size/Math.max(extent.x,extent.y,extent.z),offset=new THREE.Matrix4().makeTranslation(-center.x*factor,-bounds.min.y*factor,-center.z*factor),scale=new THREE.Matrix4().makeScale(factor,factor,factor);dummy.position.set(p.x,p.y,p.z);dummy.rotation.y=p.rotation||0;dummy.scale.setScalar(1);dummy.updateMatrix();const matrix=dummy.matrix.clone().multiply(offset).multiply(scale).multiply(part.matrixWorld);batch.setMatrixAt(i,matrix);});batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();parent.add(batch);
    });
  },
  async place(key,parent,{x=0,y=0,z=0,size=1,rotation=0,alive=()=>true}={}){
    try{
      const source=await this.load(key);if(!alive())return null;
      const clone=source.clone(true),bounds=new THREE.Box3().setFromObject(clone),extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const factor=size/Math.max(extent.x,extent.y,extent.z);
      clone.position.set(-center.x*factor,-bounds.min.y*factor,-center.z*factor);clone.scale.setScalar(factor);
      clone.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=this.material(o.material);o.castShadow=o.receiveShadow=true;}});
      const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=rotation;group.add(clone);parent.add(group);return group;
    }catch(error){console.warn('场景模型加载失败，保留基础布景',key,error.message);return null;}
  }
};
