"""Exercise the unarmed viewmodel through the preview's normal input and rendering paths."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / 'evidence/fps-hands-v2'
out.mkdir(parents=True, exist_ok=True)
url = 'http://127.0.0.1:8080/march-world/preview.html?chapter=chapter-3%2Fscene-zunyi'

def verify(browser, mobile):
    width, height = (390,844) if mobile else (1280,800)
    ctx = browser.new_context(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=mobile)
    page = ctx.new_page()
    errors = []
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.on('response',lambda r:errors.append(str(r.status)+' '+r.url) if r.status>=400 else None)
    # Hold a completed game frame for capture; resume the original RAF queue afterwards.
    page.add_init_script("""const raf=window.requestAnimationFrame.bind(window), pending=[];
      window.holdFrame=false;window.requestAnimationFrame=cb=>window.holdFrame ? (pending.push(cb),0) : raf(cb);
      window.resumeGame=()=>{window.holdFrame=false;pending.splice(0).forEach(cb=>raf(cb))}""")
    page.goto(url+'&3d=1')
    page.wait_for_function('window.CZMarchWorld?.mounted')
    E=page.evaluate
    E("""async()=>{const W=CZMarchWorld, assets=W._.assets3d,load=assets.load,mod=W._.renderer3d,create=mod.create;
      assets.load=async(...args)=>{const result=await load(...args);window.hands=result.models.playerArms;return result};
      mod.create=async(...args)=>{window.v=await create(...args);return v};
      const scene=W.manifest.scenes.find(s=>s.chapterId==3);
      await W.mount(document.querySelector('#world'),{chapterId:3,sceneId:scene.sceneId,spawn:{x:57,y:27,facing:'s'},anchors:scene.anchors,playIntro:false});
      window.pl=v.session.player;window.T=await import('three');window.W=W;
      W.setCameraMode('fps',{instant:true});v.setCameraAngle(Math.PI/2,.025);
      document.querySelector('#world').focus();}""")
    page.add_style_tag(content='body{grid-template-rows:minmax(0,1fr)}body>header,body>footer{display:none}')
    E("""()=>{window.samples=[];window.peak={calls:0,triangles:0};const vec=new T.Vector3();
      function tops(arm){let top=1;
        arm.traverse(o=>{if(!o.isMesh)return;const pos=o.geometry.attributes.position;
          for(let i=0;i<pos.count;i+=3){o.getVertexPosition(i,vec);vec.applyMatrix4(o.matrixWorld);
            vec.project(hands.parent);
            if(Math.abs(vec.x)<=1 && Math.abs(vec.z)<=1 && Math.abs(vec.y)<=1)top=Math.min(top,(1-vec.y)/2);
          }});return top}
      const arms=['FPS_Arm_Left','FPS_Arm_Right'].map(k=>hands.getObjectByName(k));
      function monitor(){const s=v.stats,state=s.armsState,top=arms.map(tops);
        peak.calls=Math.max(peak.calls,s.drawCalls);peak.triangles=Math.max(peak.triangles,s.triangles);
        samples.push({state,top,t:performance.now(),speed:pl.speed,angle:arms[0].rotation.x,y:arms[0].position.y,flex:arms[0].children[0]?.morphTargetInfluences?.[0]});
        if(window.captureWhen?.(samples.at(-1))) {holdFrame=true;window.captureWhen=null}
        requestAnimationFrame(monitor)} monitor()}""")
    def wait(test):
        try:
            page.wait_for_function(test,polling=30,timeout=7000)
        except Exception:
            print(test,E("({recent:samples.slice(-1),states:[...new Set(samples.map(s=>s.state))],min:samples.reduce((v,s)=>v.map((n,i)=>Math.min(n,s.top[i])),[1,1]),pos:[pl.x,pl.y],modal:[...document.querySelectorAll('.czmw-relic-modal')].map(m=>m.hidden),transition:v.isTransitioning(),target:v.getIndoorTarget()?.key})"),errors,flush=True)
            raise
    def capture(name,condition):
        E('()=>{window.captureWhen='+condition+'}')
        wait('window.holdFrame===true')
        page.screenshot(path=out/(('portrait-' if mobile else '')+name+'.png'))
        E('resumeGame()')
    page.wait_for_timeout(480)
    capture('01-idle',"(s)=>s.state==='idle' && Math.min(...s.top)===1")
    # Check down/up pitch and a real 16:9 viewport independently of artwork.
    if not mobile:page.set_viewport_size({'width':1280,'height':720})
    for pitch in [1.1,-.92]:
        E("p=>v.setCameraAngle(Math.PI/2,p)",pitch);page.wait_for_timeout(400)
        assert E("samples.at(-1).top.every(y=>y===1)")
    if not mobile:page.set_viewport_size({'width':width,'height':height})
    E("v.setCameraAngle(Math.PI/2,.025)");page.wait_for_timeout(400)
    cdp=ctx.new_cdp_session(page)
    def move(mode):
        if mobile:
            box=page.locator('.czmw-stick86').bounding_box()
            x=box['x']+box['width']/2;y=box['y']+box['height']/2
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-box['height']*(.48 if mode=='run' else .28)}]})
        else:
            if mode=='run':page.keyboard.down('Shift')
            page.keyboard.down('w')
    def stop():
        if mobile:cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        else:
            page.keyboard.up('w');page.keyboard.up('Shift')
    def gait(mode):
        E('samples.length=0')
        move(mode)
        cutoff=(.92 if mobile else .88) if mode=='walk' else (.85 if mobile else .76)
        condition=f"(s)=>s.state==='{mode}' && Math.min(...s.top)<{cutoff} && Math.max(...s.top)>.98"
        capture('02-walk' if mode=='walk' else '03-sprint',condition)
        wait(f"samples.some(s=>s.state==='{mode}'&&s.top[0]<{cutoff})&&samples.some(s=>s.state==='{mode}'&&s.top[1]<{cutoff})")
        stop()
        return E('samples.reduce((v,s)=>v.map((n,i)=>Math.min(n,s.top[i])),[1,1])')
    data={'idleTop':E('samples.at(-1).top'),'walkTop':gait('walk'),'runTop':gait('run')}
    data['sprintElbowsDeg']=E("""()=>['FPS_Arm_Left','FPS_Arm_Right'].map(name=>{
      let cloth;hands.getObjectByName(name).traverse(o=>{if(o.material?.name.includes('twill'))cloth=o});
      const g=cloth.geometry,pos=g.attributes.position,delta=g.morphAttributes.position[0];
      function ring(test){const sum=new T.Vector3();let count=0;
        for(let i=0;i<pos.count;i++)if(test(pos.getZ(i))){sum.add(new T.Vector3().fromBufferAttribute(pos,i)).add(new T.Vector3().fromBufferAttribute(delta,i));count++}
        return sum.divideScalar(count)}
      return T.MathUtils.radToDeg(ring(z=>z>.47).angleTo(ring(z=>z<-.217)))})""")
    assert all(85<=a<=95 for a in data['sprintElbowsDeg']),data['sprintElbowsDeg']
    page.wait_for_timeout(450)
    page.keyboard.press('c');page.keyboard.down('w')
    wait("samples.at(-1).state==='walk' && pl.speed>1 && pl.speed<2.1")
    wait("pl.speed>1.76 && pl.speed<1.84")
    data['slowSpeed']=E('pl.speed')
    E('samples.length=0')
    wait("samples.some(s=>s.top[0]<.995)&&samples.some(s=>s.top[1]<.995)")
    data['slowTop']=E('samples.reduce((v,s)=>v.map((n,i)=>Math.min(n,s.top[i])),[1,1])')
    page.keyboard.up('w');page.keyboard.press('c');page.wait_for_timeout(650)
    E('samples.length=0');page.keyboard.press('Space')
    wait("samples.some(s=>s.state==='land')")
    page.wait_for_timeout(450)
    data['jumpStates']=E('[...new Set(samples.map(s=>s.state))]')
    assert {'jump','land','idle'}<=set(data['jumpStates'])
    data['jumpTop']=E("Math.min(...samples.filter(s=>s.state==='jump').flatMap(s=>s.top))")
    data['landingElbowY']=E("samples.filter(s=>s.state==='land').map(s=>+s.y.toFixed(3))")
    assert data['jumpTop']<.98 and min(data['landingElbowY'])<-.44 and max(data['landingElbowY'])>-.42
    E("pl.setPos(81,36.6,0);v.setCameraAngle(-Math.PI/2,.12)")
    wait("v.session.lastNear?.anchorId==='chapter-3/anchor-indoor-meeting-room'")
    def action():
        if mobile:page.locator('.czmw-act').tap()
        else:page.keyboard.press('e')
    action();wait('v.isIndoors() && !v.isTransitioning()');page.wait_for_timeout(400)
    E("""()=>{const pt=new T.Box3().setFromObject(v.scene.getObjectByName('Prop_MeetingTable'),true).getCenter(new T.Vector3());
      const dx=pt.x-(pl.x-80),dz=pt.z-(pl.y-55);v.setCameraAngle(Math.atan2(dz,dx),Math.atan2(v.surfaceHeight(pl.x,pl.y)+1.65-pt.y,Math.hypot(dx,dz)));samples.length=0}""")
    wait("v.getIndoorTarget()?.key==='Prop_MeetingTable'")
    action();wait("!document.querySelector('.czmw-relic-modal').hidden && samples.some(s=>s.state==='interact'&&s.top[1]<.96)")
    page.wait_for_timeout(450)
    data['touchRightTop']=E("Math.min(...samples.filter(s=>s.state==='interact').map(s=>s.top[1]))")
    page.keyboard.press('Escape')
    wait("document.querySelector('.czmw-relic-modal').hidden")
    E("pl.moveTo([{x:89.786,y:18.83},{x:89.786,y:19.10}])")
    wait("Math.hypot(pl.x-89.786,pl.y-19.10)<.04")
    E("""()=>{pl.stop();const door=v.scene.getObjectByName('Door_Exit');
      const pt=new T.Box3().setFromObject(door,true).getCenter(new T.Vector3());
      const dx=pt.x-(pl.x-80),dz=pt.z-(pl.y-55);
      v.setCameraAngle(Math.atan2(dz,dx),Math.atan2(v.surfaceHeight(pl.x,pl.y)+1.65-pt.y,Math.hypot(dx,dz)));samples.length=0}""")
    wait("v.getIndoorTarget()?.type==='door'")
    action();wait("!v.isIndoors() && !v.isTransitioning() && W.getCameraMode()==='tps'")
    data['exitRightTop']=E("Math.min(...samples.filter(s=>s.state==='interact').map(s=>s.top[1]))")
    assert data['exitRightTop']<.96
    data['peak']=E('peak');data['errors']=errors
    assert not errors and data['peak']['calls']<=120 and data['peak']['triangles']<=120000
    ctx.close()
    return data

with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',args=['--use-angle=d3d11'])
    report={}
    for mobile in (False,True):
        key='portrait' if mobile else 'desktop'
        report[key]=verify(browser,mobile)
        print(key,report[key],flush=True)
        (out/'browser.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    page=browser.new_page();page.goto(url+'&3d=0');page.wait_for_function('CZMarchWorld.mounted')
    report['fallback']=page.evaluate('CZMarchWorld.performance.backend')
    assert report['fallback']=='canvas'
    (out/'browser.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    browser.close()
