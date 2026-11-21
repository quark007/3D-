const WorldLighting={
  environment(renderer,interior=false){
    const T=THREE,sky=new T.Scene(),material=new T.ShaderMaterial({side:T.BackSide,uniforms:{warm:{value:interior?1:.45}},vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 direction;uniform float warm;void main(){vec3 d=normalize(direction);float h=max(d.y,0.);vec3 color=mix(vec3(.56,.65,.68),vec3(.15,.25,.36),pow(h,.55));color=mix(color,vec3(.05,.045,.035),(1.-smoothstep(-.45,0.,d.y)));float sun=pow(max(dot(d,normalize(vec3(-.5,.7,.35))),0.),500.);color+=vec3(1.,.81,.56)*sun*18.;color=mix(color,color*vec3(1.,.8,.6),warm*.3);gl_FragColor=vec4(color,1.);}`});
    const dome=new T.Mesh(new T.SphereGeometry(100,32,16),material);sky.add(dome);const pmrem=new T.PMREMGenerator(renderer),target=pmrem.fromScene(sky,.05,.1,200);pmrem.dispose();dome.geometry.dispose();material.dispose();return target;
  }
};
