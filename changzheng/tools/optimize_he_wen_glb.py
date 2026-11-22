import hashlib
import io
import json
import struct
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
GLB = ROOT / 'assets/characters/he-wen/he-wen-study-v1.glb'
SPEC = ROOT / 'source-assets/characters/he-wen/face-spec.json'
RESIZE = {
    'skin-authored-micro-normal': 1024,
    'tunic-cotton-normal': 1024,
    'skin-authored-roughness': 1024,
    'he-wen-short-hair-short04_diffuse': 1024,
    'belt-leather-normal': 512,
    'tunic-cotton-rough': 1024,
    'teeth': 512,
    'belt-leather-rough': 512,
    'tongue01_diffuse': 256,
}

data = GLB.read_bytes()
json_length = struct.unpack('<I', data[12:16])[0]
gltf = json.loads(data[20:20 + json_length])
bin_data = data[20 + json_length + 8:]
image_by_view = {img['bufferView']: img for img in gltf.get('images', []) if 'bufferView' in img}

new_views = []
out = bytearray()
for index, view in enumerate(gltf['bufferViews']):
    start = view.get('byteOffset', 0)
    payload = bin_data[start:start + view['byteLength']]
    image = image_by_view.get(index)
    if image and image.get('name') in RESIZE:
        target = RESIZE[image['name']]
        with Image.open(io.BytesIO(payload)) as im:
            if max(im.size) > target:
                ratio = target / max(im.size)
                im = im.resize((max(1, round(im.width * ratio)), max(1, round(im.height * ratio))), Image.LANCZOS)
            buffer = io.BytesIO()
            im.save(buffer, format='PNG', optimize=True)
            payload = buffer.getvalue()
            print('RESIZED', image['name'], im.size, len(payload), flush=True)
    while len(out) % 4:
        out.append(0)
    new_view = dict(view)
    new_view['byteOffset'] = len(out)
    new_view['byteLength'] = len(payload)
    out.extend(payload)
    new_views.append(new_view)

gltf['bufferViews'] = new_views
gltf['buffers'][0]['byteLength'] = len(out)
json_bytes = json.dumps(gltf, separators=(',', ':')).encode()
while len(json_bytes) % 4:
    json_bytes += b' '
while len(out) % 4:
    out.append(0)
total = 12 + 8 + len(json_bytes) + 8 + len(out)
result = (b'glTF' + struct.pack('<II', 2, total)
          + struct.pack('<I', len(json_bytes)) + b'JSON' + json_bytes
          + struct.pack('<I', len(out)) + b'BIN\0' + bytes(out))
GLB.write_bytes(result)
spec = json.loads(SPEC.read_text(encoding='utf-8'))
spec['runtimeAsset']['sha256'] = hashlib.sha256(result).hexdigest()
SPEC.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('OPTIMIZED_GLB_MB', round(len(result) / 1e6, 2), flush=True)