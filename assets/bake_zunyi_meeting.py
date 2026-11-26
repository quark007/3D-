"""Bake once across distinct world-space UV islands, then restore object boundaries for glTF."""
import bpy, math, tempfile, json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from itertools import combinations
from contextlib import redirect_stdout
root=Path(__file__).resolve().parents[1]
ev=root/"evidence/realism-upgrade"
dst=root/"changzheng/assets/scenes/zunyi-realscan"
tmp=Path(tempfile.gettempdir())/"zunyi-meeting-cycles"
tmp.mkdir(exist_ok=True)
s=bpy.context.scene
# Offset the cold emitter behind the mullions so their shadows reach the floor.
west=s.objects["West overcast"]
west.location=(-3.35,-.85,2.90)
west.rotation_euler=(Vector((.75,.36,.35))-west.location).to_track_quat("-Z","Y").to_euler()
west.data.size=1.18;west.data.energy=720;west.data.color=(.60,.76,1)
bounce=s.objects["Window return"]
bounce.location=(-2.26,-.23,2.06)
bounce.rotation_euler=(Vector((1.4,-.2,.70))-bounce.location).to_track_quat("-Z","Y").to_euler()
bounce.data.energy=155;bounce.data.size=2.05;bounce.data.color=(.60,.78,1)
lamp=s.objects["Lamp glow"].data
lamp.energy=83;lamp.color=(1,.455,.155);lamp.shadow_soft_size=.088
if hasattr(lamp,"use_temperature"):
    lamp.use_temperature=True;lamp.temperature=2700;lamp.color=(1,1,1)
fire=s.objects["Embers"].data
fire.energy=4.6;fire.color=(1,.115,.024)
bg=next(n for n in s.world.node_tree.nodes if n.type=="BACKGROUND")
bg.inputs["Strength"].default_value=.12
s.cycles.max_bounces=6
cam=s.objects["BrazierDetail"]
cam.location=(-.09,1.955,.77)
cam.rotation_euler=(Vector((-.17,1.05,.43))-cam.location).to_track_quat("-Z","Y").to_euler()
cam.data.lens=17
objects=[o for o in s.objects if o.type=="MESH"]
chairs=[o for o in objects if o.name.startswith("FoldingChair")]
assert len(chairs)==20 and len({o.data for o in chairs})==1
def verify_bounds(name):
    o=s.objects[name]
    vs=[o.matrix_world@v.co for v in o.data.vertices]
    return [(min(p[i] for p in vs),max(p[i] for p in vs)) for i in range(3)]
def verify_overlap(a,b,axis):
    aa,bb=verify_bounds(a)[axis],verify_bounds(b)[axis]
    return min(aa[1],bb[1])-max(aa[0],bb[0])
def hull(points):
    pts=sorted(set(points))
    def half(seq):
        h=[]
        for p in seq:
            while len(h)>=2 and (h[-1][0]-h[-2][0])*(p[1]-h[-2][1])-(h[-1][1]-h[-2][1])*(p[0]-h[-2][0])>=0:h.pop()
            h.append(p)
        return h
    return half(pts)[:-1]+half(pts[::-1])[:-1]
def poly(o):return hull([tuple((o.matrix_world@v.co)[:2]) for v in o.data.vertices])
def edge_dist(p,a,b):
    p,a,b=map(Vector,(p,a,b)); ab=b-a
    return (p-a-ab*max(0,min(1,(p-a).dot(ab)/ab.length_squared))).length
def gap(a,b):
    return min(edge_dist(p,v,w) for h,k in [(a,b),(b,a)] for p in h for v,w in zip(k,k[1:]+k[:1]))
furniture=chairs+[s.objects[n] for n in ("Prop_MeetingTable","Prop_WardrobeMirror","Prop_WardrobePlain","Prop_CharcoalBrazier")]
bounds={o.name:verify_bounds(o.name) for o in furniture}
trees={}
for o in furniture:
    trees[o]=BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[p.vertices[:] for p in o.data.polygons])
hits=[]
for a,b in combinations(furniture,2):
    if all(verify_overlap(a.name,b.name,i)>=0 for i in range(3)) and trees[a].overlap(trees[b]):hits.append([a.name,b.name])
aisle={}
for o in chairs:
    (x,X),(y,Y),_=bounds[o.name]
    aisle[o.name]=min(x+2.3,2.3-X,y+3.2,3.2-Y,*[gap(poly(o),poly(s.objects[n])) for n in ("Prop_WardrobeMirror","Prop_WardrobePlain")])
m=chairs[0].data;m.calc_loop_triangles()
report=dict(bounds=bounds,aisle_m=aisle,minimum_aisle_m=min(aisle.values()),intersections=hits,chair_triangles=len(m.loop_triangles),chair_mesh_users=len(chairs),clock_dimensions=list(s.objects["Prop_WallClock"].dimensions))
(ev/"geometry.json").write_text(json.dumps(report,indent=2))
assert not hits and min(aisle.values())>=.9 and 550<=len(m.loop_triangles)<=750
assert all(abs(b[2][0])<.001 for b in bounds.values())
verts=[];faces=[];mats=[];indices=[];uvs=[];offsets={}
for o in objects:
    o.data=o.data.copy()
    if o.data.uv_layers.get("Lightmap"):o.data.uv_layers.remove(o.data.uv_layers["Lightmap"])
    mesh=o.data
    if o.name=="RoomShell":
        for poly in mesh.polygons:
            if "oxblood boards" not in mesh.materials[poly.material_index].name:continue
            for li in poly.loop_indices:
                v=mesh.vertices[mesh.loops[li].vertex_index].co
                mesh.uv_layers[0].data[li].uv=((v.x+2.30)/(4.60/26),v.y*.71)
    offsets[o]=len(uvs)
    off=len(verts)
    verts.extend(o.matrix_world@v.co for v in mesh.vertices)
    for p in mesh.polygons:
        mat=mesh.materials[p.material_index]
        if mat not in mats:mats.append(mat)
        indices.append(mats.index(mat))
        faces.append(tuple(off+i for i in p.vertices))
    uvs.extend(v.uv[:] for v in mesh.uv_layers[0].data)
    o.hide_render=True
mesh=bpy.data.meshes.new("Atlas source")
mesh.from_pydata(verts,[],faces);mesh.update()
proxy=bpy.data.objects.new("Atlas source",mesh)
s.collection.objects.link(proxy)
for mat in mats:mesh.materials.append(mat)
for p,i in zip(mesh.polygons,indices):p.material_index=i
base=mesh.uv_layers.new(name="UVMap")
for loop,uv in zip(base.data,uvs):loop.uv=uv
atlas=mesh.uv_layers.new(name="Lightmap")
mesh.uv_layers.active_index=1
base.active_render=True
bpy.ops.object.select_all(action="DESELECT")
proxy.select_set(True); bpy.context.view_layer.objects.active=proxy
bpy.ops.object.mode_set(mode="EDIT");bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(island_margin=.003,area_weight=.25)
bpy.ops.object.mode_set(mode="OBJECT")
atlas=mesh.uv_layers["Lightmap"]
# Reserve a separate chart for faces that projected edge-on or folded.
import numpy as np,subprocess,shutil
mesh.calc_loop_triangles()
np.savez(tmp/"charts.npz",tri=[[atlas.data[i].uv[:] for i in t.loops] for t in mesh.loop_triangles],face=[t.polygon_index for t in mesh.loop_triangles])
subprocess.run([shutil.which("python") or "python",str(root/"assets/check_zunyi_charts.py"),str(tmp/"charts.npz"),str(tmp/"repair.npy")],check=True)
repair=np.load(tmp/"repair.npy")
strip=(math.ceil(len(repair)/128)*8+4)/1024
for loop in atlas.data:loop.uv.y*=1-strip
for slot,idx in enumerate(repair):
    p=mesh.polygons[int(idx)]
    u=p.normal.orthogonal().normalized();v=p.normal.cross(u)
    xy=np.array([(mesh.vertices[i].co.dot(u),mesh.vertices[i].co.dot(v)) for i in p.vertices])
    xy-=xy.min(axis=0)
    xy/=np.maximum(np.ptp(xy,axis=0),1e-12)
    for li,point in zip(p.loop_indices,xy):
        atlas.data[li].uv=((slot%128*8+2+point[0]*4)/1024,1-strip+(slot//128*8+2+point[1]*4)/1024)
for o in objects:
    target=o.data.uv_layers.new(name="Lightmap")
    for i,loop in enumerate(target.data):loop.uv=atlas.data[offsets[o]+i].uv
    o.data.uv_layers.active_index=0;o.data.uv_layers[0].active_render=True
# Store the unique static UVs and the prototype seat UVs in the editable source.
s.collection.objects.unlink(proxy)
export_meshes={o:o.data for o in chairs}
for o in objects:o.hide_render=False
for o in chairs:o.data=export_meshes[chairs[0]]
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(root/"assets/zunyi-meeting-room-master.blend"),compress=True)
for o in chairs:o.data=export_meshes[o]
for o in objects:o.hide_render=True
s.collection.objects.link(proxy)
proxy.select_set(True);bpy.context.view_layer.objects.active=proxy
s.render.threads_mode="FIXED";s.render.threads=10
s.cycles.samples=256
s.render.bake.margin=3
def bake(key,kind,passes=None):
    img=bpy.data.images.new(key,1024,1024,alpha=False)
    for mat in mats:
        nodes=mat.node_tree.nodes
        node=nodes.new("ShaderNodeTexImage");node.image=img
        nodes.active=node
    args=dict(type=kind,uv_layer="Lightmap",margin=3)
    if passes:args["pass_filter"]=passes
    bpy.ops.object.bake(**args)
    img.filepath_raw=str(tmp/(key+".png"));img.file_format="PNG";img.save()
    return img
# Thin panes pass tinted shadow rays while frames retain full occlusion.
for mat in mats:
    if not any(k in mat.name for k in ("winter glass","rose glass","straw glass")):continue
    nt=mat.node_tree;out=next(n for n in nt.nodes if n.type=="OUTPUT_MATERIAL")
    source=out.inputs[0].links[0].from_socket
    transparent=nt.nodes.new("ShaderNodeBsdfTransparent")
    transparent.inputs[0].default_value=(*((.91,.42,.46) if "rose" in mat.name else (.93,.77,.43) if "straw" in mat.name else (.92,.96,1)),1)
    mix=nt.nodes.new("ShaderNodeMixShader");rays=nt.nodes.new("ShaderNodeLightPath")
    nt.links.new(rays.outputs["Is Shadow Ray"],mix.inputs[0]);nt.links.new(source,mix.inputs[1]);nt.links.new(transparent.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],out.inputs[0])
# Staining follows the skirting, fading into the limewash above knee height.
for mat in mats:
    if "lime plaster" not in mat.name:continue
    nt=mat.node_tree
    p=next(n for n in nt.nodes if n.type=="BSDF_PRINCIPLED")
    source=p.inputs["Base Color"].links[0].from_socket
    coord=nt.nodes.new("ShaderNodeNewGeometry");xyz=nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Position"],xyz.inputs[0])
    ramp=nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color=(.50,.44,.35,1)
    ramp.color_ramp.elements[1].position=.56
    nt.links.new(xyz.outputs["Z"],ramp.inputs[0])
    mult=nt.nodes.new("ShaderNodeMixRGB");mult.blend_type="MULTIPLY";mult.inputs[0].default_value=.82
    nt.links.new(source,mult.inputs[1]);nt.links.new(ramp.outputs[0],mult.inputs[2]);nt.links.new(mult.outputs[0],p.inputs["Base Color"])
ao=bake("AO","AO")
lit=bake("Diffuse","DIFFUSE",{"DIRECT","INDIRECT","COLOR"})
for mat in mats:
    nt=mat.node_tree;mix=next((n for n in nt.nodes if n.type=="MIX_SHADER"),None)
    if mix:
        out=next(n for n in nt.nodes if n.type=="OUTPUT_MATERIAL")
        nt.links.new(mix.inputs[1].links[0].from_socket,out.inputs[0])
# Restore transmissive panes, silver and cane normal in the web version.
def webmat(name,rough,metal=0,with_normal=False):
    mat=bpy.data.materials.new("Web "+name);mat.use_nodes=True
    nt=mat.node_tree;p=next(n for n in nt.nodes if n.type=="BSDF_PRINCIPLED")
    p.inputs["Roughness"].default_value=rough;p.inputs["Metallic"].default_value=metal
    uv=nt.nodes.new("ShaderNodeUVMap");uv.uv_map="Lightmap"
    t=nt.nodes.new("ShaderNodeTexImage");t.image=lit
    nt.links.new(uv.outputs[0],t.inputs[0]); nt.links.new(t.outputs[0],p.inputs["Base Color"])
    if with_normal:
        t=nt.nodes.new("ShaderNodeTexImage");t.image=next(i for i in bpy.data.images if i.name.startswith("Cane weave"))
        v=nt.nodes.new("ShaderNodeUVMap");v.uv_map="UVMap";nt.links.new(v.outputs[0],t.inputs[0])
        n=nt.nodes.new("ShaderNodeNormalMap");nt.links.new(t.outputs[0],n.inputs["Color"]);nt.links.new(n.outputs[0],p.inputs["Normal"])
    return mat
floor=webmat("varnished floor",1)
plaster=webmat("aged plaster",.91)
table=webmat("rubbed table",1)
edge=webmat("burnished edge",.32)
wood=webmat("static",.52)
cane=webmat("woven cane",.66,with_normal=True)
for o in objects:
    o.hide_render=False
    for i,mat in enumerate(o.data.materials):
        if any(k in mat.name for k in ["winter glass","rose glass","straw glass","silvered mirror","milk glass","banked coals","cast iron","tarnished brass"]):continue
        layers={"woven cane":cane,"oxblood boards":floor,"lime plaster":plaster,"blackened table":table,"worn edges":edge}
        o.data.materials[i]=next((m for label,m in layers.items() if label in mat.name),wood)
    slots=list(o.data.materials)
    unique=list(dict.fromkeys(slots))
    remap=[unique.index(slots[p.material_index]) for p in o.data.polygons]
    o.data.materials.clear()
    for mat in unique:o.data.materials.append(mat)
    for p,idx in zip(o.data.polygons,remap):p.material_index=idx
bpy.data.objects.remove(proxy,do_unlink=True)
# Export all seats in a shared draw batch with individual baked islands.
bpy.ops.object.select_all(action="DESELECT")
for o in chairs:o.select_set(True)
bpy.context.view_layer.objects.active=chairs[0]
bpy.ops.object.join()
chairs[0].name="FoldingChairs_20"
bpy.ops.object.select_all(action="DESELECT")
for o in s.objects:
    if o.type=="MESH":o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(tmp/"baked.glb"),use_selection=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_texcoord_quantization=22,export_texcoords=True,export_all_vertex_colors=False,export_yup=True)
print("STAGING",tmp)
