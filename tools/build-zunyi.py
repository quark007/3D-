"""Run inside Blender through MCP. Build a dedicated metric scene in the current session."""
import bpy, math, json, numpy as np
from pathlib import Path
from mathutils import Vector
from collections import defaultdict
# Foundation tops meet pier feet; roof skins seat on cornices and ridge caps.
# Scan roots meet the pavement; street foundations share the paving elevation.
R=Path(ROOT)
raw=R/'assets/raw-scans/zunyi'
out=R/'assets/clean-kit/zunyi'
out.mkdir(parents=True,exist_ok=True)
ev=R/'evidence/zunyi-blender-check'
ev.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('1935 子尹路')
bpy.context.window.scene=scene
scene.unit_settings.system='METRIC'
scene.world=bpy.data.worlds.new('Overcast sky')
scene.world.use_nodes=True
next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value=(.65,.72,.8,1)
next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND').inputs[1].default_value=.75
materials={}
def material(key,rgb):
    m=bpy.data.materials.new('ZY_'+key)
    m.use_nodes=True
    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bs.inputs['Base Color'].default_value=(*rgb,1)
    bs.inputs['Roughness'].default_value=.85
    m.diffuse_color=(*rgb,1)
    materials[key]=m
    return m,bs
def processed(source,key,kind):
    im=bpy.data.images.load(str(source),check_existing=False)
    im.colorspace_settings.name='Non-Color'
    w,h=im.size
    values=np.empty(w*h*4,dtype=np.float32)
    im.pixels.foreach_get(values)
    px=values.reshape(-1,4)
    if kind=='diffuse':
        # Bake HSV desaturation and shallow cavity shading from measured height.
        hmap=bpy.data.images.load(str(source).replace('_diffuse_','_displacement_'))
        hmap.colorspace_settings.name='Non-Color'
        hv=np.empty_like(values)
        hmap.pixels.foreach_get(hv)
        lum=px[:,:3] @ np.array([.299,.587,.114],dtype=np.float32)
        px[:,:3]=(.55*px[:,:3]+.45*lum[:,None])*({'wood':[.67,.52,.40],'roof':[.76,.80,.80],'stone':[.80,.84,.83]}.get(key,[.85,.86,.84]))*(.89+.11*hv[::4,None])
        bpy.data.images.remove(hmap)
    else:
        low,high=(.45,.65) if key=='stone' else (.78,.92)
        px[:,:3]=low+(high-low)*px[:,:3]
    im.pixels.foreach_set(values)
    # Write raw RGB without view transform; load JPEG as normal color / data.
    im.file_format='JPEG'
    dest=out/(key+'_'+kind+'.jpg')
    im.filepath_raw=str(dest)
    im.save()
    bpy.data.images.remove(im)
    return bpy.data.images.load(str(dest))
for key,prefix in [('stone','road_'),('brick','wall_dark'),('plaster','wall_plastered'),('wood','wood_'),('roof','roof_')]:
    m,bs=material(key,(.25,.24,.21))
    for kind in ['diffuse','roughness','normal']:
        f=next((raw/'textures').glob(prefix+'*_'+kind+'_1k.jpg'))
        im=bpy.data.images.load(str(f)) if kind=='normal' else processed(f,key,kind)
        im.colorspace_settings.name='sRGB' if kind=='diffuse' else 'Non-Color'
        im.pack()
        t=m.node_tree.nodes.new('ShaderNodeTexImage'); t.image=im
        if kind=='normal':
            n=m.node_tree.nodes.new('ShaderNodeNormalMap')
            n.inputs['Strength'].default_value=.7
            m.node_tree.links.new(t.outputs['Color'],n.inputs['Color'])
            m.node_tree.links.new(n.outputs[0],bs.inputs['Normal'])
        else:
            m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color' if kind=='diffuse' else 'Roughness'])
for k,c in [('glass',(.13,.23,.21)),('leaf',(.11,.16,.073))]:material(k,c)
bucket=defaultdict(lambda:[[],[]])
group='landmark'
def mesh(name,verts,faces,mat):
    v,f=bucket[group,mat]; start=len(v)
    v.extend(tuple(p) for p in verts); f.extend(tuple(start+i for i in face) for face in faces)
cube_faces=[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
def box(name,center,size,mat):
    a,b,c=[s/2 for s in size]
    mesh(name,[(center[0]+x,center[1]+y,center[2]+z) for x,y,z in [(-a,-b,-c),(a,-b,-c),(a,b,-c),(-a,b,-c),(-a,-b,c),(a,-b,c),(a,b,c),(-a,b,c)]],cube_faces,mat)
def beam(name,start,end,width,depth,mat):
    a,b=Vector(start),Vector(end); d=(b-a).normalized()
    side=d.cross(Vector((0,0,1)) if abs(d.z)<.98 else Vector((0,1,0))).normalized()*width/2
    up=d.cross(side).normalized()*depth/2
    mesh(name,[p+sx*side+sy*up for p in [a,b] for sx,sy in [(-1,-1),(1,-1),(1,1),(-1,1)]],cube_faces,mat)
def flush():
    objects=[]
    for (label,mat),(verts,faces) in bucket.items():
        me=bpy.data.meshes.new(label+'_'+mat);me.from_pydata(verts,[],faces);me.update()
        ob=bpy.data.objects.new(me.name,me);scene.collection.objects.link(ob);me.materials.append(materials[mat])
        uv=me.uv_layers.new()
        for p in me.polygons:
            axis=max(range(3),key=lambda i:abs(p.normal[i]))
            u,v=[(1,2),(0,2),(0,1)][axis]
            for li in p.loop_indices:
                co=me.vertices[me.loops[li].vertex_index].co
                uv.data[li].uv=(co[u]/2.4,co[v]/2.4)
        objects.append(ob)
    bucket.clear()
    return objects
