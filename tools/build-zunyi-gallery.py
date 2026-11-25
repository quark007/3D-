"""Build the west return and facade ornament in the live metric Blender scene."""
import bpy, math
from mathutils import Vector
from pathlib import Path
R=Path(ROOT)
(R/'evidence/.zunyi-photo-build').mkdir(parents=True,exist_ok=True)
target=R/'changzheng/assets/scenes/zunyi-realscan'
scene=bpy.data.scenes.new('Zunyi west gallery')
bpy.context.window.scene=scene
scene.unit_settings.system='METRIC'
verts=[]; faces=[]; colors=[]
lime=(.53,.49,.40); brick=(.073,.081,.085); timber=(.19,.055,.026)
def poly(points, color):
    idx=len(verts); verts.extend(points); faces.append(tuple(range(idx,idx+len(points)))); colors.append(color)
def prism(profile,x0,x1,color):
    for x,ring in [(x0,profile[::-1]),(x1,profile)]:
        poly([(x,y,z) for y,z in ring],color)
    for i,(y,z) in enumerate(profile):
        yy,zz=profile[(i+1)%len(profile)]
        poly([(x0,y,z),(x0,yy,zz),(x1,yy,zz),(x1,y,z)],color)
def box(x,y,z,w,d,h,c):
    a,b=y-d/2,y+d/2; l,t=z-h/2,z+h/2
    prism([(a,l),(b,l),(b,t),(a,t)],x-w/2,x+w/2,c)
def turned(x,y,profile,color):
    for (lo,r),(hi,s) in zip(profile,profile[1:]):
        for i in range(12):
            a,b=math.tau*i/12,math.tau*(i+1)/12
            poly([(x+rr*math.cos(t),y+rr*math.sin(t),z) for z,rr,t in [(lo,r,a),(lo,r,b),(hi,s,b),(hi,s,a)]],color)
# Horizontal reveals and diamond inlays on the existing seven front bays.
for i in range(8):
    x=(i-3.5)*3.6
    for z in [2.69,6.26]:
        for j in range(3):
            h=z+j*.30
            poly([(x,-5.899,h-.15),(x+.14,-5.899,h),(x,-5.899,h+.15),(x-.14,-5.899,h)],lime)
# West return colonnade: integrated floor, shallow segmental arches and turned rail.
x=-12.60
for base in [.46,4.03]:
    box(-11.77,.04,base-.09,2.03,11.65,.18,brick)
    box(x,.04,base+3.48,.5,11.75,.14,lime)
    for i in range(4):
        y=-5.62+i*3.78
        turned(x,y,[(base,.24),(base+.13,.245),(base+.20,.19),(base+1.94,.166),(base+2,.23),(base+2.08,.25)],brick)
        turned(x,y,[(base+.12,.245),(base+.18,.245),(base+.21,.19)],lime)
        turned(x,y,[(base+1.94,.185),(base+1.99,.23),(base+2.06,.26),(base+2.12,.27)],lime)
        if i==3:continue
        center=y+1.89
        for j in range(16):
            a,b=j*math.pi/16,(j+1)*math.pi/16
            lo=(center+1.89*math.cos(a),base+2.06+1.02*math.sin(a))
            hi=(center+1.89*math.cos(b),base+2.06+1.02*math.sin(b))
            prism([lo,(lo[0],base+3.45),(hi[0],base+3.45),hi],x-.16,x+.16,brick)
            up=lambda t:(center+1.89*math.cos(t),base+2.06+1.02*math.sin(t)+.095)
            prism([lo,up(a),up(b),hi],x-.18,x-.16,tuple(v*(1+(j%3)*.13) for v in brick))
        if base>1:
            for z in [.13,.89]:box(x,center,base+z,.095,3.52,.085,timber)
            for k in range(1,14):
                yy=y+.12+k*.255
                turned(x,yy,[(base+.15,.028),(base+.32,.041),(base+.42,.026),(base+.69,.035),(base+.85,.024)],timber)
# Five-by-five exterior sash at the same opening as the room.
for i in range(6):
    box(4.85,6.00+i*.85,5.915,.07,.048,2.11,timber)
    box(4.85,8.125,4.88+i*.414,.07,4.29,.048,timber)
# Mirrored return flights behind the two end bays. The centre entrance remains clear.
for side in [-1,1]:
    for i in range(20):
        x=side*11.68
        yy=-2.96+i*.206
        h=.46+(i+1)*3.57/20
        box(x,yy,h-.057,1.10,.228,.114,timber)
        if i%3==0:box(x+side*.53,yy,h+.36,.048,.048,.72,timber)
    for xx in [side*11.13,side*12.23]:
        for rise in [-.14,.79]:
            poly([(xx,-3.07,.46+rise),(xx,1.12,4.03+rise),(xx,1.12,4.12+rise),(xx,-3.07,.55+rise)],timber)
# Return landing on the west face of the projecting east wing, beside the sash.
box(4.27,8.13,3.95,1.24,5.68,.16,brick)
for yy in [5.42,8.12,10.82]:
    turned(3.73,yy,[(4.03,.15),(7.39,.12),(7.52,.205),(7.61,.205)],brick)
for hh in [4.18,4.94]:box(3.73,8.12,hh,.09,5.48,.085,timber)
for j in range(20):box(3.73,5.53+j*.272,4.56,.05,.055,.72,timber)
# Small projecting roof light visible in both oblique aerial references.
for side in [-1,1]:
    poly([(side*.89,-3.22,9.02),(side*.89,-3.22,10.14),(side*.89,-1.42,10.14)],timber)
    poly([(0,-3.42,10.53),(side*1.06,-3.42,10.14),(side*1.06,-1.52,10.14),(0,-1.52,10.53)],brick)
box(0,-3.15,9.67,1.74,.12,.96,(.061,.041,.037))
for i in range(9):box((i-4)*.18,-3.24,9.67,.045,.07,.92,timber)
# Drip edges and exposed rafter tails on the two long courtyard side houses.
for sx,near,far in [(94,51,64),(77,51,64)]:
    sense=-1 if sx==94 else 1
    x=sx-81+sense*.14
    for i in range(26):
        yy=30-(near+.25+i*.49)
        box(x,yy,3.53 if sx==94 else 3.43,.55,.076,.092,timber)
mesh=bpy.data.meshes.new('Arcade inlays and joinery');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('WestGallery',mesh);scene.collection.objects.link(obj)
col=mesh.color_attributes.new(name='COLOR_0',type='BYTE_COLOR',domain='CORNER')
for p,c in zip(mesh.polygons,colors):
    for idx in p.loop_indices:col.data[idx].color=(*c,1)
mat=bpy.data.materials.new('West gallery lime brick and timber');mat.use_nodes=True
bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
vc=mat.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name=col.name
mat.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.88
mesh.materials.append(mat);obj.select_set(True);bpy.context.view_layer.objects.active=obj
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.uv.smart_project(island_margin=.006);bpy.ops.object.mode_set(mode='OBJECT')
# Bake crevice occlusion to local atlas; packaging binds it as glTF occlusion.
scene.render.engine='CYCLES';scene.cycles.samples=6
atlas=bpy.data.images.new('West gallery occlusion',512,512,alpha=False)
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=atlas;mat.node_tree.nodes.active=tex
bpy.ops.object.bake(type='AO',margin=2)
atlas.filepath_raw=str(R/'evidence/.zunyi-photo-build/gallery-ao.png');atlas.file_format='PNG';atlas.save()
# Each pane is a single surface in the thickness of the west sash.
for label, tint, alpha, rows in [('clear',(.60,.68,.70),.12,range(1,5)),('rose',(.65,.19,.23),.38,[0]),('straw',(.76,.58,.24),.32,[0])]:
    pv=[]; pf=[]
    for j in rows:
        for i in range(5):
            if j==0 and ((i%2==0)!=(label=='rose')):continue
            y=6.00+(i+.5)*.85; z=4.88+(j+.5)*.414
            start=len(pv)
            pv.extend([(4.85,y+dy,z+dz) for dy,dz in [(-.415,-.20),(-.415,.20),(.415,.20),(.415,-.20)]])
            pf.append(tuple(range(start,start+4)))
    pane=bpy.data.meshes.new(label);pane.from_pydata(pv,[],pf);pane.update()
    po=bpy.data.objects.new('Window_'+label,pane);scene.collection.objects.link(po);po.select_set(True)
    pm=bpy.data.materials.new('WestPane_'+label);pm.use_nodes=True
    shader=next(n for n in pm.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value=(*tint,1);shader.inputs['Alpha'].default_value=alpha
    shader.inputs['Roughness'].default_value=.17;pm.surface_render_method='BLENDED';pane.materials.append(pm)
# Broken-joint flagstones over the central pedestrian court. The shallow
# bevel catches raking light; lower joints expose the existing ground mesh.
import random
rng=random.Random(193501)
pv=[];pf=[];pc=[]
for row in range(18):
    y=-7.46-row*.765
    x=-13.6
    while x<15.9:
        length=min(15.9-x,rng.uniform(1.14,1.91))
        if length<.08:break
        base=len(pv);height=rng.uniform(.022,.034)
        for inset,h in [(.008,.011),(.020,height)]:
            pv.extend([(a,b,h) for a,b in [(x+inset,y-.765+inset),(x+length-inset,y-.765+inset),(x+length-inset,y-inset),(x+inset,y-inset)]])
        tint=rng.uniform(.076,.153)
        for idx in [(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:
            pf.append(tuple(base+n for n in idx));pc.append((tint*.90,tint,tint*1.01))
        x+=length
pave=bpy.data.meshes.new('Wet courtyard flags');pave.from_pydata(pv,[],pf);pave.update()
o=bpy.data.objects.new('CourtyardFlagstones',pave);scene.collection.objects.link(o);o.select_set(True)
attr=pave.color_attributes.new(name='COLOR_0',type='BYTE_COLOR',domain='CORNER')
for f,c in zip(pave.polygons,pc):
    for k in f.loop_indices:attr.data[k].color=(*c,1)
pm=mat.copy();pm.name='ZY_stone_flags';pave.materials.append(pm)
next(n for n in pm.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Roughness'].default_value=.38
bpy.ops.export_scene.gltf(filepath=str(target/'zunyi-gallery-web.glb'),use_selection=True,use_active_scene=True,export_animations=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
mesh.calc_loop_triangles();print('gallery triangles',len(mesh.loop_triangles))
