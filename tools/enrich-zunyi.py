"""Street infill in chapter coordinates. The ground datum is z=0."""
# Walls and shed feet meet the grade. Capstones seat on wall tops.
# Street curbs stay outside the 7.4 m carriageway. All freestanding props
# occupy the same edge strips as the simplified walking proxies.
from random import Random

rng = Random(1935)
def local(x,y,z=0):
    return x-81,30-y,z

def block(label,x,y,z,w,d,h,mat):
    box(label,local(x,y,z),(w,d,h),mat)

def span(label,x,y,xx,yy,z,w,h,mat):
    beam(label,local(x,y,z),local(xx,yy,z),w,h,mat)

group='Infill'
# Integrated curbs and shallow covered drains. Junctions stay flush.
for (x,y),(xx,yy) in zip(road,road[1:]):
    for side in [-1,1]:
        span('石砌路缘',x,y+3.79*side,xx,yy+3.79*side,.057,.18,.11,'stone')
        span('沟盖板',x,y+4.05*side,xx,yy+4.05*side,.029,.30,.045,'brick')
        for k in range(1,int(xx-x),2):
            cy=y+(yy-y)*k/(xx-x)+4.05*side
            span('盖板接缝',x+k,cy-.13,x+k,cy+.13,.052,.025,.01,'wood')

# Rear yards and end walls share the same coordinates as the navigation proxies.
for x,y,w in [(62,22,11),(99,26,9),(27,39,12),(111,43,15),(51,76,16),(119,72,14),(7,46,9),(151,43,10)]:
    block('院墙',x,y,.68,w,.42,1.36,'brick')
    block('压顶',x,y,1.40,w+.14,.60,.14,'roof')
for x,y,w in [(49,73.6,12),(120,69.5,12),(17,45,6)]:
    for j in range(int(w)):
        block('木栅柱',x-w/2+j,y,.48,.10,.14,.96,'wood')
    for z in [.32,.74]:
        block('栅栏横枋',x,y,z,w,.08,.095,'wood')
for x,y in [(61,19.5),(103,27.5),(43,76),(125,72)]:
    block('柴棚基座',x,y,.08,4,2.45,.16,'stone')
    block('柴棚后墙',x,y-1.06,1,3.9,.22,1.95,'plaster')
    for dx in [-1.75,1.75]:
        block('棚柱',x+dx,y+1,.96,.14,.16,1.92,'wood')
    mesh('棚瓦',[local(x-2.15,y-1.35,2.25),local(x-2.15,y+1.38,1.87),local(x+2.15,y+1.38,1.87),local(x+2.15,y-1.35,2.25)],[(0,1,2,3)],'roof')
for x,y,w in [(52,11,25),(112,12,27),(36,84,36),(117,85,37)]:
    block('边坡挡墙',x,y,.40,w,.64,.8,'brick')
    block('边坡压顶',x,y,.83,w,.79,.12,'stone')
for x,y in [(39,77.5),(74,18),(112,75.5),(132,72)]:
    for j in range(3):
        block('菜畦石埂',x,y+j*.58,.095,3,.43,.19,'brick')
flush()

def palette(key,rgb):
    material(key,rgb)

palette('earthenware',(.25,.121,.067))
palette('basket',(.42,.28,.124))
palette('old_lamp',(.36,.19,.07))
palette('shrub',(.127,.197,.077))
palette('bamboo',(.19,.25,.071))
palette('grass',(.23,.27,.124))

def pottery(label,radius,height,mat,profile):
    n=8
    vertices=[(radius*r*math.cos(i*math.tau/n),radius*r*math.sin(i*math.tau/n),height*z)
              for r,z in profile for i in range(n)]
    faces=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i)
           for j in range(len(profile)-1) for i in range(n)]
    faces.append(tuple(reversed(range(n))))
    mesh(label,vertices,faces,mat)

def prototype(kind):
    if kind=='Water crock':
        pottery(kind,.34,.68,'earthenware',[(.58,0),(.94,.23),(1,.61),(.70,.91),(.79,.96),(.78,1),(.57,1),(.56,.74)])
    elif kind=='Barrel':
        pottery(kind,.27,.61,'wood',[(.87,0),(1,.42),(1,.65),(.9,1),(0,1)])
    elif kind=='Basket':
        pottery(kind,.29,.32,'basket',[(.62,0),(1,1),(.88,1),(.57,.15)])
    elif kind=='Crate':
        for z in [.06,.17,.28]:
            box(kind,(0,0,z),(.47,.42,.10),'wood')
        for x in [-.19,.19]:
            for y in [-.2,.2]:
                box(kind,(x,y,.16),(.07,.06,.32),'wood')
    elif kind=='Firewood':
        for row in range(3):
            for i in range(4-row):
                x=(i-(3-row)/2)*.13
                beam(kind,(x,-.20,.06+row*.10),(x,.21,.075+row*.10),.11,.10,'wood')
    elif kind=='Bench':
        box(kind,(0,0,.32),(.88,.26,.065),'wood')
        for x in [-.34,.34]:
            box(kind,(x,0,.16),(.08,.21,.32),'wood')
    elif kind=='Bollard':
        pottery(kind,.18,.34,'stone',[(.91,0),(1,.14),(.73,.89),(.45,1),(0,1)])
    elif kind=='Broken paving':
        pottery(kind,.24,.042,'stone',[(.88,0),(1,.65),(.89,1),(0,1)])
    elif kind=='Lantern':
        pottery(kind,.116,.28,'old_lamp',[(.54,0),(.94,.16),(1,.77),(.62,1),(0,1)])
    elif kind in ('Canopy','Bamboo','Grass'):
        for i in range({'Canopy':4,'Bamboo':5,'Grass':4}[kind]):
            angle=i*2.4
            c,s=math.cos(angle),math.sin(angle)
            if kind=='Canopy':
                x,y=c*.63,s*.63
                beam('Twig',(0,0,0),(x,y,1.44),.075,.075,'wood')
                for scale,z in [(1,1.41),(.65,1.97)]:
                    verts=[(x+scale*.58*math.cos(k*math.tau/5),y+scale*.58*math.sin(k*math.tau/5),z) for k in range(5)]
                    mesh(kind,verts+[(x,y,z+.51),(x,y,z-.32)],[(k,(k+1)%5,5) for k in range(5)]+[((k+1)%5,k,6) for k in range(5)],'shrub')
            else:
                h=(1.9+i*.23) if kind=='Bamboo' else (.13+i*.055)
                w=.12 if kind=='Bamboo' else .033
                mesh(kind,[(-s*w,c*w,0),(s*w,-c*w,0),(.43*c,.43*s,h),(.13*c,.13*s,h*.56)],[(0,1,2,3)],'bamboo' if kind=='Bamboo' else 'grass')
                if kind=='Bamboo':
                    for j in range(4):
                        z=h*(.46+.13*j)
                        mesh('竹叶',[(c*.26,s*.26,z),(c*.37-s*.24,s*.37+c*.24,z+.18),(c*.78,s*.78,z+.08),(c*.38+s*.13,s*.38-c*.13,z+.03)],[(0,1,2,3)],'bamboo')

# Linked mesh data plus a common parent exports as EXT_mesh_gpu_instancing.
instances=bpy.data.objects.new('Wall-foot props and vegetation',None)
scene.collection.objects.link(instances)
furnish=['Water crock','Barrel','Basket','Crate','Firewood','Bench','Bollard']
rows=[(51.18,list(range(23,60,4))),(51.12,list(range(103,116,4))),(64.83,list(range(43,72,4))),(60.86,list(range(99,128,4)))]
placements={kind:[] for kind in furnish+['Lantern','Canopy','Bamboo','Grass','Broken paving']}
for y,xs in rows:
    for i,x in enumerate(xs):
        placements[furnish[(i+int(y))%len(furnish)]].append((x+.83,y,0))
        if i%3==1:placements['Lantern'].append((x-.89,y,2.17))
        placements['Grass'].append((x-1.6,y+.25,0))
for x,y,w in [(62,22,11),(99,26,9),(27,39,12),(111,43,15),(51,76,16),(119,72,14),(7,46,9),(151,43,10)]:
    for sign in [-1,1]:
        placements['Canopy'].append((x+sign*(w/2-1.45),y-.39,0))
        placements['Bamboo'].append((x+sign*(w/2-2.5),y+.38,0))
        for i in range(3):placements['Grass'].append((x+sign*(w/2-1)+i*.31,y+.31,0))
for x,y,w in [(52,11,25),(112,12,27),(36,84,36),(117,85,37)]:
    for side in [-1,1]:
        xx=x+side*w*.38
        placements['Canopy'].append((xx,y-.24,0))
        placements['Bamboo'].append((xx+1,y+.29,0))
    for i in range(5):
        xx=x+(i/4-.5)*w*.83
        placements['Broken paving'].append((xx,y+.62+rng.uniform(-.13,.13),0))
        placements['Grass'].append((xx-.22,y+.40,0))
for kind,points in placements.items():
    group=kind
    prototype(kind)
    bases=flush()
    for j,(x,y,z) in enumerate(points):
        angle=rng.uniform(-.55,.55)
        scale=rng.uniform(.8,1.13)
        for base in bases:
            obj=base if j==0 else base.copy()
            if j:scene.collection.objects.link(obj)
            obj.parent=instances
            obj.location=local(x,y,z)
            obj.rotation_euler.z=angle
            obj.scale=(scale,)*3


group='Notices'
m,bs=material('notice',(.35,.27,.17))
im=bpy.data.images.load(str(out/'notices.jpg'))
im.pack()
tx=m.node_tree.nodes.new('ShaderNodeTexImage')
tx.image=im
m.node_tree.links.new(tx.outputs['Color'],bs.inputs['Base Color'])
for x,y in [(27,51.02),(43,51.02),(107,51.03)]:
    block('木布告框',x,y+.045,2.02,.64,.068,.84,'wood')
    mesh('布告', [local(x-.30,y+.082,1.63),local(x+.30,y+.082,1.63),
                  local(x+.30,y+.082,2.41),local(x-.30,y+.082,2.41)],[(0,1,2,3)],'notice')
for obj in flush():
    if obj.data.materials[0] != m:continue
    for p in obj.data.polygons:
        for j,li in enumerate(p.loop_indices):
            u,v=[(0,0),(1,0),(1,1),(0,1)][j]
            obj.data.uv_layers.active.data[li].uv=((p.index*170+6+155*u)/512,(20+215*v)/256)

# All contacts share one mesh and one vertex-alpha material.
group='Contacts'
m,bs=material('contact',(.079,.067,.047))
m.surface_render_method='BLENDED'
attr=m.node_tree.nodes.new('ShaderNodeVertexColor')
attr.layer_name='GroundContact'
m.node_tree.links.new(attr.outputs['Alpha'],bs.inputs['Alpha'])
def contact(x,y,rx,ry):
    pts=[local(x+rx*math.cos(i*math.tau/8)*scale,y+ry*math.sin(i*math.tau/8)*scale,.065)
         for scale in [.42,1] for i in range(8)]
    faces=[(j,j+8,(j+1)%8+8,(j+1)%8) for j in range(8)]
    mesh('接触暗部',pts,faces+[tuple(reversed(range(8)))],'contact')

for y,xs in rows:
    for x in xs:contact(x,y,2.30,.39)
for x in range(69,95,3):contact(x,36.3,1.38,.49)
for x in [69,73,76,82,85,87]:contact(x,50.20,1.14,.68)
for x,y,rx,ry in [(69,41,1.47,1.1),(58,50,.85,.63),(89,49,1.6,1.03)]:
    contact(x,y,rx,ry)
for obj in flush():
    layer=obj.data.color_attributes.new(name='GroundContact',type='FLOAT_COLOR',domain='POINT')
    for i,v in enumerate(layer.data):
        v.color=(1,1,1,.45 if i%16<8 else 0)

# Repeat the scanned originals at other enclosed wall feet.
scan_copy_positions=[[(63,21.6)],[(111,42.6)],[(151,43.4)]]
for base,places in zip([o for o in scene.objects if o.name.startswith(('tree_tree_stump','prop_rock_moss'))],scan_copy_positions):
    base.parent=instances
    for x,y in places:
        duplicate=base.copy()
        scene.collection.objects.link(duplicate)
        duplicate.location=local(x,y)
        duplicate.scale=(.56,.56,.56)
        duplicate.rotation_euler.z=rng.uniform(0,math.tau)

# Keep new reusable props as instances and merge architectural surfaces by material.
static_groups=('L1_', 'L2_', 'L3_', 'Infill_', 'Notices_')
batches=defaultdict(list)
for obj in scene.objects:
    if obj.type=='MESH' and obj.name.startswith(static_groups):
        batches[obj.data.materials[0]].append(obj)
for mat,objects in batches.items():
    if len(objects)<2:continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    active=objects[0]
    bpy.context.view_layer.objects.active=active
    if active.data.users>1:active.data=active.data.copy()
    bpy.ops.object.join()
    active.name='Zunyi fabric - '+mat.name
