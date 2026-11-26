"""Rebuild the close-range viewmodel from the installed CC0 MakeHuman HM08 hand topology.
Run in Blender with ROOT and BASE pointing to the checkout and the MPFB base.obj.
"""
import bpy, math, tempfile
from pathlib import Path
from collections import defaultdict
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import sin,cos,pi
root=Path(ROOT);stage=Path(STAGE)
scene=bpy.data.scenes.new("FPS • field uniform");bpy.context.window.scene=scene
verts=[];groups=defaultdict(list);group=""
for line in Path(BASE).open(encoding="utf8"):
    s=line.split()
    if not s:continue
    if s[0]=="v":verts.append(Vector(tuple(map(float,s[1:4]))))
    elif s[0]=="g":group=s[1]
    elif s[0]=="f":groups[group].append(tuple(int(t.split('/')[0])-1 for t in s[1:]))
def joint(name):
    ids={i for f in groups['joint-l-'+name] for i in f}
    return sum((verts[i] for i in ids),Vector())/len(ids)
wrist=joint("hand")
axis=(joint("finger-3-1")-wrist).normalized()
thumb=joint("finger-2-1")-joint("finger-5-1")
thumb=(thumb-axis*thumb.dot(axis)).normalized()
back=thumb.cross(axis).normalized()
def local(v):
    d=(v-wrist)*.10
    return Vector((d.dot(thumb),.24+d.dot(axis),d.dot(back)))
points=[local(v) for v in verts]
def mat(name,color,rough,skin=False,atlas=True):
    m=bpy.data.materials.new(name);m.use_nodes=True
    nt=m.node_tree;p=next(n for n in nt.nodes if n.type=="BSDF_PRINCIPLED")
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
    p.inputs['Subsurface Weight'].default_value=.22 if skin else 0
    if skin:p.inputs['Subsurface Scale'].default_value=.0016
    if atlas:
        tex={}
        for key in ('color','orm','normal'):
            n=nt.nodes.new('ShaderNodeTexImage')
            n.image=bpy.data.images.load(str(stage/(key+'.png')),check_existing=True)
            if key!='color':n.image.colorspace_settings.name='Non-Color'
            tex[key]=n
        nt.links.new(tex['color'].outputs[0],p.inputs['Base Color'])
        n=nt.nodes.new('ShaderNodeSeparateColor');nt.links.new(tex['orm'].outputs[0],n.inputs[0]);nt.links.new(n.outputs[1],p.inputs['Roughness'])
        n=nt.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.72
        nt.links.new(tex['normal'].outputs[0],n.inputs[1]);nt.links.new(n.outputs[0],p.inputs['Normal'])
        # glTF exporter recognises this AO socket and retains the packed red channel.
        group=bpy.data.node_groups.get('glTF Material Output')
        if not group:
            group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
            group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
        n=nt.nodes.new('ShaderNodeGroup');n.node_tree=group
        sep=next(n for n in nt.nodes if n.type=='SEPARATE_COLOR')
        nt.links.new(sep.outputs[0],n.inputs['Occlusion'])
    return m
skin=mat('Sun-exposed skin',(.5,.26,.18),.62,True)
cloth=mat('Washed field twill',(.12,.15,.14),.92)
nail=mat('Keratin nail plates',(.47,.286,.233),.42,atlas=False)
def object_mesh(name,vs,fs,m):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],fs);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);mesh.materials.append(m)
    for p in mesh.polygons:p.use_smooth=True
    return o
def apply(o,typ,**kw):
    bpy.context.view_layer.objects.active=o
    mod=o.modifiers.new(typ,typ)
    for k,v in kw.items():setattr(mod,k,v)
    bpy.ops.object.modifier_apply(modifier=mod.name)
def tris(o):
    o.data.calc_loop_triangles();return len(o.data.loop_triangles)
def verify_bounds(o):
    pts=[v.co for v in o.data.vertices]
    return [(min(v[i] for v in pts),max(v[i] for v in pts)) for i in range(3)]
def verify_overlap(a,b):
    aa,bb=verify_bounds(a),verify_bounds(b)
    return [min(x[1],y[1])-max(x[0],y[0]) for x,y in zip(aa,bb)]
for side,tag in [(1,'Left'),(-1,'Right')]:
    faceids=[f for f in groups['body'] if all(p.y>.15 and abs(p.x)<.12 and abs(p.z)<.11 for p in (points[i] for i in f))]
    ids=sorted({i for f in faceids for i in f});remap={i:j for j,i in enumerate(ids)}
    vs=[]
    for i in ids:
        x,y,z=points[i]
        # Tendons taper between wrist and metacarpophalangeal joints.
        if z>0:
            lift=sum(math.exp(-((x-q*(1+(y-.24)*3))/.0024)**2) for q in (-.020,-.007,.006,.018))
            z+=.0015*lift*math.exp(-((y-.278)/.036)**4)
        z-=max(0,y-.328)**2*(2.2 if side==1 else 3.8)
        # The covered forearm stays inside the folded sleeve, feathering into the wrist.
        inset=min(1,max(0,(.224-y)/.017))
        radius=((x/.031)**2+(z/.022)**2)**.5
        scale=1-inset*(1-1/max(1,radius))
        vs.append((side*x*scale,y,z*scale))
    faces=[tuple(remap[i] for i in (f if side==1 else f[::-1])) for f in faceids]
    hand=object_mesh(tag+' hand',vs,faces,skin)
    apply(hand,'SUBSURF',levels=1)
    if tris(hand)>2400:apply(hand,'DECIMATE',ratio=2400/tris(hand))
    uv=hand.data.uv_layers.new(name='UVMap')
    for p in hand.data.polygons:
        for li in p.loop_indices:
            v=hand.data.vertices[hand.data.loops[li].vertex_index].co
            uv.data[li].uv=(.565*(v.x*side+.085)/.17,(.5 if p.normal.z>0 else 0)+.5*(v.y-.095)/.34)
    # Fit each nail dome against the actual distal phalanx mesh.
    tree=BVHTree.FromPolygons([v.co for v in hand.data.vertices],[p.vertices[:] for p in hand.data.polygons])
    nv=[];nf=[]
    for finger in range(1,6):
        tip=local(joint(f'finger-{finger}-4'));last=local(joint(f'finger-{finger}-3'))
        centre=tip.lerp(last,.28);centre.x*=side
        along=tip-last;along.x*=side;along.z=0;along.normalize()
        across=Vector((along.y,-along.x,0));width=[.0058,.0051,.0053,.0049,.0041][finger-1]
        base=len(nv)
        for ring in [1,.70,.03]:
            for j in range(12):
                q=2*pi*j/12
                pt=centre+across*(width*ring*cos(q))+along*(width*1.35*ring*sin(q))
                hit=tree.ray_cast((pt.x,pt.y,.13),(0,0,-1))[0]
                nv.append((pt.x,pt.y,(hit.z if hit else centre.z)+.00025+.0007*(1-ring)))
        for r in range(2):
            for j in range(12):nf.append(tuple(base+r*12+k for k in (j,(j+1)%12,(j+1)%12+12,j+12)))
        nf.append(tuple(base+24+i for i in range(12)))
    nails=object_mesh(tag+' nail plates',nv,nf,nail)
    # Patterned sleeve radii follow forearm taper, oblique compression folds and a doubled hem.
    ys=[-.055,-.029,.01,.045,.073,.091,.109,.129,.151,.161,.171,.179,.186,.192,.20,.205,.213,.219,.224]
    sv=[];sf=[];N=19
    for k,y in enumerate(ys):
        t=k/(len(ys)-1)
        for j in range(N):
            a=2*pi*j/N
            fold=.0043*sin(89*y+2.7*cos(a+.6)+side*.31)+.0025*cos(153*y-2*sin(2*a))+.003*cos(3*a+8*y)
            if y>.20:fold=.0015*cos(3*a)+(.003 if k in (15,17) else 0)
            rx=.060-.024*t+fold;rz=.050-.022*t+fold
            rear=max(0,(-y+.01)/.065)
            sv.append((side*(rx*cos(a)-.013*(1-t)-.105*rear),y+.0032*sin(2*a+.4)*(1-t)-.43*rear,rz*sin(a)-.005*(1-t)-.14*rear))
    for k in range(len(ys)-1):
        for j in range(N):
            quad=(k*N+j,(k+1)*N+j,(k+1)*N+(j+1)%N,k*N+(j+1)%N)
            sf.append(quad if side==1 else quad[::-1])
    sleeve=object_mesh(tag+' folded sleeve',sv,sf,cloth)
    uv=sleeve.data.uv_layers.new(name='UVMap')
    for k,p in enumerate(sleeve.data.polygons):
        j=k%N
        for li in p.loop_indices:
            ix=sleeve.data.loops[li].vertex_index
            u=1 if j==N-1 and ix%N==0 else (ix%N)/N
            uv.data[li].uv=(.575+.42*u,.01+.98*(ys[ix//N]-ys[0])/(ys[-1]-ys[0]))
    apply(sleeve,'SOLIDIFY',thickness=.0028,offset=-1)
    assert min(verify_overlap(hand,sleeve))>.005
    print(tag,verify_bounds(hand),verify_overlap(hand,sleeve),[tris(o) for o in (hand,sleeve,nails)])
    # Keep only the interior near the turnback and proximal opening.
    import bmesh
    bm=bmesh.new();bm.from_mesh(sleeve.data)
    cut=[f for f in bm.faces if f.index>=len(sf) and f.index<2*len(sf) and -.03<f.calc_center_median().y<.197]
    bmesh.ops.delete(bm,geom=cut,context='FACES');bm.to_mesh(sleeve.data);bm.free()
    bpy.ops.object.select_all(action='DESELECT')
    for o in (hand,sleeve,nails):o.select_set(True)
    bpy.context.view_layer.objects.active=hand;bpy.ops.object.join();hand.name='FPS_Arm_'+tag
count=sum(tris(o) for o in scene.objects)
print('TOTAL',count)
assert 5500<=count<=7500,count
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(root/'changzheng/assets/characters/player/fps-arms-web.glb'),use_active_scene=True,use_selection=True,export_animations=False,export_image_format='WEBP',export_image_quality=80,export_draco_mesh_compression_enable=True,export_draco_texcoord_quantization=14)
