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
    image.convert("RGB").save(buff,format="WEBP",lossless=True,method=0)
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
for t in g["textures"]:t["extensions"]={"EXT_texture_webp":{"source":t.pop("source")}}
for m in g["materials"]:
    if m["name"].startswith("Web "):m["occlusionTexture"]=dict(index=len(g["textures"])-1,texCoord=1,strength=.38)
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
