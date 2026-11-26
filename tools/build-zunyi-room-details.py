"""Near-field fittings on the extant tabletop, cabinet fronts and charcoal bowl."""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
root=Path(ROOT)
(root/'evidence/.zunyi-photo-build').mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('Zunyi furniture fittings')
bpy.context.window.scene=scene
verts=[];faces=[];colors=[]
def tube(a,b,r,s,col,sides=8):
    a,b=Vector(a),Vector(b);axis=(b-a).normalized()
    u=axis.cross(Vector((0,1,0)) if abs(axis.y)<.8 else Vector((1,0,0))).normalized()
    v=axis.cross(u);start=len(verts)
    for p,size in [(a,r),(b,s)]:
        for i in range(sides):
            t=i*math.tau/sides;verts.append(p+size*(u*math.cos(t)+v*math.sin(t)))
    for i in range(sides):
        j=(i+1)%sides;faces.append(tuple(start+n for n in (i,j,sides+j,sides+i)));colors.append(col)
    faces.append(tuple(start+sides+i for i in range(sides)));colors.append(col)
brass=(.33,.21,.078);ink=(.026,.031,.027);wood=(.20,.094,.043)
# Tapered brush beside the bound notebook, resting on a small porcelain mountain rest.
tube((-.32,-.47,.830),(-.22,-.24,.840),.004,.006,wood)
tube((-.22,-.24,.840),(-.21,-.219,.841),.006,.005,brass)
tube((-.21,-.219,.841),(-.193,-.18,.843),.005,.0003,ink)
tube((-.26,-.302,.826),(-.217,-.316,.826),.011,.01,(.36,.40,.33))
# Cabinet key plates and hanging bail handles use the measured door plane.
for cy in [-1.26,1.15]:
    for sign in [-1,1]:
        y=cy+sign*.075
        tube((1.898,y,1.05),(1.889,y,1.05),.025,.022,brass,16)
        for j in range(10):
            a,b=j*math.tau/10,(j+1)*math.tau/10
            pt=lambda t:(1.877,y+.013*math.cos(t),1.027+.021*math.sin(t))
            tube(pt(a),pt(b),.0025,.0025,brass,5)
# Angular ash on split charcoal; selected fissures expose the hot core.
rng=random.Random(1935)
for i in range(18):
    a=i*2.399;r=.143*math.sqrt((i+.5)/18)
    x=-.16+r*math.cos(a);y=1.30+r*math.sin(a);h=.225+rng.uniform(0,.007)
    tube((x-.014,y-.009,h),(x+.013,y+.005,h+.004),.008,.006,(.12,.105,.091),5)
    if i%3==0:tube((x-.012,y-.007,h+.009),(x+.009,y+.003,h+.011),.0018,.001,(.76,.144,.028),5)
mesh=bpy.data.meshes.new('Writing and metal fittings');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('PeriodFittings',mesh);scene.collection.objects.link(obj)
attr=mesh.color_attributes.new(name='COLOR_0',type='BYTE_COLOR',domain='CORNER')
for p,c in zip(mesh.polygons,colors):
    for i in p.loop_indices:attr.data[i].color=(*c,1)
for name in ['UVMap','UV1']:
    uv=mesh.uv_layers.new(name=name)
    for loop in mesh.loops:
        pt=mesh.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(pt.x*.1+.5,pt.y*.1+.5)
mat=bpy.data.materials.new('Oxidised fittings');mat.use_nodes=True
v=mat.node_tree.nodes.new('ShaderNodeVertexColor');v.layer_name=attr.name
bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
mat.node_tree.links.new(v.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.65
mesh.materials.append(mat);obj.select_set(True);bpy.context.view_layer.objects.active=obj
bpy.ops.export_scene.gltf(filepath=str(root/'evidence/.zunyi-photo-build/fittings.glb'),use_selection=True,use_active_scene=True,export_animations=False,export_draco_mesh_compression_enable=True)
