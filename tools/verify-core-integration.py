"""Exercise each core role in the character viewer and the mounted Zunyi chapter."""
import json
from pathlib import Path
from os import environ
from playwright.sync_api import sync_playwright

out=Path(__file__).resolve().parents[1]/"evidence/zunyi-core-integration"
out=Path(environ.get("ZUNYI_EVIDENCE_DIR",out))
out.mkdir(exist_ok=True,parents=True)
base="http://127.0.0.1:8080/march-world/"
roles=("commander","soldier","logistics","medic")
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel="msedge",args=["--use-angle=d3d11"])
    report={}
    for width,height in [(1280,800),(390,844)]:
        ctx=browser.new_context(viewport={"width":width,"height":height},has_touch=width==390,is_mobile=width==390)
        page=ctx.new_page()
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.on("console",lambda m:errors.append(m.text) if m.type=="error" or "模型回退" in m.text else None)
        page.on("response",lambda r:errors.append(str(r.status)+" "+r.url) if r.status>=400 else None)
        results={}
        for role in roles:
            page.goto(base+"character-preview.html?char="+role+"&renderer=webgl")
            page.wait_for_function("window.characterPreview?.stats.bones>0")
            clips=page.evaluate("characterPreview.stats.animations")
            assert set(("Walk","Run","Jump_Start","Jump_Air","Jump_Land"))<=set(clips)
            for clip in ("Walk","Run","Jump_Start"):
                page.select_option("#animation",clip)
                page.wait_for_timeout(180)
            results[role]={"preview":clips}
        page.goto(base+"preview.html?chapter=chapter-3%2Fscene-zunyi&3d=1")
        page.wait_for_function("CZMarchWorld.mounted")
        page.evaluate("""()=>{const M=CZMarchWorld._,ac=M.actors3d.create,rc=M.renderer3d.create;
          M.actors3d.create=async(...args)=>window.actorSystem=await ac(...args);
          M.renderer3d.create=async(...args)=>window.v=await rc(...args)}""")
        for role in roles:
            page.evaluate("""async role=>{const W=CZMarchWorld,s=W.manifest.scenes.find(s=>s.chapterId===3);
              await W.mount(document.querySelector('#world'),{chapterId:3,sceneId:s.sceneId,roleId:role,spawn:{x:57,y:27},anchors:s.anchors,playIntro:false});
              v.setCameraAngle(Math.PI/2,.025);document.querySelector('#world').focus()}""",role)
            page.wait_for_function("r=>actorSystem.playerState()?.role===r",arg=role)
            assert page.evaluate("r=>performance.getEntriesByType('resource').some(e=>e.name.endsWith('/'+r+'-field-lod.glb'))",role)
            for mode in ("walk","slow","run"):
                page.evaluate("v.session.player.setPos(57,27,Math.PI/2)")
                if mode=="slow":page.keyboard.press("c")
                if mode=="run":page.keyboard.down("Shift")
                page.keyboard.down("w");page.wait_for_timeout(420)
                result=page.evaluate("""async()=>{const p=v.session.player, vec=(await import('three')).Vector3,
                  root=v.scene.getObjectByName('march-actor-'+p.roleId),feet=['foot_l','foot_r'].map(n=>root.getObjectByName(n));
                  let prev=null,travel=0,support=0,n=0,calls=0,tris=0;
                  const start=performance.now();do{await new Promise(requestAnimationFrame);
                    let f=feet.map(b=>b.getWorldPosition(new vec())),loc=[p.x,p.y];
                    if(prev){let phase=actorSystem.strideCycle().phase/(2*Math.PI),i=phase<.5?0:1;const duty=p.running?.35:.52;
                      if(i===prev.i && phase%0.5>.025 && phase%0.5<duty-.025){support+=Math.hypot(f[i].x-prev.f[i].x,f[i].z-prev.f[i].z);travel+=Math.hypot(loc[0]-prev.loc[0],loc[1]-prev.loc[1]);n++}}
                    prev={f,loc,i:actorSystem.strideCycle().phase<Math.PI?0:1};calls=Math.max(calls,v.stats.drawCalls);tris=Math.max(tris,v.stats.triangles)
                  }while(performance.now()-start<650);
                  return {speed:p.speed,travel,ankleTravel:support,samples:n,calls,tris,...actorSystem.playerState()}}""")
                page.keyboard.up("w")
                if mode=="slow":page.keyboard.press("c")
                if mode=="run":page.keyboard.up("Shift")
                assert result["travel"]>.10 and result["calls"]<=120 and result["tris"]<=120000,result
                assert result["ankleTravel"]<.015*result["travel"],result
                results[role][mode]=result
            page.keyboard.press("Space")
            for phase in ("air","land"):
                page.wait_for_function("k=>actorSystem.playerState().jumpStage===k",arg=phase)
            page.wait_for_function("actorSystem.playerState().jumpStage===null")
            print(width,role,results[role],flush=True)
        assert not errors,errors
        report[str(width)]={"roles":results,"errors":errors}
        (out/"roles.json").write_text(json.dumps(report,indent=2),encoding="utf8")
        ctx.close()
    browser.close()
