"""Build the west-facing entrance and the documented Bai residence groups in metres."""
# Paving tops meet wall footings at Z=0. Cap tiles inset into brickwork by 1 cm.
# The west shop wings intersect the arched gate shoulders; the clear jamb gap is 3.03 m.
# Roof overhangs cover the timber plate. Portico columns sit on the main building's plinth.
import re

exec(compile((R/'tools/zunyi-landmark.py').read_text(encoding='utf-8-sig'),'zunyi-landmark.py','exec'))
source=(R/'changzheng/march-world/scenes/chapter-03.js').read_text(encoding='utf-8')
layout=json.loads(re.search(r'/\* compound-layout \*/ (.*?) /\* end-compound-layout \*/',source,re.S)[1])
barriers={name:(x,y,w,d,h) for name,x,y,w,d,h in layout['barriers'] if name!='廊柱'}
ev=R/'evidence/zunyi-compound-check'
ev.mkdir(parents=True,exist_ok=True)
scene.name='1935 柏辉章公馆'


def xy(x,y):
    return x-81,30-y


def block(name,x,y,w,d,bottom,top,mat):
    box(name,(*xy(x+w/2,y+d/2),(bottom+top)/2),(w,d,top-bottom),mat)


def rotated_west(label,x,y,build):
    global group
    original=group
    group=label
    build()
    group=original
    for key in [key for key in bucket if key[0]==label]:
        verts,faces=bucket.pop(key)
        mesh(label,[(x+v,y-u,z) for u,v,z in verts],faces,key[1])


def tiled_wall(name):
    x,y,w,d,h=barriers[name]
    block(name,x-.018,y-.018,w+.036,d+.036,-.022,h-.23,'brick')
    block('石脚',x-.065,y-.065,w+.13,d+.13,-.02,.33,'stone')
    block('瓦压顶',x-.12,y-.12,w+.24,d+.24,h-.25,h,'roof')
    if name in ('北围墙','东围墙','南围墙'):
        long=w>d
        length=w if long else d
        for i in range(1,int(length//5.8)+1):
            dx,dy=(i*5.8,-.08) if long else (-.08,i*5.8)
            block('扶壁',x+dx,y+dy,.42 if long else w+.16,d+.16 if long else .42,-.02,h-.09,'brick')


def wing(name,western_front=False):
    x,y,w,d,h=barriers[name]
    eave=h-1.32
    block('石基',x,y,w,d,-.03,.25,'stone')
    faced_wing=ARCH_POLISH and d>w
    if not faced_wing:
        block(name,x+.09,y+.09,w-.18,d-.18,.24,eave,'plaster' if '房' in name else 'brick')
    cx,cy=xy(x+w/2,y+d/2)
    if d>w:
        rotated_west(name+'瓦顶',cx,cy,lambda: zy_roof(0,0,d/2+.28,w/2+.30,eave-.012,h))
    else:
        zy_roof(cx,cy,w/2+.30,d/2+.30,eave-.012,h)
    bays=4 if '四铺' in name else (5 if name=='旧宅东房' else max(1,round(max(w,d)/3.4)))
    if d>w:
        side=-1 if western_front or '东' in name else 1
        face=x if side<0 else x+w
        if faced_wing:
            panel=min(2.35,d/bays-(.36 if faced_wing else .26))
            sign=-side
            center=xy(face,y+d/2)
            def front_skin():
                pockets=[((i+.5)*d/bays-d/2-panel/2-.055,(i+.5)*d/bays-d/2+panel/2+.055,.24,2.76)
                    for i in range(bays)]
                if side>0: pockets=[(-right,-left,lo,hi) for left,right,lo,hi in pockets]
                recessed_wall(-d/2+.09,d/2-.09,0,w-.09,.24,eave,pockets,'brick' if western_front else 'plaster')
            if side<0:
                rotated_west(name+'凹口',*center,front_skin)
            else:
                global group
                old=group
                group=name+'凹口'
                front_skin()
                group=old
                for key in [key for key in bucket if key[0]==name+'凹口']:
                    verts,faces=bucket.pop(key)
                    mesh(name,[(center[0]-v,center[1]+u,z) for u,v,z in verts], faces,key[1])
            face+=sign*.30
        for i in range(bays):
            yy=y+(i+.5)*d/bays
            panel=min(2.35,d/bays-(.36 if faced_wing else .26))
            block('铺面排门' if western_front else '厢房门窗',face-.085,yy-panel/2,.18,panel,.24,2.71,'wood')
            for j in range(1,7):
                block('木板接缝',face-.108,yy-panel/2+j*panel/7,.226,.038,.23,2.71,'wood' if faced_wing else 'brick')
            for z in (.38,2.61,3.12):
                block('横枋',face-(.055 if faced_wing else .14),yy-panel/2-.17,.11 if faced_wing else .28,panel+.34,z,z+.11,'wood')
        if name=='东侧厨房及楼上警卫用房':
            wx,wy=xy(x,y+d/2)
            rotated_west('警卫用房上层窗',wx,wy,lambda: zy_window(0,0,4.05,1.42,1.22))
            block('楼层横枋',x-.12,y+.08,.24,d-.16,2.90,3.06,'wood')
    else:
        for i in range(bays):
            xx=x+(i+.5)*w/bays
            wx,wy=xy(xx,y+d)
            zy_window(wx,wy,1.61,min(1.45,w/bays-.22),1.45)


def gate():
    gx,gy=xy(62.15,43)
    def local():
        for side in (-1,1):
            box('西门砖墩',(side*2.14,0,1.995),(1.25,2.12,4.01),'brick')
            box('西门柱脚',(side*2.17,0,.19),(1.31,2.26,.40),'stone')
        zy_arc('西门券',0,0,2.12,1.52,.19,2.11,4.11)
        box('西门檐枋',(0,0,4.09),(5.57,2.17,.15),'wood')
        zy_roof(0,0,2.96,1.38,4.15,5.46)
    rotated_west('西门',gx,gy,local)
    x,y,w,d=layout['passage']
    block('门厅石板',x,y,w,d,-.06,.014,'stone')


def road_barrier(name):
    x,y,w,d,h=barriers[name]
    middle=y+d/2
    for j in range(5):
        block('拒马石脚',x+j*(w-.28)/4,middle-.28,.28,.56,-.02,.29,'stone')
        for sign in (-1,1):
            xx=x+.14+j*(w-.28)/4
            beam('拒马木架',(*xy(xx,middle+sign*.31),.25),(*xy(xx,middle-sign*.25),h),.14,.15,'wood')
    for z in (.75,1.06):
        beam('哨卡横木',(*xy(x,middle),z),(*xy(x+w,middle),z),.16,.15,'wood')
    for i in range(5):
        block('低垒麻袋',x+.36+i*.49,middle-.32,.48,.69,.02,.26,'plaster')


assembly_bounds={}


def verify_bounds(name, build):
    offsets={key:len(data[0]) for key,data in bucket.items()}
    build()
    points=[pt for key,data in bucket.items() for pt in data[0][offsets.get(key,0):]]
    assembly_bounds[name]=[(min(pt[axis] for pt in points),max(pt[axis] for pt in points)) for axis in range(3)]


def verify_overlap(first,second,minimum=.005):
    extents=zip(assembly_bounds[first],assembly_bounds[second])
    overlap=[min(a[1],b[1])-max(a[0],b[0]) for a,b in extents]
    assert min(overlap)>=minimum,(first,second,overlap)


group='会址建筑群'
for name,(x,y,w,d) in zip(('公馆铺地','街道铺地'),layout['grounds']):
    verify_bounds(name,lambda: block('青石铺地',x,y,w,d,-.095,.009,'stone'))
for y in (22.1,63.7):
    block('街段端部',53.99,y,7.25,.26,-.02,.10,'stone')
for x in (54.13,60.83):
    block('子尹路排水边石',x,22.3,.18,41.35,-.03,.035,'stone')
verify_bounds('主楼',lambda: build_landmark(gate=None,tree=None,bays=7))
for x in (-12.1,12.1):
    for i in range(5):
        rise=(i+1)*.093
        box('前廊端部石阶',(x,-7.36+i*.28,rise/2),(1.25,.29,rise),'stone')
# The small tiled dormer follows the modern record of the original roof form.
box('老虎窗窗座',(0,-2.52,9.04),(1.36,.66,1.02),'wood')
zy_window(0,-2.90,9.19,1.05,.70)
zy_roof(0,-2.44,.92,.62,9.55,10.06)
for name in ('北围墙','东围墙','南围墙','西北封火墙','西南封火墙','子尹路对街连续立面','慎笃照壁'):
    verify_bounds(name,lambda: tiled_wall(name))
verify_bounds('西门楼及门厅',gate)
for name in ('临街北排四铺','临街南排四铺'):
    verify_bounds(name,lambda: wing(name,western_front=True))
for name in ('旧宅东房','旧宅西房','旧宅北房','旧宅南房','东侧厨房及楼上警卫用房'):
    verify_bounds(name,lambda: wing(name))
for name in ('北侧警戒线','南侧警戒线'):
    verify_bounds(name,lambda: road_barrier(name))
for name in ('井台','槐树花台'):
    x,y,w,d,h=barriers[name]
    for sx,sy,sw,sd in ((x,y,w,.22),(x,y+d-.22,w,.22),(x,y+.22,.22,d-.44),(x+w-.22,y+.22,.22,d-.44)):
        block(name,sx,sy,sw,sd,-.015,h,'stone')
    block('井口' if name=='井台' else '花台覆土',x+.22,y+.22,w-.44,d-.44,-.03,.10 if name=='井台' else h-.12,'wood')
zy_tree(*xy(94.75,47.45))
# A few silhouettes behind the walls break the roofline without adding outbuildings.
for index,(x,y,z) in enumerate(((72,17.8,5.4),(98,17.85,5.6),(103.15,28,5.3),(103.12,54,5.5))):
    cx,cy=xy(x,y)
    rng=random.Random(index+303)
    beam('墙边细树干',(cx,cy,-.02),(cx,cy,z),.20,.20,'wood')
    for _ in range(5):
        a,b,c=cx+rng.uniform(-1.6,1.6),cy+rng.uniform(-.56,.56),z+rng.uniform(-.46,.7)
        r=rng.uniform(.78,1.32)
        beam('树冠支枝',(cx,cy,z-.80),(a,b,c),.085,.085,'wood')
        mesh('墙外树冠',[(a+r,b,c),(a,b+r,c),(a-r,b,c),(a,b-r,c),(a,b,c+r*.77),(a,b,c-r*.52)],
             [(i,(i+1)%4,4) for i in range(4)]+[((i+1)%4,i,5) for i in range(4)],'leaf')
for y in (38,49.8):
    block('前院排水明沟',71.6,y,23,.115,-.014,.003,'wood')
    block('沟沿',71.6,y+.115,23,.08,-.012,.019,'stone')
mesh_objects=flush()

for name in ('主楼','北围墙','东围墙','南围墙','西北封火墙','西南封火墙','慎笃照壁',
             '临街北排四铺','临街南排四铺','旧宅东房','旧宅西房','旧宅北房','旧宅南房','东侧厨房及楼上警卫用房'):
    verify_overlap('公馆铺地',name)
for first,second in (('北围墙','东围墙'),('南围墙','东围墙'),('北围墙','西北封火墙'),
                     ('南围墙','西南封火墙'),('西门楼及门厅','临街北排四铺'),('西门楼及门厅','临街南排四铺'),
                     ('旧宅东房','旧宅南房'),('旧宅西房','旧宅南房'),('旧宅西房','旧宅北房'),
                     ('街道铺地','西门楼及门厅'),('街道铺地','北侧警戒线'),('街道铺地','南侧警戒线')):
    verify_overlap(first,second)
print('Verified bounds and joints for',len(assembly_bounds),'assembly parts')

# Validate shared collision extents and the measured clear opening in assembly coordinates.
assert abs(layout['passage'][3]-3.03)<1e-6
for name in ('临街北排四铺','临街南排四铺'):
    assert barriers[name][1] >= 44.515 or abs(sum(barriers[name][i] for i in (1,3))-41.485)<1e-6
for ob in mesh_objects:
    verts=[v.co for v in ob.data.vertices]
    assert all(math.isfinite(c) for v in verts for c in v)
    assert min(v.z for v in verts)>=-.10
    assert max(v.z for v in verts)<12.5
    ob.data.calc_loop_triangles()
print('compound geometry',len(mesh_objects),sum(len(o.data.loop_triangles) for o in mesh_objects),'triangles')

scene.render.engine='CYCLES'
scene.cycles.samples=12
scene.view_settings.exposure=.48
scene.cycles.use_denoising=True
scene.render.resolution_x=1040
scene.render.resolution_y=700
sun=bpy.data.lights.new('薄云天光','SUN');sun.energy=2.1;sun.angle=.26
light=bpy.data.objects.new(sun.name,sun);scene.collection.objects.link(light)
light.rotation_euler=(.47,-.62,-.38)
camera=bpy.data.objects.new('会址验收相机',bpy.data.cameras.new('会址验收相机'))
scene.collection.objects.link(camera);scene.camera=camera
views=[('blender-01-aerial',(26,-46,60),(-3,-11,2),27),
       ('blender-02-main-and-wings',(7,-32,11),(0,-6,4),27),
       ('blender-03-court-and-gate',(-3,-22,4.6),(-16,-13,2.75),24),
       ('blender-04-street-and-barrier',(-25,-27,2.6),(-23,4,2.4),29)]


def setview(view):
    name,eye,target,lens=view
    camera.location=eye
    camera.rotation_euler=(Vector(target)-Vector(eye)).to_track_quat('-Z','Y').to_euler()
    camera.data.lens=lens
    scene.render.filepath=str(ev/(name+'.jpg'))
    scene.render.image_settings.file_format='JPEG'


setview(views[0])
bpy.context.view_layer.update()
