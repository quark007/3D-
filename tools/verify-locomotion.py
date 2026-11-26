"""Validate decoded world-space poses and capture the full-body character viewer."""
from pathlib import Path
import io,json
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
out=root/'evidence/locomotion-fix'
out.mkdir(exist_ok=True,parents=True)
report={}
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='msedge',args=['--use-angle=d3d11'])
    for width,height in [(1280,800),(390,844)]:
        ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=width==390,has_touch=width==390)
        page=ctx.new_page();errors=[]
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('response',lambda r:errors.append(str(r.status)+' '+r.url) if r.status>=400 else None)
        for role in ['soldier','commander','logistics','medic']:
            page.goto('http://127.0.0.1:8080/march-world/character-preview.html?renderer=webgl&char='+role)
            page.wait_for_function('window.characterPreview?.stats.bones>0')
            page.evaluate("""async()=>{const T=await import('three'),p=characterPreview;
              p.setView('body');p.mixer.timeScale=0;
              window.pose=(kind,phase)=>{const mixer=p.mixer;
                mixer.stopAllAction();const a=mixer._actions.find(a=>a.getClip().name===kind);
                a.reset().play();a.time=phase*a.getClip().duration;mixer.update(0);p.model.updateMatrixWorld(true);
                return a.getClip().duration};
              window.inspect=kind=>{let width=[],knee=[],thigh=[],elbow=[],flex=[],limbs=[],hips=[];
                const pt=name=>p.model.getObjectByName(name).getWorldPosition(new T.Vector3());
                const peak=arr=>arr.indexOf(Math.max(...arr));let duration;
                for(let i=0;i<256;i++){duration=pose(kind,i/256);let row={};
                  for(let [side,sign] of [['l',1],['r',-1]]){
                    const hip=pt('thigh_'+side),k=pt('calf_'+side),f=pt('foot_'+side),w=pt('hand_'+side);
                    if(Math.min(k.x*sign,f.x*sign,w.x*sign)<=0)throw Error(kind+' crossed midline '+i);
                    const upper=k.clone().sub(hip);const lower=f.clone().sub(k);
                    thigh.push(T.MathUtils.radToDeg(Math.atan2(upper.z,-upper.y)));flex.push(T.MathUtils.radToDeg(upper.angleTo(lower)));
                    const arm=pt('lowerarm_'+side);elbow.push(T.MathUtils.radToDeg(arm.clone().sub(pt('upperarm_'+side)).angleTo(w.clone().sub(arm))));
                    row[side]=[f.x,k.x,f.z,w.z]}
                  limbs.push(row);width.push(row.l[0]-row.r[0]);knee.push(row.l[1]-row.r[1]);hips.push(pt('pelvis').y)}
                const range=a=>[Math.min(...a),Math.max(...a)];
                const peaks=['l','r'].map(side=>[peak(limbs.map(r=>r[side][2])),peak(limbs.map(r=>r[side==='l'?'r':'l'][3]))]);
                return {duration,samples:256,ankle:range(width),knee:range(knee),thigh:range(thigh),kneeFlex:range(flex),elbow:range(elbow),pelvisExcursion:Math.max(...hips)-Math.min(...hips),peaks}
              }}""")
            for kind in ('Walk','Run'):
                result=page.evaluate('k=>inspect(k)',kind)
                print(width,role,kind,result,flush=True)
                assert .14<=result['ankle'][0]<=result['ankle'][1]<=.20
                assert all(a==b for a,b in result['peaks']),result
                report[f'{width}/{role}/{kind}']=result
                if width==1280:
                    for view in ('front','side'):
                        page.evaluate("""v=>{const c=characterPreview.camera;c.position.set(v==='side'?3.35:0,.92,v==='side'?0:3.35);c.lookAt(0,.92,0);c.updateMatrixWorld()}""",view)
                        tiles=[]
                        for phase in (0,.25,.5,.75):
                            page.evaluate('([k,t])=>pose(k,t)',[kind,phase])
                            page.wait_for_timeout(75)
                            img=Image.open(io.BytesIO(page.locator('#portrait').screenshot())).convert('RGB')
                            w,h=img.size;img=img.crop((w//2-h*.34,0,w//2+h*.34,h))
                            img.thumbnail((270,410));tiles.append(img)
                        w,h=tiles[0].size;sheet=Image.new('RGB',(w*4,h+26),'#20211e')
                        for i,image in enumerate(tiles):
                            sheet.paste(image,(i*w,26))
                            ImageDraw.Draw(sheet).text((i*w+8,6),f'{role} {kind} {view}   {25*i}%',fill='white')
                        sheet.save(out/f'{role}-{kind.lower()}-{view}.png')
        assert not errors,errors
        ctx.close()
    browser.close()
(out/'decoded-poses.json').write_text(json.dumps(report,indent=2))
