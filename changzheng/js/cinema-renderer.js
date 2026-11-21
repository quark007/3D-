/* Genuine render passes: contact occlusion, restrained bloom, ACES output. */
const CinemaRenderer={
  modules:null,
  async create(renderer,scene,camera,isAlive){
    // Ordinary interaction uses the renderer directly: no hidden AO/bloom
    // render targets or shader compilation until cinematic mode is requested.
    let effects=null,pending=null,disposed=false;
    return {render:()=>{const q=renderer.userData?.czQuality;if(q&&(q.ao||q.bloom)){
      if(!effects&&!pending)pending=this.createEffects(renderer,scene,camera,()=>!disposed&&isAlive()).then(p=>{if(disposed)p?.dispose();else effects=p;}).catch(()=>{});
      if(effects){effects.render();return;}
    }renderer.render(scene,camera);},dispose(){disposed=true;effects?.dispose();}};
  },
  async createEffects(renderer,scene,camera,isAlive){
    this.modules??=Promise.all([
      import('./vendor/postprocessing/EffectComposer.js'),import('./vendor/postprocessing/RenderPass.js'),
      import('./vendor/postprocessing/SSAOPass.js'),import('./vendor/postprocessing/UnrealBloomPass.js'),
      import('./vendor/postprocessing/OutputPass.js'),import('./vendor/postprocessing/ShaderPass.js')]);
    const [ec,rp,ao,bloom,output,shader]=await this.modules;if(!isAlive())return null;
    const T=THREE,size=renderer.getSize(new T.Vector2()),composer=new ec.EffectComposer(renderer);
    composer.addPass(new rp.RenderPass(scene,camera));
    // Half-resolution occlusion avoids multiplying cost on laptop screens.
    const contact=new ao.SSAOPass(scene,camera,Math.max(1,size.x>>1),Math.max(1,size.y>>1),12);
    contact.kernelRadius=2.2;contact.minDistance=.0005;contact.maxDistance=.025;composer.addPass(contact);
    const glow=new bloom.UnrealBloomPass(size,.12,.35,1.15);composer.addPass(glow);
    const grade=new shader.ShaderPass({uniforms:{tDiffuse:{value:null},time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D tDiffuse;uniform float time;varying vec2 vUv;
      void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,.92);vec2 p=vUv-.5;float v=1.-.26*smoothstep(.12,.72,length(p));c*=v;float grain=fract(sin(dot(vUv+time,vec2(12.9898,78.233)))*43758.5453)-.5;c+=grain*.0025;gl_FragColor=vec4(max(c,0.),1.);}`});composer.addPass(grade);composer.addPass(new output.OutputPass());
    let oldW=0,oldH=0,oldRatio=0;return {render(){const quality=renderer.userData?.czQuality||{ao:false,bloom:false};contact.enabled=quality.ao;glow.enabled=quality.bloom;const ratio=renderer.getPixelRatio();if(ratio!==oldRatio){composer.setPixelRatio(ratio);oldRatio=ratio;}renderer.getSize(size);if(size.x!==oldW||size.y!==oldH){oldW=size.x;oldH=size.y;composer.setSize(oldW,oldH);contact.setSize(Math.max(1,oldW>>1),Math.max(1,oldH>>1));}grade.uniforms.time.value=performance.now()*.00003;composer.render();},dispose(){composer.passes.forEach(p=>p.dispose?.());composer.dispose();}};
  }
};
