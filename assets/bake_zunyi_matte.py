"""Run in a background Blender opened on the meeting room master. Bake its existing UV1."""
import ctypes as C
from pathlib import Path
import bpy
import numpy as np

root = Path(__file__).resolve().parents[1]
stage = root / "evidence/.zunyi-photo-build"
stage.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
shell = scene.objects["RoomShell"]
assert shell.data.uv_layers["Lightmap"]
def verify_bounds(obj):
    points = [obj.matrix_world @ v.co for v in obj.data.vertices]
    return [(min(p[i] for p in points), max(p[i] for p in points)) for i in range(3)]
def verify_overlap(a, b, axis):
    aa, bb = verify_bounds(a)[axis], verify_bounds(b)[axis]
    return min(aa[1], bb[1]) - max(aa[0], bb[0])
assert verify_overlap(shell, scene.objects["Prop_MeetingTable"], 0) > 0
for name in ("Door_Exit","Prop_WardrobeMirror","Prop_WallClock","Prop_MeetingTable","Prop_CharcoalBrazier","Prop_HangingLamp"):
    assert name in scene.objects
scene.render.engine = "CYCLES"
scene.cycles.samples = 256
scene.cycles.use_denoising = True
scene.cycles.denoiser = "OPENIMAGEDENOISE"
plaster = next(m for m in shell.data.materials if "lime plaster" in m.name)
for n in plaster.node_tree.nodes:
    if n.type == "VALTORGB":
        stops = n.color_ramp.elements
        midpoint = (np.array(stops[0].color)+np.array(stops[-1].color))/2
        for e in stops:
            e.color = midpoint + .09*(np.array(e.color)-midpoint)
    if n.type == "BUMP":
        n.inputs["Strength"].default_value = .012
    if n.type == "BSDF_PRINCIPLED":
        n.inputs["Roughness"].default_value = .96
img = bpy.data.images.new("Room shell lightmap",1024,1024,alpha=True,float_buffer=True)
for mat in shell.data.materials:
    node = mat.node_tree.nodes.new("ShaderNodeTexImage")
    node.image = img
    mat.node_tree.nodes.active = node
bpy.ops.object.select_all(action="DESELECT")
shell.hide_render=False
shell.select_set(True)
bpy.context.view_layer.objects.active=shell
bpy.ops.object.bake(type="DIFFUSE",pass_filter={"DIRECT","INDIRECT","COLOR"},uv_layer="Lightmap",margin=3)
rgba=np.empty(1024*1024*4,np.float32)
img.pixels.foreach_get(rgba)
rgba=rgba.reshape(1024,1024,4)
assert rgba[:,:,3].max() > .99 and rgba[:,:,3].min() == 0
# Cycles bake does not run the render denoiser on texture targets.
# Invoke the bundled OIDN RT filter explicitly on linear radiance.
oidn=C.CDLL(str(Path(bpy.app.binary_path).parent/"blender.shared/OpenImageDenoise.dll"))
ptr=C.c_void_p
def api(name,ret,*args):
    f=getattr(oidn,name);f.restype=ret;f.argtypes=args;return f
dev=api("oidnNewDevice",ptr,C.c_int)(1)
api("oidnCommitDevice",None,ptr)(dev)
flt=api("oidnNewFilter",ptr,ptr,C.c_char_p)(dev,b"RT")
rgb=np.ascontiguousarray(rgba[:,:,:3])
result=np.empty_like(rgb)
bind=api("oidnSetSharedFilterImage",None,ptr,C.c_char_p,ptr,C.c_int,*([C.c_size_t]*5))
for name,data in [(b"color",rgb),(b"output",result)]:
    bind(flt,name,data.ctypes.data,3,1024,1024,0,0,0)
api("oidnSetFilterBool",None,ptr,C.c_char_p,C.c_bool)(flt,b"hdr",True)
api("oidnCommitFilter",None,ptr)(flt)
api("oidnExecuteFilter",None,ptr)(flt)
err=C.c_char_p()
assert api("oidnGetDeviceError",C.c_int,ptr,C.POINTER(C.c_char_p))(dev,C.byref(err))==0,err.value
api("oidnReleaseFilter",None,ptr)(flt)
api("oidnReleaseDevice",None,ptr)(dev)
rgba[:,:,:3]=result
np.save(stage/"shell-linear.npy",rgba[::-1])
print("OIDN shell bake complete",np.count_nonzero(rgba[:,:,3]))

