/* Three.js real-time scene direction. Local scenic coordinates, never survey data. */
const LongMarch3D = {
  chapters: {
    1:{title:'中央苏区 · 星夜启程',place:'于都集结与渡河背景',kind:'village',sky:0x343d46,fog:0x586367,water:true,light:0xffd6a2},
    2:{title:'湘江 · 掩护与渡江',place:'湘江战役背景',kind:'battle',sky:0x3b3e42,fog:0x73716b,water:true,light:0xffc88d},
    3:{title:'遵义 · 灯下研判',place:'遵义会议背景 · 1935年1月15—17日',kind:'meeting',sky:0x171b20,fog:0x282b30,light:0xffb85d},
    4:{title:'赤水 · 山河之间',place:'四渡赤水背景 · 1935年1—3月',kind:'valley',sky:0x53616a,fog:0x71817d,water:true,light:0xffddac},
    5:{title:'金沙江 · 渡运之夜',place:'皎平渡历史背景',kind:'gorge',sky:0x475968,fog:0x718586,water:true,light:0xffd5a5},
    6:{title:'大渡河 · 安顺场',place:'安顺场强渡背景 · 1935年5月25日',kind:'rapids',sky:0x465863,fog:0x8a9592,water:true,light:0xffe0b5},
    7:{title:'泸定 · 铁索横江',place:'飞夺泸定桥背景 · 1935年5月29日',kind:'bridge',sky:0x3b4650,fog:0x83928e,water:true,light:0xffdcad},
    8:{title:'雪山 · 风雪同行',place:'夹金山高寒环境 · 1935年6月',kind:'snow',sky:0x8b9da8,fog:0xb0c1c5,light:0xe7f2ff},
    9:{title:'草地 · 彼此照应',place:'松潘草地环境 · 1935年8月',kind:'marsh',sky:0x657779,fog:0x8e9d8c,light:0xffefcb},
    10:{title:'腊子口 · 峡谷通道',place:'腊子口战役背景 · 1935年9月',kind:'pass',sky:0x4f5a60,fog:0x7d8b83,light:0xffd7a3},
    11:{title:'吴起镇 · 陕北落脚',place:'中央红军到达陕北 · 1935年10月',kind:'loess',sky:0x8a8275,fog:0xa89b7d,light:0xffdfa2},
    12:{title:'会师 · 征途回望',place:'三大主力会师背景 · 1936年10月',kind:'reunion',sky:0x8d8679,fog:0xb6aa8e,light:0xffdfa0}
  },
  instances:new Map(),
  bindModes(host,id,options){
    if(host.querySelector('.world3d-modes'))return;
    const modes=document.createElement('div');modes.className='world3d-modes';
    for(const [mode,label] of [['scene','剧情近景'],['geo','真实地形'],['v03','新模型 · v03']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.classList.toggle('active',mode==='scene');button.onclick=()=>{const old=this.instances.get(host);old?.dispose();this.instances.delete(host);host.querySelectorAll('.geo-proof,.geo-north').forEach(n=>n.remove());host.querySelector('.world3d-view').replaceChildren();modes.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));if(mode==='geo')LongMarchGeo.mount(host,id);else if(mode==='v03')LongMarchModelsV03.mount(host,id);else this.mount(host,id,options);};modes.append(button);}(host.querySelector('.world3d-tools')||host).append(modes);
  },
  markup(node){const id=Number(node?.id)||1,c=this.chapters[id]||this.chapters[1];return `<figure class="world3d-frame" data-world3d="${id}"><div class="world3d-tools" aria-label="场景与视角工具栏"></div><div class="world3d-view" role="img" aria-label="${c.title}可交互三维场景"></div><div class="world3d-caption"><span>${c.title}</span><small>艺术复原 · 非测绘地图 / 拖动平移 · 双击聚焦</small></div></figure>`;},
  init(){if(typeof SceneMountQueue!=='undefined'){if(!SceneMountQueue.installed){SceneMountQueue.installed=true;SceneMountQueue.install();}return;}const scan=()=>{document.querySelectorAll('[data-world3d]').forEach(el=>{if(!this.instances.has(el))this.mount(el,Number(el.dataset.world3d));});this.instances.forEach((v,k)=>{if(!k.isConnected){v.dispose();this.instances.delete(k);}});};let scheduled=false;new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;scan();});}}).observe(document.body,{childList:true,subtree:true});scan();},
  mount(host,id,options={}){
    if(this.instances.has(host))return this.instances.get(host);
    host.dataset.chapterId=String(id);host.dataset.sceneStarted=String(performance.now());host.dataset.sceneReady='false';
    this.bindModes(host,id,options);
    const detail=host.querySelector('.world3d-caption small');if(detail)detail.textContent='艺术复原 · 非测绘地图 / 拖动平移 · 双击聚焦';
    if(typeof THREE==='undefined'){host.dataset.sceneReady='error';host.dataset.sceneError='三维引擎未加载，请返回后重试或阅读剧情文字。';return null;}const T=THREE,cfg=this.chapters[id]||this.chapters[1],view=host.querySelector('.world3d-view')||host;let renderer;const economy=typeof RenderBudget!=='undefined'&&RenderBudget.mode==='economy';
    try{renderer=new T.WebGLRenderer({antialias:!economy,alpha:false,powerPreference:'high-performance'});}catch{host.dataset.sceneReady='error';host.dataset.sceneError='当前设备未启用WebGL，可继续阅读剧情或观看电影分镜。';view.textContent='当前设备未启用WebGL，请使用剧情文字与已有电影分镜。';return null;}
    let cleanupScene=null;const failedCleanup=[];
    try {
    renderer.setPixelRatio(Math.min(devicePixelRatio,economy?.7:1));renderer.shadowMap.enabled=!economy;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;view.append(renderer.domElement);
    const scene=cleanupScene=new T.Scene();scene.background=new T.Color(cfg.sky);scene.fog=new T.FogExp2(cfg.fog,cfg.kind==='meeting'?.006:.0045);const camera=new T.PerspectiveCamera(39,1,.2,400),target=new T.Vector3(0,cfg.kind==='meeting'?4:3,0);let radius=cfg.kind==='meeting'?22:68,theta=cfg.kind==='meeting'?.38:.64,phi=cfg.kind==='meeting'?1.36:1.24,drag=null,alive=true,visible=true,frame=0;
    scene.add(new T.HemisphereLight(cfg.kind==='meeting'?0x9aa9b4:0xc6d9e3,0x2a291c,cfg.kind==='meeting'?.65:1.6));const sun=new T.DirectionalLight(cfg.light,cfg.kind==='meeting'?.8:3.2);sun.position.set(-35,65,24);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:180});sun.shadow.bias=-.0007;scene.add(sun);
    let seed=id*899+17;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    function material(params){return new T.MeshStandardMaterial(params);}
    const textures=[];failedCleanup.push(()=>textures.forEach(t=>t.dispose()));function texture(type){const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');g.fillStyle=type==='wood'?'#63503b':type==='snow'?'#bdcbd0':type==='earth'?'#777058':'#706e62';g.fillRect(0,0,256,256);for(let i=0;i<(economy?1800:13000);i++){const light=70+Math.floor(random()*110);g.fillStyle=`rgba(${light},${light},${Math.round(light*.88)},${.08+random()*.2})`;g.fillRect(random()*256,random()*256,random()*4+1,type==='wood'?random()*70+10:random()*4+1);}if(type==='rock'){g.strokeStyle='#272b2833';for(let i=0;i<20;i++){g.beginPath();g.moveTo(0,random()*256);g.lineTo(256,random()*256);g.stroke();}}const tx=new T.CanvasTexture(cv);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(type==='wood'?1:12,type==='wood'?1:12);tx.colorSpace=T.SRGBColorSpace;textures.push(tx);return tx;}
    const rockMap=texture('rock'),earthMap=texture('earth'),woodMap=texture('wood');const rock=material({color:0xbbb9a9,map:rockMap,roughness:.98}),wood=material({color:0xddd1b5,map:woodMap,roughness:.9}),darkWood=material({color:0x736352,map:woodMap}),leaf=material({color:0x3c5140,roughness:1}),red=material({color:0x922e25,roughness:.9}),snow=material({color:0xe4edf0,map:texture('snow'),roughness:.9});
    if(typeof WorldArtAssets!=='undefined'){WorldArtAssets.apply(rock,'rock',1);WorldArtAssets.apply(wood,'wood',1);WorldArtAssets.apply(darkWood,'wood',1);}
    function mesh(geo,mat,x=0,y=0,z=0,parent=scene){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
    function box(w,h,d,mat,x,y,z,parent){return mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,parent);}
    function pole(a,b,r,mat,parent=scene){const d=new T.Vector3().subVectors(b,a),o=mesh(new T.CylinderGeometry(r,r,d.length(),7),mat,0,0,0,parent);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
    const waterObjects=[],flags=[],people=[],markers=[],forestPlacements=[],rockPlacements=[];
    const environment=economy||typeof WorldLighting==='undefined'?null:WorldLighting.environment(renderer,cfg.kind==='meeting');failedCleanup.push(()=>environment?.dispose());if(environment)scene.environment=environment.texture;
    const riverX=z=>Math.sin(z*.025)*5;
    const terrainHeight=(x,z)=>{if(cfg.kind==='meeting')return 0;if(cfg.kind==='marsh')return .2+Math.sin(x*.12)*Math.cos(z*.13)*.35;if(['loess','reunion'].includes(cfg.kind))return Math.max(.1,(Math.abs(x)>19?Math.pow((Math.abs(x)-19)/10,1.2)*4:0)+Math.sin(z*.07)*.8);const width=cfg.kind==='gorge'?9:cfg.kind==='snow'?5:11;const bank=Math.abs(x-riverX(z));let y=Math.pow(Math.max(0,bank-width)*.35,1.4)*(cfg.kind==='snow'?1.8:1);y+=Math.max(0,bank-width)*.15*Math.sin(z*.12+x*.15);return Math.max(-.7,y);};
    function terrain(){const geo=new T.PlaneGeometry(180,190,economy?55:110,economy?60:120);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,terrainHeight(x,z));}geo.computeVertexNormals();const colors=[];for(let i=0;i<p.count;i++){const y=p.getY(i),color=new T.Color();if(cfg.kind==='snow')color.setRGB(.69+y*.003,.75+y*.003,.78+y*.003);else if(cfg.kind==='marsh')color.setRGB(.53+random()*.035,.59+random()*.03,.38);else if(['loess','reunion'].includes(cfg.kind))color.setRGB(.81,.67,.47);else color.setRGB(.58+y*.003,.61+y*.002,.5+y*.001);colors.push(color.r,color.g,color.b);}geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));const mat=material({map:cfg.kind==='snow'?snow.map:earthMap,vertexColors:true,roughness:1});mesh(geo,mat);if(cfg.kind!=='snow'&&typeof WorldArtAssets!=='undefined')WorldArtAssets.apply(mat,'earth',24);}
    function water(width=18){
      const geo=new T.PlaneGeometry(width,190,economy?20:40,economy?90:180);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
      for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)+riverX(p.getZ(i)));geo.computeVertexNormals();
      const mat=new T.MeshPhysicalMaterial({color:cfg.kind==='rapids'?0x748580:0x385657,metalness:0,roughness:.18,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:.85});
      mat.onBeforeCompile=shader=>{shader.uniforms.riverTime={value:0};mat.userData.shader=shader;shader.vertexShader='uniform float riverTime;varying vec3 riverPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=.035*sin(position.z*2.2+riverTime*1.5)+.02*sin(position.x*4.-riverTime);riverPosition=position;');shader.fragmentShader='uniform float riverTime;varying vec3 riverPosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal=normalize(normal+vec3(.075*sin(riverPosition.z*2.+sin(riverPosition.x*2.7)+riverTime*1.4),.025*cos(riverPosition.x*3.+sin(riverPosition.z*1.3)-riverTime),.04*sin(riverPosition.z*5.+sin(riverPosition.x*1.9)+riverTime)));');};
      const o=mesh(geo,mat,0,.12,0);o.castShadow=false;waterObjects.push(o);
    }
    function tree(x,z,scale=1){
      const y=terrainHeight(x,z);if(cfg.kind==='snow')return;
      forestPlacements.push({x,y,z,size:6+scale*3,rotation:random()*6.28});
    }
    function rocks(){for(let i=0;i<65;i++){
      const z=random()*170-85,x=(random()>.5?1:-1)*(12+random()*56),y=terrainHeight(x,z);
      if(cfg.kind==='snow'){const o=mesh(new T.DodecahedronGeometry(.7+random(),1),snow,x,y-.4,z);o.scale.set(1,.35,.8);}
      else rockPlacements.push({x,y:y-.2,z,size:1+random()*3.7,rotation:random()*6.28});
    }}
    function hut(x,z,scale=1){const g=new T.Group();g.userData.navigationFocus=8*scale;g.position.set(x,terrainHeight(x,z),z);g.scale.setScalar(scale);scene.add(g);const wall=material({color:0xb8ac95,roughness:1,map:earthMap}),tiles=material({color:0x9a9991,roughness:.92});if(typeof WorldArtAssets!=='undefined'){WorldArtAssets.apply(wall,'plaster',2);WorldArtAssets.apply(tiles,'roof',2);}box(5,3.4,4,wall,0,1.7,0,g);[-1,1].forEach(side=>{const roof=box(3.1,.16,5.1,tiles,side*1.35,3.95,0,g);roof.rotation.z=-side*.4;pole(new T.Vector3(side*2.65,3.4,-2.5),new T.Vector3(0,4.55,-2.5),.08,darkWood,g);});pole(new T.Vector3(0,4.55,-2.6),new T.Vector3(0,4.55,2.6),.12,tiles,g);[-2.35,2.35].forEach(a=>box(.14,3.5,.14,darkWood,a,1.75,2.12,g));box(.9,2.1,.08,darkWood,0,1.05,2.05,g);[-1.6,1.6].forEach(a=>{box(.75,.9,.09,material({color:0xd8a255,emissive:0x9d571e,emissiveIntensity:.35}),a,1.9,2.06,g);box(.06,.95,.12,darkWood,a,1.9,2.15,g);box(.8,.06,.12,darkWood,a,1.9,2.15,g);});return g;}
    function boat(x,z){const g=new T.Group();scene.add(g);g.position.set(x,.4,z);mesh(new T.SphereGeometry(1,12,6),darkWood,0,0,0,g).scale.set(1.3,.4,3.8);box(2.2,.1,5.5,wood,0,.15,0,g);pole(new T.Vector3(-2,.3,0),new T.Vector3(2,.8,0),.05,wood,g);return g;}
    function person(x,z){
      const g=new T.Group();scene.add(g);g.position.set(x,terrainHeight(x,z),z);g.rotation.y=-.15;
      const cloth=material({color:0x485047,roughness:1}),skin=material({color:0x776451,roughness:1});
      mesh(new T.CylinderGeometry(.26,.21,.68,10),cloth,0,1.23,0,g).scale.z=.65;
      mesh(new T.SphereGeometry(.18,10,8),skin,0,1.79,0,g).scale.set(.86,1.15,.9);
      mesh(new T.CylinderGeometry(.2,.21,.1,12),cloth,0,1.97,0,g);box(.29,.035,.17,cloth,0,1.94,.13,g);
      [-1,1].forEach(side=>{pole(new T.Vector3(side*.13,.97,0),new T.Vector3(side*.16,.55,side*.09),.09,cloth,g);pole(new T.Vector3(side*.16,.55,side*.09),new T.Vector3(side*.17,.12,side*.15),.075,cloth,g);mesh(new T.SphereGeometry(.13,8,6),darkWood,side*.17,.09,side*.15+.06,g).scale.set(.7,.65,1.5);pole(new T.Vector3(side*.27,1.5,0),new T.Vector3(side*.34,1.15,-.06),.075,cloth,g);pole(new T.Vector3(side*.34,1.15,-.06),new T.Vector3(side*.28,.95,.1),.06,cloth,g);});
      const pack=box(.42,.5,.25,darkWood,0,1.3,-.25,g);pack.rotation.x=.1;people.push(g);return g;
    }
    function flag(x,z){const y=terrainHeight(x,z);pole(new T.Vector3(x,y,z),new T.Vector3(x,y+6,z),.06,wood);const geo=new T.PlaneGeometry(3,1.7,12,6),f=mesh(geo,red,x+1.5,y+4.9,z);f.material.side=T.DoubleSide;flags.push(f);}
    function road(){const points=[];for(let z=-75;z<=75;z+=3){const x=riverX(z)+14+Math.sin(z*.06)*2;points.push(new T.Vector3(x,terrainHeight(x,z)+.07,z));}const curve=new T.CatmullRomCurve3(points);mesh(new T.TubeGeometry(curve,140,.55,7,false),material({color:0x86785e,map:earthMap,roughness:1}));}
    function bridge(){
      // Assault-stage artistic reconstruction: exposed chains, no timber deck.
      // Structural reference: 9 floor chains + 2 handrail chains on each side.
      const iron=material({color:0x4b4944,metalness:.82,roughness:.48});
      const group=new T.Group();group.name='luding-exposed-chains';group.userData.navigationFocus=24;scene.add(group);
      [-15,15].forEach(x=>box(2.2,8,4.2,rock,x,4,0));
      const sag=x=>5.7-1.4*Math.sin((x+15)/30*Math.PI);
      const strands=[];for(let i=0;i<9;i++)strands.push({z:-1.36+i*.34,lift:0,kind:'floor'});
      for(const side of [-1,1])for(const lift of [.85,1.65])strands.push({z:side*1.65,lift,kind:'handrail'});
      const linkGeometry=new T.TorusGeometry(.105,.025,6,12),count=116,dummy=new T.Object3D();
      for(const strand of strands){
        const chain=new T.InstancedMesh(linkGeometry,iron,count);chain.name='luding-'+strand.kind+'-chain';chain.userData.chainRole=strand.kind;chain.castShadow=chain.receiveShadow=true;
        for(let i=0;i<count;i++){
          const x=-15+30*i/(count-1),slope=-1.4*Math.PI/30*Math.cos((x+15)/30*Math.PI),tangent=new T.Vector3(1,slope,0).normalize();
          dummy.position.set(x,sag(x)+strand.lift,strand.z);dummy.quaternion.setFromUnitVectors(new T.Vector3(1,0,0),tangent);
          if(i%2)dummy.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2));
          dummy.scale.set(1.7,.72,1);dummy.updateMatrix();chain.setMatrixAt(i,dummy.matrix);
        }chain.instanceMatrix.needsUpdate=true;chain.computeBoundingSphere();group.add(chain);
      }
    }
    function meeting(){const wall=material({color:0x8b7d68,roughness:1,map:earthMap});box(24,.4,20,wood,0,-.2,0);box(24,10,.4,wall,0,5,-10);box(.4,10,20,wall,-12,5,0);box(.4,10,20,wall,12,5,0);for(let x=-10;x<=10;x+=4){box(.3,.35,20,darkWood,x,9,0);}for(let x=-7;x<=7;x+=7){box(3.3,4,.2,darkWood,x,5.4,-9.7);box(2.8,3.5,.25,material({color:0x68808c,emissive:0x344959,emissiveIntensity:.6}),x,5.4,-9.5);box(.12,4,.3,wood,x,5.4,-9.3);box(3.3,.12,.3,wood,x,5.4,-9.3);}box(11,.35,4,wood,0,3.2,0);[-4.7,4.7].forEach(x=>[-1.4,1.4].forEach(z=>box(.2,3,.2,darkWood,x,1.5,z)));const paper=material({color:0xd9caa5});for(let i=0;i<6;i++){const p=box(1.2,.025,1.7,paper,-4+i*1.5,3.4,(i%2?1:-1)*.6);p.rotation.y=.15*i;}for(let x=-4;x<=4;x+=2.7)[-3,3].forEach(z=>{box(1.1,.2,1.1,wood,x,1.6,z);box(1.1,1.8,.15,darkWood,x,2.5,z+(z>0?.5:-.5));[-.4,.4].forEach(a=>[-.4,.4].forEach(b=>box(.1,1.6,.1,darkWood,x+a,.8,z+b)));});mesh(new T.CylinderGeometry(.3,.5,.2,12),darkWood,0,3.55,0);mesh(new T.CylinderGeometry(.18,.28,.9,12),material({color:0xe2c174,emissive:0xffa332,emissiveIntensity:2,transparent:true,opacity:.7}),0,4,0);const lamp=new T.PointLight(0xffae43,75,30,2);lamp.position.set(0,4.6,0);lamp.castShadow=true;scene.add(lamp);target.set(0,3,0);}
    if(cfg.kind==='meeting')meeting();else{terrain();if(cfg.water)water(cfg.kind==='gorge'?16:19);rocks();if(!['marsh','loess','reunion','snow'].includes(cfg.kind)){for(let i=0;i<85;i++){const x=(random()>.5?1:-1)*(16+random()*47),z=random()*150-75;tree(x,z,.55+random()*1.2);}}if(cfg.kind==='snow'){for(let i=0;i<32;i++)tree((random()>.5?1:-1)*(19+random()*25),random()*130-65,.5+random()*.7);}if(cfg.kind==='marsh'){for(let i=0;i<14;i++){const p=mesh(new T.CircleGeometry(2+random()*5,28),material({color:0x354c47,roughness:.24,metalness:.35}),random()*100-50,.65,random()*120-60);p.rotation.x=-Math.PI/2;p.scale.y=.45+random()*.7;}const bladeGeo=new T.ConeGeometry(.06,.75,3),grass=new T.InstancedMesh(bladeGeo,material({color:0x687a43}),1400),dummy=new T.Object3D();for(let i=0;i<1400;i++){const x=random()*135-67,z=random()*145-72;dummy.position.set(x,terrainHeight(x,z)+.5,z);dummy.rotation.z=(random()-.5)*.5;dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}scene.add(grass);}else road();
    if(['village','valley','reunion','loess'].includes(cfg.kind)){hut(19,-17,1.1);hut(25,-25,.85);hut(21,-34,.7);}if(['gorge','rapids','valley','village'].includes(cfg.kind)){boat(2,-6);boat(-3,8);box(8,.25,2.4,wood,12,.5,-6);for(let z=-7;z<=-5;z+=2)pole(new T.Vector3(8,-.6,z),new T.Vector3(8,1,z),.14,wood);}if(cfg.kind==='bridge')bridge();if(cfg.kind==='pass'){box(1.5,3,7,rock,12,1.5,-10);box(1.5,3,7,rock,-12,1.5,-10);}for(let i=0;i<7;i++)person(14+Math.sin(i)*.8,-1-i*2.5);flag(18,-2);}
    if(cfg.kind==='village'){
      for(let x=-10;x<11;x+=1.4){boat(x,-24);box(1.35,.15,3.2,wood,x,.8,-24);}pole(new T.Vector3(-13,1.7,-26),new T.Vector3(13,1.7,-26),.055,darkWood);
      for(let i=0;i<5;i++)hut(26+(i%2)*7,12+i*10,.8);
    }
    if(cfg.kind==='battle'){
      const sack=material({color:0x837457,map:earthMap,roughness:1});for(let row=0;row<2;row++)for(let i=0;i<12;i++){const o=mesh(new T.SphereGeometry(1,8,6),sack,13+row*.4,terrainHeight(13+row*.4,-15+i*.9)+.4+row*.55,-15+i*.9);o.scale.set(.65,.45,.8);}
      const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d'),gradient=g.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(71,68,61,.55)');gradient.addColorStop(1,'rgba(71,68,61,0)');g.fillStyle=gradient;g.fillRect(0,0,64,64);const tx=new T.CanvasTexture(cv);textures.push(tx);for(let i=0;i<8;i++){const smoke=new T.Sprite(new T.SpriteMaterial({map:tx,transparent:true,opacity:.5,depthWrite:false}));smoke.position.set(-22+i*3,8+i*1.8,-12-i*5);smoke.scale.set(12+i,12+i,1);scene.add(smoke);}
    }
    if(cfg.kind==='loess'){
      const loess=material({color:0xa58a62,map:earthMap,roughness:1});for(let i=0;i<3;i++){const x=-25,z=-9-i*7,y=terrainHeight(x,z);box(4,5,5,loess,x,y+2.5,z);const door=mesh(new T.CircleGeometry(1.2,20),darkWood,x+2.01,y+1.7,z);door.rotation.y=Math.PI/2;}
    }
    if(cfg.kind==='reunion'){
      const wall=material({color:0x988467,map:earthMap});box(11,6,3,wall,18,terrainHeight(18,-35)+3,-35);box(3.3,3.5,3.1,darkWood,18,terrainHeight(18,-35)+1.75,-35);flag(16,-35);flag(21,-35);for(let i=0;i<10;i++)person(13+(i%2)*3,8+Math.floor(i/2)*2);
    }
    if(cfg.kind==='meeting'&&typeof WorldArtAssets!=='undefined'){const walls=new Set();scene.traverse(o=>{if(o.material?.color?.getHex()===0x8b7d68)walls.add(o.material);});walls.forEach(m=>WorldArtAssets.apply(m,'plaster',3));}
    // Scanned props use scenic coordinates; they are not historical landmarks.
    if(typeof WorldModelAssets!=='undefined'){
      const place=(key,x,z,size,rotation=0)=>WorldModelAssets.place(key,scene,{x,y:terrainHeight(x,z),z,size,rotation,alive:()=>alive}).then(o=>{if(o)renderer.shadowMap.needsUpdate=true;}).catch(()=>null);
      if(rockPlacements.length)WorldModelAssets.forest('rock_07',scene,rockPlacements,()=>alive).then(()=>renderer.shadowMap.needsUpdate=true).catch(e=>console.warn('岩石加载失败',e.message));
      if(cfg.kind==='meeting'){place('wooden_crate_01',-9,-6,1.8);place('wooden_crate_01',-9,-3.5,1.4,.2);}
      else if(['village','valley','gorge','rapids','reunion','loess'].includes(cfg.kind)){place('wooden_crate_01',16,-8,1.7,.1);place('wooden_crate_01',18,-7,1.3,.4);}
    }
    if(forestPlacements.length&&typeof WorldModelAssets!=='undefined')WorldModelAssets.forest('tree_small_02',scene,forestPlacements,()=>alive).then(()=>renderer.shadowMap.needsUpdate=true).catch(e=>console.warn('植被加载失败',e.message));
    if(typeof WorldModelAssets!=='undefined'&&['village','valley','gorge','rapids','pass'].includes(cfg.kind)){const plants=[];for(let i=0;i<40;i++){const x=(i%2?1:-1)*(12+random()*16),z=random()*90-45;plants.push({x,y:terrainHeight(x,z),z,size:.7+random()*1.2,rotation:random()*6.28});}WorldModelAssets.forest('fern_02',scene,plants,()=>alive).then(()=>renderer.shadowMap.needsUpdate=true).catch(e=>console.warn('地被加载失败',e.message));}
    const particlesGeo=new T.BufferGeometry(),positions=[];for(let i=0;i<180;i++)positions.push((random()-.5)*120,random()*35,(random()-.5)*120);particlesGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));const particles=new T.Points(particlesGeo,new T.PointsMaterial({color:cfg.kind==='snow'?0xeaf6ff:0xcfc3a3,size:cfg.kind==='snow'?.18:.055,transparent:true,opacity:cfg.kind==='snow'?.75:.3}));scene.add(particles);
    if(options.sites){options.sites.forEach((site,i)=>{const x=site.x*.65,z=site.z*.65,y=terrainHeight(x,z);const marker=mesh(new T.CylinderGeometry(.3,.5,1.2,8),material({color:0xb78c4e,emissive:0x50371b}),x,y+.6,z);marker.userData.site=i;markers.push(marker);const label=document.createElement('button');label.className='world3d-site';label.textContent=site.name;label.onclick=()=>options.onSelect?.(i);view.append(label);marker.userData.label=label;});}
    if(options.sites&&people[0]&&Number.isInteger(options.position)){const site=options.sites[options.position];people[0].position.set(site.x*.65,terrainHeight(site.x*.65,site.z*.65),site.z*.65);}
    scene.userData.czMotion=options.getMotion;const canvas=renderer.domElement;const navigation=WorldNavigation.create({host,canvas,camera,scene,target,radius,theta,phi,minRadius:cfg.kind==='meeting'?1.5:2,maxRadius:240});
    failedCleanup.push(()=>navigation.dispose());
    const resize=()=>{const w=view.clientWidth,h=view.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(typeof RenderBudget!=='undefined')RenderBudget.invalidate(host);}};const ro=new ResizeObserver(resize);ro.observe(view);failedCleanup.push(()=>ro.disconnect());resize();const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&typeof RenderBudget!=='undefined')RenderBudget.invalidate(host);});io.observe(host);failedCleanup.push(()=>io.disconnect());
    let lost=false;const canvasLost=e=>{e.preventDefault();lost=true;host.dataset.sceneReady='error';host.dataset.sceneError='图形上下文暂时丢失；恢复后将重新加载，文字任务仍可继续。';};const canvasRestored=()=>{if(!alive||!host.isConnected)return;this.instances.get(host)?.dispose();this.mount(host,id,options);};canvas.addEventListener('webglcontextlost',canvasLost);canvas.addEventListener('webglcontextrestored',canvasRestored);const unbind=()=>{canvas.removeEventListener('webglcontextlost',canvasLost);canvas.removeEventListener('webglcontextrestored',canvasRestored);};failedCleanup.push(unbind);
    let cinema=null;if(typeof CinemaRenderer!=='undefined')CinemaRenderer.create(renderer,scene,camera,()=>alive).then(p=>cinema=p).catch(e=>console.warn('电影渲染回退',e.message));
    if(typeof RenderBudget!=='undefined'){RenderBudget.register(host,renderer,scene);RenderBudget.demand(host,!economy||!!options.getMotion);}const vector=new T.Vector3();let lastLabels=0;function tick(){if(!alive)return;frame=typeof RenderBudget==='undefined'?requestAnimationFrame(tick):RenderBudget.schedule(host,tick);const now=performance.now();if(lost||!visible||document.hidden||(typeof RenderBudget!=='undefined'&&!RenderBudget.allow(host,now)))return;const began=performance.now(),t=now*.001;navigation.update();flags.forEach(f=>{const p=f.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,.17*Math.sin(p.getX(i)*2-t*2));p.needsUpdate=true;});waterObjects.forEach((w,i)=>{if(w.material.userData.shader)w.material.userData.shader.uniforms.riverTime.value=t;if(i)w.position.z+=.012;else w.position.y=.12+Math.sin(t*.8)*.025;});particles.rotation.y=t*.006;if(cfg.kind==='snow'){const p=particles.geometry.attributes.position;for(let i=0;i<p.count;i++){p.setY(i,(p.getY(i)-.04+35)%35);}p.needsUpdate=true;}
    if(options.getMotion&&people[0]){const motion=options.getMotion(),sites=options.sites;if(motion){const a=sites[motion.from],b=sites[motion.to],f=Math.min(1,(performance.now()-motion.start)/1800),x=(a.x+(b.x-a.x)*f)*.65,z=(a.z+(b.z-a.z)*f)*.65;people[0].position.set(x,terrainHeight(x,z),z);}}
    if(now-lastLabels>=50){lastLabels=now;const labelWidth=view.clientWidth,labelHeight=view.clientHeight,used=[];markers.forEach(m=>{const label=m.userData.label;vector.copy(m.position).add(new T.Vector3(0,3,0)).project(camera);const x=(vector.x*.5+.5)*labelWidth,y=(-vector.y*.5+.5)*labelHeight;const overlap=used.some(p=>Math.abs(p.x-x)<115&&Math.abs(p.y-y)<34);const show=vector.z<1&&vector.z>-1&&x>0&&x<labelWidth&&y>30&&y<labelHeight-45&&!overlap;if(label.hidden!==!show)label.hidden=!show;if(show){label.style.left=x+'px';label.style.top=y+'px';used.push({x,y});}});}if(cinema)cinema.render();else renderer.render(scene,camera);host.dataset.sceneReady='true';if(typeof RenderBudget!=='undefined')RenderBudget.record(host,now,performance.now()-began);}
    failedCleanup.push(()=>{alive=false;if(typeof RenderBudget!=='undefined'){RenderBudget.cancel(frame);RenderBudget.release(host);}else cancelAnimationFrame(frame);cinema?.dispose();});
    tick();const instance={scene,renderer,camera,dispose(){if(!alive)return;alive=false;unbind();if(LongMarch3D.instances.get(host)===instance)LongMarch3D.instances.delete(host);if(typeof RenderBudget!=='undefined')RenderBudget.release(host);navigation.dispose();cinema?.dispose();environment?.dispose();if(typeof RenderBudget==='undefined')cancelAnimationFrame(frame);else RenderBudget.cancel(frame);ro.disconnect();io.disconnect();scene.traverse(o=>{o.geometry?.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.userData.czDisposed=true;m.userData.czOwnTextures?.forEach(t=>t.dispose());m.dispose();});}});textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();host.querySelectorAll('.world3d-site').forEach(x=>x.remove());}};this.instances.set(host,instance);return instance;
    } catch(error) {
      for(const cleanup of failedCleanup.reverse())try{cleanup();}catch{}
      cleanupScene?.traverse(o=>{o.geometry?.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){m.userData.czDisposed=true;m.userData.czOwnTextures?.forEach(t=>t.dispose());m.dispose();}});
      renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();host.querySelectorAll('.world3d-site').forEach(e=>e.remove());
      host.dataset.sceneReady='error';host.dataset.sceneError='沙盘初始化未完成，可重试或继续文字任务。';return null;
    }
  }
};
document.addEventListener('DOMContentLoaded',()=>LongMarch3D.init());
