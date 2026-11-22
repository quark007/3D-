import hashlib
import io
import json
import struct
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/models-v03/char_soldier.glb'
TARGET_DIR = ROOT / 'assets/characters/wang-gui'
TARGET = TARGET_DIR / 'wang-gui-v1.glb'
COMPONENTS = {
    5120: ('i1', np.int8), 5121: ('u1', np.uint8), 5122: ('<i2', np.int16),
    5123: ('<u2', np.uint16), 5124: ('<u4', np.uint32), 5125: ('<u4', np.uint32), 5126: ('<f4', np.float32)
}
COUNTS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


class Glb:
    def __init__(self, path):
        raw = Path(path).read_bytes()
        self.path = Path(path)
        self.json_length = struct.unpack_from('<I', raw, 12)[0]
        self.doc = json.loads(raw[20:20 + self.json_length])
        bin_header = 20 + self.json_length
        self.bin = bytearray(raw[bin_header + 8:])
        self.new_views = []
        self.image_replacements = {}

    def accessor(self, index):
        accessor = self.doc['accessors'][index]
        view = self.doc['bufferViews'][accessor['bufferView']]
        dtype, _ = COMPONENTS[accessor['componentType']]
        count = COUNTS[accessor['type']]
        start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        stride = view.get('byteStride', np.dtype(dtype).itemsize * count)
        rows = []
        for row in range(accessor['count']):
            rows.append(np.frombuffer(self.bin, dtype=dtype, count=count, offset=start + row * stride))
        return np.asarray(rows)

    def write_accessor(self, index, values):
        accessor = self.doc['accessors'][index]
        view = self.doc['bufferViews'][accessor['bufferView']]
        dtype, _ = COMPONENTS[accessor['componentType']]
        count = COUNTS[accessor['type']]
        values = np.asarray(values, dtype=dtype)
        start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        stride = view.get('byteStride', np.dtype(dtype).itemsize * count)
        for row in range(accessor['count']):
            self.bin[start + row * stride:start + row * stride + count * values.dtype.itemsize] = values[row].tobytes()

    def append_accessor(self, values, target_type, component_type=5126):
        dtype, _ = COMPONENTS[component_type]
        array = np.asarray(values, dtype=dtype)
        data = array.tobytes()
        view_index = len(self.doc['bufferViews']) + len(self.new_views)
        self.new_views.append(({'buffer': 0}, data))
        accessor = {'bufferView': view_index, 'componentType': component_type, 'count': len(array), 'type': target_type}
        if target_type == 'VEC3':
            accessor['min'] = np.min(array, axis=0).tolist()
            accessor['max'] = np.max(array, axis=0).tolist()
        self.doc['accessors'].append(accessor)
        return len(self.doc['accessors']) - 1

    def image_bytes(self, index):
        image = self.doc['images'][index]
        view = self.doc['bufferViews'][image['bufferView']]
        start = view.get('byteOffset', 0)
        return bytes(self.bin[start:start + view['byteLength']])

    def replace_image(self, index, data):
        self.image_replacements[self.doc['images'][index]['bufferView']] = data

    def save(self, path):
        views = []
        for index, view in enumerate(self.doc['bufferViews']):
            start = view.get('byteOffset', 0)
            data = self.image_replacements.get(index, bytes(self.bin[start:start + view['byteLength']]))
            views.append((dict(view), data))
        views.extend(self.new_views)
        binary = bytearray()
        output_views = []
        for view, data in views:
            while len(binary) % 4:
                binary.append(0)
            view['byteOffset'] = len(binary)
            view['byteLength'] = len(data)
            output_views.append(view)
            binary.extend(data)
        while len(binary) % 4:
            binary.append(0)
        self.doc['bufferViews'] = output_views
        self.doc['buffers'] = [{'byteLength': len(binary)}]
        text = json.dumps(self.doc, ensure_ascii=False, separators=(',', ':')).encode()
        while len(text) % 4:
            text += b' '
        total = 12 + 8 + len(text) + 8 + len(binary)
        payload = struct.pack('<III', 0x46546C67, 2, total)
        payload += struct.pack('<II', len(text), 0x4E4F534A) + text
        payload += struct.pack('<II', len(binary), 0x004E4942) + binary
        Path(path).write_bytes(payload)


def node_matrix(node):
    if 'matrix' in node:
        return np.asarray(node['matrix'], dtype=np.float64).reshape(4, 4).T
    matrix = np.eye(4)
    scale = node.get('scale', [1, 1, 1])
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    matrix[:3, :3] = np.asarray([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]
    ]) * np.asarray(scale)
    matrix[:3, 3] = node.get('translation', [0, 0, 0])
    return matrix


def world_matrices(doc):
    world = {}
    def walk(index, parent):
        matrix = parent @ node_matrix(doc['nodes'][index])
        world[index] = matrix
        for child in doc['nodes'][index].get('children', []):
            walk(child, matrix)
    for scene in doc.get('scenes', []):
        for root in scene.get('nodes', []):
            walk(root, np.eye(4))
    return world


def recompute_normals(positions, indices):
    normals = np.zeros_like(positions, dtype=np.float64)
    triangles = positions[indices.reshape(-1, 3)]
    face = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
    for corner in range(3):
        np.add.at(normals, indices.reshape(-1, 3)[:, corner], face)
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    normals = normals / np.maximum(lengths, 1e-12)
    normals[lengths[:, 0] < 1e-12] = [0, 1, 0]
    return normals.astype(np.float32)


def gaussian(value, center, width):
    return np.exp(-((value - center) / width) ** 2)


def soften_nose_normals(normals, positions):
    x, y, z = positions[:, 0], positions[:, 1], positions[:, 2]
    weight = gaussian(x, 0, .024) * gaussian(y, 1.635, .035) * np.clip((z - .065) / .025, 0, 1) * .68
    target = np.column_stack([x * 2.2, np.full_like(x, .08), np.ones_like(x)])
    target /= np.maximum(np.linalg.norm(target, axis=1, keepdims=True), 1e-12)
    result = normals * (1 - weight[:, None]) + target * weight[:, None]
    result /= np.maximum(np.linalg.norm(result, axis=1, keepdims=True), 1e-12)
    return result.astype(np.float32)


def age_geometry(positions, cloth=False):
    result = positions.astype(np.float64).copy()
    y = result[:, 1]
    head = gaussian(y, 1.64, 0.13)
    result[:, 1] -= 0.009 * head
    if cloth:
        cap = np.clip((y - 1.68) / 0.09, 0, 1)
        result[:, 1] -= 0.004 * cap
        shoulders = gaussian(np.abs(result[:, 0]), 0.16, 0.07) * gaussian(y, 1.45, 0.045)
        result[:, 1] += 0.004 * shoulders
        return result.astype(np.float32)
    jaw = gaussian(y, 1.565, 0.035)
    result[:, 0] *= 1 + 0.035 * jaw
    cheek = gaussian(y, 1.64, 0.022)
    result[:, 0] *= 1 + 0.018 * cheek
    front = np.clip((result[:, 2] - 0.045) / 0.03, 0, 1)
    brow = gaussian(y, 1.675, 0.009) * front
    result[:, 2] += 0.0018 * brow
    nose = gaussian(y, 1.635, 0.018) * gaussian(result[:, 0], 0, 0.022) * front
    result[:, 2] += 0.0012 * nose
    result[:, 0] *= 1 + 0.012 * nose
    return result.astype(np.float32)


def morph_deltas(base, uv):
    x, y, z = base[:, 0], base[:, 1], base[:, 2]
    front = np.clip((z - 0.045) / 0.035, 0, 1)
    mouth = gaussian(y, 1.588, 0.025) * gaussian(x, 0, 0.060) * front
    lip_line = (uv[:, 0] >= .33) & (uv[:, 0] < .66) & (uv[:, 1] > .88)
    jaw = np.zeros_like(base)
    lower_lip = np.where(y < 1.6005, 1.0, 0.0)
    jaw_weight = np.maximum(mouth, lip_line.astype(np.float64))
    jaw[:, 1] = -0.042 * jaw_weight * lower_lip
    jaw[:, 2] = 0.003 * jaw_weight * lower_lip
    smile = np.zeros_like(base)
    corners = gaussian(y, 1.600, 0.009) * gaussian(np.abs(x), 0.020, 0.014) * front
    smile[:, 0] = np.sign(x) * 0.007 * corners
    smile[:, 1] = 0.0045 * corners + 0.0015 * gaussian(y, 1.635, 0.02) * front
    smile[:, 2] = 0.0015 * gaussian(y, 1.625, 0.025) * front
    deltas = {'jawOpen': jaw, 'smile': smile}
    eye_white = (uv[:, 0] >= .66) & (uv[:, 1] > .88)
    for side, label in [(1, 'Left'), (-1, 'Right')]:
        eye = np.clip(gaussian(x, side * 0.032, 0.024) * gaussian(y, 1.666, 0.017) * front * 1.8, 0, 1)
        blink = np.zeros_like(base)
        blink[:, 1] = (1.666 - y) * eye
        blink[:, 2] = np.where(eye_white, -0.018 * eye, 0.004 * eye)
        deltas[f'eyeBlink{label}'] = blink
        brow = np.zeros_like(base)
        brow_weight = gaussian(x, side * 0.032, 0.022) * gaussian(y, 1.679, 0.008) * front
        brow[:, 1] = -0.004 * brow_weight
        brow[:, 2] = 0.001 * brow_weight
        deltas[f'browDown{label}'] = brow
    purse = np.zeros_like(base)
    mouth_line = gaussian(y, 1.600, 0.010) * front
    purse[:, 0] = -x * 0.30 * mouth_line
    purse[:, 2] = 0.004 * mouth_line
    wide = np.zeros_like(base)
    wide[:, 0] = x * 0.12 * mouth_line
    deltas['visemeA'] = jaw * 0.72 + wide
    deltas['visemeI'] = jaw * 0.14 + wide * 0.7
    deltas['visemeU'] = jaw * 0.16 + purse
    deltas['visemeO'] = jaw * 0.42 + purse * 1.1
    deltas['visemeE'] = jaw * 0.27 + wide * 0.55
    close = np.zeros_like(base)
    close[:, 1] = (1.600 - y) * mouth_line * 0.30
    close[:, 2] = 0.001 * mouth_line
    deltas['visemeM'] = close
    return deltas


def surface_function(positions, indices):
    triangles = positions[indices.reshape(-1, 3)].astype(np.float64)
    a = triangles[:, 0]
    b = triangles[:, 1] - a
    c = triangles[:, 2] - a
    def front_z(x, y):
        px = b[:, 0]
        py = b[:, 1]
        qx = c[:, 0]
        qy = c[:, 1]
        rx = x - a[:, 0]
        ry = y - a[:, 1]
        det = px * qy - py * qx
        valid = np.abs(det) > 1e-10
        u = np.zeros(len(a))
        v = np.zeros(len(a))
        u[valid] = (rx[valid] * qy[valid] - ry[valid] * qx[valid]) / det[valid]
        v[valid] = (px[valid] * ry[valid] - py[valid] * rx[valid]) / det[valid]
        hit = valid & (u >= 0) & (v >= 0) & (u + v <= 1)
        if not np.any(hit):
            return None
        z = a[:, 2] + u * b[:, 2] + v * c[:, 2]
        return float(np.max(z[hit]))
    return front_z


def ribbon(points, width, front_z):
    positions = []
    normals = []
    uvs = []
    indices = []
    for p0, p1 in zip(points[:-1], points[1:]):
        delta = np.asarray([p1[0] - p0[0], p1[1] - p0[1]])
        length = np.linalg.norm(delta)
        if length < 1e-8:
            continue
        side = np.asarray([-delta[1], delta[0]]) / length * width * 0.5
        quad = [p0 - side, p0 + side, p1 + side, p1 - side]
        base = len(positions)
        for point in quad:
            z = front_z(float(point[0]), float(point[1]))
            if z is None:
                return None
            positions.append([point[0], point[1], z + 0.00065])
            normals.append([0, 0, 1])
            uvs.append([0, 0])
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])
    return {'positions': positions, 'normals': normals, 'uvs': uvs, 'indices': indices}


def combine_geometry(parts):
    result = {'positions': [], 'normals': [], 'uvs': [], 'indices': []}
    for part in parts:
        if not part:
            continue
        offset = len(result['positions'])
        result['positions'].extend(part['positions'])
        result['normals'].extend(part['normals'])
        result['uvs'].extend(part['uvs'])
        result['indices'].extend([index + offset for index in part['indices']])
    return result


def age_details(front_z):
    creases = []
    for y in [1.692, 1.702]:
        creases.append(ribbon([(-.024, y), (-.010, y + .0005), (.006, y - .0003), (.023, y + .0004)], .00065, front_z))
    for side in [-1, 1]:
        creases.append(ribbon([(side * .004, 1.680), (side * .005, 1.671)], .0006, front_z))
        creases.append(ribbon([(side * .016, 1.658), (side * .027, 1.656), (side * .041, 1.657)], .00055, front_z))
        creases.append(ribbon([(side * .017, 1.643), (side * .024, 1.627), (side * .030, 1.612)], .00065, front_z))
        creases.append(ribbon([(side * .014, 1.678), (side * .027, 1.681), (side * .044, 1.677)], .0014, front_z))
    rng = np.random.default_rng(193501)
    stubble = []
    for _ in range(95):
        x = float(rng.uniform(-.052, .052))
        y = float(rng.uniform(1.548, 1.593))
        size = float(rng.uniform(.00035, .00075))
        part = ribbon([(x - size, y), (x + size, y + size * .4)], size, front_z)
        if part:
            stubble.append(part)
    return combine_geometry(creases), combine_geometry(stubble)


def lathe(center, rings, segments=20, flatten=0.58):
    positions = []
    normals = []
    uvs = []
    indices = []
    for ring_index, (height, radius) in enumerate(rings):
        for segment in range(segments):
            angle = segment / segments * np.pi * 2
            positions.append([center[0] + np.cos(angle) * radius, center[1] + height, center[2] + np.sin(angle) * radius * flatten])
            normals.append([np.cos(angle), 0, np.sin(angle)])
            uvs.append([segment / segments, ring_index / max(1, len(rings) - 1)])
    for ring in range(len(rings) - 1):
        for segment in range(segments):
            a = ring * segments + segment
            b = ring * segments + (segment + 1) % segments
            c = a + segments
            d = b + segments
            indices.extend([a, c, b, b, c, d])
    bottom = len(positions)
    positions.append([center[0], center[1] + rings[0][0], center[2]])
    normals.append([0, -1, 0])
    uvs.append([.5, .5])
    top = len(positions)
    positions.append([center[0], center[1] + rings[-1][0], center[2]])
    normals.append([0, 1, 0])
    uvs.append([.5, .5])
    for segment in range(segments):
        nxt = (segment + 1) % segments
        indices.extend([bottom, nxt, segment])
        a = (len(rings) - 1) * segments + segment
        b = (len(rings) - 1) * segments + nxt
        indices.extend([top, a, b])
    return {'positions': positions, 'normals': normals, 'uvs': uvs, 'indices': indices}


def patch_geometry():
    x, y, z = .055, 1.20, -.359
    w, h = .065, .050
    return {
        'positions': [[x - w / 2, y - h / 2, z], [x + w / 2, y - h / 2, z], [x + w / 2, y + h / 2, z], [x - w / 2, y + h / 2, z]],
        'normals': [[0, 0, -1]] * 4,
        'uvs': [[0, 0], [1, 0], [1, 1], [0, 1]],
        'indices': [0, 2, 1, 0, 3, 2]
    }


def plane_quad(x0, x1, y0, y1, z):
    return {
        'positions': [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]],
        'normals': [[0, 0, 1]] * 4,
        'uvs': [[0, 0], [1, 0], [1, 1], [0, 1]],
        'indices': [0, 1, 2, 0, 2, 3]
    }


def between_geometry(start, end, radius):
    start = np.asarray(start, dtype=np.float64)
    end = np.asarray(end, dtype=np.float64)
    delta = end - start
    length = np.linalg.norm(delta)
    direction = delta / length
    side = np.cross(direction, np.asarray([0, 0, 1.0]))
    if np.linalg.norm(side) < 1e-6:
        side = np.cross(direction, np.asarray([1.0, 0, 0]))
    side /= np.linalg.norm(side)
    up = np.cross(direction, side)
    base = lathe([0, 0, 0], [(0, radius), (length, radius)], 12, 1.0)
    positions = np.asarray(base['positions'])
    normals = np.asarray(base['normals'])
    base['positions'] = (start + positions[:, 0:1] * side + positions[:, 1:2] * direction + positions[:, 2:3] * up).tolist()
    base['normals'] = (normals[:, 0:1] * side + normals[:, 1:2] * direction + normals[:, 2:3] * up).tolist()
    return base


def fabric_patch(x, y, width, height, front_z):
    corners = [[x - width / 2, y - height / 2], [x + width / 2, y - height / 2], [x + width / 2, y + height / 2], [x - width / 2, y + height / 2]]
    positions = []
    for px, py in corners:
        z = front_z(px, py)
        if z is None:
            raise RuntimeError(f'Patch is outside cloth: {x}, {y}')
        positions.append([px, py, z + .0008])
    center = {'positions': positions, 'normals': [[0, 0, 1]] * 4, 'uvs': [[0, 0], [1, 0], [1, 1], [0, 1]], 'indices': [0, 1, 2, 0, 2, 3]}
    border = combine_geometry([ribbon(corners[i:i + 2], .0012, front_z) for i in range(3)] + [ribbon([corners[3], corners[0]], .0012, front_z)])
    return center, border


def transform_points(points, matrix):
    points = np.asarray(points, dtype=np.float64)
    homogeneous = np.concatenate([points, np.ones((len(points), 1))], axis=1)
    return (matrix @ homogeneous.T).T[:, :3]


def add_static_mesh(glb, name, geometry, material_index, parent_index, parent_world):
    inverse_parent = np.linalg.inv(parent_world)
    local_positions = transform_points(geometry['positions'], inverse_parent)
    local_normals = (inverse_parent[:3, :3] @ np.asarray(geometry['normals'], dtype=np.float64).T).T
    local_normals /= np.maximum(np.linalg.norm(local_normals, axis=1, keepdims=True), 1e-12)
    primitive = {
        'attributes': {
            'POSITION': glb.append_accessor(np.asarray(local_positions, dtype=np.float32), 'VEC3'),
            'NORMAL': glb.append_accessor(np.asarray(local_normals, dtype=np.float32), 'VEC3'),
            'TEXCOORD_0': glb.append_accessor(np.asarray(geometry['uvs'], dtype=np.float32), 'VEC2')
        },
        'indices': glb.append_accessor(np.asarray(geometry['indices'], dtype=np.uint32), 'SCALAR', 5125),
        'material': material_index,
        'mode': 4
    }
    mesh_index = len(glb.doc['meshes'])
    glb.doc['meshes'].append({'name': name, 'primitives': [primitive]})
    node_index = len(glb.doc['nodes'])
    glb.doc['nodes'].append({'name': name, 'mesh': mesh_index})
    glb.doc['nodes'][parent_index].setdefault('children', []).append(node_index)
    return node_index


def material(name, color, roughness=0.85):
    return {
        'name': name,
        'pbrMetallicRoughness': {'baseColorFactor': [*color, 1], 'metallicFactor': 0, 'roughnessFactor': roughness}
    }


def png_bytes(image):
    output = io.BytesIO()
    image.save(output, format='PNG', optimize=True)
    return output.getvalue()


def enhance_image(data, name, size, seed):
    image = Image.open(io.BytesIO(data)).convert('RGBA').resize((size, size), Image.Resampling.LANCZOS)
    rng = np.random.default_rng(seed)
    pixels = np.asarray(image).astype(np.float32) / 255
    if 'normal' in name:
        noise = rng.normal(0, 0.0025 if name == 'skin_normal' else 0.004, (size, size, 1))
        pixels[:, :, :2] = np.clip(pixels[:, :, :2] + noise, 0.46, 0.54)
    elif 'orm' not in name:
        fine = rng.normal(0, 0.006 if name == 'skin_basecolor' else 0.009, (size, size, 1))
        low = np.asarray(Image.fromarray(np.uint8(np.clip(rng.normal(.5, .18, (32, 32)), 0, 1) * 255)).resize((size, size), Image.Resampling.BICUBIC)).astype(np.float32) / 255 - .5
        pixels[:, :, :3] += fine + low[:, :, None] * .025
        if name == 'skin_basecolor':
            protect = int(size * .88)
            original = Image.open(io.BytesIO(data)).convert('RGBA').resize((size, size), Image.Resampling.LANCZOS)
            pixels[protect:] = np.asarray(original).astype(np.float32)[protect:] / 255
            eye_start = int(size * .66)
            pixels[protect:, eye_start:, :3] *= np.asarray([.82, .85, .87])
        else:
            pixels[:, :, :3] *= np.asarray([.97, .98, .98])
        pixels[:, :, :3] = np.clip(pixels[:, :, :3], 0, 1)
    return png_bytes(Image.fromarray(np.uint8(np.clip(pixels, 0, 1) * 255)))


def build():
    source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    glb = Glb(SOURCE)
    doc = glb.doc
    worlds = world_matrices(doc)
    skin_primitive = None
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            if doc['materials'][primitive['material']].get('name') == 'skin':
                skin_primitive = primitive
                break
    if skin_primitive is None:
        raise RuntimeError('Missing skin primitive')
    original_positions = glb.accessor(skin_primitive['attributes']['POSITION'])
    aged_positions = age_geometry(original_positions)
    indices = glb.accessor(skin_primitive['indices']).astype(np.uint32).reshape(-1)
    glb.write_accessor(skin_primitive['attributes']['POSITION'], aged_positions)
    glb.write_accessor(skin_primitive['attributes']['NORMAL'], soften_nose_normals(recompute_normals(aged_positions, indices), aged_positions))
    target_names = []
    for name, delta in morph_deltas(aged_positions).items():
        accessor = glb.append_accessor(delta.astype(np.float32), 'VEC3')
        skin_primitive.setdefault('targets', []).append({'POSITION': accessor})
        target_names.append(name)
    cloth_surface = None
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            if primitive is skin_primitive:
                mesh.setdefault('extras', {})['targetNames'] = target_names
            elif doc['materials'][primitive['material']].get('name') == 'character_cloth_atlas':
                positions = glb.accessor(primitive['attributes']['POSITION'])
                aged_cloth = age_geometry(positions, cloth=True)
                cloth_indices = glb.accessor(primitive['indices']).astype(np.uint32).reshape(-1)
                glb.write_accessor(primitive['attributes']['POSITION'], aged_cloth)
                glb.write_accessor(primitive['attributes']['NORMAL'], recompute_normals(aged_cloth, cloth_indices))
                if mesh.get('name') == 'chest_pocket':
                    cloth_surface = surface_function(aged_cloth, cloth_indices)
    front_z = surface_function(aged_positions, indices)
    creases, stubble = age_details(front_z)
    nodes = doc['nodes']
    head_index = next(i for i, node in enumerate(nodes) if node.get('name') == 'Head')
    chest_index = next(i for i, node in enumerate(nodes) if node.get('name') == 'Chest')
    pelvis_index = next(i for i, node in enumerate(nodes) if node.get('name') == 'Pelvis')
    upper_arm_index = next(i for i, node in enumerate(nodes) if node.get('name') == 'UpperArm.L')
    crease_mat = len(doc['materials'])
    doc['materials'].append(material('WangGui_AgeCreases', [.24, .14, .085], .92))
    stubble_mat = len(doc['materials'])
    doc['materials'].append(material('WangGui_ShortStubble', [.12, .10, .08], .95))
    canteen_mat = len(doc['materials'])
    doc['materials'].append(material('WangGui_CanteenOlive', [.13, .16, .105], .82))
    cap_mat = len(doc['materials'])
    doc['materials'].append(material('WangGui_CanteenCap', [.075, .055, .032], .72))
    repair_mat = len(doc['materials'])
    doc['materials'].append(material('WangGui_PackRepair', [.23, .20, .13], .96))
    oral_mat = len(doc['materials'])
    doc['materials'].append(material('WangGui_OralCavity', [.025, .006, .004], 1))
    teeth_mat = len(doc['materials'])
    doc['materials'].append(material('WangGui_UpperTeeth', [.65, .60, .48], .7))
    stitch_mat = len(doc['materials'])
    doc['materials'].append(material('WangGui_RepairStitch', [.40, .32, .20], .95))
    add_static_mesh(glb, 'WangGui_AgeDetails', creases, crease_mat, head_index, worlds[head_index])
    add_static_mesh(glb, 'WangGui_Stubble', stubble, stubble_mat, head_index, worlds[head_index])
    add_static_mesh(glb, 'WangGui_Canteen', lathe([-.215, .98, -.215], [(0, .030), (.014, .044), (.086, .044), (.104, .030)]), canteen_mat, pelvis_index, worlds[pelvis_index])
    add_static_mesh(glb, 'WangGui_CanteenCap', lathe([-.215, 1.084, -.215], [(0, .017), (.022, .017)], 16, 1.0), cap_mat, pelvis_index, worlds[pelvis_index])
    add_static_mesh(glb, 'WangGui_PackRepair', patch_geometry(), repair_mat, chest_index, worlds[chest_index])
    add_static_mesh(glb, 'WangGui_OralCavity', plane_quad(-.018, .018, 1.586, 1.602, .078), oral_mat, head_index, worlds[head_index])
    add_static_mesh(glb, 'WangGui_UpperTeeth', plane_quad(-.012, .012, 1.598, 1.601, .0795), teeth_mat, head_index, worlds[head_index])
    sleeve_patch, sleeve_stitch = fabric_patch(.32, 1.24, .05, .06, cloth_surface)
    add_static_mesh(glb, 'WangGui_SleeveRepair', sleeve_patch, repair_mat, upper_arm_index, worlds[upper_arm_index])
    add_static_mesh(glb, 'WangGui_SleeveStitch', sleeve_stitch, stitch_mat, upper_arm_index, worlds[upper_arm_index])
    add_static_mesh(glb, 'WangGui_CanteenStrap', between_geometry([-.215, 1.09, -.215], [-.12, 1.38, -.28], .004), cap_mat, chest_index, worlds[chest_index])
    sizes = {'character_cloth_atlas': 2048, 'skin': 1024}
    for index, image in enumerate(doc['images']):
        name = image.get('name', f'image-{index}')
        group = 'skin' if name.startswith('skin_') else 'character_cloth_atlas'
        glb.replace_image(index, enhance_image(glb.image_bytes(index), name, sizes[group], 193501 + index))
    for mat in doc['materials']:
        pbr = mat.get('pbrMetallicRoughness', {})
        if 'metallicRoughnessTexture' in pbr:
            mat['occlusionTexture'] = {'index': pbr['metallicRoughnessTexture']['index'], 'strength': .75}
        if 'normalTexture' in mat:
            mat['normalTexture']['scale'] = .42 if mat.get('name') == 'character_cloth_atlas' else .36
    doc.setdefault('asset', {})['generator'] = 'Changzheng Wang Gui procedural variant builder'
    doc['asset']['copyright'] = 'Derived from user-supplied v03 char_soldier.glb; original asset terms retained'
    doc['extras'] = {
        'role': 'wang_gui', 'ageYears': 40, 'sourceSha256': source_hash,
        'variant': 'Experienced squad leader; restrained facial aging, neck transition, cap, pack repair and canteen',
        'morphApproximation': 'Low-poly eyelid and mouth deformation; not ARKit or scanned facial performance'
    }
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    glb.save(TARGET)
    output_hash = hashlib.sha256(TARGET.read_bytes()).hexdigest()
    metadata = {
        'role': 'wang_gui', 'ageYears': 40, 'source': 'assets/models-v03/char_soldier.glb',
        'sourceSha256': source_hash, 'asset': 'assets/characters/wang-gui/wang-gui-v1.glb', 'sha256': output_hash,
        'bytes': TARGET.stat().st_size, 'joints': len(doc['skins'][0]['joints']),
        'animations': [clip['name'] for clip in doc.get('animations', [])], 'morphTargets': target_names,
        'textures': {'skin': 1024, 'clothing': 2048}, 'sourceAssetTerms': 'User-supplied v03 asset; no new license claim'
    }
    (TARGET_DIR / 'wang-gui-v1.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


def inspect_model():
    glb = Glb(SOURCE)
    for mesh in glb.doc['meshes']:
        for primitive in mesh['primitives']:
            positions = glb.accessor(primitive['attributes']['POSITION'])
            material_name = glb.doc['materials'][primitive['material']].get('name')
            print(mesh.get('name'), material_name, len(positions), positions.min(axis=0), positions.max(axis=0))
    print('joints', len(glb.doc['skins'][0]['joints']), 'animations', len(glb.doc.get('animations', [])))


if __name__ == '__main__':
    if '--inspect' in sys.argv:
        inspect_model()
    else:
        build()