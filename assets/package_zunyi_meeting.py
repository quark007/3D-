"""Convert Cycles images to WebP and bind the AO atlas to glTF UV1."""
import io,json,struct,sys,tempfile
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
stage=Path(sys.argv[1]) if len(sys.argv)>1 else Path(tempfile.gettempdir())/"zunyi-meeting-cycles"
out=root/"changzheng/assets/scenes/zunyi-realscan"
raw=(stage/"baked.glb").read_bytes()
length=struct.unpack_from("<I",raw,12)[0]
g=json.loads(raw[20:20+length])
blob=raw[28+length:]
views=g["bufferViews"]
chunks=[blob[v.get("byteOffset",0):v.get("byteOffset",0)+v["byteLength"]] for v in views]
def webp(image):
    buff=io.BytesIO()
    image.convert("RGB").save(buff,format="WEBP",quality=94,method=6)
    return buff.getvalue()
for img in g["images"]:
    i=img["bufferView"]
    chunks[i]=webp(Image.open(io.BytesIO(chunks[i])))
    img["mimeType"]="image/webp"
    if img["name"]=="Diffuse":(out/"zunyi-meeting-room-diffuse.webp").write_bytes(chunks[i])
bits=webp(Image.open(stage/"AO.png"))
(out/"zunyi-meeting-room-ao.webp").write_bytes(bits)
g["images"].append(dict(bufferView=len(views),mimeType="image/webp",name="Cycles AO"))
views.append(dict(buffer=0,byteLength=len(bits)))
chunks.append(bits)
g["textures"].append(dict(sampler=0,source=len(g["images"])-1))
ao_index=len(g["textures"])-1
import numpy as np
def tile(name,pixels):
    b=io.BytesIO();Image.fromarray(np.uint8(np.clip(pixels,0,255))).save(b,format="WEBP",quality=88,method=6)
    data=b.getvalue()
    g["images"].append(dict(name=name,bufferView=len(views),mimeType="image/webp"))
    views.append(dict(buffer=0,byteLength=len(data)));chunks.append(data)
    g["textures"].append(dict(sampler=0,source=len(g["images"])-1))
    return {"index":len(g["textures"])-1}
y,x=np.mgrid[:512,:512]/512
grain=np.sin(2*np.pi*(32*x+.64*np.sin(2*np.pi*y)+.27*np.sin(4*np.pi*y+9*np.sin(x*2*np.pi))))
seam=np.exp(-(np.minimum(x,1-x)/.022)**2)
rng=np.random.default_rng(13)
def relief(name,height):
    dx=(np.roll(height,-1,axis=1)-np.roll(height,1,axis=1))*.5
    dy=(np.roll(height,1,axis=0)-np.roll(height,-1,axis=0))*.5
    n=np.stack((-dx,-dy,np.ones_like(dx)),axis=-1)
    n/=np.linalg.norm(n,axis=-1,keepdims=True)
    return tile(name,(n*.5+.5)*255)
wood_normal=relief("Quarter-sawn timber",.32*grain-1.1*seam)
plaster_normal=relief("Lime aggregate",rng.normal(0,.19,(512,512)))
for mat in g["materials"]:
    name=mat["name"]
    if name in ("Web varnished floor","Web rubbed table"):
        floor=name.endswith("floor")
        rough=(.32 if floor else .49)+(.33 if floor else .10)*seam+.032*grain*(1-seam)
        mat["normalTexture"]={**wood_normal,"scale":.65 if floor else .43}
        mat["pbrMetallicRoughness"]["metallicRoughnessTexture"]=tile(name+" roughness",np.stack((np.ones_like(x),rough,np.zeros_like(x)),axis=-1)*255)
        if floor:
            mat.setdefault("extensions",{})["KHR_materials_clearcoat"]={"clearcoatFactor":.24,"clearcoatRoughnessFactor":.34}
            if "KHR_materials_clearcoat" not in g["extensionsUsed"]:g["extensionsUsed"].append("KHR_materials_clearcoat")
    if name=="Web aged plaster":
        mat["normalTexture"]={**plaster_normal,"scale":.48}
        mat["pbrMetallicRoughness"]["baseColorFactor"]=[.78,.75,.70,1]
for t in g["textures"]:t["extensions"]={"EXT_texture_webp":{"source":t.pop("source")}}
for m in g["materials"]:
    if m["name"].startswith("Web "):m["occlusionTexture"]=dict(index=ao_index,texCoord=1,strength=.68)
for key in ["extensionsUsed","extensionsRequired"]:g.setdefault(key,[]).append("EXT_texture_webp")
buf=bytearray()
for v,data in zip(views,chunks):
    v["byteOffset"]=len(buf);v["byteLength"]=len(data)
    buf.extend(data);buf.extend(bytes(-len(buf)%4))
g["buffers"][0]["byteLength"]=len(buf)
header=json.dumps(g,separators=(",",":")).encode()
header+=b" "*(-len(header)%4)
total=28+len(header)+len(buf)
target=out/"zunyi-meeting-room-web.glb"
target.write_bytes(struct.pack("<4sIII4s",b"glTF",2,total,len(header),b"JSON")+header+struct.pack("<I4s",len(buf),b"BIN\0")+buf)
print(target,total)
