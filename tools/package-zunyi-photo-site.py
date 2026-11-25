"""Install the Blender wall cut and Cycles atlas without transcoding existing street textures."""
import io,json,struct
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
assets=root/'changzheng/assets/scenes/zunyi-realscan'
stage=root/'evidence/.zunyi-photo-build'
def read(p):
    b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);buf=b[28+n:]
    return g,[buf[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']] for v in g['bufferViews']]
def write(p,g,chunks):
    blob=bytearray()
    for v,c in zip(g['bufferViews'],chunks,strict=True):
        v.update(byteOffset=len(blob),byteLength=len(c));blob.extend(c);blob.extend(bytes(-len(blob)%4))
    g['buffers'][0]['byteLength']=len(blob);j=json.dumps(g,separators=(',',':')).encode();j+=b' '*(-len(j)%4)
    p.write_bytes(struct.pack('<4sIII4s',b'glTF',2,28+len(j)+len(blob),len(j),b'JSON')+j+struct.pack('<I4s',len(blob),b'BIN\0')+blob)
p=assets/'zunyi_street.glb';g,chunks=read(p);patch,patchchunks=read(stage/'west-wall.glb')
old=next(m for m in g['meshes'] if 'plaster' in m['name'])['primitives'][0]
new=patch['meshes'][0]['primitives'][0];draco='KHR_draco_mesh_compression'
assert old['attributes'].keys()==new['attributes'].keys(),(old,new)
for attr,idx in {**old['attributes'],'indices':old['indices']}.items():
    other=new['indices'] if attr=='indices' else new['attributes'][attr]
    g['accessors'][idx]=patch['accessors'][other]
a=old['extensions'][draco];b=new['extensions'][draco]
chunks[a['bufferView']]=patchchunks[b['bufferView']];a['attributes']=b['attributes']
# Crown and trunk use the same transform about the root seat. In the aerial
# reference the upper branches clear the eaves of the two-storey manor.
for node in g['nodes']:
    if node['name'].endswith(('_twig','_bark')):
        scale=[1.13,1.40,1.13];pivot=[13.75,.29,17.45]
        node.update(scale=scale,translation=[c*(1-k) for c,k in zip(pivot,scale)])
write(p,g,chunks)
p=assets/'zunyi-gallery-web.glb';g,chunks=read(p)
encoded=io.BytesIO();Image.open(stage/'gallery-ao.png').convert('RGB').save(encoded,'WEBP',quality=88)
if not g.get('images'):
    g['images']=[dict(bufferView=len(chunks),mimeType='image/webp')];chunks.append(encoded.getvalue());g['bufferViews'].append({'buffer':0})
    g.setdefault('extensionsUsed',[]).append('EXT_texture_webp');g.setdefault('extensionsRequired',[]).append('EXT_texture_webp')
    g['textures']=[dict(extensions={'EXT_texture_webp':{'source':0}})]
    next(m for m in g['materials'] if 'gallery' in m['name'])['occlusionTexture']={'index':0,'strength':.72}
write(p,g,chunks)
p=assets/'zunyi-meeting-room-web.glb';g,chunks=read(p)
for m in g['materials']:
    for name,alpha in [('winter glass',.12),('rose glass',.38),('straw glass',.32)]:
        if name not in m['name']:continue
        m.get('extensions',{}).pop('KHR_materials_transmission',None)
        m['alphaMode']='BLEND';m['doubleSided']=False
        m['pbrMetallicRoughness']['baseColorFactor'][3]=alpha
if not any(n.get('name')=='PeriodFittings' for n in g['nodes']):
    detail,data=read(stage/'fittings.glb');prim=detail['meshes'][0]['primitives'][0]
    base=len(g['accessors']);view=prim['extensions'][draco]
    assert len(detail['bufferViews'])==1 and 'TEXCOORD_1' in prim['attributes']
    view['bufferView']=len(chunks)
    g['bufferViews'].append(dict(buffer=0));chunks.extend(data)
    g['accessors'].extend(detail['accessors'])
    prim['attributes']={k:v+base for k,v in prim['attributes'].items()};prim['indices']+=base
    prim['material']=len(g['materials']);g['materials'].extend(detail['materials'])
    g['scenes'][g['scene']]['nodes'].append(len(g['nodes']))
    g['nodes'].append({'name':'PeriodFittings','mesh':len(g['meshes'])})
    g['meshes'].extend(detail['meshes'])
write(p,g,chunks)
