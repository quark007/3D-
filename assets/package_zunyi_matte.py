"""Repack shell irradiance and timber maps around the existing WebP/Draco payload."""
import io
import json
import struct
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
folder = root/"changzheng/assets/scenes/zunyi-realscan"
target = folder/"zunyi-meeting-room-web.glb"
raw = target.read_bytes()
length = struct.unpack_from("<I",raw,12)[0]
g = json.loads(raw[20:20+length])
buf = raw[28+length:]
chunks = [buf[v["byteOffset"]:v["byteOffset"]+v["byteLength"]] for v in g["bufferViews"]]
views = {im["name"]:im["bufferView"] for im in g["images"]}
def write_image(name, pixels, quality):
    result = io.BytesIO()
    Image.fromarray(pixels).save(result,"WEBP",quality=quality,method=6)
    chunks[views[name]] = result.getvalue()

shell = np.load(root/"evidence/.zunyi-photo-build/shell-linear.npy")
rgb = np.maximum(0,shell[:,:,:3])
srgb = np.where(rgb<=.0031308,12.92*rgb,1.055*rgb**(1/2.4)-.055)
diffuse = np.array(Image.open(io.BytesIO(chunks[views["Diffuse"]])).convert("RGB"))
valid = shell[:,:,3]>.99
diffuse[valid] = np.uint8(np.clip(srgb[valid]*255,0,255))
write_image("Diffuse",diffuse,93)
(folder/"zunyi-meeting-room-diffuse.webp").write_bytes(chunks[views["Diffuse"]])
y,x = np.mgrid[:512,:512]/512
grain = np.sin(2*np.pi*(32*x+.64*np.sin(2*np.pi*y)+.27*np.sin(4*np.pi*y+9*np.sin(x*2*np.pi))))
seam = np.exp(-(np.minimum(x,1-x)/.022)**2)
for name,base in [("Web varnished floor",.59),("Web rubbed table",.65)]:
    rough = base+.14*grain*(1-seam)+.23*seam
    write_image(name+" roughness",np.uint8(np.stack((np.ones_like(x),rough,np.zeros_like(x)),axis=-1)*255),91)
materials = {m["name"]:m for m in g["materials"]}
plaster = materials["Web aged plaster"]
plaster["pbrMetallicRoughness"]["roughnessFactor"] = .96
plaster["normalTexture"]["scale"] = .035
plaster["occlusionTexture"]["strength"] = .21
# Keep the plaster material slot and atlas UVs but replace its high-frequency normal.
write_image("Lime aggregate",np.full((4,4,3),[128,128,255],dtype=np.uint8),100)
floor = materials["Web varnished floor"]
floor.get("extensions",{}).pop("KHR_materials_clearcoat",None)
for name in ("Web static","Web burnished edge"):
    pbr = materials[name]["pbrMetallicRoughness"]
    pbr["roughnessFactor"] = 1 if name=="Web static" else .89
    pbr["metallicRoughnessTexture"] = materials["Web rubbed table"]["pbrMetallicRoughness"]["metallicRoughnessTexture"]
blob = bytearray()
for view,chunk in zip(g["bufferViews"],chunks,strict=True):
    view.update(byteOffset=len(blob),byteLength=len(chunk))
    blob.extend(chunk);blob.extend(bytes(-len(blob)%4))
g["buffers"][0]["byteLength"] = len(blob)
header = json.dumps(g,separators=(",",":")).encode()
header += b" "*(-len(header)%4)
target.write_bytes(struct.pack("<4sIII4s",b"glTF",2,28+len(header)+len(blob),len(header),b"JSON")+header+struct.pack("<I4s",len(blob),b"BIN\0")+blob)

