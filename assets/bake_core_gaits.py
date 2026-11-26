"""Blender background bake. Preserve existing Draco streams and every unrelated clip."""
import json
import math
import struct
from pathlib import Path
import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'evidence/locomotion-fix'
OUT.mkdir(parents=True, exist_ok=True)
X,Y = Vector((1,0,0)), Vector((0,1,0))
N = 40
def rotation(axis,degrees):
    return Quaternion(axis,math.radians(degrees))
def unpack(node):
    x,y,z,w=node.get('rotation',[0,0,0,1])
    return Matrix.LocRotScale(Vector(node.get('translation',[0,0,0])),Quaternion((w,x,y,z)),Vector(node.get('scale',[1,1,1])))
def bake(g,kind):
    nodes=g['nodes']
    ids={n['name']:i for i,n in enumerate(nodes)}
    parent={c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
    rest=[unpack(n) for n in nodes]
    def world(i):
        return world(parent[i]) @ local[i] if i in parent else local[i]
    local=rest.copy()
    bind=[world(i) for i in range(len(nodes))]
    def pos(name):return world(ids[name]).translation
    def orient(name,q):
        i=ids[name];pq=world(parent[i]).to_quaternion()
        t,_,s=local[i].decompose()
        local[i]=Matrix.LocRotScale(t,pq.inverted() @ q,s)
        changed.add((i,'rotation'))
    def turn(name,q):orient(name,q @ bind[ids[name]].to_quaternion())
    def aim(name,end,direction):
        i=ids[name];base=(bind[ids[end]].translation-bind[i].translation).normalized()
        orient(name,base.rotation_difference(direction.normalized()) @ bind[i].to_quaternion())
    run=kind=='Run'
    duration=.725 if run else 1.175
    leg=bind[ids['thigh_l']].translation
    knee=bind[ids['calf_l']].translation
    ankleRest=bind[ids['foot_l']].translation
    scale=((leg-knee).length+(knee-ankleRest).length)/.741
    speed=(2.49 if run else .72)*scale
    duty=.35 if run else .52
    span=speed*duration*duty
    tracks={};samples=[]
    for frame in range(N+1):
        local=rest.copy();changed=set()
        f=frame/N; wave=math.cos(2*math.pi*f)
        bob=.5-.5*math.cos(4*math.pi*(f-(.115 if run else .21)))
        pelvis=ids['pelvis'];p=bind[pelvis].translation.copy()
        p.y+=ankleRest.y+.736*scale-leg.y
        p.y+=scale*((-.120 if run else -.048)+(.060 if run else .030)*bob)
        local[pelvis].translation=world(parent[pelvis]).inverted() @ p
        changed.add((pelvis,'translation'))
        turn('pelvis',rotation(Y,-5*wave))
        turn('spine_01',rotation(Y,4*wave) @ rotation(X,11 if run else 2))
        turn('head',Quaternion())
        record={}
        for side,offset,sign in [('l',0,1),('r',.5,-1)]:
            t=(f+offset)%1; stride=math.cos(2*math.pi*t)
            thigh,shin,foot,toe=[k+'_'+side for k in ('thigh','calf','foot','ball')]
            hip=pos(thigh); a=(bind[ids[shin]].translation-bind[ids[thigh]].translation).length
            b=(bind[ids[foot]].translation-bind[ids[shin]].translation).length
            ankleY=bind[ids[foot]].translation.y
            if t<=duty:
                u=t/duty;z=span*(.5-u);rise=0
                pitch=-12*max(0,1-5*u)+20*max(0,4*u-3)
            else:
                u=(t-duty)/(1-duty)
                z=span*(-.5+u*u*(3-2*u))
                rise=scale*(.089 if run else .016)*math.sin(math.pi*u)**(1.18 if run else 4)*(1+(.515 if run else -.064)*math.cos(math.pi*u))
                pitch=20*(1-u)-12*u+12*math.sin(2*math.pi*u)
            rise+=max(0,math.sin(math.radians(pitch)))*(.115 if run else .10)
            target=Vector((sign*.086,ankleY+rise,z+leg.z-scale*(.060 if run else .064)+max(0,scale-1.04)*.055))
            axis=(target-hip).normalized();reach=(target-hip).length
            assert reach<a+b,(kind,side,frame,reach,a+b)
            pole=Vector((0,0,1));pole=(pole-axis*axis.dot(pole)).normalized()
            along=(a*a-b*b+reach*reach)/(2*reach)
            knee=hip+axis*along+pole*math.sqrt(max(0,a*a-along*along))
            aim(thigh,shin,knee-hip);aim(shin,foot,target-pos(shin))
            turn(foot,rotation(X,pitch))
            upper,lower,hand=[k+'_'+side for k in ('upperarm','lowerarm','hand')]
            angle=(3-32*stride) if run else (3-17*stride)
            elbow=(90-4*stride) if run else (15-2*stride)
            def down(deg,splay):
                r=math.radians(deg)
                return Vector((sign*splay,-math.cos(r),math.sin(r)))
            aim(upper,lower,down(angle,.065))
            aim(lower,hand,down(angle+elbow,.04))
            # Preserve the relaxed bind-hand roll relative to the forearm.
            if run:
                for digit in ('index','middle','ring','pinky'):
                    for j in (2,3):
                        name=f'{digit}_0{j}_{side}'
                        if name in ids:
                            i=ids[name];q=world(i).to_quaternion()
                            restQ=bind[i].to_quaternion()
                            hinge=restQ.inverted() @ Vector((0,0,1))
                            orient(name,q @ rotation(hinge,-sign*18))
            k,ank,wrist=pos(shin),pos(foot),pos(hand)
            assert k.x*sign>0 and ank.x*sign>0 and wrist.x*sign>0
            record[side]={'hip':list(hip),'knee':list(k),'ankle':list(ank),'wrist':list(wrist)}
        width=record['l']['ankle'][0]-record['r']['ankle'][0]
        assert .14<=width<=.20
        samples.append(record)
        for i,path in sorted(changed):
            xyz,q,_=local[i].decompose()
            seq=tracks.setdefault((i,path),[])
            value=[q.x,q.y,q.z,q.w] if path=='rotation' else list(xyz)
            if path=='rotation' and seq and np.dot(value,seq[-1])<0:value=[-v for v in value]
            seq.append(value)
    for side,opposite in [('l','r'),('r','l')]:
        peak=lambda member,j:int(np.argmax([r[member][j][2] for r in samples[:-1]]))
        assert peak(side,'ankle')==peak(opposite,'wrist'),(kind,side,peak(side,'ankle'),peak(opposite,'wrist'))
    return duration,tracks,samples,speed

def repack(path):
    raw=path.read_bytes();size=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+size]);binary=raw[28+size:]
    views=g['bufferViews'];chunks=[binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']] for v in views]
    acc=g['accessors']
    def data(values,typ):
        arr=np.array(values,dtype='<f4');chunk=arr.tobytes()
        acc.append(dict(bufferView=len(views),componentType=5126,count=len(arr),type=typ,min=arr.min(axis=0).tolist(),max=arr.max(axis=0).tolist()))
        views.append(dict(buffer=0,byteLength=len(chunk)));chunks.append(chunk)
        return len(acc)-1
    log={}
    for anim in g['animations']:
        if anim['name'] not in ('Walk','Run'):continue
        duration,tracks,samples,speed=bake(g,anim['name'])
        anim['extras']={'groundSpeed':speed};anim['channels']=[];anim['samplers']=[]
        times=data([[duration*k/N] for k in range(N+1)],'SCALAR')
        for (i,pathKey),values in tracks.items():
            if np.max(np.abs(np.array(values)-values[0]))<1e-6:
                values=values[:1];inp=data([[0]],'SCALAR')
            else:inp=times
            anim['channels'].append(dict(target=dict(node=i,path=pathKey),sampler=len(anim['samplers'])))
            anim['samplers'].append(dict(input=inp,output=data(values,'VEC4' if pathKey=='rotation' else 'VEC3'),interpolation='LINEAR'))
        log[anim['name']]=dict(seconds=duration,groundSpeed=speed,frames=samples)
    # Compact only the storage made unreachable by replacing the two clips.
    ar=[];vr=[]
    for mesh in g['meshes']:
        for prim in mesh['primitives']:
            ar.extend((prim['attributes'],k) for k in prim['attributes']);ar.append((prim,'indices'))
            vr.append((prim['extensions']['KHR_draco_mesh_compression'],'bufferView'))
    ar.extend((skin,'inverseBindMatrices') for skin in g['skins'])
    for anim in g['animations']:
        for s in anim['samplers']:ar.extend([(s,'input'),(s,'output')])
    def compact(refs):
        keys=sorted({d[k] for d,k in refs});remap={n:i for i,n in enumerate(keys)}
        for d,k in refs:d[k]=remap[d[k]]
        return keys
    g['accessors']=[acc[i] for i in compact(ar)]
    vr.extend((a,'bufferView') for a in g['accessors'] if 'bufferView' in a)
    vr.extend((im,'bufferView') for im in g['images'])
    selected=compact(vr);blob=bytearray();g['bufferViews']=[]
    for i in selected:
        v=views[i];v['byteOffset']=len(blob);g['bufferViews'].append(v)
        blob+=chunks[i];blob+=bytes(-len(blob)%4)
    g['buffers'][0]['byteLength']=len(blob)
    header=json.dumps(g,separators=(',',':')).encode();header+=b' '*(-len(header)%4)
    return struct.pack('<4sIII4s',b'glTF',2,28+len(header)+len(blob),len(header),b'JSON')+header+struct.pack('<I4s',len(blob),b'BIN\0')+blob,log

if __name__=='__main__':
    pending={};logs={}
    for role in ('commander','soldier','logistics','medic'):
        for suffix in ('web','field-lod'):
            p=ROOT/f'changzheng/assets/characters/{role}/{role}-{suffix}.glb'
            pending[p],logs[p.stem]=repack(p)
    for p,b in pending.items():p.write_bytes(b)
    (OUT/'bake-frames.json').write_text(json.dumps(logs,separators=(',',':')))
