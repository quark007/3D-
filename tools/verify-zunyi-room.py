"""Browser acceptance against the running project server. Requires Playwright and Edge."""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
photos="--photos" in sys.argv
lookdev="--lookdev" in sys.argv or photos
out=root/"evidence"/("zunyi-1to1-real" if photos else "realism-upgrade" if lookdev else "zunyi-full-integration")
url="http://127.0.0.1:8080/march-world/preview.html?chapter=chapter-3%2Fscene-zunyi"
report={}
out.mkdir(parents=True,exist_ok=True)
def verify(browser,mobile):
    width,height=(390,844) if mobile else (1280,800)
    ctx=browser.new_context(viewport=dict(width=width,height=height),has_touch=mobile,is_mobile=mobile)
    page=ctx.new_page()
    errors=[]; requests=[]
    page.on("pageerror",lambda err:errors.append(str(err)))
    page.on("console",lambda msg:errors.append(msg.text) if msg.type=="error" else None)
    page.on("response",lambda r:requests.append([r.url.split("/")[-1],r.status]) if "meeting-room-web.glb" in r.url or "fps-arms-web.glb" in r.url or r.status>=400 else None)
    page.add_init_script("performance.setResourceTimingBufferSize(2000)")
    page.goto(url+"&3d=1")
    page.wait_for_function("window.CZMarchWorld?.mounted")
    page.evaluate("""async()=>{const W=CZMarchWorld, mod=W._.renderer3d,create=mod.create;
      mod.create=async(...args)=>{window.v=await create(...args);return v};
      const scene=W.manifest.scenes.find(s=>s.chapterId==3);
      await W.mount(document.querySelector('#world'),{chapterId:3,sceneId:scene.sceneId,spawn:{x:81,y:39.4,facing:'n'},anchors:scene.anchors,playIntro:false});
      window.pl=v.session.player;window.T=await import('three');
      document.querySelector('#world').focus();}""")
    # Use the gameplay viewport for both screenshots and performance readings.
    page.add_style_tag(content="body{grid-template-rows:minmax(0,1fr)}body>header,body>footer{display:none}")
    E=page.evaluate
    E("""()=>{window.peak={calls:0,triangles:0};function sample(){const s=v.stats;
      peak.calls=Math.max(peak.calls,s.drawCalls||0);peak.triangles=Math.max(peak.triangles,s.triangles||0);requestAnimationFrame(sample);}sample()}""")
    wait=lambda expr:page.wait_for_function(expr,timeout=12000)
    def go(x,y):
        E("([x,y])=>pl.moveTo([{x,y}])",[x,y])
        page.wait_for_function("([x,y])=>Math.hypot(pl.x-x,pl.y-y)<.04",arg=[x,y],timeout=12000)
        E("pl.stop()")
    def aim(key):
        E("""k=>{const obj=v.scene.getObjectByName(k),pt=new T.Box3().setFromObject(obj,true).getCenter(new T.Vector3());
          const dx=pt.x-(pl.x-80),dz=pt.z-(pl.y-55);v.setCameraAngle(Math.atan2(dz,dx),Math.atan2(6.45-pt.y,Math.hypot(dx,dz)));}""",key)
        page.wait_for_function("k=>{const t=v.getIndoorTarget();return k==='Door_Exit'?t?.type==='door':t?.key===k}",arg=key,timeout=3500)
    def action():
        if mobile:page.locator('.czmw-act').tap()
        else:page.keyboard.press("e")
    def snap(name):
        if photos:
            bare=name.removeprefix("mobile-").removeprefix("portrait-")
            retain={"01-main-arcade.png":"01-main-arcade.png","02-courtyard-steps.png":"02-courtyard-steps.png",
                    "05-window-table-brazier.png":"03-window-table-brazier.png","02-east-wall-clock-wardrobe.png":"04-east-wall-clock-wardrobe.png"}
            if bare not in retain:return
            name=("portrait-" if mobile else "")+retain[bare]
        page.screenshot(path=out/name)
    def metrics():
        return E("""()=>new Promise(done=>{const read=()=>CZMarchWorld.performance,t=performance.now(),start=read().frames;
          let calls=0,tris=0;function sample(now){const r=read();calls=Math.max(calls,r.drawCalls);tris=Math.max(tris,r.triangles);
          if(now-t<1500)requestAnimationFrame(sample);else done({fps:+((r.frames-start)*1000/(now-t)).toFixed(1),calls,triangles:tris});}requestAnimationFrame(sample)})""")
    def hud_turn():
        samples=[]
        for i in range(13):
            E("yaw=>v.setCameraAngle(yaw,.1)",i*3.141592653589793/6)
            page.wait_for_timeout(45)
            samples.append(E("""()=>{let e=document.querySelector('.czmw-fps-tip'),b=e.getBoundingClientRect(),j=document.querySelector('.czmw-stick86').getBoundingClientRect();
                return [b.x+b.width/2,b.bottom,b.bottom>j.top&&b.top<j.bottom&&b.left<j.right&&b.right>j.left]}"""))
        drift=max(max(s[i] for s in samples)-min(s[i] for s in samples) for i in (0,1))
        assert drift==0 and not any(s[2] for s in samples)
        return drift
    def step_in():
        wait("v.session.lastNear?.anchorId==='chapter-3/anchor-indoor-meeting-room'");action()
        wait("v.isIndoors() && CZMarchWorld.getCameraMode()==='fps'");page.wait_for_timeout(500)
        assert not E("v.isStreetVisible()")
    def step_out():
        aim("Door_Exit");action()
        wait("!v.isIndoors() && CZMarchWorld.getCameraMode()==='tps'");page.wait_for_timeout(500)
        assert E("v.isStreetVisible() && v.scene.getObjectByName('march-actor-soldier').visible && !!v.scene.fog")
    if photos:
        prefix="portrait-" if mobile else ""
        for x,y,yaw,pitch,name in [(91,49.5,-2.04,-.14,"01-main-arcade"),(74,40,-.62,-.06,"02-courtyard-steps")]:
            E("([x,y,a,p])=>{pl.setPos(x,y,a);v.setCameraAngle(a,p)}",[x,y,yaw,pitch])
            page.wait_for_timeout(900);snap(prefix+name+".png")
        E("pl.setPos(81,39.4,-Math.PI/2)")
    go(81,36.8);E("v.setCameraAngle(-Math.PI/2,.09)")
    data={"outside":metrics(),"outsideHUDDriftPx":hud_turn()}
    step_in()
    data["inside"]=metrics()
    if photos:
        data["westWindow"]=E("""()=>{const view=v.scene.getObjectByName('WestWindowCourtyard'), panes=[];
          v.scene.getObjectByName('RoomShell').traverse(o=>{if(o.isMesh&&/ZY (winter|rose|straw) glass/.test(o.material.name))
          panes.push([o.material.name,o.material.transparent,o.material.opacity])});
          return {sky:v.scene.background.isTexture===true,vistaMeshes:view.children.length,panes}}""")
        assert data["westWindow"]["sky"] and data["westWindow"]["vistaMeshes"]>=3
        panes=data["westWindow"]["panes"];assert len(panes)==3 and all(t and 0<a<1 for _,t,a in panes)
    data["uv1"]=E("""()=>{let ok=true;v.scene.getObjectByName('zunyi-meeting-room').traverse(o=>{if(o.isMesh){ok&&=!!o.geometry.attributes.uv1;for(const m of [].concat(o.material))if(m.aoMap)ok&&=m.aoMap.channel===1&&m.map.channel===1}});return ok}""")
    if not mobile:snap("01-enter-room-fps.png")
    else:snap("04-mobile-390-interior.png")
    if lookdev:
        go(82.46,27.18);go(82.46,27.38 if photos else 28.18)
        E("v.setCameraAngle(2.20,.26)" if photos else "v.setCameraAngle(2.77,.43)");page.wait_for_timeout(350)
        snap(("mobile-" if mobile else "")+"05-window-table-brazier.png")
        go(82.46,27.18);go(81.1,27.18)
    data["insideHUDDriftPx"]=hud_turn()
    go(79.25,27.18)
    states=[]
    for mode in ["walk","slow","run"]:
        E("v.setCameraAngle(Math.PI/2,0)")
        if mode=="slow":page.keyboard.press("c")
        if mode=="run":page.keyboard.down("Shift")
        page.keyboard.down("w");page.wait_for_timeout(420)
        states.append(E("({arms:v.stats.armsState,speed:pl.speed,draws:v.stats.armsDrawCalls})"))
        if lookdev and mode=="run":snap(("mobile-" if mobile else "")+"06-moving-hands.png")
        page.keyboard.up("w")
        if mode=="slow":page.keyboard.press("c")
        if mode=="run":page.keyboard.up("Shift")
        E("pl.stop()");go(79.25,27.18)
    assert [s["arms"] for s in states]==["walk","walk","run"] and states[1]["speed"]<states[0]["speed"]<states[2]["speed"]
    data["gaits"]=states
    E("v.setCameraAngle(Math.PI,0)");page.keyboard.down("w");page.wait_for_timeout(600);page.keyboard.up("w")
    assert 78.93<E("pl.x")<79.03
    data["westWallStopX"]=E("pl.x")
    for x,y in [(79.25,27.18),(79.25,32.65),(82.46,32.65),(82.46,27.18),(81.1,27.18)]:go(x,y)
    data["lap"]=True
    if not mobile or lookdev:
        go(79.25,27.18);go(79.25,30)
        E("v.setCameraAngle(.03,.04)");page.wait_for_timeout(180);snap(("mobile-" if mobile else "")+"02-east-wall-clock-wardrobe.png")
        go(79.25,27.18);go(81.1,27.18)
    cards=[]
    for key,x,y in [("Prop_MeetingTable",81.1,27.18),("Prop_CharcoalBrazier",81.1,27.18),("Prop_HangingLamp",81.1,27.18),("Prop_WallClock",82.46,30),("Prop_WardrobeMirror",82.46,31.04)]:
        if x>82 and E("pl.x")<82:go(x,27.18)
        go(x,y);aim(key)
        action();wait("!document.querySelector('.czmw-relic-modal').hidden")
        title=page.locator(".czmw-relic-title").inner_text()
        cards.append([key,title])
        if key=="Prop_MeetingTable":
            data["card"]=metrics()
            if not mobile:snap("03-artifact-card-popup.png")
            before=E("[pl.x,pl.y,pl.facing]")
            page.keyboard.down("w");page.mouse.move(100,70);page.wait_for_timeout(180);page.keyboard.up("w")
            assert before==E("[pl.x,pl.y,pl.facing]")
        if mobile:page.locator(".czmw-relic-close").tap()
        else:page.keyboard.press("Escape" if len(cards)%2 else "e")
        wait("document.querySelector('.czmw-relic-modal').hidden")
        page.wait_for_timeout(120)
    data["cards"]=cards
    go(82.46,27.45);step_out()
    cdp=ctx.new_cdp_session(page)
    def memory():
        cdp.send("HeapProfiler.collectGarbage")
        return E("({geometries:v.stats.geometries,textures:v.stats.textures,heap:performance.memory?.usedJSHeapSize})")
    step_in();go(82.46,27.45);step_out()  # Warm deferred outdoor actor textures before baseline.
    samples=[memory()]
    for i in range(5):
        step_in();go(82.46,27.45);step_out();samples.append(memory())
    data.update(memory=samples,errors=errors,requests=requests)
    print(width,samples,errors,[data[k] for k in ("outside","inside","card")],flush=True)
    assert all((x["geometries"],x["textures"])==(samples[0]["geometries"],samples[0]["textures"]) for x in samples)
    assert not errors and all(status<400 for _,status in requests)
    for k in ["outside","inside","card"]:assert data[k]["calls"]<=120 and data[k]["triangles"]<=120000
    if photos:
        data["anchorSweep"]=E("""async()=>{const anchors=CZMarchWorld.manifest.scenes.find(s=>s.chapterId==3).anchors;
          let calls=0,triangles=0;
          const settle=ms=>new Promise(resolve=>setTimeout(resolve,ms));
          for(const a of anchors){
            pl.setPos(a.x,a.y,0);await settle(180);
            for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
              v.setCameraAngle(yaw,.12);await settle(120);
              calls=Math.max(calls,v.stats.drawCalls);triangles=Math.max(triangles,v.stats.triangles);
            }
          }
          return {anchors:anchors.length,headings:4,calls,triangles}}""")
        assert data["anchorSweep"]["anchors"]==23
    data["wholeRoutePeak"]=E("peak")
    data["resources"]=E("""()=>{let r={};for(const e of performance.getEntriesByType('resource'))if(e.name.startsWith(location.origin+'/')){
      const name=new URL(e.name).pathname;r[name]=Math.max(r[name]||0,e.encodedBodySize)}return r}""")
    data["documentBytes"]=E("performance.getEntriesByType('navigation')[0].encodedBodySize")
    data["totalBytes"]=sum(data["resources"].values())+data["documentBytes"]
    print("route",data["wholeRoutePeak"],"page bytes",data["totalBytes"],flush=True)
    if lookdev:
        assert data["uv1"] and data["totalBytes"]<=15000000
        assert data["wholeRoutePeak"]["calls"]<=120 and data["wholeRoutePeak"]["triangles"]<=120000
    ctx.close()
    return data
with sync_playwright() as p:
    b=p.chromium.launch(channel="msedge",args=["--use-angle=d3d11"])
    for mobile in [False,True]:
        key="portrait" if mobile else "desktop"
        report[key]=verify(b,mobile)
        (out/"browser.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf8")
    page=b.new_page();page.goto(url+"&3d=0");page.wait_for_function("CZMarchWorld.mounted")
    report["fallback"]=page.evaluate("CZMarchWorld.performance.backend")
    assert report["fallback"]=="canvas" and page.locator(".czmw-canvas3d").count()==0
    (out/"browser.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf8")
    b.close()
