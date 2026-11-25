(() => {
  'use strict';
  const M = window.CZMarchWorld._;

  function shadeCourtyardMaterial(mat, floorHeight) {
    const stone = mat.name.startsWith('ZY_stone');
    const wall = /^(ZY_brick|ZY_plaster|ZY_bark)/.test(mat.name);
    if (mat.aoMap) mat.aoMapIntensity = .64;
    if (mat.name.startsWith('ZY_trim')) {
      // The archivolt is dark brick with lime joints. Keep the adjacent capitals pale.
      mat.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec3 vArcade;\n' + shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\nvArcade = position;');
        shader.fragmentShader = 'varying vec3 vArcade;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
          #include <color_fragment>
          vec2 rel = vec2(mod(vArcade.x+1.8,3.6)-1.8, mod(vArcade.y-.46,3.57)-1.95);
          float ring = length(rel);
          if (vArcade.z>5.82 && vArcade.z<6.10 && rel.y>0.0 && ring>1.54 && ring<1.74) {
            float joint = smoothstep(.40,.49,abs(fract(atan(rel.y,rel.x)*14.0/3.141593)-.5));
            diffuseColor.rgb *= mix(vec3(.18,.20,.21),vec3(.69),joint);
          }`);
      };
      return;
    }
    if (!stone && !wall && !mat.name.startsWith('ZY_glass')) return;
    mat.onBeforeCompile = shader => {
      shader.uniforms.floorHeight = { value: floorHeight };
      shader.vertexShader = 'varying vec3 vCourtyardPos;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>', '#include <begin_vertex>\nvCourtyardPos = (modelMatrix * vec4(position, 1.0)).xyz;');
      shader.fragmentShader = 'varying vec3 vCourtyardPos;\nuniform float floorHeight;\n' + shader.fragmentShader;
      if (stone || wall) {
        // World-space noise crosses the paving UV seams. Elevated stonework stays matte.
        shader.fragmentShader = `
          float wetHash(vec2 p) {
            vec3 h = fract(vec3(p.xyx) * .1031);
            h += dot(h, h.yzx + 33.33);
            return fract((h.x + h.y) * h.z);
          }
          float wetNoise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f*f*(3.0-2.0*f);
            return mix(mix(wetHash(i), wetHash(i+vec2(1,0)), f.x),
                       mix(wetHash(i+vec2(0,1)), wetHash(i+1.0), f.x), f.y);
          }
        ` + shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
          #include <roughnessmap_fragment>
          vec2 p = vCourtyardPos.xz;
          float paving = 1.0 - smoothstep(.045, .10, abs(vCourtyardPos.y-floorHeight));
          float stainNoise = wetNoise(p*1.65 + vCourtyardPos.yy*.8);
          float grain = wetNoise(p*48.0);
          diffuseColor.rgb *= ${stone ? 'mix(.77,1.14,grain)*mix(.87,1.08,stainNoise)' : 'mix(.92,1.04,wetNoise(vCourtyardPos.xz*15.+vCourtyardPos.yy*1.3))'};

          float baseDamp = 1.0 - smoothstep(.04, .75, max(0.,vCourtyardPos.y-floorHeight));
          float damp = baseDamp * smoothstep(.20, .67, stainNoise) * ${stone ? '(1.0 - paving)' : '1.0'};
          float moss = damp * smoothstep(.61, .84, stainNoise);
          diffuseColor.rgb *= mix(vec3(1.), vec3(.57,.61,.55), damp*.8);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(.69,.91,.54), moss*.56);
          roughnessFactor = ${wall ? 'mix(.85, .95, clamp(roughnessFactor, 0., 1.))' : 'roughnessFactor'};
          diffuseColor.rgb *= 1.0 + .20 * baseDamp * smoothstep(.68, .80, stainNoise);
          float wet = ${stone ? 'paving' : '0.0'} * smoothstep(.43, .71, .72*wetNoise(p*.42)+.28*wetNoise(p*1.37));
          roughnessFactor = mix(roughnessFactor, mix(.42, .25, wet), ${stone ? "paving" : "0.0"});
          diffuseColor.rgb *= mix(vec3(1.), vec3(.63,.68,.73), wet);
        `).replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.indirectSpecular *= mix(1.0, 1.65, wet);');
      } else {
        shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
          #include <emissivemap_fragment>
          totalEmissiveRadiance += vec3(.28,.139,.041) * smoothstep(3.8,4.3,vCourtyardPos.y-floorHeight);
        `);
      }
    };
    mat.customProgramCacheKey = () => stone ? 'zunyi-wet-stone' : wall ? 'zunyi-damp-masonry' : 'zunyi-upper-windows';
  }

  function winterWeather(T, root, settings, onSurface, world, grassTexture) {
    const group = new T.Group();
    group.name = 'zunyi-winter-weather';
    root.add(group);
    const materials = [];
    const make = (geometry, material, Type = T.Mesh) => {
      materials.push({ geometry, material });
      const mesh = new Type(geometry, material);
      mesh.frustumCulled = false;
      group.add(mesh);
      return mesh;
    };
    let seed = 1935;
    const rand = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
    const rainData = new Float32Array(settings.count * 6);
    const seeds = Array.from({ length: settings.count }, () => [rand()*44-22, rand()*14, rand()*44-22, .10+rand()*.24]);
    const rainGeo = new T.BufferGeometry();
    rainGeo.setAttribute('position', new T.BufferAttribute(rainData, 3).setUsage(T.DynamicDrawUsage));
    const rain = make(rainGeo,new T.LineBasicMaterial({ color: '#c7d9df', transparent: true, opacity: .24, depthWrite: false }),T.LineSegments);
    rain.renderOrder=5;
    const fogGeo=new T.BufferGeometry();
    const fogPositions=new Float32Array(settings.mist.length*12), uv=[], indices=[];
    for(let i=0; i<settings.mist.length; i++){
      uv.push(0,0,1,0,1,1,0,1);
      indices.push(i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3);
    }
    fogGeo.setAttribute('position',new T.BufferAttribute(fogPositions,3).setUsage(T.DynamicDrawUsage));
    fogGeo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    fogGeo.setIndex(indices);
    const fog=make(fogGeo,new T.ShaderMaterial({
      side:T.DoubleSide,transparent:true,depthWrite:false,
      vertexShader:'varying vec2 uvMist; void main(){uvMist=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`
        varying vec2 uvMist;
        void main(){
          vec2 p=uvMist*2.-1.;
          float fade=1.-smoothstep(.08,1.,dot(p,p));
          gl_FragColor=vec4(.53,.63,.68,.093*fade*fade);
          #include <colorspace_fragment>
        }`
    }));
    fog.renderOrder=4;
    for(const [x,y,h,power,reach] of settings.lights){
      const light=new T.PointLight('#ffc183',power,reach,2);
      light.position.copy(onSurface(x,y,h));
      group.add(light);
    }
    const grassGeometry = new T.BufferGeometry();
    const grassPositions = [], grassUV = [], grassColors = [], grassIndices = [];
    for (let plane = 0; plane < 2; plane++) {
      const offset = plane * 4;
      for (const [u,v] of [[0,0],[1,0],[1,1],[0,1]]) {
        const side = u - .5, shade = .43 + v * .57;
        grassPositions.push(plane ? 0 : side, v, plane ? side : 0);
        grassUV.push(u,v); grassColors.push(shade,shade,shade);
      }
      grassIndices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
    }
    grassGeometry.setAttribute('position',new T.Float32BufferAttribute(grassPositions,3));
    grassGeometry.setAttribute('uv',new T.Float32BufferAttribute(grassUV,2));
    grassGeometry.setAttribute('color',new T.Float32BufferAttribute(grassColors,3));
    grassGeometry.setIndex(grassIndices);
    const wind = { value: 0 };
    const grassMaterial = new T.MeshBasicMaterial({
      map:grassTexture, vertexColors:true, alphaTest:.45, side:T.DoubleSide
    });
    grassMaterial.onBeforeCompile=shader=>{
      shader.uniforms.grassTime=wind;
      shader.vertexShader='uniform float grassTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`
        #include <begin_vertex>
        vec2 root=instanceMatrix[3].xz;
        transformed.x+=sin(grassTime*1.15+root.x*.9+root.y*.43)*position.y*position.y*.086;`);
    };
    const grass=new T.InstancedMesh(grassGeometry,grassMaterial,84);
    group.add(grass);
    const dummy=new T.Object3D();
    for(let i=0;i<84;i++){
      let x,y,h=0;
      if(i<23){
        x=94.17+rand()*1.16;y=46.85+rand()*1.20;h=.392;
      }else if(i<42){
        if(i%2){x=93.48+rand()*.075;y=46.38+rand()*2.14;}
        else{x=93.67+rand()*2.13;y=48.66+rand()*.11;}
      }else if(i<64){
        x=103.29-rand()*.11;y=20+rand()*43;
      }else{
        x=(i%2?54.17:60.81)+rand()*.09;y=24+rand()*36;
        if(y>40.9&&y<45.0)y+=6;
      }
      dummy.position.copy(onSurface(x,y,h-.007));
      dummy.rotation.y=rand()*Math.PI;
      dummy.scale.set(.21+rand()*.31,.14+rand()*.20,.21+rand()*.31);
      dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
    }
    grass.instanceMatrix.needsUpdate=true;
    return {
      group,
      rain,
      update(t,player,camera){
        wind.value=t;
        for(let i=0;i<seeds.length;i++){
          const [a,b,c,len]=seeds[i];
          const x=player.x+((a+t*.64+22)%44+44)%44-22;
          const z=player.y+c, height=((b-t*6.8)%14+14)%14;
          const inside=settings.shelter.some(([sx,sz,w,d,roof=4])=>height<roof&&x>=sx&&x<=sx+w&&z>=sz&&z<=sz+d);
          const k=i*6, y=height+1, wx=x-world.w/2, wz=z-world.h/2;
          rainData[k]=wx; rainData[k+1]=y; rainData[k+2]=wz;
          const streak=inside?0:len;
          rainData[k+3]=wx-streak*.176; rainData[k+4]=y+streak; rainData[k+5]=wz;
        }
        rainGeo.attributes.position.needsUpdate=true;
        const yaw=Math.atan2(camera.matrixWorld.elements[2],camera.matrixWorld.elements[0]);
        settings.mist.forEach(([x,y,h,w,v],i)=>{
          const cx=x-world.w/2+Math.sin(t*.12+i)*1.05, cz=y-world.h/2+Math.cos(t*.075+i)*.7;
          for(let j=0;j<4;j++){
            const side=j===0||j===3?-1:1;
            fogPositions.set([cx+Math.cos(yaw)*w*.5*side,h+(j<2?0:v),cz+Math.sin(yaw)*w*.5*side],i*12+j*3);
          }
        });
        fogGeo.attributes.position.needsUpdate=true;
      },
      dispose(){
        group.removeFromParent();
        grass.dispose();grassGeometry.dispose();grassMaterial.dispose();
        for(const {geometry,material} of materials){geometry.dispose();material.dispose();}
      }
    };
  }

  function createArms(T, model, worldScene, hemi, sun) {
    const left = model?.getObjectByName('FPS_Arm_Left');
    const right = model?.getObjectByName('FPS_Arm_Right');
    if (!left || !right) return null;
    const scene = new T.Scene();
    const eye = new T.PerspectiveCamera(52, 1, .055, 2);
    const fill = hemi.clone();
    const key = new T.DirectionalLight(sun.color, sun.intensity * .76);
    scene.add(eye, fill, key);
    eye.add(model);
    scene.environment = worldScene.environment;
    scene.environmentIntensity = worldScene.environmentIntensity;
    const arms = [left, right];
    // The GLB points along -Z. Its proximal sleeve continues behind the elbow
    // (z=0); the wrist is at z=-.19. Pose those regions in mesh space so the
    // sprint bend also affects the shadow and the cuff stays joined to the hand.
    const posedMeshes = arms.map(arm => {
      const meshes = [];
      arm.traverse(mesh => {
        if (!mesh.isMesh) return;
        const geometry = mesh.geometry;
        const source = geometry.attributes.position;
        const positions = [], normals = [];
        for (const kind of ['flex', 'wrist']) {
          const dp = [], dn = [];
          for (let i = 0; i < source.count; i++) {
            const y = source.getY(i), z = source.getZ(i);
            const pivot = kind === 'wrist' ? -.19 : z > 0 ? 0 : -.29;
            const angle = kind === 'wrist' ? .20*T.MathUtils.smoothstep(-z,.17,.24)
              : -1.86*T.MathUtils.smoothstep(z,0,.13) - .56*T.MathUtils.smoothstep(-z,.29,.36);
            const c = Math.cos(angle), sn = Math.sin(angle), dz = z-pivot;
            dp.push(0, (c-1)*y-sn*dz, sn*y+(c-1)*dz);
            const n = geometry.attributes.normal, ny=n.getY(i), nz=n.getZ(i);
            dn.push(0,(c-1)*ny-sn*nz,sn*ny+(c-1)*nz);
          }
          positions.push(new T.Float32BufferAttribute(dp,3));
          normals.push(new T.Float32BufferAttribute(dn,3));
        }
        geometry.morphTargetsRelative = true;
        geometry.morphAttributes.position = positions;
        geometry.morphAttributes.normal = normals;
        mesh.updateMorphTargets();
        mesh.frustumCulled = false;
        meshes.push(mesh);
      });
      return meshes;
    });
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let breath=0, walk=0, run=0, tuck=0, flight=0, airborne=false;
    let landing=0, landingVelocity=0, reachTime=1;
    let yawSway=0, pitchSway=0, yawVelocity=0, pitchVelocity=0, lastYaw, lastPitch;
    const wrists=[0,0];
    const aim = new T.Vector3(), ember = new T.PointLight(0xff5922, 0, 3);
    scene.add(ember,key.target);
    key.castShadow = true;
    key.shadow.mapSize.set(256,256);
    Object.assign(key.shadow.camera,{left:-.67,right:.67,top:.67,bottom:-.67,near:.1,far:3});
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.normalBias=.0008;
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const cold=new T.Color(0xc6d8ec), warm=new T.Color(0xffd09e);
    const damp = (value, target, rate, dt) => T.MathUtils.lerp(value, target, 1 - Math.exp(-rate * dt));
    return {
      touch() { reachTime=0; },
      get reaching() { return reachTime < .35; },
      hide() {
        lastYaw=lastPitch=undefined;
        walk=run=flight=landing=landingVelocity=yawSway=pitchSway=yawVelocity=pitchVelocity=0;
        wrists.fill(0); airborne=false; reachTime=1;
      },
      dispose() { key.shadow.dispose(); },
      draw(renderer, camera, player, yaw, pitch, clearance, dt, phase, roomLights) {
        // Stable viewmodel lens on both aspect ratios, independent of world FOV.
        if (eye.aspect !== camera.aspect) {
          eye.aspect = camera.aspect;
          eye.updateProjectionMatrix();
        }
        const motion = reducedMotion.matches ? .35 : 1;
        const fast = player.reversing ? 0 : T.MathUtils.smoothstep(player.speed,4.1,6.4);
        const moving = T.MathUtils.smoothstep(player.speed,.1,1.7);
        run = damp(run, player.airborne ? 0 : fast, 12, dt);
        walk = damp(walk, player.airborne ? 0 : moving*(1-fast), 12, dt);
        tuck = damp(tuck, 1-T.MathUtils.smoothstep(clearance,.30,.65), 13, dt);
        breath += dt*1.35;
        if (airborne && !player.airborne) landingVelocity = -2.4;
        airborne = player.airborne;
        flight = damp(flight, airborne ? 1 : 0, 16, dt);
        const turn = Math.atan2(Math.sin(yaw-(lastYaw ?? yaw)),Math.cos(yaw-(lastYaw ?? yaw)));
        yawVelocity -= T.MathUtils.clamp(turn,-.6,.6)*3.2;
        pitchVelocity += T.MathUtils.clamp(pitch-(lastPitch ?? pitch),-.5,.5)*2.8;
        for (let time=dt; time>0; time-=1/120) {
          const h=Math.min(time,1/120);
          yawVelocity+=(-115*yawSway-14*yawVelocity)*h;
          pitchVelocity+=(-115*pitchSway-14*pitchVelocity)*h;
          landingVelocity+=(-180*landing-13*landingVelocity)*h;
          yawSway+=yawVelocity*h; pitchSway+=pitchVelocity*h; landing+=landingVelocity*h;
        }
        lastYaw=yaw; lastPitch=pitch;
        reachTime=Math.min(.35,reachTime+dt);
        const reach=Math.sin(Math.PI*reachTime/.35)**2;
        const narrow=Math.min(1,eye.aspect/.85);
        const stride=player.reversing ? .65 : .95+.05*T.MathUtils.smoothstep(player.speed,1.8,4);
        const wave=Math.sin(phase);
        for (let i=0;i<2;i++) {
          const side=i*2-1, step=-side*wave;
          const crest=T.MathUtils.smoothstep(step,-.20,1)*walk*stride;
          const contact=i===1 ? reach : 0;
          const lift=flight*(.77+.43*Math.cos(Math.PI*player.jumpProgress)+.64*player.jumpProgress**4);
          // Idle hangs from the elbow. At a forward step only the cuff and
          // knuckles clear the bottom edge. Sprint rotates about the elbow.
          let angle=-1.27+1.09*crest;
          let y=-.425+.275*crest, z=-.09-.14*crest;
          angle=T.MathUtils.lerp(angle,-.08+.32*step*motion,run);
          y=T.MathUtils.lerp(y,-.245+.052*step*motion,run);
          z=T.MathUtils.lerp(z,-.16-.055*step*motion,run);
          const spread=(.27+.035*flight-.042*crest-run*(.045+.036*step))*narrow;
          angle=T.MathUtils.lerp(angle,.04,contact);
          y=T.MathUtils.lerp(y,-.20,contact); z=T.MathUtils.lerp(z,-.255,contact);
          const arm=arms[i];
          arm.position.set(side*(spread-.07*narrow*contact)+yawSway*.10*motion,
            y+motion*(lift*.27+landing+.0015*Math.sin(breath)+pitchSway*.13)+.018*pitch-tuck*.045,
            z-.14*lift+tuck*.035);
          arm.rotation.set(angle+1.04*lift+landing*1.3+.08*pitch,
            side*(.065+.17*run*step+.23*contact)-yawSway*.55*motion,
            side*(.06+.19*run*step+.12*flight)+yawSway*.3*motion);
          wrists[i]=damp(wrists[i],-step*run+pitchSway,9,dt);
          for (const mesh of posedMeshes[i]) {
            mesh.morphTargetInfluences[0]=run;
            mesh.morphTargetInfluences[1]=wrists[i];
          }
        }
        // Keep the stage's fill and sunlight direction in camera-local space.
        fill.position.copy(hemi.position).transformDirection(camera.matrixWorldInverse);
        key.position.copy(sun.position).sub(sun.target.position).transformDirection(camera.matrixWorldInverse);
        scene.environment=worldScene.environment;
        scene.environmentIntensity=roomLights?.visible ? .30 : .56;
        const inside=!!roomLights?.visible;
        fill.color.copy(cold);
        fill.groundColor.set(inside ? 0x35251e : 0x515651);
        fill.intensity=inside ? 1.17 : 1.22;
        key.color.copy(inside ? warm : cold);key.intensity=inside ? 1.85 : 1.9;
        if(inside){
          aim.copy(roomLights.children[1].position).sub(camera.position).transformDirection(camera.matrixWorldInverse);
          key.position.copy(aim);
          ember.position.copy(roomLights.children[2].position).applyMatrix4(camera.matrixWorldInverse);
        }
        ember.intensity=inside ? .60 : 0;
        key.target.position.set(0,-.13,-.33);key.position.add(key.target.position);
        const autoClear = renderer.autoClear;
        // Refresh the small hand shadow without invalidating the courtyard shadow cache.
        const updateShadows=renderer.shadowMap.needsUpdate;
        renderer.shadowMap.needsUpdate=true;
        renderer.autoClear = false;
        try {
          renderer.clearDepth();
          renderer.render(scene, eye);
        } finally {
          renderer.autoClear = autoClear;
          renderer.shadowMap.needsUpdate=updateShadows;
        }
        if (reachTime < .35) return 'interact';
        if (airborne) return 'jump';
        if (Math.abs(landingVelocity)>.12 || Math.abs(landing)>.012) return 'land';
        if (run>.5) return 'run';
        return walk>.28 ? 'walk' : 'idle';
      }
    };
  }

  async function create(container, logicalScene, options = {}) {
    const T = await import('three');
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const environment = M.visual3d.environment(logicalScene);
    const snowy = environment.terrain === 'snow';
    const staging = M.visual3d.staging(logicalScene);
    const assets = await M.assets3d.load(T, options.signal, logicalScene.streetModel, logicalScene.sceneId === 'chapter-3/scene-zunyi');
    const cinematic = logicalScene.sceneId === 'chapter-3/scene-zunyi';
    let reflectionTarget = null, roomReflection = null;
    let winterSky = null, winterGrass = null;
    let renderer = null, worldRoot = null, disposeView = null;
    const materials = new Map();
    function releaseResources(root = worldRoot, fullScene = true) {
      const geometries = new Set(), mats = new Set(), textures = new Set(), images = new Set();
      if (fullScene) {
        reflectionTarget?.dispose(); roomReflection?.dispose();
        winterSky?.dispose();
        winterGrass?.dispose();
        assets?.collect(geometries, mats, textures);
        for (const mat of materials.values()) mats.add(mat);
      }
      root?.traverse(object => {
        if (object.isInstancedMesh) object.dispose();
        if (object.geometry) geometries.add(object.geometry);
        for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!mat) continue;
          mats.add(mat);
          for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
        }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const mat of mats) mat.dispose();
      for (const texture of textures) { texture.dispose(); if (texture.image?.close) images.add(texture.image); }
      for (const image of images) image.close();
    }
    try {
    options.signal?.throwIfAborted();
    renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    const canvas = renderer.domElement;
    canvas.className = 'czmw-canvas czmw-canvas3d';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', logicalScene.title + ' · 实时三维可行走场景');
    container.append(canvas);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = staging.exposure;
    const mobile = navigator.maxTouchPoints > 0 || innerWidth < 760;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;

    const scene = new T.Scene();
    scene.background = new T.Color(staging.sky);
    scene.fog = cinematic ? new T.FogExp2(staging.fog, .011) : new T.Fog(staging.fog, environment.fogNear, environment.fogFar);
    const camera = new T.PerspectiveCamera(52, 1, 0.1, 650);
    worldRoot = new T.Group();
    scene.add(worldRoot);
    const cam = { viewW: 0, viewH: 0, zoom: 12.5 };
    const stats = { frames: 0, renderMs: 0, dpr: 1, adaptive: false, backend: 'three', cameraMode: 'tps', propsReady: false, unsupportedProps: [], environment: environment.terrain };
    const world = logicalScene.world;
    const toWorld = (x, y, height = 0) => new T.Vector3(x - world.w / 2, height, y - world.h / 2);
    const props = logicalScene.props.map(alignedProp);
    const terrain = M.visual3d.terrain(logicalScene, props);
    const steps = logicalScene.stepSurfaces;
    let isIndoors = false;
    const roomOffset = cinematic ? new T.Vector3(...logicalScene.streetModel.roomOffset) : null;
    const roomX = cinematic ? logicalScene.streetModel.origin[0] + roomOffset.x : 0;
    const roomZ = cinematic ? logicalScene.streetModel.origin[1] + roomOffset.z : 0;
    const roomFloor = () => street.position.y + roomOffset.y;
    const surfaceHeight = (x, y) => {
      if (cinematic && isIndoors) return roomFloor();
      const base = terrain.support(x, y);
      if (!steps || !assets.models.street) return base;
      // A narrow approach band lets the stance rise before the leading foot reaches each nosing.
      let rise = .009;
      for (const [sx, sy, w, h, z] of steps) {
        const edge = Math.max(sx - x, x - sx - w, sy - y, y - sy - h);
        if (edge <= .16) rise = Math.max(rise, z * (1 - T.MathUtils.smoothstep(edge, 0, .16)));
      }
      return base + .04 + rise;
    };
    const onSurface = (x, y, offset = 0) => toWorld(x, y, surfaceHeight(x, y) + offset);
    const pickSurfaces = [];
    const street = assets.models.street;
    const mergeGeometries = street ? (await import('three/addons/utils/BufferGeometryUtils.js')).mergeGeometries : null;
    if (street) {
      const [x, y] = logicalScene.streetModel.origin;
      street.position.copy(toWorld(x, y, terrain.support(x, y) + .04));
      street.name = 'zunyi-realscan';
      if (cinematic && logicalScene.winterRain?.sky) {
        const load = new T.TextureLoader();
        const textures = await Promise.allSettled([
          load.loadAsync(logicalScene.winterRain.sky),
          load.loadAsync(logicalScene.winterRain.grass)
        ]);
        [winterSky,winterGrass] = textures.map(t => t.status==='fulfilled' ? t.value : null);
        if (options.signal?.aborted || !winterSky || !winterGrass) {
          winterSky?.dispose(); winterGrass?.dispose();
          throw textures.find(t=>t.status==='rejected')?.reason ?? new DOMException('Aborted','AbortError');
        }
        winterSky.colorSpace = winterGrass.colorSpace = T.SRGBColorSpace;
        winterSky.mapping = T.EquirectangularReflectionMapping;
        scene.background = winterSky;
        scene.backgroundIntensity = .93;
        scene.fog.color.set('#899399');
        const generator = new T.PMREMGenerator(renderer);
        try { reflectionTarget = generator.fromEquirectangular(winterSky); }
        finally { generator.dispose(); }
        scene.environment = reflectionTarget.texture;
        scene.environmentIntensity = .98;
      }
      street.traverse(node => {
        if (!node.isMesh) return;
        node.receiveShadow = true;
        if (cinematic) {
          if (node.material.name.startsWith('ZY_amber')) {
            node.material.emissiveIntensity = .035;
            node.material.color.set('#647172');
            node.material.roughness = .26;
          }
          const foliage = /^(ZY_twig|ZY_crown)/.test(node.material.name);
          node.castShadow = !foliage && !node.material.vertexColors && !node.material.name.startsWith('WestPane_');
          if (node.material.name.startsWith('WestPane_')) node.material.depthWrite = false;
          if (foliage) {
            node.material.alphaTest = .45;
            node.material.side = T.DoubleSide;
          }
          shadeCourtyardMaterial(node.material, street.position.y);
        }
      });
      worldRoot.add(street);
      renderer.shadowMap.enabled = cinematic;
    }
    stats.landform = staging.name;
    stats.terrainVertices = terrain.heights.length;
    stats.terrainMin = Math.min(...terrain.heights);
    stats.terrainMax = Math.max(...terrain.heights);
    const markers = new Map();
    const waters = [], flags = [], smokeColumns = [], fires = [];
    const guideLine = new T.Line(new T.BufferGeometry(), new T.LineDashedMaterial({ color: '#f4db98', dashSize: .7, gapSize: .4, toneMapped: false }));
    guideLine.name = 'march-guide-route';
    guideLine.visible = false;
    guideLine.frustumCulled = false;
    worldRoot.add(guideLine);
    let guideRoute = null;
    let actors = null, streetLife;
    let dead = false;
    let raf = 0;
    let last = 0;
    let slow = 0;
    let dprCap = mobile ? 1.15 : 1.6;
    const FOCUS_HEIGHT = 1.52, HEAD_POINT_HEIGHT = 1.92, MIN_TPS_DIST = .5, WALL_MARGIN = .27;
    const EYE_HEIGHT = 1.65;
    const PITCH_LIMITS = { tps: [-.35, .75], fps: [-1.05, 1.15] };
    let cameraMode = 'tps', pitchGoal = null;
    const clampPitch = value => T.MathUtils.clamp(value, ...PITCH_LIMITS[cameraMode]);
    const BASE_DISTANCE = 4.2, SHOULDER = .35, SPRINT_OFFSET = .8;
    let yaw = 0, pitch = .22, boom = BASE_DISTANCE;
    let viewYaw = 0, followingRoute = false;
    let freeLookActive = false, freeLookYawOffset = 0, lockedBodyYaw = 0;
    const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
    const isOrbiting = () => freeLookActive || freeLookYawOffset !== 0;
    function setFreeLook(active) {
      if (intro || cameraMode === 'fps' || freeLookActive === active) return;
      freeLookActive = active;
      if (active) {
        if (!freeLookYawOffset) lockedBodyYaw = logicalScene.focusActor?.facing ?? yaw;
        followingRoute = false;
      }
    }
    let intro = null;
    let introOverlay = null;
    let followTarget = onSurface(logicalScene.spawn.x, logicalScene.spawn.y, FOCUS_HEIGHT);
    let graphicsLost = false;

    function material(color, roughness = 0.9, metalness = 0) {
      const key = `${color}:${roughness}:${metalness}`;
      if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness, metalness }));
      return materials.get(key);
    }

    function surface(key, tint = '#ffffff', meters = 2, strength = .7) {
      if (!assets) return material(tint);
      const cacheKey = `pbr:${key}:${tint}:${meters}:${strength}`;
      if (!materials.has(cacheKey)) {
        const maps = assets.textures[key];
        const mat = new T.MeshStandardMaterial({ color: tint, map: maps.diffuse, normalMap: maps.normal, roughnessMap: maps.roughness, roughness: 1, normalScale: new T.Vector2(strength, strength) });
        mat.userData.meters = meters;
        materials.set(cacheKey, mat);
      }
      return materials.get(cacheKey);
    }

    function snowSurface() {
      if (!materials.has('snow')) {
        const mat = new T.MeshStandardMaterial({ color: environment.groundTint, normalMap: assets.textures.earth.normal, normalScale: new T.Vector2(.16, .16), roughness: .94 });
        mat.userData.meters = 2;
        materials.set('snow', mat);
      }
      return materials.get('snow');
    }

    function mesh(geometry, mat, x = 0, y = 0, z = 0, parent = worldRoot) {
      if (mat.userData.meters && geometry.attributes.normal) {
        const positions = geometry.attributes.position, normals = geometry.attributes.normal;
        const uv = new Float32Array(positions.count * 2), scale = mat.userData.meters;
        for (let i = 0; i < positions.count; i++) {
          const nx = Math.abs(normals.getX(i)), ny = Math.abs(normals.getY(i)), nz = Math.abs(normals.getZ(i));
          uv[i * 2] = (nx > nz && nx > ny ? positions.getZ(i) : positions.getX(i)) / scale;
          uv[i * 2 + 1] = (ny > nx && ny > nz ? positions.getZ(i) : positions.getY(i)) / scale;
        }
        geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
      }
      const object = new T.Mesh(geometry, mat);
      object.position.set(x, y, z);
      object.castShadow = true;
      object.receiveShadow = true;
      parent.add(object);
      return object;
    }

    function groundTexture() {
      const cv = document.createElement('canvas');
      cv.width = 1536;
      cv.height = Math.max(512, Math.round(cv.width * world.h / world.w));
      const ctx = cv.getContext('2d');
      const sx = cv.width / world.w;
      const sy = cv.height / world.h;
      ctx.fillStyle = logicalScene.palette.ground;
      ctx.fillRect(0, 0, cv.width, cv.height);
      let seed = logicalScene.seed || 1;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let i = 0; i < 22000; i++) {
        const light = random() > 0.48;
        ctx.fillStyle = light ? 'rgba(244,234,194,.055)' : 'rgba(33,40,26,.045)';
        const size = 0.5 + random() * 2.2;
        ctx.fillRect(random() * cv.width, random() * cv.height, size, size);
      }
      for (const patch of logicalScene.terrain?.patches || []) {
        ctx.save();
        ctx.globalAlpha = patch.alpha ?? 0.5;
        ctx.fillStyle = patch.color;
        ctx.beginPath();
        ctx.ellipse(patch.x * sx, patch.y * sy, patch.rx * sx, patch.ry * sy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const road of logicalScene.terrain?.roads || []) {
        for (const [color, extra] of [[logicalScene.palette.roadEdge, 1.1], [logicalScene.palette.road, 0]]) {
          ctx.strokeStyle = color;
          ctx.lineWidth = (road.w + extra) * sx;
          ctx.beginPath();
          road.pts.forEach(([x, y], index) => index ? ctx.lineTo(x * sx, y * sy) : ctx.moveTo(x * sx, y * sy));
          ctx.stroke();
        }
      }
      for (const water of [...(logicalScene.terrain?.waters || []), ...terrain.crossings.map(b => ({ pts: [[b.x - b.w / 2, b.min], [b.x + b.w / 2, b.min], [b.x + b.w / 2, b.max], [b.x - b.w / 2, b.max]] }))]) {
        ctx.fillStyle = logicalScene.palette.waterDeep;
        ctx.beginPath();
        water.pts.forEach(([x, y], index) => index ? ctx.lineTo(x * sx, y * sy) : ctx.moveTo(x * sx, y * sy));
        ctx.closePath();
        ctx.fill();
      }
      const texture = new T.CanvasTexture(cv);
      texture.colorSpace = T.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return texture;
    }

    if (assets) for (const maps of Object.values(assets.textures)) for (const texture of Object.values(maps)) texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    function terrainPatch(width, depth, x, y, cols, rows, offset = 0) {
      const positions = [], uv = [], indices = [];
      for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) {
        const px = x - width / 2 + col * width / cols, py = y - depth / 2 + row * depth / rows;
        positions.push(px - world.w / 2, terrain.height(px, py) + offset, py - world.h / 2);
        uv.push(col / cols, 1 - row / rows);
      }
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const a = row * (cols + 1) + col, c = a + cols + 1;
        indices.push(a, c, a + 1, a + 1, c, c + 1);
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geometry.setIndex(indices); geometry.computeVertexNormals();
      return geometry;
    }
    // Use the scanned forest floor as a single continuous substrate. Grassy
    // edges, worn tracks and contact shadows share its material and draw call.
    function zunyiGroundColors(geometry) {
      const positions = geometry.attributes.position;
      const colors = [];
      const clay = new T.Color('#c1b19c'), gravel = new T.Color('#9e9a8c');
      const grass = new T.Color('#8caa73'), shade = new T.Color();
      const footprints = logicalScene.streetBlocked.flatMap(({rect}) => rect ? [rect] : []);
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i) + world.w / 2, y = positions.getZ(i) + world.h / 2;
        const roadY = 58 - Math.max(0, x - 40) * .05;
        const pattern = Math.sin(x * .53 + Math.sin(y * .42)) * Math.cos(y * .35 + x * .12);
        const distance = Math.abs(y - roadY);
        shade.copy(clay).lerp(gravel, .32 + .24 * pattern + .26 * Math.exp(-distance * .19));
        shade.lerp(grass, T.MathUtils.clamp((distance - 6) / 27 + .22 * pattern, 0, .86));
        const yardTrail = Math.min(
          Math.abs(x - 61.5 - Math.sin(y * .22)) * .76 + Math.max(0,y-44,13-y),
          Math.abs(y - 74 - Math.sin(x * .19)) + Math.max(0,36-x,x-136)
        );
        if (yardTrail < 3) shade.lerp(gravel, .64 * (1 - yardTrail / 3));
        let contact = 0;
        for (const [left, top, width, depth] of footprints) {
          const d = Math.hypot(Math.max(left - x, x - left - width, 0), Math.max(top - y, y - top - depth, 0));
          contact = Math.max(contact, 1 - Math.min(1, d / 1.4));
        }
        shade.multiplyScalar(1 - .24 * contact);
        colors.push(shade.r, shade.g, shade.b);
      }
      geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    }
    const ground = mesh(
      terrainPatch(world.w, world.h, world.w / 2, world.h / 2, terrain.cols, terrain.rows),
      snowy ? snowSurface() : assets ? (street ? surface('earth', '#e4dad0', 2.2, .72) : surface('earth', environment.groundTint, 3, .8)) : new T.MeshStandardMaterial({ map: groundTexture(), roughness: 0.98, metalness: 0 })
    );
    ground.name = 'march-pbr-ground';
    const compoundPaving = Boolean(street && logicalScene.strictPlayable);
    // Keep the invisible plane available to picking so clicks outside can clamp.
    ground.visible = !compoundPaving;
    if (street && !compoundPaving) {
      ground.material.vertexColors = true;
      zunyiGroundColors(ground.geometry);
    }
    ground.castShadow = false;
    pickSurfaces.push(ground);
    if (assets && !compoundPaving) {
      const divisor = street ? 6 : 3;
      const geometry = terrainPatch(world.w * 3, world.h * 3, world.w / 2, world.h / 2,
        Math.ceil(terrain.cols / divisor) * 3, Math.ceil(terrain.rows / divisor) * 3);
      const positions = geometry.attributes.position, indices = [];
      for (let i = 0; i < geometry.index.count; i += 3) {
        const triangle = [geometry.index.getX(i), geometry.index.getX(i + 1), geometry.index.getX(i + 2)];
        const x = triangle.reduce((sum, vertex) => sum + positions.getX(vertex), 0) / 3;
        const z = triangle.reduce((sum, vertex) => sum + positions.getZ(vertex), 0) / 3;
        if (Math.abs(x) > world.w / 2 || Math.abs(z) > world.h / 2) indices.push(...triangle);
      }
      geometry.setIndex(indices);
      if (street) {
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i), z = positions.getZ(i);
          const outside = Math.max(Math.abs(x) - world.w / 2, Math.abs(z) - world.h / 2);
          const shoulder = T.MathUtils.smoothstep(outside, 8, 40);
          const rise = 2.2 + 1.1 * Math.sin(x * .062) + .7 * Math.cos(z * .09);
          positions.setY(i, positions.getY(i) + shoulder * rise);
        }
        geometry.computeVertexNormals();
        zunyiGroundColors(geometry);
      }
      const outskirts = mesh(geometry, ground.material);
      outskirts.name = 'march-terrain-outskirts';
      outskirts.castShadow = false;
    }

    const featherCanvas = document.createElement('canvas');
    featherCanvas.width = featherCanvas.height = 128;
    const featherContext = featherCanvas.getContext('2d');
    const gradient = featherContext.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.65, '#bbbbbb'); gradient.addColorStop(1, '#000000');
    featherContext.fillStyle = gradient;
    featherContext.fillRect(0, 0, 128, 128);
    const feather = new T.CanvasTexture(featherCanvas);
    feather.channel = 1;
    for (const patch of (logicalScene.terrain?.patches || []).slice(street ? 2 : 0)) {
      const left = Math.max(0, Math.floor((patch.x - patch.rx) / terrain.dx)), right = Math.min(terrain.cols, Math.ceil((patch.x + patch.rx) / terrain.dx));
      const top = Math.max(0, Math.floor((patch.y - patch.ry) / terrain.dy)), bottom = Math.min(terrain.rows, Math.ceil((patch.y + patch.ry) / terrain.dy));
      const geometry = terrainPatch((right - left) * terrain.dx, (bottom - top) * terrain.dy, (left + right) * terrain.dx / 2, (top + bottom) * terrain.dy / 2, right - left, bottom - top, .018);
      geometry.setAttribute('uv1', geometry.attributes.uv.clone());
      const mat = (snowy ? snowSurface() : surface('earth', patch.color, 2.8, .45)).clone();
      if (snowy) mat.color.set('#c7d3da');
      mat.alphaMap = feather; mat.transparent = true; mat.depthWrite = false;
      mat.opacity = snowy ? .32 : patch.alpha ?? .5;
      const object = mesh(geometry, mat);
      object.name = 'march-ground-patch';
      object.castShadow = false;
    }

    function polygonObject(points, mat, height) {
      const contour = points.map(([x, y]) => new T.Vector2(x - world.w / 2, y - world.h / 2));
      const triangles = T.ShapeUtils.triangulateShape(contour, []);
      const positions = [];
      for (const point of contour) positions.push(point.x, height, point.y);
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.setIndex(triangles.flat());
      geometry.computeVertexNormals();
      return mesh(geometry, mat);
    }

    for (const water of [...(logicalScene.terrain?.waters || []), ...terrain.crossings.map(b => ({ pts: [[b.x - b.w / 2, b.min], [b.x + b.w / 2, b.min], [b.x + b.w / 2, b.max], [b.x - b.w / 2, b.max]] }))]) {
      const mat = new T.MeshPhysicalMaterial({
        color: logicalScene.palette.water,
        roughness: 0.2,
        metalness: 0.05,
        clearcoat: 0.8,
        clearcoatRoughness: 0.16,
        transparent: true,
        opacity: 0.92,
        side: T.DoubleSide
      });
      const flow = { value: 0 };
      mat.userData.flow = flow;
      mat.onBeforeCompile = shader => {
        shader.uniforms.marchFlow = flow;
        shader.vertexShader = 'varying vec2 vMarchWater;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMarchWater = position.xz;');
        shader.fragmentShader = 'varying vec2 vMarchWater;\nuniform float marchFlow;\n' + shader.fragmentShader.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
          vec2 p = vMarchWater;
          vec3 ripple = vec3(.10 * sin(p.x * 2.1 + p.y * .7 - marchFlow * 1.9) + .035 * sin(p.y * 6.1 - marchFlow * 3.0), 0.0, .08 * cos(p.y * 2.7 - p.x * .5 - marchFlow * 1.4));
          normal = normalize(normal + mat3(viewMatrix) * ripple);`);
      };
      const object = polygonObject(water.pts, mat, terrain.waterLevel);
      object.name = 'march-river-water';
      object.castShadow = false;
      waters.push(object);
    }

    const roadEdge = assets ? (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 256;
      const ctx = canvas.getContext('2d'), image = ctx.createImageData(64, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
        const noise = Math.sin(y * .13) * 1.7 + Math.cos(y * .31 + x * .27) * 1.4;
        const shade = Math.max(0, Math.min(1, (Math.min(x, 63 - x) - 2 - noise) / 9));
        const offset = (y * 64 + x) * 4;
        image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = shade * 255;
        image.data[offset + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      const texture = new T.CanvasTexture(canvas);
      texture.wrapT = T.RepeatWrapping;
      texture.channel = 1;
      return texture;
    })() : null;

    function roadRibbon(road) {
      const geometry = ground.geometry.clone(), positions = geometry.attributes.position;
      const edgeUV = [], distances = [], indices = [];
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i) + world.w / 2, y = positions.getZ(i) + world.h / 2;
        let nearest = Infinity, along = 0, signed = 0, travelled = 0;
        for (let j = 1; j < road.pts.length; j++) {
          const a = road.pts[j - 1], b = road.pts[j], dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
          const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (length * length)));
          const px = x - a[0] - dx * t, py = y - a[1] - dy * t, distance = Math.hypot(px, py);
          if (distance < nearest) { nearest = distance; along = travelled + length * t; signed = distance * (dx * py - dy * px < 0 ? -1 : 1); }
          travelled += length;
        }
        distances.push(nearest);
        edgeUV.push(Math.max(0, Math.min(1, .5 + signed / road.w)), along / 6);
        positions.setY(i, positions.getY(i) + .03);
      }
      for (let i = 0; i < ground.geometry.index.count; i += 3) {
        const a = ground.geometry.index.getX(i), b = ground.geometry.index.getX(i + 1), c = ground.geometry.index.getX(i + 2);
        if (Math.min(distances[a], distances[b], distances[c]) <= road.w * .6) indices.push(a, b, c);
      }
      geometry.setIndex(indices);
      const roadMaterial = snowy ? snowSurface().clone() : assets ? surface('earth', '#c1b49a', 2.3, .22) : new T.MeshStandardMaterial({ color: logicalScene.palette.road, roughness: 1 });
      if (snowy) roadMaterial.color.set('#b4c4cc');
      roadMaterial.side = T.DoubleSide;
      if (roadEdge) {
        geometry.setAttribute('uv1', new T.Float32BufferAttribute(edgeUV, 2));
        roadMaterial.alphaMap = roadEdge;
        roadMaterial.transparent = true;
        roadMaterial.depthWrite = false;
      }
      const object = mesh(geometry, roadMaterial);
      object.castShadow = false;
    }
    for (const road of (logicalScene.terrain?.roads || []).slice(street ? 1 : 0)) roadRibbon(road);

    function groupAt(prop, height = 0) {
      const group = new T.Group();
      group.name = `march-prop-${prop.type || 'decoration'}-${prop.seed || 1}`;
      group.position.copy(toWorld(prop.x, prop.y, terrain.height(prop.x, prop.y) + height));
      worldRoot.add(group);
      return group;
    }

    function house(prop, wooden = false) {
      const group = groupAt(prop);
      const width = prop.w || 10, depth = prop.depth || width * .68;
      const chapter = Number(logicalScene.chapterId), seed = prop.seed || 1;
      const meeting = chapter === 3 && wooden && seed === 4;
      const barracks = chapter === 7 && prop.x < (logicalScene.ironBridge?.x0 ?? 62);
      const loess = chapter === 11 || chapter === 12;
      const wall = surface('plaster', loess ? '#b7a080' : '#c3bcaa', 2.5, .6);
      const earth = surface('earth', loess ? '#ae9067' : '#9b8564', 2, .55);
      const roof = surface('roof', loess ? '#8c8270' : '#777c7c', 2.6, .85);
      const wood = surface('wood', '#76614d', 1.8);
      const boards = surface('wood', '#aa9272', 1.8, .65);
      const stone = surface('rock', '#8a8375', 1.6, .65);
      const dark = material('#262a26');
      const parts = new Map(), cube = new T.BoxGeometry(1, 1, 1);
      const transform = new T.Object3D(), point = new T.Vector3();
      const vertices = mat => {
        if (!parts.has(mat)) parts.set(mat, []);
        return parts.get(mat);
      };
      function triangle(mat, a, b, c) { vertices(mat).push(...a, ...b, ...c); }
      function quad(mat, a, b, c, d) { triangle(mat, a, b, c); triangle(mat, a, c, d); }
      function solid(w, h, d, mat, x = 0, y = h / 2, z = 0, tilt = 0) {
        transform.position.set(x, y, z); transform.rotation.set(tilt, 0, 0); transform.scale.set(w, h, d); transform.updateMatrix();
        const out = vertices(mat);
        for (const index of cube.index.array) {
          point.fromBufferAttribute(cube.attributes.position, index).applyMatrix4(transform.matrix);
          out.push(point.x, point.y, point.z);
        }
      }
      function room(x, z, w, d, bottom, top, mat = wall) {
        solid(w, top - bottom, d, mat, x, (bottom + top) / 2, z);
      }
      function pitched(x, z, w, d, height, rise, overhang = .18, wear = 0, gable = wall) {
        const count = wear ? Math.ceil(w / 1.1) : 1, half = d / 2;
        const down = p => [p[0], p[1] - .12, p[2]];
        const section = i => {
          const px = x - w / 2 - overhang + (w + 2 * overhang) * i / count;
          return [-half - overhang, -half, 0, half, half + overhang].map((pz, j) => {
            const edge = j === 0 || j === 4;
            const uneven = edge ? wear * Math.sin(seed * 2.3 + i * 1.7 + j) : 0;
            const py = j === 2 ? rise : edge ? -overhang * rise / half * .55 + uneven : 0;
            return [px, height + .12 + py, z + pz + (edge ? uneven * .5 : 0)];
          });
        };
        for (let i = 0; i < count; i++) {
          const a = section(i), b = section(i + 1);
          for (let j = 0; j < 4; j++) {
            quad(roof, a[j], a[j + 1], b[j + 1], b[j]);
            quad(wood, down(b[j]), down(b[j + 1]), down(a[j + 1]), down(a[j]));
            if (!i) quad(roof, a[j], down(a[j]), down(a[j + 1]), a[j + 1]);
            if (i === count - 1) quad(roof, b[j], b[j + 1], down(b[j + 1]), down(b[j]));
          }
          quad(roof, b[0], down(b[0]), down(a[0]), a[0]);
          quad(roof, a[4], down(a[4]), down(b[4]), b[4]);
        }
        for (const side of [-1, 1]) {
          const gx = x + side * w / 2;
          triangle(gable, [gx, height, z - side * half], [gx, height + rise, z], [gx, height, z + side * half]);
        }
        solid(w + overhang * 2, .16, .22, roof, x, height + rise + .17, z);
      }
      function canopy(x, w, back, front, high, low) {
        solid(w, .13, Math.hypot(front - back, high - low), roof, x, (high + low) / 2, (front + back) / 2, Math.atan2(high - low, front - back));
      }
      function door(x, bottom, z, w = 1.4, h = 2.05) {
        solid(w + .22, h + .18, .1, wood, x, bottom + h / 2, z + .055);
        solid(w, h, .035, dark, x, bottom + h / 2, z + .115);
        for (const side of [-1, 1]) {
          solid(w / 2 - .035, h - .06, .055, boards, x + side * w / 4, bottom + h / 2, z + .145);
          for (const y of [.24, h - .28]) solid(w / 2 - .1, .09, .04, wood, x + side * w / 4, bottom + y, z + .18);
        }
      }
      function windowBay(x, y, z, w = 1.1, h = 1, lattice = false, facing = 1) {
        solid(w + .16, h + .16, .09, wood, x, y, z + facing * .05);
        solid(w, h, .035, dark, x, y, z + facing * .11);
        if (lattice) {
          for (const dx of [-.3, 0, .3]) solid(.065, h, .045, wood, x + dx * w, y, z + facing * .145);
          solid(w, .065, .045, wood, x, y, z + facing * .145);
        } else {
          for (const side of [-1, 1]) solid(w / 2 - .035, h - .05, .045, boards, x + side * w / 4, y, z + facing * .145);
          for (const dy of [-.28, .28]) solid(w, .075, .035, wood, x, y + dy * h, z + facing * .18);
        }
      }
      function frame(x, z, w, bottom, top, bays = 3) {
        for (let i = 0; i <= bays; i++) solid(.16, top - bottom, .15, wood, x - w / 2 + .1 + (w - .2) * i / bays, (bottom + top) / 2, z);
        for (const y of [bottom + .12, top - .12]) solid(w, .17, .16, wood, x, y, z);
      }
      function steps(x, z, w, height, count = 2, run = .5) {
        for (let i = 0; i < count; i++) {
          const h = height * (count - i) / count;
          solid(w, h, run / count, stone, x, h / 2, z + (i + .5) * run / count);
        }
      }

      if ((chapter === 3 && seed === 3) || (chapter === 12 && prop.y > 80)) group.rotation.y = Math.PI;
      if (meeting) {
        const gallery = Math.min(1.15, depth * .14), bodyW = width - 2 * gallery, bodyD = depth - 2 * gallery;
        const floor = 3.08, eave = 5.95, px = width / 2 - .18, pz = depth / 2 - .18;
        solid(width, .34, depth, stone);
        room(0, 0, bodyW, bodyD, .34, eave);
        solid(width - .12, .2, depth - .12, wood, 0, floor, 0);
        for (const side of [-1, 1]) {
          frame(0, side * pz, width - .2, .34, eave, 5);
          for (let i = 0; i <= 5; i++) solid(.32, .2, .32, stone, -px + 2 * px * i / 5, .44, side * pz);
          for (const y of [floor + .27, floor + .94]) solid(width - .3, .1, .12, wood, 0, y, side * pz);
          for (let i = 0; i <= 28; i++) solid(.065, .65, .065, wood, -px + 2 * px * i / 28, floor + .59, side * pz);
          for (const y of [floor + .27, floor + .94, eave - .12]) solid(.12, .1, depth - .3, wood, side * px, y, 0);
          for (let i = 1; i < 18; i++) solid(.065, .65, .065, wood, side * px, floor + .59, -pz + 2 * pz * i / 18);
          for (const z of [-depth * .17, depth * .17]) solid(.17, eave - .34, .17, wood, side * px, (eave + .34) / 2, z);
          for (let i = -2; i <= 2; i++) {
            const x = i * bodyW / 5;
            windowBay(x, floor + 1.4, side * bodyD / 2, 1.35, 1.7, true, side);
            if (i) windowBay(x, 1.85, side * bodyD / 2, 1.3, 1.45, true, side);
          }
          beam([side * px, eave - .66, pz], [side * (px - .6), eave - .15, pz], .065, wood, group);
        }
        door(0, .34, bodyD / 2, 1.7, 2.3);
        steps(0, bodyD / 2 + .22, 2.25, .34, 2, gallery - .28);
        pitched(0, 0, width - .12, depth - .12, eave, 1.42, .22, 0, wall);
      } else if (loess) {
        const archive = chapter === 11 && wooden, side = seed % 2 ? -1 : 1;
        const base = .22, eave = archive ? 2.8 : 2.42 + (seed % 3) * .1;
        const rearD = depth * .57, rearZ = -depth / 2 + rearD / 2 + .06, front = rearZ + rearD / 2;
        solid(width, .16, depth, earth);
        room(0, rearZ, width - .14, rearD, base, eave);
        solid(width - .14, .22, rearD, stone, 0, .11, rearZ);
        pitched(0, rearZ, width - .14, rearD, eave, .64 + (seed % 2) * .13, .13);
        const wingW = width * .25, wingD = depth - rearD - .28, wingX = side * (width / 2 - wingW / 2 - .07);
        const wingZ = front + wingD / 2, wingTop = eave - .4;
        room(wingX, wingZ, wingW, wingD, base, wingTop);
        canopy(wingX, wingW + .12, front - .06, front + wingD + .08, wingTop + .48, wingTop + .08);
        solid(wingW, .4, .1, wall, wingX, wingTop + .2, front);
        for (const s of [-1, 1]) {
          const x = wingX + s * wingW / 2;
          triangle(wall, [x, wingTop, wingZ - s * wingD / 2], [x, wingTop + .4, front], [x, wingTop, wingZ + s * wingD / 2]);
        }
        door(0, base, front, archive ? 1.55 : 1.25, 1.95);
        windowBay(-side * width * .29, base + 1.4, front, archive ? 1.45 : .85, .95, archive || wooden);
        if (archive) frame(0, front + .11, width - .2, base, eave, 4);
        const gateX = -side * width * .1, gateW = 1.55, fenceZ = depth / 2 - .16;
        const left = gateX - gateW / 2 - .12, right = gateX + gateW / 2 + .12;
        solid(left + width / 2, 1.18, .28, wall, (left - width / 2) / 2, .59, fenceZ);
        solid(width / 2 - right, 1.18, .28, wall, (right + width / 2) / 2, .59, fenceZ);
        solid(.24, 1.18, depth - rearD - .12, wall, -side * (width / 2 - .12), .59, front + (depth - rearD - .12) / 2);
        for (const s of [-1, 1]) solid(.24, 2.04, .4, wall, gateX + s * (gateW / 2 + .12), 1.02, depth / 2 - .22);
        door(gateX, .12, depth / 2 - .42, gateW, 1.8);
        solid(gateW + .52, .14, .52, roof, gateX, 2.05, depth / 2 - .28);
      } else if (chapter === 4) {
        const floor = wooden ? 1.02 + (seed % 2) * .25 : .66;
        const eave = floor + (wooden ? 2.95 : 2.65), bodyD = depth - 1.18, bodyZ = -.51, front = bodyZ + bodyD / 2;
        solid(width, .13, depth, stone);
        solid(width - .1, .42, depth * .38, stone, 0, .21, -depth * .3);
        solid(width - .12, .2, depth - .12, boards, 0, floor, 0);
        room(0, bodyZ, width - .24, bodyD, floor + .1, eave, boards);
        frame(0, front + .07, width - .24, .13, eave, 4);
        for (const side of [-1, 1]) {
          const x = side * (width / 2 - .26), z = depth / 2 - .22;
          solid(.32, .22, .34, stone, x, .24, z);
          solid(.2, eave - .95, .2, wood, x, (eave - .95) / 2, z);
          beam([x, .23, z], [x - side * 1.15, floor - .1, z], .09, wood, group);
          solid(.13, .12, depth - .35, wood, x, floor + .92, 0);
          const railW = width / 2 - 1.08;
          solid(railW, .12, .13, wood, side * (1 + railW / 2), floor + .9, z);
          for (let i = 0; i < 6; i++) solid(.075, .7, .075, wood, side * (1.08 + railW * i / 6), floor + .52, z);
          windowBay(side * width * .27, floor + 1.65, front, 1.25, 1.25, true);
        }
        door(0, floor + .1, front, 1.5, 2.15);
        steps(0, front + .23, 1.65, floor + .1, 4, depth / 2 - front - .28);
        pitched(0, bodyZ, width - .24, bodyD, eave, 1.25, .22, .02, boards);
        canopy(0, width - .06, front - .22, depth / 2 + .14, eave - .48, eave - 1.05);
      } else if (chapter === 1) {
        const warehouse = seed === 3, publicHall = seed === 2, archive = seed === 5;
        const base = .38 + (seed % 2) * .06, front = depth / 2 - (warehouse || publicHall || wooden ? 1 : .64), back = -depth / 2 + .08;
        const bodyD = front - back, bodyZ = (front + back) / 2;
        const eave = warehouse ? 3.65 : publicHall ? 3.4 : archive ? 3.25 : 2.78 + (seed % 3) * .18;
        solid(width, base, depth, earth);
        const annexW = warehouse || publicHall || archive || wooden ? 0 : width * .25, side = seed % 2 ? 1 : -1;
        const mainW = width - annexW - .14, mainX = -side * annexW / 2;
        room(mainX, bodyZ, mainW, bodyD, base, eave, wooden ? boards : wall);
        pitched(mainX, bodyZ, mainW, bodyD, eave, warehouse ? 1.5 : 1.18 + (seed % 2) * .18, .22, .055, wooden ? boards : wall);
        if (annexW) {
          const x = side * (width - annexW) / 2, d = bodyD * .83, z = back + d / 2;
          room(x, z, annexW - .14, d, base, eave - .52);
          pitched(x, z, annexW - .14, d, eave - .52, .72, .16, .04);
          windowBay(x, base + 1.3, z + d / 2, .72, .82);
        }
        door(mainX, base, front, warehouse ? 2.45 : publicHall ? 1.8 : 1.35, warehouse ? 2.6 : 2.08);
        for (const s of [-1, 1]) windowBay(mainX + s * mainW * .31, warehouse ? 2.94 : base + 1.5, front, warehouse ? 1.15 : .95, warehouse ? .52 : 1.05, archive || publicHall || wooden);
        steps(mainX, front + .23, warehouse ? 2.7 : 1.75, base, 2, depth / 2 - front - .3);
        if (warehouse || publicHall || wooden) {
          const z = depth / 2 - .18;
          canopy(0, width - .1, front - .14, depth / 2 + .13, eave - .26, eave - .67);
          for (const s of [-1, 1]) solid(.18, eave - .61 - base, .18, wood, s * width * .36, (eave - .61 + base) / 2, z);
          if (wooden) frame(0, front + .08, width - .2, base, eave, 4);
        }
      } else if (chapter === 6) {
        const base = .4, eave = 2.96 + ((prop.h || 7) - 6.6) * .2, front = depth / 2 - 1.02;
        const bodyD = depth - 1.14, bodyZ = -.45, postZ = depth / 2 - .18;
        solid(width, base, depth, stone);
        room(0, bodyZ, width - .24, bodyD, base, eave, boards);
        frame(0, front + .07, width - .24, base, eave, 4);
        for (const s of [-1, 1]) {
          const x = s * (width / 2 - .24);
          solid(.19, eave - base, .19, wood, x, (eave + base) / 2, postZ);
          solid(.14, .16, depth - .3, wood, x, 1.12, -.03);
          beam([x, eave - .62, postZ], [x - s * .6, eave - .14, postZ], .07, wood, group);
          windowBay(s * width * .27, 1.9, front, 1.3, 1.18);
        }
        solid(width - .3, .19, .18, wood, 0, eave - .14, postZ);
        door(0, base, front, 1.6, 2.08);
        steps(0, front + .23, 1.9, base, 2, .65);
        pitched(0, 0, width - .16, depth - .16, eave, 1.38 + (seed % 2) * .16, .2, 0, boards);
      } else if (barracks) {
        const base = .28, eave = 2.46 + (seed % 2) * .12, front = depth / 2 - .52;
        solid(width, base, depth, stone);
        room(0, -.22, width - .16, depth - .6, base, eave);
        pitched(0, 0, width - .16, depth - .14, eave, .78, .14, 0, boards);
        for (const s of [-1, 1]) {
          door(s * width * .22, base, front, 1.08, 1.98);
          windowBay(s * width * .39, 1.92, front, .55, .48);
          steps(s * width * .22, front + .22, 1.3, base, 1, .25);
        }
        solid(width - .2, .17, .15, wood, 0, eave - .12, front + .07);
      } else if (chapter === 7 && wooden) {
        const base = .35, floor = 2.86, eave = 5.12, front = depth / 2 - .6;
        solid(width, base, depth, stone);
        room(0, -.34, width - .54, depth - .94, base, floor, boards);
        room(0, -.2, width - .2, depth - .6, floor, eave);
        solid(width - .16, .2, depth - .42, wood, 0, floor, -.16);
        frame(0, front - .14, width - .6, base, floor, 3);
        door(0, base, front - .21, 1.7, 2.18);
        for (const s of [-1, 1]) {
          windowBay(s * width * .29, 1.7, front - .21, 1.65, 1.45);
          windowBay(s * width * .3, 4.05, depth / 2 - .5, 1.35, 1.35, true);
        }
        windowBay(0, 4.05, depth / 2 - .5, 1.35, 1.35, true);
        frame(0, depth / 2 - .43, width - .22, floor, eave, 3);
        canopy(0, width - .14, front - .26, depth / 2 + .13, floor - .04, floor - .43);
        pitched(0, -.14, width - .16, depth - .32, eave, 1.18, .18, 0, boards);
        steps(0, front + .02, 1.95, base, 2, .48);
      } else {
        const shop = chapter === 3 && wooden;
        const base = .32, eave = shop ? 3.2 + (seed % 2) * .18 : 2.84 + Math.max(0, (prop.h || 7) - 6.6) * .23;
        const recess = shop ? .88 : .52, front = depth / 2 - recess;
        const bodyD = depth - recess - .08, bodyZ = (.08 - recess) / 2;
        solid(width, base, depth, stone);
        room(0, bodyZ, width - .16, bodyD, base, eave, shop || wooden ? boards : wall);
        pitched(0, 0, width - .16, depth - .16, eave, shop ? 1.38 : 1.05, .18, 0, shop || wooden ? boards : wall);
        door(shop ? -width * .26 : 0, base, front, shop ? 1.55 : 1.3, 2.08);
        if (shop) {
          frame(0, front + .08, width - .2, base, eave, 3);
          for (const x of [0, width * .28]) windowBay(x, base + 1.14, front, width * .22, 1.95);
          for (const s of [-1, 1]) solid(.17, eave - base, .17, wood, s * (width / 2 - .2), (eave + base) / 2, depth / 2 - .16);
        } else {
          for (const s of [-1, 1]) windowBay(s * width * .29, base + 1.45, front, 1.05, 1.04, chapter === 3 || chapter === 7);
        }
        steps(shop ? -width * .26 : 0, front + .23, 1.7, base, 2, recess - .29);
      }
      cube.dispose();
      for (const [mat, positions] of parts) {
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
        geometry.computeVertexNormals();
        mesh(geometry, mat, 0, 0, 0, group);
      }
    }

    function scannedProp(key, prop, height) {
      const model = assets.models[key].clone(true);
      const bounds = new T.Box3().setFromObject(model);
      const size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
      const scale = height / size.y;
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      const group = groupAt(prop);
      model.name = 'march-scan-' + key;
      group.add(model);
      group.rotation.y = (prop.seed || 1) * 2.39996;
      model.traverse(object => {
        if (!object.isMesh) return;
        object.castShadow = true; object.receiveShadow = true;
      });
      if (key === 'rock' && snowy) {
        const cap = mesh(new T.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), snowSurface(), 0, height * .7, 0, group);
        cap.scale.set(size.x * scale * .37, height * .31, size.z * scale * .37);
      }
      return group;
    }

    function tree(prop, pine = false) {
      if (!pine) return snowy ? deadTree(prop, true) : scannedProp('tree', prop, (prop.h || 9) * .85);
      const group = groupAt(prop), height = prop.h || 9, width = prop.w || 7;
      const wood = surface('wood', '#7b6b58', 1.2);
      mesh(new T.CylinderGeometry(.045, width * .047, height, 12), wood, 0, height / 2, 0, group);
      const branches = new T.InstancedMesh(new T.CylinderGeometry(.018, .07, 1, 6), wood, 48);
      const needles = new T.BufferGeometry(), vertices = [];
      for (let i = 0; i < 12; i++) {
        const angle = i * 2.39996, x = Math.cos(angle), z = Math.sin(angle), y = i * .055;
        vertices.push(0, y, 0, x * .7, y + .13, z * .7, x * .24 - z * .075, y + .055, z * .24 + x * .075);
      }
      needles.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); needles.computeVertexNormals();
      const leaf = material(logicalScene.palette.pine); leaf.side = T.DoubleSide;
      const tufts = new T.InstancedMesh(needles, leaf, 48 * 9);
      const caps = snowy ? new T.InstancedMesh(new T.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), snowSurface(), 48) : null;
      const dummy = new T.Object3D(), up = new T.Vector3(0, 1, 0);
      for (let i = 0; i < 48; i++) {
        const level = Math.floor(i / 6), angle = i * 2.39996 + (prop.seed || 1);
        const reach = width * .45 * (1 - level / 9);
        const start = new T.Vector3(0, height * (.25 + level * .09), 0);
        const end = new T.Vector3(Math.cos(angle) * reach, start.y + .2, Math.sin(angle) * reach);
        const direction = end.clone().sub(start);
        dummy.position.copy(start).addScaledVector(direction, .5);
        dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize()); dummy.scale.set(1, direction.length(), 1); dummy.updateMatrix(); branches.setMatrixAt(i, dummy.matrix);
        for (let j = 0; j < 9; j++) {
          dummy.position.copy(start).addScaledVector(direction, (j + 1) / 10);
          dummy.rotation.set(0, angle + j * 1.7, .15); dummy.scale.setScalar(.55 + (1 - j / 9) * .55); dummy.updateMatrix(); tufts.setMatrixAt(i * 9 + j, dummy.matrix);
        }
        if (caps) {
          dummy.position.copy(start).addScaledVector(direction, .62); dummy.position.y += .11;
          dummy.rotation.set(0, -angle, 0); dummy.scale.set(reach * .42, .13, .28); dummy.updateMatrix(); caps.setMatrixAt(i, dummy.matrix);
        }
      }
      for (const object of [branches, tufts, caps].filter(Boolean)) { object.castShadow = true; object.receiveShadow = true; group.add(object); }
    }

    function gate(prop) {
      const group = groupAt(prop);
      const width = prop.w || 7;
      const height = Math.max(3.6, (prop.h || 7) * .65);
      const wood = assets ? surface('wood', '#847468', 1.4) : material('#5c402a');
      for (const side of [-1, 1]) mesh(new T.CylinderGeometry(0.18, 0.24, height, 8), wood, side * width / 2, height / 2, 0, group);
      mesh(new T.BoxGeometry(width + 1, 0.35, 0.4), wood, 0, height - 0.3, 0, group);
      const flag = mesh(new T.PlaneGeometry(width * 0.55, height * 0.25, 8, 2), new T.MeshStandardMaterial({ color: logicalScene.palette.flag, roughness: 0.82, side: T.DoubleSide }), 0, height * 0.73, 0.06, group);
      flags.push(flag);
    }

    function boat(prop) {
      const group = groupAt(prop);
      group.position.y = terrain.waterLevel + .12;
      const width = prop.w || 6;
      const hull = mesh(new T.SphereGeometry(1, 16, 8), material('#4d3625'), 0, 0, 0, group);
      hull.scale.set(width * 0.48, 0.42, 1.15);
      mesh(new T.BoxGeometry(width * 0.78, 0.14, 1.55), material('#806142'), 0, 0.26, 0, group);
    }

    function bridgeDepth(prop) {
      const gaps = props.filter(other => other.type === 'bridge' && other.x === prop.x && other.y !== prop.y).map(other => Math.abs(other.y - prop.y));
      const gap = Math.min(...gaps);
      return Number.isFinite(gap) && gap <= (prop.h || 4) * 2 ? gap + .02 : prop.h || 4;
    }

    function bridge(prop) {
      const group = groupAt(prop), width = prop.w || 12, depth = bridgeDepth(prop);
      group.position.y = .145;
      const count = Math.ceil(depth / .55), wood = surface('wood', '#a29780', 2);
      const deck = new T.InstancedMesh(new T.BoxGeometry(width, .16, depth / count), wood, count);
      deck.name = 'march-wood-bridge-deck';
      const dummy = new T.Object3D();
      for (let i = 0; i < count; i++) { dummy.position.set(0, 0, -depth / 2 + (i + .5) * depth / count); dummy.updateMatrix(); deck.setMatrixAt(i, dummy.matrix); }
      deck.castShadow = true; deck.receiveShadow = true; group.add(deck); pickSurfaces.push(deck);
      for (const side of [-1, 1]) {
        beam([side * width / 2, .8, -depth / 2], [side * width / 2, .8, depth / 2], .045, wood, group);
        for (const end of [-1, 1]) beam([side * width / 2, 0, end * depth / 2], [side * width / 2, 1, end * depth / 2], .065, wood, group);
      }
    }

    function beam(a, b, radius, mat, parent) {
      const start = new T.Vector3(...a), end = new T.Vector3(...b), direction = end.sub(start);
      const object = mesh(new T.CylinderGeometry(radius * .8, radius, direction.length(), 8), mat, 0, 0, 0, parent);
      object.position.copy(start).addScaledVector(direction, .5);
      object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize());
      return object;
    }

    function cable(parent, width, height, z, sag) {
      const count = Math.ceil(width / .3), iron = material('#55564f', .48, .75);
      const links = new T.InstancedMesh(new T.TorusGeometry(.12, .025, 5, 12), iron, count);
      const dummy = new T.Object3D();
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        dummy.position.set((t - .5) * width, height - sag * 4 * t * (1 - t), z);
        dummy.rotation.set(i % 2 ? Math.PI / 2 : 0, 0, Math.atan2(-sag * 4 * (1 - 2 * t), width));
        dummy.scale.set(1.7, 1, 1); dummy.updateMatrix(); links.setMatrixAt(i, dummy.matrix);
      }
      links.castShadow = true; links.receiveShadow = true; parent.add(links);
    }

    function chainBridge(prop) {
      const group = groupAt(prop), width = prop.w || 12;
      if (logicalScene.ironBridge) { group.position.y = 0; group.position.z = logicalScene.ironBridge.y + (prop.seed % 2 ? -3 : 3) - world.h / 2; }
      for (const level of [.65, 1.45]) cable(group, width, level, 0, .22);
      for (const side of [-1, 1]) beam([side * width / 2, 0, 0], [side * width / 2, 1.65, 0], .1, surface('wood', '#837264'), group);
    }

    if (logicalScene.ironBridge) {
      const bridge = logicalScene.ironBridge, width = bridge.x1 - bridge.x0;
      const group = groupAt({ type: 'ironBridge', x: (bridge.x0 + bridge.x1) / 2, y: bridge.y });
      group.position.y = 0;
      const count = Math.ceil(width / .65), plankWidth = width / count;
      const deck = new T.InstancedMesh(new T.BoxGeometry(plankWidth, .16, 6), surface('wood', '#a29780', 2), count);
      deck.name = 'march-iron-bridge-deck';
      const dummy = new T.Object3D();
      for (let i = 0; i < count; i++) {
        dummy.position.set(-width / 2 + (i + .5) * plankWidth, -.055, 0); dummy.updateMatrix(); deck.setMatrixAt(i, dummy.matrix);
      }
      deck.castShadow = true; deck.receiveShadow = true; group.add(deck); pickSurfaces.push(deck);
      for (let i = 0; i < bridge.deckChains; i++) cable(group, width, -.15, (i / (bridge.deckChains - 1) - .5) * bridge.width, .08);
    }

    function archedWall(group, width, height, depth, opening, mat) {
      const spring = height * .4, radius = opening / 2;
      const shape = new T.Shape();
      shape.moveTo(-width / 2, 0); shape.lineTo(-width / 2, height); shape.lineTo(width / 2, height); shape.lineTo(width / 2, 0);
      shape.lineTo(radius, 0); shape.lineTo(radius, spring); shape.absarc(0, spring, radius, 0, Math.PI, false); shape.lineTo(-radius, 0); shape.closePath();
      return mesh(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 2, curveSegments: 24, steps: 1 }), mat, 0, 0, -depth / 2, group);
    }

    function archGate(prop) {
      const group = groupAt(prop), width = prop.w || 12, height = (prop.h || 9) * .7, depth = prop.depth || 4;
      const stone = surface('rock', environment.rockTint, 2.3);
      const opening = Math.min(width * .4, 8);
      archedWall(group, width, height, depth, opening, stone);
      const door = mesh(new T.BoxGeometry(opening, height * .4 + opening / 2, .25), surface('wood', '#75654f', 2), 0, (height * .4 + opening / 2) / 2, depth / 2 - .18, group);
      door.name = 'march-arch-closed-door';
      for (const y of [height * .18, height * .42]) mesh(new T.BoxGeometry(opening, .16, .08), material('#4e4c42', .65, .65), 0, y, depth / 2, group);
      mesh(new T.BoxGeometry(width + .45, .4, depth + .5), stone, 0, height, 0, group);
      for (let i = 0; i < Math.ceil(width / 1.5); i++) {
        const x = -width / 2 + (i + .5) * width / Math.ceil(width / 1.5);
        for (const side of [-1, 1]) mesh(new T.BoxGeometry(.75, .75, .55), stone, x, height + .53, side * depth * .46, group);
      }
      const roof = mesh(new T.ConeGeometry(width * .32, 1.8, 4), surface('roof', '#8a8b80'), 0, height + 1.65, 0, group);
      roof.rotation.y = Math.PI / 4; roof.scale.z = .6;
      mesh(new T.BoxGeometry(width * .38, 1.25, depth * .68), surface('wood', '#ad9780'), 0, height + .68, 0, group);
    }

    function yaodong(prop) {
      const group = groupAt(prop), width = prop.w || 9, depth = prop.depth || 6, height = (prop.h || 7) * .62;
      const loess = surface('rock', logicalScene.palette.loess || '#b99a67', 3, .45);
      const mound = mesh(new T.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), loess, 0, height * .73, -depth * .06, group);
      mound.scale.set(width * .5, height * .65, depth * .44);
      const mass = mesh(new T.BoxGeometry(width, height * .8, depth * .82), loess, 0, height * .4, -depth * .09, group);
      mass.name = 'march-yaodong-earth-mass';
      const front = depth / 2 - .325;
      const facade = new T.Group(); facade.position.z = front; group.add(facade);
      archedWall(facade, width, height, .65, Math.min(2.3, width * .32), loess);
      mesh(new T.BoxGeometry(width, height * .9, .4), material('#302a20'), 0, height * .4, depth * .3, group);
      const wood = surface('wood', '#93836a');
      for (const side of [-1, 1]) {
        const x = side * width * .32;
        mesh(new T.BoxGeometry(width * .18, 1.3, .2), material('#27291e'), x, height * .5, front + .37, group);
        for (let i = -2; i <= 2; i++) beam([x + i * width * .033, height * .5 - .65, front + .5], [x + i * width * .033, height * .5 + .65, front + .5], .025, wood, group);
        for (const y of [-.35, .35]) beam([x - width * .09, height * .5 + y, front + .5], [x + width * .09, height * .5 + y, front + .5], .025, wood, group);
      }
    }

    function tent(prop) {
      const group = groupAt(prop), width = prop.w || 7, depth = prop.depth || width * .7, height = Math.min(3.4, (prop.h || 5) * .62);
      const cloth = material(logicalScene.palette.tent || '#91836b', .98); cloth.side = T.DoubleSide;
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute([-width / 2, 0, -depth / 2, -width / 2, 0, depth / 2, 0, height, -depth / 2, 0, height, depth / 2, width / 2, 0, -depth / 2, width / 2, 0, depth / 2], 3));
      geometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 0, 2, 4]); geometry.computeVertexNormals(); mesh(geometry, cloth, 0, 0, 0, group);
      const wood = surface('wood', '#8d7a62');
      for (const side of [-1, 1]) beam([0, 0, side * depth / 2], [0, height + .12, side * depth / 2], .06, wood, group);
      for (const side of [-1, 1]) {
        const flap = new T.BufferGeometry(); flap.setAttribute('position', new T.Float32BufferAttribute([side * width / 2, 0, depth / 2, 0, height, depth / 2, side * width * .1, 0, depth / 2 + .3], 3)); flap.computeVertexNormals(); mesh(flap, cloth, 0, 0, 0, group);
        for (const z of [-1, 1]) beam([side * width / 2, .3, z * depth * .35], [side * (width / 2 + .8), .02, z * depth * .55], .017, material('#bca880'), group);
      }
    }

    function stoneWall(prop) {
      const group = groupAt(prop), width = prop.w || 8, height = Math.min(3.2, prop.h || 3), depth = prop.depth || 1.1;
      const stone = surface('rock', environment.rockTint, 1.6), cols = Math.ceil(width / 1.4), rows = Math.ceil(height / .55);
      const blocks = new T.InstancedMesh(new T.BoxGeometry(width / cols - .035, height / rows - .035, depth), stone, cols * rows);
      const dummy = new T.Object3D();
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        dummy.position.set(-width / 2 + (col + .5) * width / cols, (row + .5) * height / rows, Math.sin(row * 8 + col) * .025); dummy.updateMatrix(); blocks.setMatrixAt(row * cols + col, dummy.matrix);
      }
      blocks.castShadow = true; blocks.receiveShadow = true; group.add(blocks);
      if (snowy) mesh(new T.BoxGeometry(width + .08, .14, depth + .1), snowSurface(), 0, height + .05, 0, group);
    }

    function flagPole(prop, prayer = false) {
      const group = groupAt(prop), height = (prop.h || 6) * .85, width = prop.w || 3;
      const wood = surface('wood', '#776c5a'), colors = ['#c8a13a', '#b4503a', '#3f6d8e', '#dad3c0', '#4a7a52'];
      if (prayer) {
        for (const side of [-1, 1]) beam([side * width / 2, 0, 0], [side * width / 2, height, 0], .06, wood, group);
        const points = Array.from({ length: 25 }, (_, i) => new T.Vector3((i / 24 - .5) * width, height - .7 * Math.sin(i / 24 * Math.PI), 0));
        mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 48, .02, 5, false), wood, 0, 0, 0, group);
        for (let i = 0; i < 10; i++) {
          const t = (i + .5) / 10, mat = material(colors[i % colors.length]); mat.side = T.DoubleSide;
          const flag = mesh(new T.PlaneGeometry(width * .055, .65, 6, 4), mat, (t - .5) * width, height - .7 * Math.sin(t * Math.PI) - .32, 0, group); flags.push(flag);
        }
      } else {
        beam([0, 0, 0], [0, height, 0], .065, wood, group);
        mesh(new T.CylinderGeometry(.35, .5, .3, 12), surface('rock', environment.rockTint), 0, .15, 0, group);
        const mat = material(logicalScene.palette.flag, .9); mat.side = T.DoubleSide;
        const flag = mesh(new T.PlaneGeometry(width * .85, height * .23, 12, 4), mat, width * .425, height * .82, 0, group); flags.push(flag);
      }
    }

    function deadTree(prop, snow = false) {
      const group = groupAt(prop), height = prop.h || 6, width = prop.w || 4, wood = surface('wood', '#7b7364');
      beam([0, 0, 0], [.15, height, 0], width * .045, wood, group);
      for (let i = 0; i < 7; i++) {
        const angle = i * 2.4, y = height * (.32 + i * .07), reach = width * (.5 - i * .035);
        const end = [Math.cos(angle) * reach, y + height * .13, Math.sin(angle) * reach];
        beam([.05, y, 0], end, width * .023, wood, group);
        beam(end, [end[0] * 1.15, end[1] + height * .13, end[2] * 1.15], width * .012, wood, group);
        if (snow) beam([.05, y + .06, 0], [end[0], end[1] + .06, end[2]], width * .018, snowSurface(), group);
      }
    }

    function tower(prop) {
      const group = groupAt(prop), width = prop.w || 5, height = (prop.h || 9) * .8, wood = surface('wood', '#9b8770');
      for (const x of [-1, 1]) for (const z of [-1, 1]) beam([x * width * .45, 0, z * width * .35], [x * width * .36, height, z * width * .28], .13, wood, group);
      for (const z of [-1, 1]) {
        beam([-width * .43, .3, z * width * .32], [width * .36, height * .7, z * width * .28], .08, wood, group);
        beam([width * .43, .3, z * width * .32], [-width * .36, height * .7, z * width * .28], .08, wood, group);
      }
      mesh(new T.BoxGeometry(width, .25, width * .8), wood, 0, height * .72, 0, group);
      const roof = mesh(new T.ConeGeometry(width * .8, height * .24, 4), surface('roof', '#92918a'), 0, height, 0, group); roof.rotation.y = Math.PI / 4;
      for (let i = 0; i < 12; i++) beam([-.4, i * height * .06, width * .38], [.4, i * height * .06, width * .38], .05, wood, group);
    }

    function simpleProp(prop) {
      if (assets && prop.type === 'crate') return scannedProp('crate', prop, 1.15);
      if (assets && ['cliff', 'rock'].includes(prop.type)) return scannedProp('rock', prop, prop.h || 4);
      const group = groupAt(prop);
      const width = prop.w || 3;
      const height = prop.h || 3;
      if (prop.type === 'cliff') {
        const rock = mesh(new T.DodecahedronGeometry(1, 1), material(logicalScene.palette.rock), 0, height * 0.35, 0, group);
        rock.scale.set(width * 0.55, height * 0.55, width * 0.3);
      } else if (prop.type === 'crate') {
        mesh(new T.BoxGeometry(width, height * 0.65, width * 0.75), material('#765638'), 0, height * 0.32, 0, group);
      } else if (prop.type === 'grain') {
        for (let i = 0; i < 4; i++) {
          const sack = mesh(new T.SphereGeometry(0.65, 10, 7), material('#a28a5d'), (i % 2 - .5) * width * .38, 0.65 + Math.floor(i / 2) * 0.75, 0, group);
          sack.scale.set(1, 1.2, .8);
        }
      } else if (prop.type === 'campfire') {
        const radius = width * .23, flameHeight = height * .55;
        const stone = surface('rock', '#aaa395', .6), charred = surface('wood', '#403128', .7);
        for (let i = 0; i < 11; i++) {
          const angle = i * Math.PI * 2 / 11;
          const rock = mesh(new T.DodecahedronGeometry(.22, 1), stone, Math.cos(angle) * radius, .13, Math.sin(angle) * radius, group);
          rock.scale.set(1.3, .7, 1); rock.rotation.set(i * .31, angle, i * .17);
        }
        for (let i = 0; i < 5; i++) {
          const angle = i * Math.PI / 5, x = Math.cos(angle) * radius * .85, z = Math.sin(angle) * radius * .85;
          beam([-x, .14, -z], [x, .24, z], .11, charred, group);
        }
        const flameMaterial = new T.ShaderMaterial({
          uniforms: { time: { value: 0 }, phase: { value: prop.seed || 1 } },
          vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: `
            uniform float time;
            uniform float phase;
            varying vec2 vUv;
            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float noise(vec2 p) {
              vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
              return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
            }
            void main() {
              float y = vUv.y, t = time * 1.8 + phase;
              vec2 p = vec2(vUv.x * 5.0, y * 5.0 - t);
              float n = noise(p) * .6 + noise(p * 2.1) * .28 + noise(p * 4.2) * .12;
              float bend = (noise(vec2(y * 4.0, t * .6)) - .5) * y * .32;
              float x = abs(vUv.x - .5 + bend);
              float edge = (1.0 - y) * .38 + (n - .5) * .22;
              float alpha = (1.0 - smoothstep(edge - .09, edge + .025, x)) * smoothstep(0.0, .1, y) * (1.0 - smoothstep(.65, 1.0, y)) * .48;
              if (alpha < .008) discard;
              vec3 color = mix(vec3(1.0, .12, .012), vec3(1.0, .68, .16), clamp((1.0 - y) * .7 + n * .45 - x, 0.0, 1.0));
              gl_FragColor = vec4(color, alpha);
              #include <colorspace_fragment>
            }`,
          transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false
        });
        for (let i = 0; i < 3; i++) {
          const flame = mesh(new T.PlaneGeometry(radius * 2, flameHeight), flameMaterial, 0, .14 + flameHeight / 2, 0, group);
          flame.rotation.y = i * Math.PI / 3; flame.castShadow = false; flame.receiveShadow = false; flame.name = 'march-fire-flame';
        }
        const light = new T.PointLight('#ff993f', 5, 5, 2); light.position.y = .7; group.add(light);
        fires.push({ material: flameMaterial, light });
      } else if (prop.type === 'lantern') {
        const poleHeight = assets ? 2.7 : height;
        const wood = assets ? surface('wood', '#817265', 1) : material('#4b3928');
        mesh(new T.CylinderGeometry(.06, .085, poleHeight, 12), wood, 0, poleHeight / 2, 0, group);
        mesh(new T.BoxGeometry(.65, .07, .08), wood, .23, poleHeight - .1, 0, group);
        mesh(new T.BoxGeometry(.34, .5, .34), new T.MeshStandardMaterial({ color: '#c7ad7d', roughness: .95, emissive: '#cf812e', emissiveIntensity: .35 }), .47, poleHeight - .53, 0, group);
        for (const x of [-1, 1]) for (const z of [-1, 1]) mesh(new T.BoxGeometry(.028, .54, .028), wood, .47 + x * .18, poleHeight - .53, z * .18, group);
        for (const offset of [-.27, .27]) mesh(new T.BoxGeometry(.39, .035, .39), wood, .47, poleHeight - .53 + offset, 0, group);
        if ([1, 9].includes(logicalScene.chapterId)) {
          const light = new T.PointLight('#ffb36b', 18, 12, 2);
          light.position.set(.47, poleHeight - .53, .25); group.add(light);
        }
      } else if (prop.type === 'well') {
        const radius = assets ? 1.1 : width * .42;
        const stone = assets ? surface('rock', '#929080', 1.5) : material('#777264');
        const ring = mesh(new T.TorusGeometry(radius, .22, 10, 32), stone, 0, .85, 0, group);
        ring.rotation.x = Math.PI / 2;
        mesh(new T.CylinderGeometry(radius + .08, radius + .12, .75, 32, 1, true), stone, 0, .42, 0, group);
        const interior = mesh(new T.CircleGeometry(radius, 32), material('#182623'), 0, .12, 0, group);
        interior.rotation.x = -Math.PI / 2;
      } else if (prop.type === 'cart') {
        mesh(new T.BoxGeometry(width * .7, .35, width * .45), material('#6e4f33'), 0, .85, 0, group);
        for (const side of [-1, 1]) {
          const wheel = mesh(new T.TorusGeometry(width * .22, .1, 7, 16), material('#443225'), side * width * .37, .65, 0, group);
          wheel.rotation.y = Math.PI / 2;
        }
      } else if (prop.type === 'table') {
        mesh(new T.BoxGeometry(width, .18, width * .55), material('#62472f'), 0, height * .55, 0, group);
        for (const x of [-1, 1]) for (const z of [-1, 1]) mesh(new T.BoxGeometry(.16, height * .55, .16), material('#4c3828'), x * width * .38, height * .27, z * width * .2, group);
      } else if (prop.type === 'stele') {
        mesh(new T.BoxGeometry(width * .55, height, .45), material('#79766b'), 0, height / 2, 0, group);
      } else if (prop.type === 'sandbag') {
        const sack = material('#a39572', .98);
        for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
          const bag = mesh(new T.SphereGeometry(1, 16, 10), sack, (col - 1.5) * width / 4 + (row % 2) * .12, .2 + row * .35, 0, group);
          bag.scale.set(width / 8 + .04, .21, .45); bag.rotation.y = Math.sin(row * 8 + col) * .08;
        }
      } else if (prop.type === 'stairs') {
        for (let i = 0; i < 8; i++) pickSurfaces.push(mesh(new T.BoxGeometry(width, .08 * (i + 1), height / 8), surface('rock', environment.rockTint, 1.5), 0, .04 * (i + 1), height * (.5 - (i + .5) / 8), group));
      } else {
        stats.unsupportedProps.push(prop.type);
      }
      if (street && ['lantern', 'table'].includes(prop.type)) {
        const batches = new Map();
        for (const child of group.children) {
          if (!child.isMesh) continue;
          if (!batches.has(child.material)) batches.set(child.material, []);
          batches.get(child.material).push(child);
        }
        for (const [mat, parts] of batches) {
          if (parts.length < 2) continue;
          const geometries = parts.map(part => {
            part.updateMatrix();
            return part.geometry.clone().applyMatrix4(part.matrix);
          });
          const combined = mergeGeometries(geometries);
          geometries.forEach(geometry => geometry.dispose());
          if (!combined) continue;
          for (const part of parts) {
            group.remove(part);
            part.geometry.dispose();
          }
          mesh(combined, mat, 0, 0, 0, group);
        }
      }
    }

    function alignedProp(original) {
      const prop = { ...original };
      if (['house', 'houseWood', 'tent', 'stoneWall', 'archGate', 'yaodong'].includes(prop.type)) {
        const rectangles = (logicalScene.blocked || []).map(b => b.rect).filter(Boolean);
        const rect = rectangles.find(r => prop.x >= r[0] && prop.x <= r[0] + r[2] && prop.y >= r[1] && prop.y <= r[1] + r[3]);
        if (rect) { prop.x = rect[0] + rect[2] / 2; prop.y = rect[1] + rect[3] / 2; prop.w = rect[2]; prop.depth = rect[3]; }
        else if (prop.type === 'stoneWall') {
          const distance = r => Math.hypot(prop.x - Math.max(r[0], Math.min(r[0] + r[2], prop.x)), prop.y - Math.max(r[1], Math.min(r[1] + r[3], prop.y)));
          const boundary = rectangles.reduce((best, r) => !best || distance(r) < distance(best) ? r : best, null);
          if (boundary) {
            prop.w = Math.min(prop.w, boundary[2]); prop.depth = Math.min(1.1, boundary[3]);
            prop.x = Math.max(boundary[0] + prop.w / 2, Math.min(boundary[0] + boundary[2] - prop.w / 2, prop.x));
            prop.y = Math.max(boundary[1] + prop.depth / 2, Math.min(boundary[1] + boundary[3] - prop.depth / 2, prop.y));
          }
        }
      }
      if (prop.type === 'gate') {
        const walls = (logicalScene.blocked || []).filter(b => b.rect && Math.abs(prop.y - b.rect[1]) < 5).map(b => b.rect);
        for (const left of walls) for (const right of walls) {
          const gap = right[0] - left[0] - left[2], center = right[0] - gap / 2;
          if (Math.abs(left[1] - right[1]) < 1 && gap >= prop.w * .7 && gap <= prop.w * 1.5 && Math.abs(center - prop.x) < prop.w * .6) { prop.x = center; prop.y = (left[1] + right[1]) / 2; prop.w = gap; }
        }
      }
      if (prop.type === 'bridge') prop.x += prop.w / 2;
      return prop;
    }

    for (const prop of props) {
      if (street && ['house', 'houseWood', 'stoneWall', 'tree', 'pine', 'cliff'].includes(prop.type)) continue;
      if (street && prop.type === 'table' && prop.x === 84 && prop.y === 42) {
        simpleProp({ ...prop, x: 82.5, w: 1.65, h: 1.55 });
        continue;
      }
      if (prop.type === 'house') house(prop);
      else if (prop.type === 'houseWood') house(prop, true);
      else if (prop.type === 'tree') tree(prop);
      else if (prop.type === 'pine') tree(prop, true);
      else if (prop.type === 'gate') gate(prop);
      else if (prop.type === 'archGate') archGate(prop);
      else if (prop.type === 'yaodong') yaodong(prop);
      else if (prop.type === 'tent') tent(prop);
      else if (prop.type === 'stoneWall') stoneWall(prop);
      else if (prop.type === 'tower') tower(prop);
      else if (prop.type === 'flagPole') flagPole(prop);
      else if (prop.type === 'prayerFlags') flagPole(prop, true);
      else if (prop.type === 'deadTree') deadTree(prop);
      else if (prop.type === 'boat') boat(prop);
      else if (prop.type === 'bridge') bridge(prop);
      else if (prop.type === 'chainBridge') chainBridge(prop);
      else simpleProp(prop);
    }
    stats.propsReady = stats.unsupportedProps.length === 0;

    if (!street && environment.vegetation) {
      for (const prop of logicalScene.props.filter(p => p.type === 'tree')) {
        for (let i = 0; i < 3; i++) {
          const angle = i * 2.1 + prop.seed;
          scannedProp('fern', { x: prop.x + Math.cos(angle) * 1.8, y: prop.y + Math.sin(angle) * 1.8, seed: prop.seed + i }, .5 + i * .13);
        }
      }
    }

    for (let side = 0; !compoundPaving && side < 3; side++) {
      const span = (side ? world.h : world.w) * 2.5;
      const hills = new T.PlaneGeometry(span, 150, street ? 16 : 160, street ? 5 : 64);
      hills.rotateX(-Math.PI / 2);
      const positions = hills.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), depth = (75 - positions.getZ(i)) / 150, phase = logicalScene.seed * .01 + side * 2;
        const ridge = .7 + .23 * Math.sin(x * .033 + phase) + .18 * Math.cos(x * .077 + depth * 5) + .065 * Math.sin(x * .29 + depth * 17);
        const gullies = Math.abs(Math.sin(x * .1 + depth * 6)) * .12;
        const edge = !side ? terrain.height(x + world.w / 2, 0) : terrain.height(side === 1 ? 0 : world.w, (side === 1 ? -x : x) + world.h / 2);
        positions.setY(i, edge + Math.pow(depth, .8) * environment.relief * (ridge - gullies) + Math.sin(depth * Math.PI) * environment.relief * .18);
      }
      hills.computeVertexNormals();
      const group = new T.Group(); group.name = 'march-mountains-' + side;
      if (!side) group.position.set(0, -1, -world.h / 2 - 75);
      else { group.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2; group.position.set((side === 1 ? -1 : 1) * (world.w / 2 + 75), -1, 0); }
      worldRoot.add(group);
      const mountain = mesh(hills, surface(environment.vegetation ? 'earth' : 'rock', environment.mountainTint, 6, .55), 0, 0, 0, group); mountain.castShadow = false;
      if (snowy) {
        const snowVertices = [], normals = hills.attributes.normal;
        for (let i = 0; i < hills.index.count; i += 3) {
          const indices = [hills.index.getX(i), hills.index.getX(i + 1), hills.index.getX(i + 2)];
          if (indices.every(j => normals.getY(j) > .55 && positions.getY(j) > 12 + 4 * Math.sin(positions.getX(j) * .09))) {
            for (const j of indices) snowVertices.push(positions.getX(j), positions.getY(j) + .045, positions.getZ(j));
          }
        }
        const cap = new T.BufferGeometry(); cap.setAttribute('position', new T.Float32BufferAttribute(snowVertices, 3)); cap.computeVertexNormals();
        mesh(cap, snowSurface(), 0, 0, 0, group).castShadow = false;
      }
    }

    for (const [index, cliff] of (street ? [] : logicalScene.terrain?.cliffs || []).entries()) {
      const curve = new T.CatmullRomCurve3(cliff.pts.map(([x, y]) => toWorld(x, y)), false, 'centripetal');
      const length = curve.getLength(), steps = Math.ceil(length / .8), rows = 12;
      const points = curve.getSpacedPoints(steps), vertices = [], indices = [];
      for (let i = 0; i <= steps; i++) {
        const point = points[i], tangent = points[Math.min(steps, i + 1)].clone().sub(points[Math.max(0, i - 1)]).normalize();
        const outward = new T.Vector3(tangent.z, 0, -tangent.x);
        if (outward.dot(point) < 0) outward.negate();
        const endFalloff = Math.min(1, i / 3, (steps - i) / 3);
        const ridge = Math.min(environment.relief * .22, 14) * (.88 + .08 * Math.sin(point.x * .13 + point.z * .09) + .04 * Math.sin(point.x * .43));
        for (let row = 0; row <= rows; row++) {
          const t = row / rows, envelope = Math.pow(Math.sin(t * Math.PI), .65);
          const strata = Math.sin(t * 22 + point.x * .23 + point.z * .19) * .18 * envelope;
          const distance = t * cliff.w * 2.4 + strata;
          const x = point.x + outward.x * distance, z = point.z + outward.z * distance;
          vertices.push(x, terrain.height(x + world.w / 2, z + world.h / 2) - .05 + Math.max(0, envelope * ridge * endFalloff + strata), z);
        }
      }
      for (let i = 0; i < steps; i++) for (let row = 0; row < rows; row++) {
        const a = i * (rows + 1) + row, b = a + rows + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
      const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
      const normals = geometry.attributes.normal;
      if (normals.getY(Math.floor(steps / 2) * (rows + 1) + rows / 2) < 0) {
        for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
        geometry.setIndex(indices); geometry.computeVertexNormals();
      }
      const mat = surface('rock', environment.rockTint, 3, 1); mat.side = T.DoubleSide;
      mesh(geometry, mat).name = 'march-cliff-line-' + index;
      if (snowy) {
        const capVertices = [], positions = geometry.attributes.position;
        for (let i = 0; i < indices.length; i += 3) {
          const triangle = indices.slice(i, i + 3);
          if (triangle.every(j => normals.getY(j) > .42 && positions.getY(j) > 1)) for (const j of triangle) capVertices.push(positions.getX(j), positions.getY(j) + .035, positions.getZ(j));
        }
        const cap = new T.BufferGeometry(); cap.setAttribute('position', new T.Float32BufferAttribute(capVertices, 3)); cap.computeVertexNormals();
        mesh(cap, snowSurface()).name = 'march-cliff-snow-' + index;
      }
    }

    worldRoot.updateMatrixWorld(true);
    const cameraObstacles = worldRoot.children.filter(object => object === ground || /^(march-prop-|march-cliff-line-)/.test(object.name)).map(object => ({ object, bounds: new T.Box3().setFromObject(object) }));
    if (street) {
      for (const { rect, cameraHeight = 7.6, cameraMinHeight = 0 } of [...logicalScene.streetBlocked, ...(logicalScene.cameraBlocked || [])]) {
        if (!rect || cameraHeight < 1.1) continue;
        const [x, y, w, h] = rect;
        const min = toWorld(x, y, terrain.support(x, y) + cameraMinHeight);
        const max = new T.Vector3(min.x + w, min.y + cameraHeight - cameraMinHeight, min.z + h);
        cameraObstacles.push({ bounds: new T.Box3(min, max) });
      }
    }
    const cameraRay = new T.Raycaster(), cameraDirection = new T.Vector3(), rayOrigin = new T.Vector3(), cameraRight = new T.Vector3();
    let cameraDistance = null;

    if (environment.terrain === 'wetland') {
      const blade = new T.BufferGeometry();
      blade.setAttribute('position', new T.Float32BufferAttribute([-.04, 0, 0, .04, 0, 0, .16, .8, .12, -.03, 0, -.06, .03, 0, .06, -.12, .64, .08], 3)); blade.computeVertexNormals();
      const grassMaterial = material('#827e4c', .96); grassMaterial.side = T.DoubleSide;
      const grass = new T.InstancedMesh(blade, grassMaterial, 5000), dummy = new T.Object3D();
      const inside = (x, y, points) => {
        let hit = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i], b = points[j];
          if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
        }
        return hit;
      };
      let count = 0, seed = logicalScene.seed;
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < 10000 && count < 5000; i++) {
        const x = random() * world.w, y = random() * world.h;
        if (logicalScene.terrain.waters.some(water => inside(x, y, water.pts))) continue;
        const nearRoad = logicalScene.terrain.roads.some(road => road.pts.slice(1).some((b, index) => {
          const a = road.pts[index], dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
          const t = length ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / length)) : 0;
          return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) < road.w * .75;
        }));
        if (nearRoad) continue;
        dummy.position.copy(onSurface(x, y)); dummy.rotation.y = random() * Math.PI * 2; dummy.scale.setScalar(.6 + random() * .9); dummy.updateMatrix(); grass.setMatrixAt(count++, dummy.matrix);
      }
      grass.count = count; grass.name = 'march-wetland-grass'; grass.castShadow = true; grass.receiveShadow = true; worldRoot.add(grass);
    }

    const hemi = new T.HemisphereLight(staging.fill, cinematic ? '#716759' : '#514b3f', staging.ambient * (logicalScene.winterRain ? 1.29 : 1));
    scene.add(hemi);
    const sun = new T.DirectionalLight(staging.key, staging.power);
    sun.position.set(-45, 75, 35);
    sun.castShadow = true;
    const shadowSize = cinematic ? (mobile ? 512 : 1024) : 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    const extent = cinematic ? 39 : assets ? 24 : 85;
    if (cinematic) {
      sun.target.position.copy(onSurface(79, 42));
      sun.position.copy(sun.target.position).add(new T.Vector3(...staging.sun));
    }
    Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 1, far: 230 });
    sun.shadow.bias = -.00015;
    sun.shadow.normalBias = cinematic ? .042 : .025;
    sun.shadow.radius = 2;
    sun.shadow.camera.updateProjectionMatrix();
    if (cinematic && street) {
      // Bake only the compound. A separate 1px pass keeps actor geometry out of
      // the cache and the first playable frame inside the triangle budget.
      const casters = new T.Scene();
      const bakeCamera = new T.OrthographicCamera(-1, 1, 1, -1, .1, 1);
      bakeCamera.position.y = 100;
      const target = new T.WebGLRenderTarget(1, 1);
      const previous = renderer.getRenderTarget();
      casters.add(street, sun, sun.target);
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      try {
        renderer.setRenderTarget(target);
        renderer.render(casters, bakeCamera);
      } finally {
        renderer.setRenderTarget(previous);
        target.dispose();
        worldRoot.add(street);
      }
    }
    scene.add(sun, sun.target);
    const arms = createArms(T, assets.models.playerArms, scene, hemi, sun);
    renderer.info.autoReset = false;

    const ringGeometry = new T.RingGeometry(0.65, logicalScene.winterRain ? .72 : .85, 32);
    const ringMaterial = new T.MeshBasicMaterial({ color: logicalScene.winterRain ? '#ceb582' : '#e8c87a', transparent: true, opacity: logicalScene.winterRain ? .40 : .72, side: T.DoubleSide, depthWrite: false });
    for (const anchor of logicalScene.anchors) {
      const ring = new T.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(onSurface(anchor.x, anchor.y, 0.07));
      ring.visible = anchor.kind !== 'npc';
      worldRoot.add(ring);
      markers.set(anchor.anchorId, ring);
    }

    const weather = street && logicalScene.winterRain ? winterWeather(T, scene, logicalScene.winterRain, onSurface, world, winterGrass) : null;
    let particles = null;
    if (logicalScene.ambient?.kind) {
      const count = 420;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - .5) * world.w;
        positions[i * 3 + 2] = (Math.random() - .5) * world.h;
        positions[i * 3 + 1] = terrain.height(positions[i * 3] + world.w / 2, positions[i * 3 + 2] + world.h / 2) + 2 + Math.random() * 25;
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
      const snow = logicalScene.ambient.kind === 'snow';
      const mist = logicalScene.ambient.kind === 'mist';
      const particleMap = feather.clone(); particleMap.channel = 0;
      particles = new T.Points(geometry, new T.PointsMaterial({ color: snow ? '#f4f8ff' : mist ? '#d4dede' : '#d9c59b', size: snow ? .22 : mist ? 3 : .1, alphaMap: particleMap, transparent: true, opacity: snow ? .82 : mist ? .035 : .35, depthWrite: false }));
      worldRoot.add(particles);
    }

    for (const source of street ? [] : logicalScene.ambient?.smokes || []) {
      const geometry = new T.BufferGeometry(), positions = new Float32Array(24 * 3);
      for (let i = 0; i < 24; i++) { positions[i * 3] = Math.sin(i * 2.4) * .22; positions[i * 3 + 1] = i * .2; positions[i * 3 + 2] = Math.cos(i * 2.4) * .22; }
      geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
      const texture = feather.clone(); texture.channel = 0;
      const smoke = new T.Points(geometry, new T.PointsMaterial({ color: '#aaa99e', alphaMap: texture, size: 1.8, transparent: true, opacity: .12, depthWrite: false }));
      smoke.position.copy(onSurface(source.x, source.y, .8)); worldRoot.add(smoke); smokeColumns.push(smoke);
    }

    function updateFieldOfView() {
      const portraitFov = T.MathUtils.radToDeg(2 * Math.atan(Math.tan(T.MathUtils.degToRad(23)) / camera.aspect));
      camera.fov = isIndoors ? T.MathUtils.clamp(portraitFov, 59, 88) : 52;
      camera.updateProjectionMatrix();
    }
    function resize() {
      const rect = container.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      cam.viewW = rect.width;
      cam.viewH = rect.height;
      const dpr = Math.min(devicePixelRatio || 1, dprCap);
      stats.dpr = +dpr.toFixed(2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      updateFieldOfView();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    function project(x, y, height = 0) {
      const point = onSurface(x, y, height).project(camera);
      return { x: (point.x * .5 + .5) * cam.viewW, y: (-point.y * .5 + .5) * cam.viewH, behind: point.z > 1 };
    }

    function unproject(sx, sy) {
      const ndc = new T.Vector2(sx / cam.viewW * 2 - 1, -(sy / cam.viewH) * 2 + 1);
      const ray = new T.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickSurfaces, false)[0];
      if (!hit) return null;
      return { x: hit.point.x + world.w / 2, y: hit.point.z + world.h / 2 };
    }

    function drawGuide(player, route, visible) {
      guideLine.visible = visible && route.length > 1;
      if (!guideLine.visible) return;
      if (guideRoute === route && guideLine.userData.origin && Math.hypot(player.x - guideLine.userData.origin.x, player.y - guideLine.userData.origin.y) < .1) return;
      guideRoute = route;
      guideLine.userData.origin = { x: player.x, y: player.y };
      const points = [], line = [player, ...route.slice(1)];
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / .6));
        for (let j = 0; j < steps; j++) points.push(onSurface(a.x + (b.x - a.x) * j / steps, a.y + (b.y - a.y) * j / steps, .12));
      }
      points.push(onSurface(line.at(-1).x, line.at(-1).y, .12));
      guideLine.geometry.dispose();
      guideLine.geometry = new T.BufferGeometry().setFromPoints(points);
      guideLine.computeLineDistances();
    }

    /* 遵义二楼核心会议室管理与 5 处史实考据 */
    const fadeCurtain = document.createElement('div');
    fadeCurtain.className = 'czmw-fade-curtain';
    container.append(fadeCurtain);

    const toastEl = document.createElement('div');
    toastEl.className = 'czmw-toast';
    container.append(toastEl);
    let toastTimer = 0;
    function showToast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 3200);
    }

    const relicModal = document.createElement('div');
    relicModal.className = 'czmw-relic-modal';
    relicModal.hidden = true;
    relicModal.innerHTML = `
      <div class="czmw-relic-card" role="dialog" aria-modal="true">
        <span class="czmw-relic-badge">史实考据</span>
        <h3 class="czmw-relic-title"></h3>
        <div class="czmw-relic-meta"></div>
        <p class="czmw-relic-desc"></p>
        <div class="czmw-relic-footer">
          <span class="czmw-relic-hint">按 E 或 Esc 关闭</span>
          <button class="czmw-relic-close" type="button">关闭</button>
        </div>
      </div>
    `;
    container.append(relicModal);

    function openRelicModal(data) {
      if (!data) return;
      relicModal.querySelector('.czmw-relic-title').textContent = data.name;
      relicModal.querySelector('.czmw-relic-meta').textContent = data.era;
      relicModal.querySelector('.czmw-relic-desc').textContent = data.desc;
      relicModal.hidden = false;
      relicModal.animate([{opacity:0},{opacity:0,offset:.48},{opacity:1}],{duration:310});
      relicModal.classList.add('is-open');
      if (window.CZMarchWorld) CZMarchWorld.pause('relic-modal');
    }
    function closeRelicModal() {
      if (relicModal.hidden) return;
      relicModal.classList.remove('is-open');
      relicModal.hidden = true;
      if (window.CZMarchWorld) CZMarchWorld.resume('relic-modal');
    }
    relicModal.querySelector('.czmw-relic-close').onclick = closeRelicModal;
    relicModal.onclick = e => { if (e.target === relicModal) closeRelicModal(); };
    const modalKeyHandler = e => {
      if (!relicModal.hidden && (e.code === 'KeyE' || e.code === 'Escape')) {
        e.preventDefault();
        e.stopPropagation();
        closeRelicModal();
      }
    };
    window.addEventListener('keydown', modalKeyHandler, true);

    const RELIC_DATA = {
      Prop_MeetingTable: {
        name: '板栗色长桌与二十人座次复原',
        era: '1935年1月15日至17日 · 柏辉章公馆二楼',
        desc: '这面长约3.3米、宽约1.1米的板栗色长桌，是遵义会议的核心见证。1935年1月15日至17日，中共中央政治局扩大会议在此举行，毛泽东、周恩来、朱德、张闻天、王稼祥、博古、李德等20人围坐于长桌周围。会议深入讨论了第五次反“围剿”以来的军事路线，确立了毛泽东同志在党中央和红军的领导地位，在极端危急的历史关头挽救了党、挽救了红军、挽救了中国革命。'
      },
      Prop_HangingLamp: {
        name: '荷叶边盖洋吊灯',
        era: '夜间会议核心光源 · 煤油挂灯',
        desc: '悬挂于会议室天花中央的荷叶边玻璃盖洋吊灯，为中西合璧式煤油照明灯具。遵义会议的三天会期均在晚间至深夜举行，这盏煤油吊灯散发的柔和暖光，照亮了中央政治局同志激烈讨论的发言记录与决议草案，是长征生死转折时刻的照明见证。'
      },
      Prop_CharcoalBrazier: {
        name: '长桌下取暖炭火盆',
        era: '黔北隆冬严寒与会场实况',
        desc: '1935年1月的贵州遵义正值数九隆冬，阴雨连绵，湿冷刺骨。为保障会议连续数小时的高强度讨论，长桌下方特置带架灰黑生铁炭火盆，盆内燃以木炭取暖。炭火余温伴随会议代表们通宵达旦地总结经验教训，生动再现了艰苦岁月中的真实会场风貌。'
      },
      Prop_WallClock: {
        name: '东壁自鸣木壳机械摆钟',
        era: '历史时刻的精准记录者',
        desc: '高悬于会议室东壁板墙上的木壳机械摆钟，按历史原貌1:1复原。摆钟发条驱动、自鸣报时，见证了1935年1月15日晚会议开幕至17日深夜原则通过《中央关于反对敌人五次“围剿”的总结决议》的全部历史历程。'
      },
      Prop_WardrobeMirror: {
        name: '穿衣镜壁柜与西壁彩玻窗',
        era: '中西合璧黔北民居建筑肌理',
        desc: '原会址主楼为黔军师长柏辉章公馆，二楼的小客厅用作会议室。东侧板壁并排立有带全身穿衣镜的木质衣柜与双门暗柜；西壁开有木格玻璃窗，底排为浅色彩玻，兼具二十世纪三十年代黔北传统木构与西式洋房装饰特色。'
      }
    };
    const DOOR_EXIT_DATA = {
      name: '二楼会议室出口'
    };

    for (const data of [...Object.values(RELIC_DATA), DOOR_EXIT_DATA]) {
      data.enabled = true;
      data.label = data.name;
      data.actionLabel = data === DOOR_EXIT_DATA ? '按 E 返回前院' : '按 E 查看考据';
    }
    let indoorRoomModel = null;
    let indoorLightGroup = null;
    let activeIndoorTarget = null;
    let savedOutdoorClearance = null;
    // Clip only the volume occupied by the room out of the exterior shell.
    // The paving, walls, trees and sky remain the same objects on both sides.
    const shellMaterials = new Set();
    let roomClipPlanes;
    function setRoomCutaway(inside) {
      for (const material of shellMaterials) {
        material.clippingPlanes = inside ? roomClipPlanes : null;
        material.clipIntersection = inside;
      }
      renderer.localClippingEnabled = inside;
    }

    function updateIndoorRelicDetection(camera) {
      if (!isIndoors) return;
      const dir = new T.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const camPos = camera.position;
      let bestTarget = null, bestScore = -Infinity;

      const doorPos = roomCenters.get('Door_Exit');
      const doorOffset = doorPos.clone().sub(camPos);
      const doorDist = doorOffset.length();
      doorOffset.normalize();
      const doorDot = dir.dot(doorOffset);
      if (doorDist <= 2.2 && doorDot >= 0.58) {
        bestTarget = { type: 'door', data: DOOR_EXIT_DATA };
      }

      if (!bestTarget) {
        for (const [key, relic] of Object.entries(RELIC_DATA)) {
          const relicPos = roomCenters.get(key);
          const offset = relicPos.clone().sub(camPos);
          const dist = offset.length();
          if (dist > 3.4) continue;
          offset.normalize();
          const dot = dir.dot(offset);
          if (dot >= 0.38) {
            const score = dot ** 8 / (dist + 0.8);
            if (score > bestScore) {
              bestScore = score;
              bestTarget = { type: 'relic', key, data: relic };
            }
          }
        }
      }

      activeIndoorTarget = bestTarget;
    }

    const roomCenters = new Map();
    const furnitureBounds = [];
    let roomLoading = null;
    async function loadMeetingRoom() {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
      const draco = new DRACOLoader().setDecoderPath('/assets/webgpu40/vendor/three/jsm/libs/draco/gltf/');
      try {
        const loader = new GLTFLoader().setDRACOLoader(draco);
        const gltf = await loader.loadAsync('/assets/scenes/zunyi-realscan/zunyi-meeting-room-web.glb');
        indoorRoomModel = gltf.scene;
      } finally {
        draco.dispose();
      }

      indoorRoomModel.name = 'zunyi-meeting-room';
      indoorRoomModel.position.copy(roomOffset);
      indoorRoomModel.traverse(node => {
        if (node.isMesh && /ZY (winter|rose|straw) glass/.test(node.material.name)) node.material.depthWrite = false;
      });
      street.traverse(node => {
        if (node.isMesh && /^(ZY_(plaster|brick|roof|wood|trim|amber)|WestPane_|West gallery)/.test(node.material.name)) {
          shellMaterials.add(node.material);
        }
      });
      street.add(indoorRoomModel);
      const center = indoorRoomModel.getWorldPosition(new T.Vector3());
      roomClipPlanes = [
        new T.Plane(new T.Vector3(-1,0,0), center.x-2.54), new T.Plane(new T.Vector3(1,0,0), -center.x-2.45),
        new T.Plane(new T.Vector3(0,-1,0), center.y-.06), new T.Plane(new T.Vector3(0,1,0), -center.y-3.51),
        new T.Plane(new T.Vector3(0,0,-1), center.z-3.34), new T.Plane(new T.Vector3(0,0,1), -center.z-3.34)
      ];
      indoorRoomModel.visible = false;
      if (dead) { indoorRoomModel.removeFromParent(); releaseResources(indoorRoomModel, false); return null; }
      indoorRoomModel.updateWorldMatrix(true, true);
      for (const key of [...Object.keys(RELIC_DATA), 'Door_Exit', 'FoldingChairs_20', 'Prop_WardrobePlain']) {
        const node = indoorRoomModel.getObjectByName(key);
        if (!node) throw Error('会议室缺少节点 ' + key);
        const box = new T.Box3().setFromObject(node, true);
        roomCenters.set(key, box.getCenter(new T.Vector3()));
        if (['FoldingChairs_20','Prop_MeetingTable','Prop_WardrobeMirror','Prop_WardrobePlain'].includes(key))
          furnitureBounds.push(box);
      }

      indoorLightGroup = new T.Group();
      indoorLightGroup.name = 'zunyi-indoor-lights';
      const indoorFill = new T.AmbientLight('#e4e8f0', 2.48);
      const lampLight = new T.PointLight('#ffb375', 1.3, 6, 2);
      lampLight.position.copy(toWorld(roomX, roomZ, roomFloor() + 2.5));
      const coal=new T.PointLight(0xff622e,.42,1.75,2);
      coal.position.copy(roomCenters.get('Prop_CharcoalBrazier'));coal.position.y+=.14;
      indoorLightGroup.add(indoorFill, lampLight,coal);
      worldRoot.add(indoorLightGroup);
      indoorLightGroup.visible = false;

      return indoorRoomModel;
    }

    const outdoorVisible = [];
    let inTransition = false;
    async function fadeTransition(fn) {
      if (inTransition) return Promise.resolve();
      inTransition = true;
      if (cameraMode === 'fps' && arms?.reaching) {
        await new Promise(resolve => setTimeout(resolve,140));
        if (dead) return;
      }
      fadeCurtain.classList.add('is-active');
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            if (!dead) await fn();
          } catch (error) {
            reject(error);
          } finally {
            setTimeout(() => {
              fadeCurtain.classList.remove('is-active');
              setTimeout(() => {
                inTransition = false;
                resolve();
              }, 300);
            }, 50);
          }
        }, 300);
      });
    }

    async function enterMeetingRoom(session) {
      const activeSession = session || view?.session;
      if (!cinematic || isIndoors || inTransition || roomLoading || dead) return false;
      try {
        if (!indoorRoomModel) {
          roomLoading = loadMeetingRoom();
          await roomLoading;
        }
      } catch (error) {
        if (indoorRoomModel) { indoorRoomModel.removeFromParent(); releaseResources(indoorRoomModel, false); }
        indoorRoomModel = null;
        roomCenters.clear();
        furnitureBounds.length = 0;
        if (!dead) showToast('会议室加载失败，请稍后重新进屋');
        console.warn('Zunyi meeting room', error);
        return false;
      } finally { roomLoading = null; }
      if (dead || !indoorRoomModel) return false;
      const enteringFromFps = cameraMode === 'fps';
      if (enteringFromFps) arms?.touch();
      await fadeTransition(() => {
        const model = indoorRoomModel;
        isIndoors = true;
        for (const obj of [...worldRoot.children, hemi, sun]) {
          if (obj !== street && obj !== indoorLightGroup && obj.visible) { outdoorVisible.push(obj); obj.visible = false; }
        }
        model.visible = true;
        setRoomCutaway(true);
        const peds = scene.getObjectByName('zunyi-pedestrians');
        if (peds) peds.visible = false;

        updateFieldOfView();
        indoorLightGroup.visible=true;
        if (!roomReflection) {
          const generator=new T.PMREMGenerator(renderer);
          try { roomReflection=generator.fromScene(scene,.025,.06,12,{size:64,position:toWorld(roomX-1,roomZ-1.1,roomFloor()+.56)}); }
          finally { generator.dispose(); }
        }
        scene.environment=roomReflection.texture;
        scene.environmentIntensity=.63;
        renderer.toneMappingExposure=1.19;

        if (activeSession?.grid) {
          savedOutdoorClearance = activeSession.grid.clearance;
          activeSession.grid.clearance = (x, y) => {
            const r = .24;
            if (x - r < (roomX - 2.3) || x + r > (roomX + 2.3) || y - r < (roomZ - 3.2) || y + r > (roomZ + 3.2)) return false;
            const px = x - world.w / 2, pz = y - world.h / 2;
            return furnitureBounds.every(box => Math.hypot(px - Math.max(box.min.x, Math.min(px, box.max.x)),
              pz - Math.max(box.min.z, Math.min(pz, box.max.z))) >= r);
          };
        }

        const player = logicalScene.focusActor;
        if (player) {
          player.setPos(roomX + .1, roomZ - 2.82, Math.PI / 2);
          yaw = 1.65; pitch = .17;
          followTarget.copy(onSurface(player.x, player.y, FOCUS_HEIGHT));
        }
        window.CZMarchWorld.setCameraMode('fps', { instant: true });
        if (!enteringFromFps) arms?.touch();
      });
      return true;
    }

    async function exitMeetingRoom(session) {
      const activeSession = session || view?.session;
      if (!isIndoors || inTransition || dead) return false;
      await fadeTransition(() => {
        isIndoors = false;
        for (const obj of outdoorVisible.splice(0)) obj.visible = true;
        activeIndoorTarget = null;
        if (indoorRoomModel) indoorRoomModel.visible = false;
        if (indoorLightGroup) indoorLightGroup.visible = false;
        setRoomCutaway(false);
        const peds = scene.getObjectByName('zunyi-pedestrians');
        if (peds) peds.visible = true;

        scene.environment=reflectionTarget?.texture ?? null;
        scene.environmentIntensity=.98;
        updateFieldOfView();
        renderer.toneMappingExposure=staging.exposure;

        if (activeSession?.grid && savedOutdoorClearance) {
          activeSession.grid.clearance = savedOutdoorClearance;
        }

        const player = logicalScene.focusActor;
        if (player) {
          player.setPos(81.0, 35.5, Math.PI / 2);
          yaw = Math.PI / 2; pitch = .16;
          followTarget.copy(onSurface(player.x, player.y, FOCUS_HEIGHT));
        }
        window.CZMarchWorld.setCameraMode('tps', { instant: true });
        const fpsTip = container.querySelector('.czmw-fps-tip');
        if (fpsTip) fpsTip.classList.remove('is-visible');
      });
      return true;
    }

    function handleInteract(anchorId, session) {
      const activeSession = session || view?.session;
      if (inTransition || roomLoading) return true;
      if (isIndoors) {
        if (activeIndoorTarget?.type === 'door') {
          arms?.touch();
          exitMeetingRoom(activeSession);
          return true;
        }
        if (activeIndoorTarget?.type === 'relic') {
          arms?.touch();
          openRelicModal(activeIndoorTarget.data);
          return true;
        }
        return true;
      }
      if (anchorId === 'chapter-3/anchor-indoor-meeting-room') {
        enterMeetingRoom(activeSession);
        return true;
      }
      return false;
    }

    function cameraPosition(target, distance = boom) {
      if (staging.inspectionOffset) return target.clone().add(new T.Vector3(...staging.inspectionOffset));
      const horizontal = Math.cos(pitch) * distance;
      return target.clone().add(new T.Vector3(
        -Math.cos(yaw) * horizontal - Math.sin(yaw) * SHOULDER,
        Math.sin(pitch) * distance,
        -Math.sin(yaw) * horizontal + Math.cos(yaw) * SHOULDER
      ));
    }

    const cameraUp = new T.Vector3(), shoulderOrigin = new T.Vector3(), hitPoint = new T.Vector3();
    const viewDirection = new T.Vector3(), lookPoint = new T.Vector3();
    // Probe the center and the four sides of the near plane.
    const cameraSamples = [[0, 0], [-.12, 0], [.12, 0], [0, -.12], [0, .12],
      [-.12, -.12], [.12, -.12], [-.12, .12], [.12, .12]];

    function cameraClearance(origin, direction, length, margin, focusHeight) {
      if (cinematic && isIndoors) {
        let clear = length;
        const x = origin.x + world.w / 2, z = origin.z + world.h / 2;
        if (direction.x < -0.2) clear = Math.min(clear, Math.max(0, (x - (roomX - 2.3)) / -direction.x) - margin);
        if (direction.x > 0.2) clear = Math.min(clear, Math.max(0, ((roomX + 2.3) - x) / direction.x) - margin);
        if (direction.z < -0.2) clear = Math.min(clear, Math.max(0, (z - (roomZ - 3.2)) / -direction.z) - margin);
        if (direction.z > 0.2) clear = Math.min(clear, Math.max(0, ((roomZ + 3.2) - z) / direction.z) - margin);
        return Math.max(0, clear);
      }
      let clear = length;
      cameraRay.set(origin, direction);
      cameraRay.far = length + margin;
      for (const { object, bounds } of cameraObstacles) {
        if (object && object !== ground && bounds.max.y <= focusHeight - .25) continue;
        if (!cameraRay.ray.intersectsBox(bounds)) continue;
        if (!object) {
          if (bounds.containsPoint(origin)) return 0;
          if (cameraRay.ray.intersectBox(bounds, hitPoint)) {
            clear = Math.min(clear, origin.distanceTo(hitPoint) - margin);
          }
        } else {
          const hit = cameraRay.intersectObject(object, true).find(hit => hit.object === ground || hit.object.castShadow);
          if (hit) clear = Math.min(clear, hit.distance - margin);
        }
      }
      return Math.max(0, clear);
    }

    function placeCamera(target, dt) {
      const inspection = staging.inspectionOffset;
      if (inspection) cameraDirection.set(...inspection).normalize();
      else {
        const orbitYaw = yaw + freeLookYawOffset;
        cameraDirection.set(-Math.cos(orbitYaw) * Math.cos(pitch), Math.sin(pitch), -Math.sin(orbitYaw) * Math.cos(pitch));
      }
      const fullDistance = inspection ? Math.hypot(...inspection) : boom;
      cameraRight.set(cameraDirection.z, 0, -cameraDirection.x).normalize();
      cameraUp.crossVectors(cameraDirection, cameraRight).normalize();
      // Fit the shoulder offset before casting the arm. The view remains parallel to the arm.
      const shoulder = inspection ? 0 : cameraClearance(target, cameraRight, SHOULDER, WALL_MARGIN, target.y);
      shoulderOrigin.copy(target).addScaledVector(cameraRight, shoulder);
      let targetDist = fullDistance;
      for (const [side, up] of cameraSamples) {
        rayOrigin.copy(shoulderOrigin).addScaledVector(cameraRight, side).addScaledVector(cameraUp, up);
        targetDist = Math.min(targetDist, cameraClearance(rayOrigin, cameraDirection, fullDistance, WALL_MARGIN, target.y));
      }
      // A wall always wins, even if the safe limit is shorter than the normal minimum.
      if (cameraDistance == null || targetDist < cameraDistance) cameraDistance = targetDist;
      else cameraDistance = T.MathUtils.lerp(cameraDistance, targetDist, 1 - Math.exp(-dt * 5.5));
      cameraDistance = T.MathUtils.clamp(cameraDistance, Math.min(MIN_TPS_DIST, targetDist), targetDist);
      camera.position.copy(shoulderOrigin).addScaledVector(cameraDirection, cameraDistance);
      camera.lookAt(lookPoint.copy(camera.position).addScaledVector(cameraDirection, -1));
      updateCameraStats(cameraDistance, targetDist < fullDistance - .01);
    }

    function updateCameraStats(distance, occluded) {
      camera.updateMatrixWorld();
      camera.getWorldDirection(viewDirection);
      viewYaw = Math.atan2(viewDirection.z, viewDirection.x);
      stats.orbitYaw = +viewYaw.toFixed(3);
      stats.cameraPitch = +Math.asin(-viewDirection.y).toFixed(3);
      stats.cameraBoom = cameraMode === 'fps' ? 0 : +boom.toFixed(3);
      stats.cameraDistance = +distance.toFixed(3);
      stats.cameraOccluded = occluded;
    }

    let stepPhase=0, stepAmplitude=0;
    const quietMotion=matchMedia('(prefers-reduced-motion: reduce)');
    function placeActiveCamera(dt) {
      if (cameraMode === 'fps') {
        // Both views share the same vertically smoothed terrain and stair sample.
        camera.position.copy(followTarget);
        const speed=logicalScene.focusActor?.speed || 0;
        stepAmplitude=T.MathUtils.damp(stepAmplitude,quietMotion.matches || logicalScene.focusActor?.airborne ? 0 : Math.min(speed/4,1.35),12,dt);
        if (!logicalScene.focusActor?.airborne) {
          const cycle = actors?.strideCycle();
          stepPhase += dt*(cycle?.rate ?? speed*1.85);
          if (cycle && speed>.1) {
            const error = cycle.phase-stepPhase;
            stepPhase += Math.atan2(Math.sin(error),Math.cos(error))*(1-Math.exp(-8*dt));
          }
        }
        camera.position.y += EYE_HEIGHT - FOCUS_HEIGHT + .013*stepAmplitude*Math.cos(2*stepPhase);
        viewDirection.set(Math.cos(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch));
        camera.lookAt(lookPoint.copy(camera.position).add(viewDirection));
        camera.rotateZ(-.005*stepAmplitude*Math.sin(stepPhase));
        updateCameraStats(0, false);
      } else {
        placeCamera(followTarget, dt);
      }
    }

    function setCameraMode(mode, { instant = false } = {}) {
      if (isIndoors && mode !== 'fps' || mode !== 'tps' && mode !== 'fps' || intro || graphicsLost || dead || !logicalScene.focusActor) return false;
      if (mode === cameraMode) return true;
      if (isOrbiting()) yaw = lockedBodyYaw;
      freeLookActive = false;
      freeLookYawOffset = 0;
      cameraMode = stats.cameraMode = mode;
      pitchGoal = null;
      const safePitch = clampPitch(pitch);
      if (instant) pitch = safePitch;
      else if (pitch !== safePitch) pitchGoal = safePitch;
      // Reopen the TPS boom from the near end, respecting walls on the first frame.
      cameraDistance = mode === 'tps' && !instant ? 0 : null;
      placeActiveCamera(0);
      logicalScene.focusActor.faceCamera(viewYaw);
      return true;
    }

    const portraitScale = () => mobile && innerWidth < innerHeight ? 1.18 : 1;
    function follow(player, dt) {
      if (intro || graphicsLost) return;
      if (pitchGoal !== null) {
        pitch = T.MathUtils.lerp(pitch, pitchGoal, 1 - Math.exp(-dt * 18));
        if (Math.abs(pitch - pitchGoal) < .001) {
          pitch = pitchGoal;
          pitchGoal = null;
        }
      }
      if (!freeLookActive && freeLookYawOffset) {
        freeLookYawOffset *= Math.exp(-dt * 22);
        if (Math.abs(freeLookYawOffset) < .012) freeLookYawOffset = 0;
      }
      if (player.navigating) followingRoute = true;
      else if (player.moving) followingRoute = false;
      if (!isOrbiting() && followingRoute && player.routeHeading != null) {
        const delta = player.routeHeading - yaw;
        const turn = Math.atan2(Math.sin(delta), Math.cos(delta));
        yaw += turn * (1 - Math.exp(-dt * 12));
        if (!player.navigating && Math.abs(turn) < .002) followingRoute = false;
      }
      const distance = (BASE_DISTANCE + (player.running ? SPRINT_OFFSET : 0)) * portraitScale();
      boom = T.MathUtils.lerp(boom, distance, 1 - Math.exp(-dt * 7));
      const target = onSurface(player.x, player.y, FOCUS_HEIGHT + player.jumpHeight * .45);
      const blend = 1 - Math.pow(.003, Math.min(dt, .1));
      followTarget.set(target.x, T.MathUtils.lerp(followTarget.y, target.y, blend), target.z);
      placeActiveCamera(dt);
      player.faceCamera(isOrbiting() ? lockedBodyYaw : viewYaw);
    }

    function finishIntro(result) {
      if (!intro) return;
      const resolve = intro.resolve;
      followTarget.copy(onSurface(intro.player.x, intro.player.y, FOCUS_HEIGHT));
      cameraDistance = null;
      intro = null;
      introOverlay?.remove();
      introOverlay = null;
      resolve(result);
    }

    function updateIntro(dt) {
      if (!intro) return;
      intro.elapsed += dt;
      const progress = Math.min(1, intro.elapsed / intro.duration);
      const playerPoint = onSurface(intro.player.x, intro.player.y, FOCUS_HEIGHT);
      const shot = data => ({ eye: onSurface(data[0], data[1], data[2]), look: onSurface(data[3], data[4], data[5]) });
      const first = shot(staging.shots[0]), second = shot(staging.shots[1]);
      const local = progress < .58 ? progress / .58 : (progress - .58) / .42, eased = local * local * (3 - 2 * local);
      camera.position.copy(progress < .58 ? first.eye.lerp(second.eye, eased) : second.eye.lerp(cameraPosition(playerPoint), eased));
      camera.position.y = Math.max(camera.position.y, terrain.height(camera.position.x + world.w / 2, camera.position.z + world.h / 2) + 1.5);
      camera.lookAt(progress < .58 ? first.look.lerp(second.look, eased) : second.look.lerp(playerPoint, eased));
      if (progress >= 1) finishIntro('completed');
    }

    function initializeCamera(player) {
      yaw = viewYaw = player.facing;
      freeLookActive = false;
      freeLookYawOffset = 0;
      boom = BASE_DISTANCE * portraitScale();
      cameraDistance = null;
      followTarget.copy(onSurface(player.x, player.y, FOCUS_HEIGHT));
      placeCamera(followTarget, 0);
      player.faceCamera(isOrbiting() ? lockedBodyYaw : viewYaw);
    }

    function playIntro(player) {
      const cfg = M.visual3d.intro(logicalScene);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve('reduced-motion');
      introOverlay = document.createElement('div');
      introOverlay.className = 'czmw-cinema3d';
      const copy = document.createElement('div');
      copy.className = 'czmw-cinema-copy3d';
      const eyebrow = document.createElement('small');
      eyebrow.textContent = cfg.eyebrow;
      const title = document.createElement('strong');
      title.textContent = cfg.title;
      const subtitle = document.createElement('span');
      subtitle.textContent = cfg.subtitle;
      copy.append(eyebrow, title, subtitle);
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'czmw-cinema-skip3d';
      skip.textContent = '跳过开场';
      skip.dataset.czmwUi = 'true';
      skip.addEventListener('click', () => finishIntro('skipped'));
      introOverlay.append(copy, skip);
      container.append(introOverlay);
      return new Promise(resolve => {
        intro = { elapsed: 0, duration: cfg.duration, player, resolve };
      });
    }

    const view = {
      streetActive: Boolean(street),
      cam,
      canvas,
      stats,
      project,
      unproject,
      follow,
      drawGuide,
      playIntro,
      initializeCamera,
      setFreeLook,
      setCameraMode,
      getCameraMode: () => cameraMode,
      setCameraAngle(targetYaw, targetPitch = 0) {
        if (!logicalScene.focusActor?.navigating) followingRoute = false;
        if (Number.isFinite(targetYaw)) yaw = wrapAngle(targetYaw);
        if (Number.isFinite(targetPitch)) pitch = clampPitch(targetPitch);
        placeActiveCamera(0);
      },
      adjustCamera(dx, dy = 0) {
        if (intro || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
        const player = logicalScene.focusActor;
        if (!player?.navigating) followingRoute = false;
        if (freeLookActive) freeLookYawOffset = wrapAngle(freeLookYawOffset + dx * .004);
        else if (!player?.navigating) {
          yaw = wrapAngle(yaw + dx * .004);
          if (freeLookYawOffset) lockedBodyYaw = yaw;
        }
        if (pitchGoal === null) pitch = clampPitch(pitch + dy * .004);
        else pitchGoal = clampPitch(pitchGoal + dy * .004);
        placeActiveCamera(0);
        player?.faceCamera(isOrbiting() ? lockedBodyYaw : viewYaw);
      },
      handleInteract,
      enterMeetingRoom,
      exitMeetingRoom,
      isIndoors: () => isIndoors,
      isStreetVisible: () => street ? street.visible : true,
      scene,
      getIndoorTarget: () => activeIndoorTarget,
      isTransitioning: () => inTransition,
      openRelicModal,
      closeRelicModal,
      cameraRelativeMovement({ x, y }) {
        const heading = isOrbiting() ? lockedBodyYaw : viewYaw;
        const sin = Math.sin(heading), cos = Math.cos(heading);
        return { x: -x * sin - y * cos, y: x * cos - y * sin };
      },
      headPoint(player) { return project(player.x, player.y, HEAD_POINT_HEIGHT + player.jumpHeight); },
      surfaceHeight,
      groundHeight: terrain.height,
      resize,
      onGraphicsLost: null,
      dispose() {
        if (dead) return;
        dead = true;
        finishIntro('destroyed');
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        options.signal?.removeEventListener('abort', abort);
        canvas.removeEventListener('webglcontextlost', contextLost);
        fadeCurtain.remove();
        toastEl.remove();
        relicModal.remove();
        window.removeEventListener('keydown', modalKeyHandler, true);
        arms?.dispose();
        actors?.dispose();
        streetLife?.dispose();
        weather?.dispose();
        releaseResources();
        sun.shadow.dispose();
        introOverlay?.remove();
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
      }
    };

    disposeView = () => view.dispose();

    function contextLost(event) {
      event.preventDefault();
      if (dead || graphicsLost) return;
      graphicsLost = true;
      finishIntro('graphics-lost');
      view.onGraphicsLost?.();
    }
    canvas.addEventListener('webglcontextlost', contextLost);
    function abort() { view.dispose(); }
    options.signal?.addEventListener('abort', abort, { once: true });

    function frame(ts) {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden || graphicsLost) { last = ts; return; }
      if (logicalScene.pausedDim && !intro && ts - last < 1000 / 20) return;
      const dt = Math.max(0, Math.min(.08, (ts - (last || ts - 16.7)) / 1000));
      last = ts;
      const started = performance.now();
      updateIntro(dt);
      camera.updateMatrixWorld();
      logicalScene.tick?.(dt);
      if (logicalScene.focusActor) {
        const firstPerson = cameraMode === 'fps' && !intro;
        const fadeDistance = firstPerson || intro || staging.inspectionOffset ? Infinity : (cameraDistance ?? Infinity);
        actors?.update(dt, logicalScene.focusActor, (cinematic && isIndoors) ? [] : (logicalScene.anchorEntities || []), camera, surfaceHeight, fadeDistance, firstPerson);
        if (assets && !cinematic) {
          const p = logicalScene.focusActor;
          sun.target.position.copy(onSurface(p.x, p.y));
          sun.position.copy(sun.target.position).add(new T.Vector3(...staging.sun));
          sun.target.updateMatrixWorld();
        }
      }
      if (streetLife && logicalScene.focusActor && !isIndoors)
        streetLife.update(logicalScene.pausedDim ? 0 : dt, logicalScene.focusActor, camera);
      const time = ts * .001;
      for (const fire of fires) {
        fire.material.uniforms.time.value = time;
        fire.light.intensity = 4.5 + Math.sin(time * 9 + fire.material.uniforms.phase.value) * .55 + Math.sin(time * 17) * .3;
      }
      for (const water of waters) {
        water.position.y = Math.sin(time * .8) * (logicalScene.ironBridge ? .005 : .018);
        water.material.userData.flow.value = time * ([6, 7, 10].includes(Number(logicalScene.chapterId)) ? 2.4 : environment.terrain === 'wetland' ? .2 : .85);
      }
      for (const flag of flags) {
        const positions = flag.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) positions.setZ(i, Math.sin(positions.getX(i) * 2.1 + time * 2.2) * .055);
        positions.needsUpdate = true; flag.geometry.computeVertexNormals();
      }
      for (const smoke of smokeColumns) {
        const positions = smoke.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) { const height = (i * .2 + time * .42) % 4.8; positions.setXYZ(i, Math.sin(i * 2.4 + time * .25) * .15 + height * .16, height, Math.cos(i * 2.4) * .22); }
        positions.needsUpdate = true;
      }
      for (const [id, marker] of markers) {
        if (cinematic && isIndoors) { marker.visible = false; continue; }
        const anchor = logicalScene.anchorEntities?.find(item => item.anchorId === id);
        if (anchor?.kind === 'npc') marker.visible = !!anchor.near;
        else marker.visible = anchor ? anchor.enabled && (!street || (logicalScene.focusActor && Math.hypot(anchor.x - logicalScene.focusActor.x, anchor.y - logicalScene.focusActor.y) <= 10)) : true;
        if (marker.visible) marker.rotation.z = time * .35;
      }
      if (particles) {
        const positions = particles.geometry.attributes.position, kind = logicalScene.ambient.kind;
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i), z = positions.getZ(i);
          const base = Math.max(terrain.waterLevel, terrain.height(x + world.w / 2, z + world.h / 2));
          const lift = kind === 'snow' ? 25 - (i * 2.37 + time * 1.4) % 25 : kind === 'mist' ? .6 + (i % 6) * .45 : 1 + (i * 2.37 + time * .2) % 10;
          positions.setY(i, base + lift);
        }
        positions.needsUpdate = true;
      }
      if (weather && logicalScene.focusActor) weather.update(time, logicalScene.focusActor, camera);
      if (cinematic && isIndoors) updateIndoorRelicDetection(camera);
      renderer.info.reset();
      renderer.render(scene, camera);
      const worldDraws = renderer.info.render.calls;
      const player = logicalScene.focusActor;
      const showArms = arms && player && cameraMode === 'fps' && !intro && (!logicalScene.pausedDim || arms.reaching);
      if (showArms) {
        const clearance = cameraClearance(camera.position, viewDirection, .78, .025, camera.position.y);
        stats.armsState = arms.draw(renderer, camera, player, viewYaw, pitch, clearance, dt, stepPhase, indoorLightGroup);
      } else {
        arms?.hide();
        stats.armsState = null;
      }
      stats.geometries = renderer.info.memory.geometries;
      stats.textures = renderer.info.memory.textures;
      stats.frames++;
      stats.drawCalls = renderer.info.render.calls;
      stats.armsDrawCalls = stats.drawCalls - worldDraws;
      stats.triangles = renderer.info.render.triangles;
      stats.renderMs = +(performance.now() - started).toFixed(2);
      if (stats.renderMs > 24) slow++; else slow = Math.max(0, slow - 1);
      if (slow >= 45 && dprCap > .76) {
        dprCap = Math.max(.75, dprCap * .8);
        stats.adaptive = true;
        slow = 0;
        resize();
      }
    }

    if (street && logicalScene.streetLife)
      streetLife = M.streetLife.create(T, logicalScene, container, scene, onSurface, cam, cameraObstacles);
    actors = await M.actors3d.create(T, logicalScene, scene, options.signal, options.roleId);
    if (options.signal?.aborted || graphicsLost) {
      actors.dispose();
      throw new DOMException('3D initialization interrupted', 'AbortError');
    }
    camera.position.copy(cameraPosition(followTarget));
    camera.lookAt(followTarget);
    camera.updateMatrixWorld();
    raf = requestAnimationFrame(frame);
    return view;
    } catch (error) {
      if (disposeView) disposeView();
      else {
        releaseResources();
        renderer?.dispose();
        renderer?.forceContextLoss();
        renderer?.domElement.remove();
      }
      throw error;
    }
  }

  M.renderer3d = { create };
})();
