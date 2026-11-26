"""Cut the measured sash aperture into the imported west wall, retaining both UV sets."""
import bpy,bmesh,math
from pathlib import Path
from mathutils import Vector
root=Path(ROOT)
(root/'evidence/.zunyi-photo-build').mkdir(parents=True,exist_ok=True)
review=bpy.data.scenes.new('Zunyi east wing sash study')
bpy.context.window.scene=review
bpy.ops.import_scene.gltf(filepath=str(root/'changzheng/assets/scenes/zunyi-realscan/zunyi_street.glb'))
wall=next(o for o in review.objects if o.type=='MESH' and 'plaster' in o.name)
bm=bmesh.new();bm.from_mesh(wall.data)
# Set the backing wall behind the short-end arcade, keeping the original
# plinth, corner post and roof eave on their survey footprint.
for v in bm.verts:
    x,y,z=v.co
    if 12.56<abs(x)<12.69 and -3.08<y<6.00 and .39<z<7.68:
        v.co.x += 1.82 if x<0 else -1.82
# The recessed end walls terminate at +/-10.83 m. Their outermost window
# reveals and sashes must terminate inside that line as well.
def on_front(co):
    return -3.20 < co.y < -2.55 and .40 < co.z < 7.68

shift_bays = any(on_front(v.co) and 11.58 < abs(v.co.x) < 11.68 for v in bm.verts)
if shift_bays:
    for v in bm.verts:
        x=abs(v.co.x)
        if on_front(v.co) and (9.92 < x < 10.01 or 11.58 < x < 11.68):
            v.co.x -= math.copysign(1.10,v.co.x)
bm.normal_update()
def outer_face(f):
    return all(abs(v.co.x-4.875)<.035 for v in f.verts) and abs(f.normal.x)>.98
for axis,cut in [(1,6.00),(1,10.25),(2,4.88),(2,6.95)]:
    region=[f for f in bm.faces if outer_face(f)]
    geom=set(region)
    for f in region:geom.update(f.edges);geom.update(f.verts)
    co=Vector((0,0,0));co[axis]=cut
    no=Vector((0,0,0));no[axis]=1
    bmesh.ops.bisect_plane(bm,geom=list(geom),dist=.0001,plane_co=co,plane_no=no)
inside=[f for f in bm.faces if outer_face(f) and 6.00<f.calc_center_median().y<10.25 and 4.88<f.calc_center_median().z<6.95]
if inside:
    bmesh.ops.delete(bm,geom=inside,context='FACES')
from mathutils.bvhtree import BVHTree
surface=BVHTree.FromBMesh(bm)
def hits_west_wall(z):
    point,_,_,_=surface.ray_cast(Vector((4.40,8.125,z)),Vector((1,0,0)),.65)
    return point is not None
assert hits_west_wall(4.7) and not hits_west_wall(5.9), 'West sill or opening missing'
bm.to_mesh(wall.data);bm.free()
def export_component(obj,filename):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.export_scene.gltf(filepath=str(root/'evidence/.zunyi-photo-build'/filename),
        use_selection=True,use_active_scene=True,export_animations=False,export_materials='PLACEHOLDER',
        export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)

export_component(wall,'west-wall.glb')
for key in ['wood','amber']:
    obj=next(o for o in review.objects if o.type=='MESH' and '建筑群_'+key in o.name)
    if shift_bays:
        for v in obj.data.vertices:
            if on_front(v.co) and 9.90 < abs(v.co.x) < 11.60:
                v.co.x -= math.copysign(1.10,v.co.x)
    export_component(obj,'end-bay-'+key+'.glb')
