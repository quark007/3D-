"""Add January courtyard details and bake static AO.

Pass an unbaked RC master after -- when regenerating from this branch.
Set ZUNYI_BAKE_CPU=1 when the GPU driver cannot allocate Cycles textures.
"""
# Joint map: paving supports leaf planes (+1 mm); bucket staves seat into the base;
# brick stack courses interlock; broom feet seat at grade and the shaft enters its
# binding; lantern strap and notice backing sink into the enclosing masonry.
from pathlib import Path
import math
import os
import random
import sys
import re
import json

import bpy
from mathutils import Vector

R = Path(__file__).resolve().parents[1]
master = R/'assets/clean-kit/zunyi/zunyi_street_master.blend'
target = R/'changzheng/assets/scenes/zunyi-realscan'
source_master = Path(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv else master
foliage=bool(os.environ.get('ZUNYI_FOLIAGE_POLISH'))
if os.environ.get('ZUNYI_ARCH_POLISH') or foliage:
    import tempfile
    staging=tempfile.TemporaryDirectory(prefix='zunyi-arch-')
    scope={'ROOT':str(R),'ARCH_POLISH':True,'FOLIAGE_POLISH':foliage,'BUILD_TEMP':staging.name}
    for name in ('build-zunyi.py','assemble-zunyi-compound.py'):
        file=R/'tools'/name
        exec(compile(file.read_text(encoding='utf-8-sig'),str(file),'exec'),scope)
    scene=scope['scene']
else:
    with bpy.data.libraries.load(str(source_master)) as (source, dest):
        dest.scenes = source.scenes[:1]
    scene = dest.scenes[0]
bpy.context.window.scene = scene
original = [o for o in scene.objects if o.type == 'MESH']
assert len(original) == (10 if foliage else 8 if os.environ.get('ZUNYI_ARCH_POLISH') else 7), 'Use the unbaked RC master as the source'

layout_source = (R/'changzheng/march-world/scenes/chapter-03.js').read_text(encoding='utf8')
layout = json.loads(re.search(r'/\* compound-layout \*/ (.*?) /\* end-compound-layout \*/', layout_source, re.S)[1])
rng = random.Random(193501)
materials = {}
for name, color in [('wood', (.16,.104,.061)), ('iron', (.075,.066,.054)), ('leaf', (.17,.105,.049))]:
    mat = bpy.data.materials.new('ZY_detail_'+name)
    mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = .87
    materials[name] = mat
materials['brick'] = next(o.active_material for o in original if o.active_material.name.startswith('ZY_brick'))
parts = {}
def geometry(name, key, points, faces):
    vertices, polygons = parts.setdefault((name, key), ([], []))
    start = len(vertices)
    vertices.extend(points)
    polygons.extend(tuple(start + i for i in p) for p in faces)

def box(name, key, center, dimensions):
    x,y,z = center
    a,b,c = (d/2 for d in dimensions)
    geometry(name,key,[(x+u*a,y+v*b,z+w*c) for u,v,w in
        [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]],
        [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])

def beam(name, key, start, end, width):
    a,b = Vector(start),Vector(end)
    d = (b-a).normalized()
    u = d.cross(Vector((0,0,1)) if abs(d.z)<.96 else Vector((0,1,0))).normalized()*width/2
    v = d.cross(u)
    geometry(name,key,[p+s*u+t*v for p in (a,b) for s,t in [(-1,-1),(1,-1),(1,1),(-1,1)]],
        [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])

def ring(name, key, x, y, levels):
    n = 12
    points=[(x+radius*math.cos(i*math.tau/n),y+radius*math.sin(i*math.tau/n),z)
        for z,radius in levels for i in range(n)]
    geometry(name,key,points,[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i)
        for j in range(len(levels)-1) for i in range(n)])

# Put bulky ground props on the inaccessible wall-side strip by the southeast annex.
x,y=22.26,-21.70
ring('bucket','wood',x,y,[(.005,.125),(.31,.167),(.31,.145),(.045,.110),(.043,0)])
for z,radius in [(.075,.137),(.256,.16)]:
    ring('bucket','iron',x,y,[(z-.013,radius+.002),(z+.013,radius+.006)])
for i in range(12):
    a=i*math.tau/12
    beam('bucket','iron',(x+.126*math.cos(a),y+.126*math.sin(a),.016),
         (x+.164*math.cos(a),y+.164*math.sin(a),.303),.003)
x,y=22.05,-22.20
beam('broom','wood',(x,y,.04),(x+.15,y+.12,1.12),.025)
for i in range(13):
    t=i/12-.5
    beam('broom','wood',(x+t*.23,y+t*.048,.006),
         (x+.033+t*.08,y+.02,.245+abs(t)*.02),.012)
beam('broom','iron',(x-.062,y,.206),(x+.095,y+.025,.206),.021)
for j in range(3):
    for i in range(2 if j < 2 else 1):
        box('bricks','brick',(22.25+(j%2)*.035,-23.0+i*.236,.036+.057*j),(.108,.225,.068))

# Notice lettering is supplied by the existing WebGL paper. These frame pieces fit
# its east face, and extend back into the screen wall at logical X=70.15.
bx,by=-10.855,-13
box('notice','wood',(bx,by,1.52),(.060,.82,.99))
for d in (-1,1):
    box('notice','wood',(bx+.059,by+d*.385,1.52),(.057,.045,.99))
    box('notice','wood',(bx+.059,by,1.52+d*.475),(.057,.82,.04))
# Shelter the lantern above head height against the north gate jamb.
x,y=-18.84,-11.44
beam('lantern','iron',(x,y+.14,2.52),(x,y-.19,2.52),.027)
beam('lantern','iron',(x,y-.18,2.54),(x,y-.18,2.38),.02)
for z,w in [(2.04,.21),(2.34,.24),(2.38,.12)]:
    box('lantern','iron',(x,y-.18,z),(w,w,.046))
for u in (-1,1):
    for v in (-1,1):
        beam('lantern','iron',(x+u*.085,y-.18+v*.085,2.045),(x+u*.104,y-.18+v*.104,2.35),.017)
if os.environ.get('ZUNYI_ARCH_POLISH'):
    materials['amber']=next(o.active_material for o in original if o.active_material.name.startswith('ZY_amber'))
    box('lantern','amber',(x,y-.18,2.19),(.156,.156,.27))
else:
    box('lantern','wood',(x,y-.18,2.19),(.156,.156,.27))
for i in range(32):
    x,y=rng.uniform(12.7,16.05),rng.uniform(-19.1,-15.9)
    if 12.6<x<14.9 and -18.6<y<-16.3: continue
    theta=rng.random()*math.tau
    a,b=math.cos(theta)*.052,math.sin(theta)*.052
    coords=[(x-a,y-b,.010),(x+b*.44,y-a*.44,.018),(x+a,y+b,.010),
            (x-b*.44,y+a*.44,.013),(x,y,.028)]
    geometry('leaves','leaf',coords,[(0,1,4),(1,2,4),(2,3,4),(3,0,4)])

def verify_bounds(name):
    points=[p for (part,key),(verts,faces) in parts.items() if part==name for p in verts]
    return [(min(p[i] for p in points),max(p[i] for p in points)) for i in range(3)]

def verify_overlap(prop, bounds, axis, minimum):
    a,b=verify_bounds(prop)[axis]
    c,d=bounds[axis]
    assert min(b,d)-max(a,c)>=minimum, prop

for name in ('bucket','broom','bricks','leaves'):
    bounds=verify_bounds(name)
    assert -.001 <= bounds[2][0] <= .011
    if name!='leaves':
        # Existing wall collision plus the player's standing radius covers this strip.
        assert bounds[0][0]>103.54-81-.62 and bounds[0][1]<103.54-81
    print(name, bounds)
assert verify_bounds('lantern')[2][0]>2
verify_overlap('lantern', [(-19.91,-17.79),(-11.485,-9.75),(0,4.01)], 1, .005)
verify_overlap('notice', [(-11.4,-10.85),(-14.8,-11.2),(0,3.25)], 0, .005)
for key in ('wood','iron','leaf','brick') + (('amber',) if 'amber' in materials else ()):
    verts,faces=[],[]
    for (name,kind),(points,polygons) in parts.items():
        if kind != key: continue
        start=len(verts); verts.extend(points)
        faces.extend(tuple(start+i for i in p) for p in polygons)
    mesh=bpy.data.meshes.new('January_'+key)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    if key=='brick':
        ob=next(o for o in original if o.active_material==materials['brick'])
        import bmesh
        bm=bmesh.new()
        bm.from_mesh(ob.data)
        layer=bm.loops.layers.uv.active
        added=[bm.verts.new(p) for p in verts]
        for indices in faces:
            face=bm.faces.new([added[i] for i in indices])
            face.normal_update()
            axis=max(range(3),key=lambda i:abs(face.normal[i]))
            u,v=[(1,2),(0,2),(0,1)][axis]
            for loop in face.loops:
                loop[layer].uv=(loop.vert.co[u]/2.4,loop.vert.co[v]/2.4)
        bm.to_mesh(ob.data); bm.free()
        bpy.data.meshes.remove(mesh)
        continue
    ob=bpy.data.objects.new(mesh.name,mesh)
    scene.collection.objects.link(ob)
    mesh.materials.append(materials[key])

scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.cycles.denoiser='OPENIMAGEDENOISE'
scene.world.light_settings.distance=2.0
scene.cycles.device='CPU'
prefs=bpy.context.preferences.addons['cycles'].preferences
for backend in (() if os.environ.get('ZUNYI_BAKE_CPU') else ('OPTIX','CUDA','HIP','ONEAPI')):
    try:
        prefs.compute_device_type=backend
        prefs.refresh_devices()
        if any(device.type==backend for device in prefs.devices):
            for device in prefs.devices: device.use=device.type==backend
            scene.cycles.device='GPU'
            break
    except (TypeError, RuntimeError):
        continue
print('Cycles device', scene.cycles.device, flush=True)
scene.render.bake.margin=5
scene.render.bake.margin_type='EXTEND'
scene.render.bake.use_clear=True
scene.render.bake.target='IMAGE_TEXTURES'

def bake_ao(objects, label):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True)
        ob.data.uv_layers.new(name='UVMap_Light')
        ob.data.uv_layers.active_index=1
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    # A fixed fractional gap is impractical for thousands of tiny roof faces.
    # Pack each atlas with a scaled 0.015 island margin plus a 5-pixel bake bleed.
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.015, margin_method='SCALED')
    bpy.ops.object.mode_set(mode='OBJECT')
    image=bpy.data.images.new(label,1024,1024,alpha=False)
    image.colorspace_settings.name='Non-Color'
    links=[]
    for ob in objects:
        mat=ob.active_material
        tex=mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image=image
        tex.label='Cycles AO · UVMap_Light'
        mat.node_tree.nodes.active=tex
        links.append((mat,tex))
    bpy.ops.object.bake(type='AO',uv_layer='UVMap_Light')
    import numpy as np
    rgba=np.empty(1024*1024*4,dtype=np.float32)
    image.pixels.foreach_get(rgba)
    values=rgba[0::4]
    valid=values[values>0]
    assert valid.size>5000 and valid.std()>.025, (label,valid.size,float(valid.std()) if valid.size else None)
    print(label, valid.size, float(valid.min()), float(valid.std()), flush=True)
    image.pack()
    from io_scene_gltf2.blender.com import material_helpers
    for mat,tex in links:
        tree=mat.node_tree
        uv=tree.nodes.new('ShaderNodeUVMap')
        uv.uv_map='UVMap_Light'
        tree.links.new(uv.outputs[0],tex.inputs[0])
        group=tree.nodes.new('ShaderNodeGroup')
        group.node_tree=bpy.data.node_groups.get(material_helpers.get_gltf_node_name()) or material_helpers.create_settings_group(material_helpers.get_gltf_node_name())
        tree.links.new(tex.outputs['Color'],group.inputs['Occlusion'])
    for ob in objects: ob.data.uv_layers.active_index=0

stone=next(o for o in original if o.active_material.name.startswith('ZY_stone'))
walls=[o for o in original if o != stone and o.active_material.name.startswith(('ZY_brick','ZY_plaster','ZY_wood','ZY_roof','ZY_trim'))]
bake_ao([stone],'Zunyi paving AO')
bake_ao(walls,'Zunyi buildings AO')

bpy.ops.export_scene.gltf(filepath=str(target/'zunyi_street.baked.glb'),export_format='GLB',
    use_active_scene=True,export_image_format='AUTO' if foliage else 'JPEG',export_jpeg_quality=78,export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,export_animations=False)

# Author the same low wall dampness in Blender after exporting the original PBR
# texture connections, which the browser reuses with its world-space shader.
for ob in [stone,*walls]:
    mat=ob.active_material
    if not mat.name.startswith(('ZY_stone','ZY_brick','ZY_plaster')): continue
    tree=mat.node_tree; n=tree.nodes; link=tree.links
    shader=next(node for node in n if node.type=='BSDF_PRINCIPLED')
    source=shader.inputs['Base Color'].links[0].from_socket
    pos=n.new('ShaderNodeNewGeometry').outputs['Position']
    xyz=n.new('ShaderNodeSeparateXYZ'); link.new(pos,xyz.inputs[0])
    ramp=n.new('ShaderNodeMapRange'); ramp.inputs['From Min'].default_value=.02
    ramp.inputs['From Max'].default_value=.75
    ramp.inputs['To Min'].default_value=1; ramp.inputs['To Max'].default_value=0
    link.new(xyz.outputs['Z'],ramp.inputs[0])
    noise=n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=2.8
    link.new(pos,noise.inputs[0])
    strength=n.new('ShaderNodeMath'); strength.operation='MULTIPLY'
    link.new(ramp.outputs[0],strength.inputs[0]); link.new(noise.outputs['Fac'],strength.inputs[1])
    tint=n.new('ShaderNodeMixRGB'); tint.blend_type='MULTIPLY'
    tint.inputs[2].default_value=(.48,.58,.46,1)
    link.new(strength.outputs[0],tint.inputs[0]); link.new(source,tint.inputs[1]); link.new(tint.outputs[0],shader.inputs['Base Color'])
bpy.data.libraries.write(str(master.with_name('zunyi_street_master.baked.blend')),{scene},compress=True,fake_user=True)
os.replace(master.with_name('zunyi_street_master.baked.blend'),master)
os.replace(target/'zunyi_street.baked.glb',target/'zunyi_street.glb')
print('Baked master and Draco export complete',flush=True)
