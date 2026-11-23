import argparse
import bpy
import importlib
import hashlib
import json
import math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import numpy as np
from pathlib import Path
import sys
import types

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--mpfb', required=True)
parser.add_argument('--render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
SOURCE = Path(args.mpfb).resolve()
ASSETS = ROOT / 'source-assets/makehuman-system'
OUT = ROOT / 'assets/characters/he-wen'
EDITABLE = ROOT / 'source-assets/characters/he-wen'
OUT.mkdir(parents=True, exist_ok=True)
EDITABLE.mkdir(parents=True, exist_ok=True)

for name, paths in [('bl_ext', []), ('bl_ext.hw', [str(SOURCE)])]:
    module = types.ModuleType(name)
    module.__path__ = paths
    sys.modules[name] = module
plugin = importlib.import_module('bl_ext.hw.mpfb')
addon = bpy.context.preferences.addons.new()
addon.module = plugin.__name__
plugin.register()
addon.preferences.mh_user_data = str(ASSETS)
services = plugin.MPFB_CONTEXTUAL_INFORMATION['SERVICES']
H, T, F, E = [services[name + 'Service'] for name in ['Human', 'Target', 'Face', 'Export']]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

macro = T.get_default_macro_info_dict()
macro.update(gender=1.0, age=0.5, muscle=0.55, weight=0.43,
             race={'asian': 1.0, 'caucasian': 0.0, 'african': 0.0})
human = H.create_human(scale=0.1, macro_detail_dict=macro)
human.name = 'HeWen_Skin'
identity = {
    'head-oval': 0.18, 'chin-width-incr': 0.16,
    'chin-prominent-incr': 0.08, 'chin-height-incr': 0.05,
    'l-eye-height2-decr': 0.10, 'r-eye-height2-decr': 0.08,
    'l-eye-corner2-up': 0.08, 'r-eye-corner2-up': 0.07,
    'l-eye-push2-in': 0.06, 'r-eye-push2-in': 0.055,
    'l-eye-bag-incr': 0.04, 'r-eye-bag-incr': 0.035,
    'l-cheek-bones-incr': 0.10, 'r-cheek-bones-incr': 0.10,
    'l-cheek-volume-decr': 0.10, 'r-cheek-volume-decr': 0.10,
    'l-cheek-inner-decr': 0.05, 'r-cheek-inner-decr': 0.05,
    'nose-scale-depth-incr': 0.05, 'nose-point-width-incr': 0.06,
    'nose-curve-convex': 0.06, 'nose-scale-vert-incr': 0.04,
    'forehead-temple-decr': 0.04,
    'asym-cheek-1-l': 0.06, 'asym-brown-1-r': 0.05,
}
for name, weight in identity.items():
    T.load_target(human, T.target_full_path(name), weight=weight)
T.bake_targets(human)
bpy.context.view_layer.update()
raw_height = human.dimensions.z
unit = raw_height / 1.76
evaluated = human.evaluated_get(bpy.context.evaluated_depsgraph_get())
body_mesh = evaluated.to_mesh()
body_surface = BVHTree.FromPolygons([v.co.copy() for v in body_mesh.vertices], [list(p.vertices) for p in body_mesh.polygons])
evaluated.to_mesh_clear()


def front_surface(x, z, offset=0):
    hit, normal, _, _ = body_surface.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)))
    if hit is None:
        hit, normal, _, _ = body_surface.ray_cast(Vector((0, -1, z)), Vector((0, 1, 0)))
    if hit is None:
        raise ValueError(f'No torso surface at {x}, {z}')
    return hit.y - offset * unit


human['npcId'] = 'he_wen'
human['characterAgeYears'] = 27
rig = H.add_builtin_rig(human, 'game_engine', import_weights=True)
rig.name = 'HeWen_Rig'
parts = {}
for kind, sub in [
    ('Hair', 'hair/short04/short04'),
    ('Eyes', 'eyes/high-poly/high-poly'),
    ('Eyebrows', 'eyebrows/eyebrow001/eyebrow001'),
    ('Teeth', 'teeth/teeth_base/teeth_base'),
    ('Tongue', 'tongue/tongue01/tongue01'),
    ('Clothes', 'clothes/male_casualsuit01/male_casualsuit01'),
    ('Shoes', 'clothes/shoes04/shoes04'),
]:
    part = H.add_mhclo_asset(str(ASSETS / (sub + '.mhclo')), human,
                           asset_type='Clothes' if kind == 'Shoes' else kind,
                           subdiv_levels=0, material_type='GAMEENGINE')
    part.name = 'HeWen_' + kind
    parts[kind] = part
H.set_character_skin(str(ASSETS / 'skins/middleage_asian_male/middleage_asian_male.mhmat'), human, skin_type='GAMEENGINE')
neck = rig.data.bones['neck_01'].head_local.copy()
chest = rig.data.bones['spine_03'].tail_local.copy()
expressions = {
    'eyeBlinkLeft': 'eye-left-closure', 'eyeBlinkRight': 'eye-right-closure',
    'jawOpen': 'mouth-open', 'browDownLeft': 'eyebrows-left-down',
    'browDownRight': 'eyebrows-right-down',
    'smile': 'mouth-corner-puller',
    'browInnerUpLeft': 'eyebrows-left-inner-up',
    'browInnerUpRight': 'eyebrows-right-inner-up',
    'eyeWideLeft': 'eye-left-opened-up', 'eyeWideRight': 'eye-right-opened-up',
    'visemeI': 'mouth-part-later', 'visemeU': 'mouth-pursing',
    'visemeO': 'mouth-protusion', 'visemeE': 'mouth-elevation',
    'visemeM': 'mouth-compression',
    'browUpLeft': 'eyebrows-left-up', 'browUpRight': 'eyebrows-right-up',
}
for name, source in expressions.items():
    T.load_target(human, str(SOURCE / ('mpfb/data/targets/expression/units/asian/' + source + '.target.gz')), name=name, weight=0.0)
F.interpolate_targets(human)
for kind in ['Clothes', 'Shoes']:
    obj = parts[kind]
    if obj.data.shape_keys:
        if len(obj.data.shape_keys.key_blocks) != 1:
            raise ValueError(f'{kind} has non-basis shape keys')
        obj.shape_key_clear()
shoes = parts['Shoes']
for vertex in shoes.data.vertices:
    side = 'l' if vertex.co.x > 0 else 'r'
    ankle = rig.data.bones['foot_' + side].head_local
    blend = max(0, min(1, (vertex.co.z - ankle.z - 0.018 * unit) / (0.055 * unit)))
    for axis in [0, 1]:
        vertex.co[axis] = ankle[axis] + (vertex.co[axis] - ankle[axis]) * (1 - 0.30 * blend)
garment = parts['Clothes']
subdiv = garment.modifiers.new('Cloth silhouette subdivision', 'SUBSURF')
subdiv.levels = 1
bpy.context.view_layer.objects.active = garment
bpy.ops.object.modifier_apply(modifier=subdiv.name)
garment_mesh = garment.data
for vertex in garment_mesh.vertices:
    point = vertex.co.copy()
    z_rel = (point.z - neck.z) / unit
    if z_rel < -0.26 or z_rel > 0.05:
        continue
    hit, normal, _, _ = body_surface.find_nearest(point)
    if hit is None:
        continue
    gap = (point - hit).dot(normal)
    if gap <= 0.009 * unit:
        continue
    weight = max(0.0, 1.0 - abs(z_rel + 0.08) / 0.15)
    vertex.co = point.lerp(hit + normal * (0.009 * unit), min(1.0, weight))
garment_mesh.update()
for vertex in garment_mesh.vertices:
    point = vertex.co
    z = (point.z - neck.z) / unit
    if z > -0.06:
        continue
    x, y = point.x / unit, point.y / unit
    long_fold = math.sin(z * 31 + x * 7.5) * math.sin(y * 11 + z * 9)
    fine_fold = math.sin(z * 83 + x * 29) * math.sin(y * 47 - z * 17)
    waist_fold = math.exp(-((z + 0.42) / 0.09) ** 2) * math.sin(x * 26 + z * 55)
    elbow_fold = math.exp(-((z + 0.24) / 0.10) ** 2) * math.sin(y * 40 + z * 46) * min(1, abs(x) / 0.14)
    amount = (0.0011 * long_fold + 0.0005 * fine_fold + 0.0022 * waist_fold + 0.0016 * elbow_fold) * unit
    vertex.co += vertex.normal * amount
garment_mesh.update()
garment_mesh.calc_loop_triangles()
cloth_triangles = [tuple(triangle.vertices) for triangle in garment_mesh.loop_triangles]
cloth_surface = BVHTree.FromPolygons([v.co.copy() for v in garment_mesh.vertices], cloth_triangles, all_triangles=True)
human.data.calc_loop_triangles()
body_triangles = [tuple(triangle.vertices) for triangle in human.data.loop_triangles]
body_weight_surface = BVHTree.FromPolygons([v.co.copy() for v in human.data.vertices], body_triangles, all_triangles=True)


def surface_weights(point, source, triangles, surface):
    hit, _, index, _ = surface.find_nearest(point)
    indices = triangles[index]
    a, b, c = [source.data.vertices[i].co for i in indices]
    ab, ac, ah = b - a, c - a, hit - a
    d00, d01, d11 = ab.dot(ab), ab.dot(ac), ac.dot(ac)
    denominator = d00 * d11 - d01 * d01
    if abs(denominator) < 1e-18:
        factors = [1, 0, 0]
    else:
        v = (d11 * ah.dot(ab) - d01 * ah.dot(ac)) / denominator
        w = (d00 * ah.dot(ac) - d01 * ah.dot(ab)) / denominator
        factors = [max(0, 1 - v - w), max(0, v), max(0, w)]
    weights = {}
    for index, factor in zip(indices, factors):
        for group in source.data.vertices[index].groups:
            name = source.vertex_groups[group.group].name
            if name in rig.data.bones:
                weights[name] = weights.get(name, 0) + group.weight * factor
    weights = dict(sorted(weights.items(), key=lambda item: item[1], reverse=True)[:4])
    total = sum(weights.values())
    if total <= 0:
        raise ValueError('Garment attachment has no deform weights')
    return {name: weight / total for name, weight in weights.items()}



def image(name, pixels, noncolor=False, jpeg=False):
    height, width = pixels.shape[:2]
    result = bpy.data.images.new(name, width=width, height=height, alpha=True)
    result.colorspace_settings.name = 'Non-Color' if noncolor else 'sRGB'
    result.pixels.foreach_set(pixels.astype(np.float32).ravel())
    result.filepath_raw = str(OUT / (name + ('.jpg' if jpeg else '.png')))
    result.file_format = 'JPEG' if jpeg else 'PNG'
    result.save()
    return result


def image_node(material, texture):
    node = material.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = texture
    return node


def material(name, color, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat, bsdf


rng = np.random.default_rng(193410)
cloth_size = 2048
y, x = np.mgrid[0:cloth_size, 0:cloth_size].astype(np.float32)
warp = np.sin((x + y * 0.35) * math.tau / 7)
weft = np.sin((y - x * 0.22) * math.tau / 9)
weave = 0.5 + 0.16 * warp * weft + 0.05 * np.sin((x - y) * math.tau / 23)
weave += 0.04 * np.sin(x * math.tau / 17) * np.sin(y * math.tau / 13)
weave += rng.normal(0, 0.035, weave.shape)
fade = 0.5 + 0.5 * np.sin(x / cloth_size * math.tau * 1.7 + 0.6) * np.sin(y / cloth_size * math.tau * 1.3)
cloth_pixels = np.ones((cloth_size, cloth_size, 4), dtype=np.float32)
cloth_pixels[:, :, :3] = np.clip(weave[:, :, None] * 0.018 + fade[:, :, None] * 0.018 + np.array([0.225, 0.265, 0.285]), 0, 1)
cloth_map = image('tunic-cotton-base', cloth_pixels, jpeg=True)
dy, dx = np.gradient(weave)
normal = np.dstack((-dx * 0.55, -dy * 0.55, np.ones_like(dx)))
normal /= np.linalg.norm(normal, axis=2, keepdims=True)
normal_pixels = np.ones((cloth_size, cloth_size, 4), dtype=np.float32)
normal_pixels[:, :, :3] = normal * 0.5 + 0.5
cloth_normal = image('tunic-cotton-normal', normal_pixels, True)
wear = 0.5 + 0.5 * np.sin(x / cloth_size * math.tau * 2.9 + 1.3) * np.sin(y / cloth_size * math.tau * 2.1 + 0.4)
wear = np.clip((wear - 0.55) * 3, 0, 1)
rough_pixels = np.ones((cloth_size, cloth_size, 4), dtype=np.float32)
rough_pixels[:, :, :3] = np.clip(0.88 + (weave - 0.5) * 0.06 + fade * 0.04 - wear * 0.13, 0.55, 0.98)[:, :, None]
cloth_rough = image('tunic-cotton-rough', rough_pixels, True)
cloth, cloth_bsdf = material('HeWen_WornCotton', (0.28, 0.32, 0.34), 0.91)
cloth_bsdf.inputs['Sheen Weight'].default_value = 0
base = image_node(cloth, cloth_map)
cloth.node_tree.links.new(base.outputs['Color'], cloth_bsdf.inputs['Base Color'])
normal_tex = image_node(cloth, cloth_normal)
rough_tex = image_node(cloth, cloth_rough)
uv = cloth.node_tree.nodes.new('ShaderNodeTexCoord')
mapping = cloth.node_tree.nodes.new('ShaderNodeMapping')
mapping.inputs['Scale'].default_value = (5, 5, 1)
cloth.node_tree.links.new(uv.outputs['UV'], mapping.inputs['Vector'])
for texture_node in [base, normal_tex, rough_tex]:
    cloth.node_tree.links.new(mapping.outputs['Vector'], texture_node.inputs['Vector'])
cloth.node_tree.links.new(rough_tex.outputs['Color'], cloth_bsdf.inputs['Roughness'])
normal_node = cloth.node_tree.nodes.new('ShaderNodeNormalMap')
normal_node.inputs['Strength'].default_value = 0.5
cloth.node_tree.links.new(normal_tex.outputs['Color'], normal_node.inputs['Color'])
cloth.node_tree.links.new(normal_node.outputs['Normal'], cloth_bsdf.inputs['Normal'])
parts['Clothes'].data.materials.clear()
parts['Clothes'].data.materials.append(cloth)
shoe, _ = material('HeWen_ClothShoes', (0.045, 0.04, 0.033), 0.87)
parts['Shoes'].data.materials.clear()
parts['Shoes'].data.materials.append(shoe)

skin, skin_bsdf = material('HeWen_SkinPBR', (1, 1, 1), 0.58)
skin_bsdf.inputs['Subsurface Weight'].default_value = 0.055
skin_bsdf.inputs['Subsurface Radius'].default_value = (1.0, 0.42, 0.22)
skin_bsdf.inputs['Subsurface Scale'].default_value = 0.012
skin_bsdf.inputs['Specular IOR Level'].default_value = 0.20
skin_image = bpy.data.images.load(str(ASSETS / 'skins/middleage_asian_male/middleage_lightskinned_male_diffuse2.png'), check_existing=True)
skin_image.scale(4096, 4096)
skin_pixels = np.empty(len(skin_image.pixels), dtype=np.float32)
skin_image.pixels.foreach_get(skin_pixels)
skin_pixels = skin_pixels.reshape(skin_image.size[1], skin_image.size[0], 4)
skin_pixels[:, :, :3] *= np.array([0.66, 0.63, 0.60])
sy, sx = np.mgrid[0:4096, 0:4096].astype(np.float32)
blotch = (np.sin(sx / 4096 * math.tau * 3.1) + np.sin(sy / 4096 * math.tau * 2.3)
          + np.sin((sx + sy) / 4096 * math.tau * 4.7)) / 3
pore_lum = rng.normal(0, 0.0045, (4096, 4096)).astype(np.float32)
skin_pixels[:, :, :3] *= 1 + blotch[:, :, None] * np.array([0.025, 0.012, 0.005]) + pore_lum[:, :, None]
spots = (rng.random((4096, 4096), dtype=np.float32) > 0.999975).astype(np.float32)
spots = (spots + np.roll(spots, 1, axis=0) + np.roll(spots, 1, axis=1)) / 3
skin_pixels[:, :, :3] *= 1 - spots[:, :, None] * np.array([0.10, 0.14, 0.16])
skin_pixels[:, :, :3] = np.clip(skin_pixels[:, :, :3], 0, 1)
skin_image = image('he-wen-skin-base', skin_pixels, jpeg=True)
skin_tex = image_node(skin, skin_image)
skin.node_tree.links.new(skin_tex.outputs['Color'], skin_bsdf.inputs['Base Color'])
pore_size = 2048
noise = rng.normal(0, 1, (pore_size, pore_size)).astype(np.float32)
soft = (noise + np.roll(noise, 1, axis=0) + np.roll(noise, 1, axis=1)
        + np.roll(noise, 2, axis=0) + np.roll(noise, 2, axis=1)) / 5
grain = noise - soft
ny, nx = np.gradient(soft * 0.7 + grain * 0.3)
normals = np.dstack((-nx * 0.17, -ny * 0.17, np.ones_like(nx)))
normals /= np.linalg.norm(normals, axis=2, keepdims=True)
rgba = np.ones((pore_size, pore_size, 4), dtype=np.float32)
rgba[:, :, :3] = normals * 0.5 + 0.5
skin_normal = image('skin-authored-micro-normal', rgba, True)
tex = image_node(skin, skin_normal)
skin_uv = skin.node_tree.nodes.new('ShaderNodeTexCoord')
skin_mapping = skin.node_tree.nodes.new('ShaderNodeMapping')
skin_mapping.inputs['Scale'].default_value = (4, 4, 1)
skin.node_tree.links.new(skin_uv.outputs['UV'], skin_mapping.inputs['Vector'])
skin.node_tree.links.new(skin_mapping.outputs['Vector'], tex.inputs['Vector'])
norm = skin.node_tree.nodes.new('ShaderNodeNormalMap')
norm.inputs['Strength'].default_value = 0.42
skin.node_tree.links.new(tex.outputs['Color'], norm.inputs['Color'])
skin.node_tree.links.new(norm.outputs['Normal'], skin_bsdf.inputs['Normal'])
rgba[:, :, :3] = np.clip(0.56 + soft[:, :, None] * 0.05 + grain[:, :, None] * 0.022, 0.40, 0.70)
rough = image('skin-authored-roughness', rgba, True)
tex = image_node(skin, rough)
skin.node_tree.links.new(skin_mapping.outputs['Vector'], tex.inputs['Vector'])
skin.node_tree.links.new(tex.outputs['Color'], skin_bsdf.inputs['Roughness'])
human.data.materials.clear()
human.data.materials.append(skin)
for kind in ['Hair', 'Eyebrows']:
    for mat in parts[kind].data.materials:
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                node.inputs['Roughness'].default_value = 0.62 if kind == 'Hair' else 0.55
                node.inputs['Specular IOR Level'].default_value = 0.12 if kind == 'Hair' else 0.16
                if kind == 'Hair':
                    node.inputs['Anisotropic'].default_value = 0.30
                    node.inputs['Anisotropic Rotation'].default_value = 0.25
                    node.inputs['Sheen Weight'].default_value = 0.15
                    node.inputs['Sheen Tint'].default_value = (0.06, 0.055, 0.05, 1)
                    node.inputs['Sheen Roughness'].default_value = 0.5
            if node.type == 'TEX_IMAGE' and node.image and node.name == 'DiffuseTexture' and kind == 'Hair':
                hair_pixels = np.empty(len(node.image.pixels), dtype=np.float32)
                node.image.pixels.foreach_get(hair_pixels)
                hair_pixels = hair_pixels.reshape(node.image.size[1], node.image.size[0], 4)
                hair_pixels[:, :, :3] *= np.array([0.52, 0.50, 0.48])
                node.image = image('he-wen-short-hair', hair_pixels)
for mat in parts['Eyes'].data.materials:
    for node in mat.node_tree.nodes:
        if node.type == 'TEX_IMAGE' and node.image and node.name == 'DiffuseTexture':
            eye_pixels = np.empty(len(node.image.pixels), dtype=np.float32)
            node.image.pixels.foreach_get(eye_pixels)
            h, w = node.image.size[1], node.image.size[0]
            eye_pixels = eye_pixels.reshape(h, w, 4)
            v, u = np.mgrid[0:h, 0:w]
            radius = np.minimum(np.hypot(u / w - 0.707, v / h - 0.702), np.hypot(u / w - 0.291, v / h - 0.285))
            iris = np.clip((0.123 - radius) / 0.015, 0, 1)
            du0, dv0 = u / w - 0.707, v / h - 0.702
            du1, dv1 = u / w - 0.291, v / h - 0.285
            use0 = np.hypot(du0, dv0) <= np.hypot(du1, dv1)
            angle = np.arctan2(np.where(use0, dv0, dv1), np.where(use0, du0, du1))
            fibers = 0.82 + 0.18 * np.sin(angle * 70 + np.sin(radius * 320) * 2.5) * (0.6 + 0.4 * np.sin(radius * 500))
            pupil = np.clip((radius - 0.048) / 0.010, 0, 1)
            limbal = np.clip((radius - 0.100) / 0.008, 0, 1) * np.clip((0.126 - radius) / 0.006, 0, 1)
            eye_pixels[:, :, :3] *= 1 + iris[:, :, None] * (np.array([0.38, 0.48, 0.55]) - 1)
            eye_pixels[:, :, :3] *= 1 - iris[:, :, None] * (1 - fibers[:, :, None]) * 0.9
            eye_pixels[:, :, :3] *= 1 - iris[:, :, None] * (1 - pupil[:, :, None]) * 0.93
            eye_pixels[:, :, :3] *= 1 - limbal[:, :, None] * 0.45
            sclera = np.clip((radius - 0.125) / 0.04, 0, 1)
            vessels = np.maximum(0, np.sin(u / w * 90 + np.sin(v / h * 35) * 2.5)
                                 * np.sin(v / h * 70 + u / w * 12)) ** 8
            vessel_mask = sclera * vessels
            eye_pixels[:, :, 1] *= 1 - vessel_mask * 0.10
            eye_pixels[:, :, 2] *= 1 - vessel_mask * 0.12 - sclera * 0.035
            node.image = image('he-wen-dark-brown-eyes', eye_pixels)
        if node.type == 'BSDF_PRINCIPLED':
            node.inputs['Roughness'].default_value = 0.12
            node.inputs['Specular IOR Level'].default_value = 0.5
            node.inputs['Coat Weight'].default_value = 0.55
            node.inputs['Coat Roughness'].default_value = 0.06

bpy.context.view_layer.update()
accessories = []


def bind(obj, bone):
    obj.parent = rig
    if bone in ['garment', 'body']:
        bpy.context.view_layer.update()
        source, triangles, surface = (human, body_triangles, body_weight_surface) if bone == 'body' else (garment, cloth_triangles, cloth_surface)
        for vertex in obj.data.vertices:
            for name, weight in surface_weights(obj.matrix_world @ vertex.co, source, triangles, surface).items():
                group = obj.vertex_groups.get(name)
                if group is None:
                    group = obj.vertex_groups.new(name=name)
                group.add([vertex.index], weight, 'REPLACE')
    else:
        group = obj.vertex_groups.new(name=bone)
        group.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    modifier = obj.modifiers.new('HeWen armature', 'ARMATURE')
    modifier.object = rig
    accessories.append(obj)


def box(name, location, dimensions, mat, bone='spine_03'):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new('Tailored soft edges', 'BEVEL')
    bevel.width = 0.0025 * unit
    bevel.segments = 3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.data.materials.append(mat)
    bind(obj, bone)
    return obj


def surface_mesh(name, vertices, faces, mat, bone):
    mesh = bpy.data.meshes.new(name + 'Mesh')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name='UVMap')
    for loop in mesh.loops:
        vertex = mesh.vertices[loop.vertex_index].co
        uv_layer.data[loop.index].uv = (vertex.x / unit, vertex.z / unit)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bind(obj, bone)
    return obj


def torso_patch(name, x_center, z_bottom, z_top, half_bottom, half_top, offset, mat, underlay=False, fullness=0, body_fallback=False):
    vertices, faces = [], []
    for row in range(17):
        t = row / 16
        z = z_bottom * (1 - t) + z_top * t
        half = half_bottom * (1 - t) + half_top * t
        if underlay:
            half += 0.024 * unit * math.sin(math.pi * t)
        for col in range(13):
            s = col / 12
            x = x_center + (s * 2 - 1) * half
            if underlay:
                neckline_z = z - 0.009 * unit * (1 - (s * 2 - 1) ** 2) * t ** 6
                y = front_surface(x, neckline_z, offset)
                hit, normal, _, _ = cloth_surface.ray_cast(Vector((x, -1, neckline_z)), Vector((0, 1, 0)))
                if hit is not None and normal.y < 0:
                    y = min(max(y, hit.y + 0.003 * unit), front_surface(x, neckline_z, 0.002))
                point = Vector((x, y, neckline_z))
            else:
                hit, normal, _, _ = cloth_surface.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)))
                if hit is None or normal.y >= 0:
                    if not body_fallback:
                        raise ValueError(f'{name} missed front garment surface')
                    point = Vector((x, front_surface(x, z, offset), z))
                else:
                    depth = offset + fullness * math.sin(math.pi * s) * math.sin(math.pi * t)
                    point = hit + normal * depth * unit
            vertices.append(tuple(point))
    for row in range(16):
        for col in range(12):
            i = row * 13 + col
            faces.append((i, i + 1, i + 14, i + 13))
    return surface_mesh(name, vertices, faces, mat, 'body' if underlay else 'garment')


def trim_material(name, width_m, height_m):
    w_px = 256 if height_m > width_m else 512
    h_px = min(4096, max(256, int(round(w_px * height_m / width_m / 8) * 8)))
    ty, tx = np.mgrid[0:h_px, 0:w_px].astype(np.float32)
    u = tx / w_px * width_m
    v = ty / h_px * height_m
    warp_t = np.sin((u * 1.4 + v) * math.tau / 0.00075)
    weft_t = np.sin((v - u * 0.3) * math.tau / 0.00095)
    weave_t = 0.5 + 0.16 * warp_t * weft_t
    weave_t += rng.normal(0, 0.03, weave_t.shape).astype(np.float32)
    pixels = np.ones((h_px, w_px, 4), dtype=np.float32)
    pixels[:, :, :3] = np.clip(weave_t[:, :, None] * 0.018 + 0.009 + np.array([0.225, 0.265, 0.285]), 0, 1)
    stitch = np.zeros((h_px, w_px), dtype=np.float32)
    for edge in [0.0018, width_m - 0.0018]:
        band = np.exp(-((u - edge) / 0.00045) ** 2)
        dash = np.clip(np.sin(v * math.tau / 0.0035) * 4, 0, 1)
        stitch = np.maximum(stitch, band * dash)
    pixels[:, :, :3] = (pixels[:, :, :3] * (1 - stitch[:, :, None] * 0.55)
                        + np.array([0.34, 0.37, 0.39]) * stitch[:, :, None] * 0.55)
    base_img = image(name + '-base', pixels, jpeg=True)
    dy_t, dx_t = np.gradient(weave_t + stitch * 0.9)
    n = np.dstack((-dx_t * 0.55, -dy_t * 0.55, np.ones_like(dx_t)))
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    npix = np.ones((h_px, w_px, 4), dtype=np.float32)
    npix[:, :, :3] = n * 0.5 + 0.5
    normal_img = image(name + '-normal', npix, True)
    mat, bsdf = material(name, (0.28, 0.32, 0.34), 0.90)
    base_node = image_node(mat, base_img)
    mat.node_tree.links.new(base_node.outputs['Color'], bsdf.inputs['Base Color'])
    normal_node = image_node(mat, normal_img)
    normal_map = mat.node_tree.nodes.new('ShaderNodeNormalMap')
    normal_map.inputs['Strength'].default_value = 0.55
    mat.node_tree.links.new(normal_node.outputs['Color'], normal_map.inputs['Color'])
    mat.node_tree.links.new(normal_map.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def reuv_trim(obj):
    coords = [(vertex.co.x / unit, vertex.co.z / unit) for vertex in obj.data.vertices]
    xs = [c[0] for c in coords]
    zs = [c[1] for c in coords]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    for loop in obj.data.loops:
        vx, vz = coords[loop.vertex_index]
        obj.data.uv_layers.active.data[loop.index].uv = ((vx - x0) / max(x1 - x0, 1e-6), (vz - z0) / max(z1 - z0, 1e-6))


red, _ = material('HeWen_RedClothTabs', (0.30, 0.018, 0.012), 0.86)
torso_patch('HeWen_UpperTunic', 0, neck.z - 0.21 * unit, neck.z + 0.020 * unit, 0.020 * unit, 0.055 * unit, 0.009, cloth, underlay=True)
placket_mat = trim_material('HeWen_TrimPlacket', 0.024, 0.390)
flap_mat = trim_material('HeWen_TrimFlap', 0.088, 0.027)
placket = torso_patch('HeWen_TunicClosure', 0, neck.z - 0.410 * unit, neck.z - 0.020 * unit, 0.012 * unit, 0.012 * unit, 0.011, placket_mat, body_fallback=True)
reuv_trim(placket)
for side in [-1, 1]:
    torso_patch('HeWen_BreastPocket', side * 0.089 * unit, neck.z - 0.310 * unit, neck.z - 0.205 * unit, 0.040 * unit, 0.044 * unit, 0.0015, cloth, fullness=0.002)
    flap = torso_patch('HeWen_PocketFlap', side * 0.089 * unit, neck.z - 0.229 * unit, neck.z - 0.202 * unit, 0.044 * unit, 0.044 * unit, 0.004, flap_mat)
    reuv_trim(flap)
button_mat, button_bsdf = material('HeWen_MatteButtons', (0.018, 0.018, 0.015), 0.55)
button_bsdf.inputs['Coat Weight'].default_value = 0.30
button_bsdf.inputs['Coat Roughness'].default_value = 0.35
for i in range(6):
    z = neck.z - (0.055 + i * 0.064) * unit
    y = front_surface(0, z, 0.015)
    hit, normal, _, _ = cloth_surface.ray_cast(Vector((0, -1, z)), Vector((0, 1, 0)))
    if hit is not None and normal.y < 0:
        y = min(y, hit.y - 0.012 * unit)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.005 * unit,
                                      location=(0, y, z))
    obj = bpy.context.object
    obj.name = 'HeWen_TunicButton'
    obj.scale = (1, 0.32, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(button_mat)
    bind(obj, 'garment')

collar_bottom_z = neck.z - 0.058 * unit
collar_top_z = neck.z + 0.034 * unit
front_ref_hit, _, _, _ = body_surface.ray_cast(Vector((0, -1, neck.z + 0.018 * unit)), Vector((0, 1, 0)))
front_ref_y = front_ref_hit.y if front_ref_hit is not None else neck.y - 0.06 * unit


def collar_point(angle, t, offset=0.004):
    radial = Vector((math.cos(angle), math.sin(angle), 0))
    front = max(0, -math.sin(angle))
    z = collar_bottom_z * (1 - t) + (collar_top_z - 0.010 * unit * front) * t
    center = Vector((0, neck.y, z))
    origin = center + radial * 0.26 * unit
    cloth_hit, _, _, _ = cloth_surface.ray_cast(origin, -radial)
    body_hit, _, _, _ = body_surface.ray_cast(origin, -radial)
    if body_hit is None:
        raise ValueError('Stand collar fitting missed neck')
    blend = min(1.0, max(0.0, (t - 0.15) / 0.6))
    blend = blend * blend * (3 - 2 * blend)
    base = body_hit if cloth_hit is None else cloth_hit.lerp(body_hit, blend)
    if front > 0:
        base.y = max(base.y, front_ref_y - (0.006 + 0.030 * (1 - t)) * unit * front)
    return base + radial * (offset + 0.004 * (1 - t)) * unit


vertices, faces = [], []
for row in range(5):
    for i in range(48):
        vertices.append(tuple(collar_point(math.tau * i / 48, row / 4)))
for row in range(4):
    for i in range(48):
        j = (i + 1) % 48
        faces.append((row * 48 + i, row * 48 + j, (row + 1) * 48 + j, (row + 1) * 48 + i))
collar = surface_mesh('HeWen_StandCollar', vertices, faces, cloth, 'body')
solid = collar.modifiers.new('Collar cloth thickness', 'SOLIDIFY')
solid.thickness = 0.0022 * unit
bpy.context.view_layer.objects.active = collar
bpy.ops.object.modifier_apply(modifier=solid.name)
for sign in [-1, 1]:
    center_angle = -math.pi / 2 + sign * 0.50
    vertices, faces = [], []
    for row in range(6):
        t = 0.42 + row / 5 * 0.42
        for col in range(5):
            angle = center_angle + (col / 4 - 0.5) * 0.34
            vertices.append(tuple(collar_point(angle, t, 0.0058)))
    for row in range(5):
        for col in range(4):
            i = row * 5 + col
            faces.append((i, i + 1, i + 6, i + 5))
    surface_mesh('HeWen_CollarTab', vertices, faces, red, 'body')
hook = collar_point(-math.pi / 2, 0.30, 0.0085)
bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.0032 * unit, location=hook)
obj = bpy.context.object
obj.name = 'HeWen_CollarHook'
obj.scale = (1, 0.45, 1)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
obj.data.materials.append(button_mat)
bind(obj, 'body')

shoulder = rig.data.bones['upperarm_l'].head_local
for sign in [-1, 1]:
    vertices, faces = [], []
    for col in range(13):
        x = sign * (0.052 + col / 12 * (abs(shoulder.x) / unit * 0.94 - 0.052)) * unit
        for row in range(5):
            y = shoulder.y + (row / 4 - 0.5) * 0.036 * unit
            hit, normal, _, _ = cloth_surface.ray_cast(Vector((x, y, neck.z + 0.25 * unit)), Vector((0, 0, -1)))
            if hit is None:
                raise ValueError('Shoulder strap missed garment')
            vertices.append(tuple(hit + normal * 0.0035 * unit))
    for col in range(12):
        for row in range(4):
            i = col * 5 + row
            faces.append((i, i + 1, i + 6, i + 5))
    surface_mesh('HeWen_ShoulderStrap', vertices, faces, cloth, 'garment')
    x, y = sign * 0.066 * unit, shoulder.y
    hit, normal, _, _ = cloth_surface.ray_cast(Vector((x, y, neck.z + 0.25 * unit)), Vector((0, 0, -1)))
    if hit is not None:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.0038 * unit,
                                           location=hit + normal * 0.0045 * unit)
        obj = bpy.context.object
        obj.name = 'HeWen_ShoulderButton'
        obj.scale = (1, 1, 0.4)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.data.materials.append(button_mat)
        bind(obj, 'garment')

head_bone = rig.data.bones['head']
cap_base_z = head_bone.tail_local.z - 0.061 * unit
cap_center = Vector((0, head_bone.head_local.y, cap_base_z))
cap_outline = []
for i in range(64):
    angle = math.tau * i / 64
    radial = Vector((math.cos(angle), math.sin(angle), 0))
    hit, _, _, _ = body_surface.ray_cast(cap_center + radial * 0.25, -radial)
    if hit is None:
        raise ValueError('Cap fitting missed scalp')
    cap_outline.append(hit + radial * 0.012 * unit - cap_center)
vertices, faces = [], []
cap_rings = [(1, 0), (1.05, 0.014), (1.11, 0.029), (1.09, 0.047), (0.95, 0.062), (0.72, 0.072), (0.38, 0.076), (0.01, 0.074)]
for row, (radius, height) in enumerate(cap_rings):
    for i, outline in enumerate(cap_outline):
        panel = 1 + (0.020 * math.cos(i * math.tau / 8) if row in [1, 2, 3, 4] else 0)
        point = cap_center + outline * radius * panel
        front = max(0, -math.sin(math.tau * i / 64))
        point.z = cap_base_z + height * unit - 0.003 * unit * front * (height / 0.076)
        vertices.append(tuple(point))
for row in range(len(cap_rings) - 1):
    for i in range(64):
        j = (i + 1) % 64
        faces.append((row * 64 + i, row * 64 + j, (row + 1) * 64 + j, (row + 1) * 64 + i))
faces.append(tuple(range((len(cap_rings) - 1) * 64, len(cap_rings) * 64)))
cap_obj = surface_mesh('HeWen_EightPanelCap', vertices, faces, cloth, 'head')
cap_obj.data.calc_loop_triangles()
cap_surface = BVHTree.FromPolygons([v.co.copy() for v in cap_obj.data.vertices],
                                   [list(t.vertices) for t in cap_obj.data.loop_triangles], all_triangles=True)
vertices, faces = [], []
for row in range(7):
    t = row / 6
    for col in range(33):
        angle = -math.pi / 2 + (col / 32 - 0.5) * 1.7
        radial = Vector((math.cos(angle), math.sin(angle), 0))
        index = int(round((angle % math.tau) / math.tau * 64)) % 64
        radius = cap_outline[index].length
        center_weight = max(0, math.cos((col / 32 - 0.5) * math.pi))
        extension = 0.062 * unit * center_weight ** 0.6
        point = cap_center + radial * (radius + extension * t)
        point.z -= (0.005 * t + 0.011 * t * t) * unit * center_weight
        point.z += 0.009 * unit * t * t * (1 - center_weight)
        vertices.append(tuple(point))
for row in range(6):
    for col in range(32):
        i = row * 33 + col
        faces.append((i, i + 1, i + 34, i + 33))
visor = surface_mesh('HeWen_CapVisor', vertices, faces, cloth, 'head')
solid = visor.modifiers.new('Visor cloth thickness', 'SOLIDIFY')
solid.thickness = 0.002 * unit
bpy.context.view_layer.objects.active = visor
bpy.ops.object.modifier_apply(modifier=solid.name)
star_z = cap_base_z + 0.030 * unit


def cap_badge_point(x, z, lift=0.0016):
    hit, normal, _, _ = cap_surface.ray_cast(Vector((x, cap_center.y - 0.30 * unit, z)), Vector((0, 1, 0)))
    if hit is None:
        raise ValueError('Red star missed cap front')
    return hit + normal * lift * unit


star_outline = []
for i in range(10):
    angle = math.pi / 2 + i * math.pi / 5
    radius = (0.017 if i % 2 == 0 else 0.0075) * unit
    star_outline.append((math.cos(angle) * radius, star_z + math.sin(angle) * radius))
boundary = []
for i in range(10):
    ax, az = star_outline[i]
    bx, bz = star_outline[(i + 1) % 10]
    for step in range(3):
        t = step / 3
        boundary.append((ax * (1 - t) + bx * t, az * (1 - t) + bz * t))
vertices = [tuple(cap_badge_point(0, star_z))]
for x, z in boundary:
    vertices.append(tuple(cap_badge_point(x, z)))
faces = [(0, i + 1, (i + 1) % len(boundary) + 1) for i in range(len(boundary))]
star = surface_mesh('HeWen_CapRedStar', vertices, faces, red, 'head')
solid = star.modifiers.new('Embroidered star relief', 'SOLIDIFY')
solid.thickness = 0.0014 * unit
solid.offset = 0
bpy.context.view_layer.objects.active = star
bpy.ops.object.modifier_apply(modifier=solid.name)

belt_mat, belt_bsdf = material('HeWen_WornLeatherBelt', (0.035, 0.017, 0.008), 0.73)
leather_size = 1024
ly, lx = np.mgrid[0:leather_size, 0:leather_size].astype(np.float32)
grain_l = rng.normal(0, 1, (leather_size, leather_size)).astype(np.float32)
soft_l = (grain_l + np.roll(grain_l, 1, axis=0) + np.roll(grain_l, 1, axis=1)
          + np.roll(grain_l, 2, axis=0) + np.roll(grain_l, 2, axis=1)) / 5
cells = np.abs(np.sin(lx / leather_size * math.tau * 21 + soft_l * 2.2)
               * np.sin(ly / leather_size * math.tau * 24 + soft_l * 1.7))
crease = np.clip(1 - cells * 2.4, 0, 1)
wear_l = np.clip((np.sin(lx / leather_size * math.tau * 1.7) + np.sin(ly / leather_size * math.tau * 1.3)) * 0.5, 0, 1)
leather_pixels = np.ones((leather_size, leather_size, 4), dtype=np.float32)
leather_pixels[:, :, :3] = np.clip(np.array([0.035, 0.017, 0.008])[None, None, :]
                                   * (0.75 + soft_l[:, :, None] * 0.25 + wear_l[:, :, None] * 0.35)
                                   * (1 - crease[:, :, None] * 0.35), 0, 1)
leather_base = image('belt-leather-base', leather_pixels, jpeg=True)
leather_rough_pixels = np.ones((leather_size, leather_size, 4), dtype=np.float32)
leather_rough_pixels[:, :, :3] = np.clip(0.70 + soft_l * 0.08 - wear_l * 0.12, 0.45, 0.92)[:, :, None]
leather_rough = image('belt-leather-rough', leather_rough_pixels, True)
dy_l, dx_l = np.gradient(soft_l * 0.6 + crease * 0.8)
n_l = np.dstack((-dx_l * 0.6, -dy_l * 0.6, np.ones_like(dx_l)))
n_l /= np.linalg.norm(n_l, axis=2, keepdims=True)
leather_normal_pixels = np.ones((leather_size, leather_size, 4), dtype=np.float32)
leather_normal_pixels[:, :, :3] = n_l * 0.5 + 0.5
leather_normal = image('belt-leather-normal', leather_normal_pixels, True)
belt_uv = belt_mat.node_tree.nodes.new('ShaderNodeTexCoord')
belt_mapping = belt_mat.node_tree.nodes.new('ShaderNodeMapping')
belt_mapping.inputs['Scale'].default_value = (4, 4, 1)
belt_mat.node_tree.links.new(belt_uv.outputs['UV'], belt_mapping.inputs['Vector'])
for leather_tex, socket in [(leather_base, 'Base Color'), (leather_rough, 'Roughness')]:
    node = image_node(belt_mat, leather_tex)
    belt_mat.node_tree.links.new(belt_mapping.outputs['Vector'], node.inputs['Vector'])
    belt_mat.node_tree.links.new(node.outputs['Color'], belt_bsdf.inputs[socket])
leather_normal_node = image_node(belt_mat, leather_normal)
belt_mat.node_tree.links.new(belt_mapping.outputs['Vector'], leather_normal_node.inputs['Vector'])
leather_normal_map = belt_mat.node_tree.nodes.new('ShaderNodeNormalMap')
leather_normal_map.inputs['Strength'].default_value = 0.6
belt_mat.node_tree.links.new(leather_normal_node.outputs['Color'], leather_normal_map.inputs['Color'])
belt_mat.node_tree.links.new(leather_normal_map.outputs['Normal'], belt_bsdf.inputs['Normal'])
waist_z = neck.z - 0.44 * unit
vertices, faces = [], []
for row in range(3):
    z = waist_z + (row - 1) * 0.019 * unit
    center = Vector((0, 0.02 * unit, z))
    for i in range(64):
        angle = math.tau * i / 64
        radial = Vector((math.cos(angle), math.sin(angle), 0))
        hit, _, _, _ = cloth_surface.ray_cast(center + radial * 0.22 * unit, -radial)
        if hit is None:
            raise ValueError('Belt fitting missed tunic')
        vertices.append(tuple(hit + radial * 0.005 * unit))
for row in range(2):
    for i in range(64):
        j = (i + 1) % 64
        faces.append((row * 64 + i, row * 64 + j, (row + 1) * 64 + j, (row + 1) * 64 + i))
surface_mesh('HeWen_LeatherBelt', vertices, faces, belt_mat, 'garment')
buckle_mat, buckle_bsdf = material('HeWen_DullBuckle', (0.09, 0.069, 0.036), 0.58)
buckle_bsdf.inputs['Metallic'].default_value = 0.7
buckle_y = vertices[64 + 48][1] - 0.004 * unit
for x, z, width, height in [(0, waist_z - 0.014 * unit, 0.035, 0.005), (0, waist_z + 0.014 * unit, 0.035, 0.005), (-0.015 * unit, waist_z, 0.005, 0.028), (0.015 * unit, waist_z, 0.005, 0.028)]:
    box('HeWen_BeltBuckle', (x, buckle_y, z), (width * unit, 0.004 * unit, height * unit), buckle_mat, 'spine_01')

subdiv = human.modifiers.new('Portrait topology subdivision', 'SUBSURF')
subdiv.levels = 1
subdiv.render_levels = 1
E.bake_modifiers_remove_helpers(human, bake_masks=True, bake_subdiv=True, also_proxy=False)
for obj in parts.values():
    if obj.type != 'MESH':
        continue
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
for polygon in human.data.polygons:
    polygon.use_smooth = True
for obj in accessories:
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
bpy.context.view_layer.update()
eye_points = [parts['Eyes'].matrix_world @ vertex.co for vertex in parts['Eyes'].data.vertices]
eye_center = sum(eye_points, Vector()) / len(eye_points)
eye_socket_x = sum(abs(point.x) for point in eye_points) / len(eye_points)


def strand_mesh(name, strands, mat):
    vertices, faces = [], []
    for root, direction, length, width, tangent in strands:
        mid = root + direction * (length * 0.55)
        tip = root + direction * length
        base = len(vertices)
        for center, half in [(root, width * 0.5), (mid, width * 0.34), (tip, width * 0.06)]:
            vertices.append(tuple(center - tangent * half))
            vertices.append(tuple(center + tangent * half))
        faces.append((base, base + 1, base + 3, base + 2))
        faces.append((base + 2, base + 3, base + 5, base + 4))
    return surface_mesh(name, vertices, faces, mat, 'head')


try:
    to_skin = human.matrix_world.inverted()
    brow_obj = parts['Eyebrows']
    brow_xform = to_skin @ brow_obj.matrix_world
    brow_obj.data.calc_loop_triangles()
    brow_tris = list(brow_obj.data.loop_triangles)
    brow_weights = np.array([max(t.area, 1e-12) for t in brow_tris], dtype=np.float64)
    brow_weights /= brow_weights.sum()
    brow_strands = []
    for _ in range(190):
        tri = brow_tris[int(rng.choice(len(brow_tris), p=brow_weights))]
        a, b, c = [brow_xform @ brow_obj.data.vertices[j].co for j in tri.vertices]
        u, v = float(rng.random()), float(rng.random())
        if u + v > 1:
            u, v = 1 - u, 1 - v
        root = a + (b - a) * u + (c - a) * v
        normal = (brow_xform.to_3x3() @ tri.normal).normalized()
        grow = Vector((1 if root.x > 0 else -1, -0.15, 0.30))
        direction = grow - normal * grow.dot(normal)
        if direction.length < 0.05:
            continue
        direction.normalize()
        root += normal * (0.00025 * unit)
        tangent = direction.cross(normal).normalized()
        brow_strands.append((root, direction, (0.0022 + float(rng.random()) * 0.0020) * unit,
                             0.00013 * unit, tangent))
    if brow_strands:
        brow_hair_mat, brow_hair_bsdf = material('HeWen_BrowStrandHair', (0.024, 0.019, 0.015), 0.48)
        brow_hair_bsdf.inputs['Specular IOR Level'].default_value = 0.22
        strand_mesh('HeWen_BrowStrands', brow_strands, brow_hair_mat)
        print('HE WEN BROW STRANDS', len(brow_strands), flush=True)
except Exception as error:
    print('HE WEN BROW STRANDS SKIPPED', repr(error), flush=True)

try:
    to_skin = human.matrix_world.inverted()
    eyes_local = [to_skin @ point for point in eye_points]
    eyes_xform = to_skin @ parts['Eyes'].matrix_world
    parts['Eyes'].data.calc_loop_triangles()
    eyes_bvh = BVHTree.FromPolygons([eyes_xform @ v.co for v in parts['Eyes'].data.vertices],
                                    [list(t.vertices) for t in parts['Eyes'].data.loop_triangles], all_triangles=True)
    lash_strands = []
    for side in [1, -1]:
        group = [p for p in eyes_local if p.x * side > 0]
        if not group:
            continue
        center = sum(group, Vector()) / len(group)
        for step in range(15):
            phi = -0.62 + step / 14 * 1.24

            def lid_direction(theta):
                return Vector((math.sin(phi) * math.cos(theta), -math.cos(phi) * math.cos(theta), math.sin(theta)))

            def eye_visible(theta):
                direction = lid_direction(theta)
                hit_e, _, _, _ = eyes_bvh.ray_cast(center, direction)
                if hit_e is None:
                    return None
                hit_s, _, _, _ = body_surface.ray_cast(center, direction)
                if hit_s is None:
                    return True
                return (hit_s - center).length > (hit_e - center).length - 0.0002 * unit

            lo, hi = 0.03, 0.85
            if eye_visible(lo) is not True or eye_visible(hi) is not False:
                continue
            for _ in range(14):
                mid = (lo + hi) * 0.5
                if eye_visible(mid):
                    lo = mid
                else:
                    hi = mid
            theta = (lo + hi) * 0.5
            direction = lid_direction(theta)
            hit_s, normal_s, _, _ = body_surface.ray_cast(center, direction)
            if hit_s is None:
                continue
            root = hit_s + normal_s * (0.00030 * unit)
            radial = (root - center).normalized()
            for _ in range(2):
                jitter = Vector((float(rng.normal(0, 0.06)), float(rng.normal(0, 0.05)), float(rng.normal(0, 0.05))))
                lash_dir = (radial * 0.45 + Vector((math.sin(phi) * 0.25, -0.62, 0.72)) + jitter).normalized()
                tangent = Vector((math.cos(phi), math.sin(phi), 0)).normalized()
                lash_strands.append((root, lash_dir, (0.0035 + float(rng.random()) * 0.0025) * unit,
                                     0.00010 * unit, tangent))
    if len(lash_strands) >= 20:
        lash_mat, lash_bsdf = material('HeWen_LashHair', (0.010, 0.008, 0.007), 0.40)
        lash_bsdf.inputs['Specular IOR Level'].default_value = 0.30
        strand_mesh('HeWen_Eyelashes', lash_strands, lash_mat)
        print('HE WEN EYELASHES', len(lash_strands), flush=True)
    else:
        print('HE WEN EYELASHES SKIPPED insufficient strands', len(lash_strands), flush=True)
except Exception as error:
    print('HE WEN EYELASHES SKIPPED', repr(error), flush=True)


def hair_strand_mesh(name, strands, mat):
    vertices, faces = [], []
    for root, direction, length, width, tangent, flow in strands:
        p1 = root + direction * (length * 0.38) + flow * (length * 0.06)
        p2 = root + direction * (length * 0.72) + flow * (length * 0.18)
        p3 = root + direction * length + flow * (length * 0.34)
        base = len(vertices)
        for center, half in [(root, width * 0.5), (p1, width * 0.42), (p2, width * 0.28), (p3, width * 0.05)]:
            vertices.append(tuple(center - tangent * half))
            vertices.append(tuple(center + tangent * half))
        for row in range(3):
            i = base + row * 2
            faces.append((i, i + 1, i + 3, i + 2))
    return surface_mesh(name, vertices, faces, mat, 'head')


try:
    to_skin = human.matrix_world.inverted()
    eye_z_local = (to_skin @ eye_center).z
    hair_obj = parts['Hair']
    hair_xform = to_skin @ hair_obj.matrix_world
    hair_obj.data.calc_loop_triangles()
    hair_tris = list(hair_obj.data.loop_triangles)
    hair_weights = np.array([max(t.area, 1e-12) for t in hair_tris], dtype=np.float64)
    hair_weights /= hair_weights.sum()
    dark_strands, light_strands = [], []
    for _ in range(5200):
        tri = hair_tris[int(rng.choice(len(hair_tris), p=hair_weights))]
        a, b, c = [hair_xform @ hair_obj.data.vertices[j].co for j in tri.vertices]
        u, v = float(rng.random()), float(rng.random())
        if u + v > 1:
            u, v = 1 - u, 1 - v
        point = a + (b - a) * u + (c - a) * v
        normal = (hair_xform.to_3x3() @ tri.normal).normalized()
        root, normal_s, _, _ = body_surface.ray_cast(point, -normal)
        if root is None:
            toward = Vector((0, point.y * 0.4, point.z)) - point
            if toward.length < 1e-9:
                continue
            root, normal_s, _, _ = body_surface.ray_cast(point, toward.normalized())
        if root is None:
            continue
        dist = (point - root).length / unit
        if dist > 0.05:
            continue
        flow = Vector((root.x / unit * 1.5, 0.55, -0.75))
        if flow.length < 1e-9:
            flow = Vector((0, 0.6, -0.7))
        flow.normalize()
        direction = (normal_s * 0.85 + flow * 0.42).normalized()
        length = min(0.013, max(0.0045, dist * 1.15)) * unit
        if root.z < eye_z_local:
            length *= 0.6
        tangent = direction.cross(normal_s).normalized()
        strand = (root + normal_s * (0.0002 * unit), direction, length, 0.00011 * unit, tangent, flow)
        (light_strands if float(rng.random()) < 0.16 else dark_strands).append(strand)
    strand_mats = []
    for name, color, roughness in [('HeWen_HairStrandDark', (0.020, 0.016, 0.013), 0.36),
                                   ('HeWen_HairStrandLight', (0.045, 0.036, 0.028), 0.40)]:
        mat, bsdf = material(name, color, roughness)
        bsdf.inputs['Specular IOR Level'].default_value = 0.38
        bsdf.inputs['Sheen Weight'].default_value = 0.25
        bsdf.inputs['Sheen Roughness'].default_value = 0.45
        strand_mats.append(mat)
    if dark_strands:
        hair_strand_mesh('HeWen_HairStrands', dark_strands, strand_mats[0])
    if light_strands:
        hair_strand_mesh('HeWen_HairStrandsLight', light_strands, strand_mats[1])
    print('HE WEN HAIR STRANDS', len(dark_strands), len(light_strands), flush=True)
except Exception as error:
    print('HE WEN HAIR STRANDS SKIPPED', repr(error), flush=True)

try:
    to_skin = human.matrix_world.inverted()
    eyes_xform = to_skin @ parts['Eyes'].matrix_world
    parts['Eyes'].data.calc_loop_triangles()
    tear_bvh = BVHTree.FromPolygons([eyes_xform @ v.co for v in parts['Eyes'].data.vertices],
                                    [list(t.vertices) for t in parts['Eyes'].data.loop_triangles], all_triangles=True)
    eyes_local = [to_skin @ point for point in eye_points]
    tear_mat, tear_bsdf = material('HeWen_TearLine', (0.16, 0.10, 0.08), 0.06)
    tear_bsdf.inputs['Coat Weight'].default_value = 1.0
    tear_bsdf.inputs['Coat Roughness'].default_value = 0.03
    tear_bsdf.inputs['Specular IOR Level'].default_value = 0.5
    for side in [1, -1]:
        group = [p for p in eyes_local if p.x * side > 0]
        if not group:
            continue
        center = sum(group, Vector()) / len(group)
        rim = []
        for step in range(11):
            phi = -0.5 + step / 10 * 1.0

            def tear_direction(theta):
                return Vector((math.sin(phi) * math.cos(theta), -math.cos(phi) * math.cos(theta), math.sin(theta)))

            def tear_visible(theta):
                direction = tear_direction(theta)
                hit_e, _, _, _ = tear_bvh.ray_cast(center, direction)
                if hit_e is None:
                    return None
                hit_s, _, _, _ = body_surface.ray_cast(center, direction)
                if hit_s is None:
                    return True
                return (hit_s - center).length > (hit_e - center).length - 0.0002 * unit

            lo, hi = -0.85, -0.03
            if tear_visible(hi) is not True or tear_visible(lo) is not False:
                continue
            for _ in range(14):
                mid = (lo + hi) * 0.5
                if tear_visible(mid):
                    hi = mid
                else:
                    lo = mid
            theta = (lo + hi) * 0.5
            hit_s, normal_s, _, _ = body_surface.ray_cast(center, tear_direction(theta))
            if hit_s is None:
                continue
            rim.append((hit_s, normal_s, (hit_s - center).normalized()))
        if len(rim) >= 6:
            vertices, faces = [], []
            for point, normal_s, radial in rim:
                base_point = point + normal_s * (0.00028 * unit)
                vertices.append(tuple(base_point + radial * (0.00038 * unit)))
                vertices.append(tuple(base_point - radial * (0.00038 * unit)))
            for i in range(len(rim) - 1):
                a = i * 2
                faces.append((a, a + 1, a + 3, a + 2))
            surface_mesh('HeWen_TearLine' + ('L' if side > 0 else 'R'), vertices, faces, tear_mat, 'head')
            print('HE WEN TEARLINE', side, len(rim), flush=True)
except Exception as error:
    print('HE WEN TEARLINE SKIPPED', repr(error), flush=True)


def face_point(x, z):
    hit, _, _, _ = body_surface.ray_cast(Vector((x, -1, z)), Vector((0, 1, 0)))
    if hit is None:
        return Vector((x, eye_center.y - 0.06 * unit, z))
    return hit


bpy.context.view_layer.update()
skin_inverse = human.matrix_world.inverted()
local_unit = (skin_inverse.to_3x3() @ Vector((0, 0, unit))).length
human['skinFrame'] = {
    'unit': local_unit,
    'socketX': eye_socket_x * local_unit / unit,
    'eye': list(skin_inverse @ Vector((0, eye_center.y, eye_center.z))),
    'brow': list(skin_inverse @ face_point(0, eye_center.z + 0.020 * unit)),
    'nose': list(skin_inverse @ face_point(0, eye_center.z - 0.040 * unit)),
    'mouth': list(skin_inverse @ face_point(0, eye_center.z - 0.070 * unit)),
    'chin': list(skin_inverse @ face_point(0, eye_center.z - 0.108 * unit)),
    'hairline': list(skin_inverse @ face_point(0, eye_center.z + 0.062 * unit)),
    'mole': list(skin_inverse @ (face_point(0.034 * unit, eye_center.z - 0.032 * unit) + Vector((0, -0.0005 * unit, 0)))),
    'neck': list(skin_inverse @ neck),
    'throat': list(skin_inverse @ face_point(0, neck.z + 0.030 * unit)),
    'handL': list(skin_inverse @ rig.data.bones['hand_l'].head_local),
    'handR': list(skin_inverse @ rig.data.bones['hand_r'].head_local),
}

rig.scale = (1.76 / raw_height,) * 3

for bone in rig.pose.bones:
    bone.rotation_mode = 'XYZ'
arm_rotations = {}
for side, sign in [('l', 1), ('r', -1)]:
    upper = rig.data.bones['upperarm_' + side]
    lower = rig.data.bones['lowerarm_' + side]
    upper_delta = (upper.tail_local - upper.head_local).rotation_difference(Vector((sign * 0.045, 0.005, -0.25)))
    basis = upper.matrix_local.to_quaternion()
    arm_rotations[upper.name] = (basis.inverted() @ upper_delta @ basis).to_euler('XYZ')
    lower_direction = upper_delta @ (lower.tail_local - lower.head_local)
    lower_delta = lower_direction.rotation_difference(Vector((sign * 0.020, -0.04, -0.25)))
    basis = lower.matrix_local.to_quaternion()
    arm_rotations[lower.name] = (basis.inverted() @ upper_delta.inverted() @ lower_delta @ upper_delta @ basis).to_euler('XYZ')


def pose(frame, phase=0, talking=False):
    for bone in rig.pose.bones:
        bone.rotation_euler = arm_rotations.get(bone.name, (0, 0, 0))
    rig.pose.bones['spine_03'].rotation_euler.x = 0.006 * math.sin(phase)
    rig.pose.bones['head'].rotation_euler.z = (0.025 if talking else 0.009) * math.sin(phase)
    for bone in rig.pose.bones:
        bone.keyframe_insert('rotation_euler', frame=frame, group=bone.name)


rig.animation_data_create()
for clip, duration in [('Idle', 96), ('Talk', 72)]:
    action = bpy.data.actions.new(clip)
    rig.animation_data.action = action
    for frame in range(1, duration + 2, 8):
        pose(frame, (frame - 1) / duration * math.tau, clip == 'Talk')
    track = rig.animation_data.nla_tracks.new()
    track.name = clip
    strip = track.strips.new(clip, 1, action)
    strip.name = clip
    track.mute = True
rig.animation_data.action = bpy.data.actions['Idle']
bpy.context.scene.frame_set(1)


objects = [rig, human, *parts.values(), *accessories]
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.bake.margin = 12
occlusion_group = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
occlusion_group.interface.new_socket(name='Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
occlusion_group.nodes.new('NodeGroupInput')
occlusion_group.nodes.new('NodeGroupOutput')
for obj, name in [(human, 'skin-contact-occlusion'), (garment, 'tunic-contact-occlusion')]:
    if obj == garment:
        obj.data.materials[0] = cloth.copy()
        obj.data.materials[0].name = 'HeWen_TunicCotton'
    mat = obj.data.materials[0]
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    target = bpy.data.images.new(name, width=1024, height=1024, alpha=False)
    target.colorspace_settings.name = 'Non-Color'
    texture = image_node(mat, target)
    nodes.active = texture
    ao = nodes.new('ShaderNodeAmbientOcclusion')
    ao.only_local = True
    ao.inputs['Distance'].default_value = 0.035
    soften = nodes.new('ShaderNodeMath')
    soften.operation = 'MULTIPLY_ADD'
    soften.inputs[1].default_value = 0.75
    soften.inputs[2].default_value = 0.25
    emission = nodes.new('ShaderNodeEmission')
    links.new(ao.outputs['AO'], soften.inputs[0])
    links.new(soften.outputs[0], emission.inputs['Color'])
    output = nodes.get('Material Output')
    shader = output.inputs['Surface'].links[0].from_socket
    links.new(emission.outputs[0], output.inputs['Surface'])
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.bake(type='EMIT')
    links.new(shader, output.inputs['Surface'])
    for node in [ao, soften, emission]:
        nodes.remove(node)
    target.filepath_raw = str(OUT / (name + '.png'))
    target.file_format = 'PNG'
    target.save()
    settings = nodes.new('ShaderNodeGroup')
    settings.node_tree = occlusion_group
    links.new(texture.outputs['Color'], settings.inputs['Occlusion'])
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=str(OUT / 'he-wen-study-v1.glb'), export_format='GLB',
                          use_selection=True, export_apply=False, export_skins=True,
                          export_morph=True, export_animations=True, export_animation_mode='NLA_TRACKS',
                          export_extras=True, export_image_format='AUTO')
spec = {
    'npcId': 'he_wen', 'name': '指导员何文', 'fictional': True, 'ageYears': 27,
    'ageSource': 'js/npc-story.js:94', 'heightMeters': 1.76,
    'status': 'sculpt-and-material-study-v4-strands-viseme-pending-visual-approval',
    'strongFeature': 'restrained elongated almond eyes',
    'supportingFeatures': ['natural broad nose tip', 'relaxed straight lips'],
    'faceShape': 'elongated oval, retained chin width, subtle cheekbones',
    'asymmetry': 'slightly different eye opening and outer corner height',
    'originality': {'noRealPersonReference': True, 'notPhotogrammetry': True},
    'macro': macro, 'identityTargets': identity, 'expressions': expressions,
    'skinSource': 'makehuman-system/skins/middleage_asian_male/middleage_asian_male.mhmat',
    'skinDetail': 'CC0 2K base color; authored procedural micro-normal and roughness plus geometry-baked self occlusion (transparent hair cards excluded), not scan displacement',
    'wardrobe': 'subdivided long-sleeve source topology with tailored fold displacement, stand collar with red tabs and collar hook, shoulder straps, placket, pockets and belt, fitted boot shafts and soft eight-panel cloth cap with surface-fitted relief star; historical cut and tailoring remain provisional',
    'tool': {'blender': bpy.app.version_string, 'mpfb': '20261119'},
    'topologyVertices': len(human.data.vertices),
    'bones': len(rig.data.bones),
    'runtimeAsset': {
        'path': str((OUT / 'he-wen-study-v1.glb').relative_to(ROOT)).replace('\\', '/'),
        'sha256': hashlib.sha256((OUT / 'he-wen-study-v1.glb').read_bytes()).hexdigest(),
    },
    'sources': {
        'coreAssetsLicense': 'CC0-1.0',
        'coreAssetsLicenseSource': 'https://static.makehumancommunity.org/mpfb/faq/use_in_closed_source.html',
        'systemAssetsManifest': 'source-assets/makehuman-system/manifest.json',
        'systemAssetsManifestSHA256': hashlib.sha256((ASSETS / 'manifest.json').read_bytes()).hexdigest(),
        'basemeshSHA256': hashlib.sha256((SOURCE / 'mpfb/data/3dobjs/base.obj').read_bytes()).hexdigest(),
        'rigSHA256': hashlib.sha256((SOURCE / 'mpfb/data/rigs/standard/rig.game_engine.json').read_bytes()).hexdigest(),
        'pluginSoftwareLicense': 'GPL-3.0-or-later; tool only, not shipped in the game',
    },
}
(EDITABLE / 'face-spec.json').write_text(json.dumps(spec, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.world.color = (0.035, 0.035, 0.035)
scene.view_settings.view_transform = 'AgX'
scene.render.resolution_x = 768
scene.render.resolution_y = 960
scene.render.resolution_percentage = 100
head_position = rig.matrix_world @ rig.data.bones['head'].head_local
head_top = rig.matrix_world @ rig.data.bones['head'].tail_local
focus = (head_position + head_top) / 2
focus.z -= 0.080
bpy.ops.object.camera_add(location=focus + Vector((0.16, -1.12, 0.025)))
camera = bpy.context.object
camera.name = 'Portrait_camera'
camera.rotation_euler = (focus - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.lens = 65
scene.camera = camera
for name, offset, power, size, color in [
    ('Key', (-0.65, -0.85, 0.6), 32, 0.65, (1.0, 0.94, 0.88)),
    ('Fill', (0.6, -0.65, 0.22), 10, 0.8, (0.82, 0.9, 1.0)),
    ('Rim', (0.32, 0.35, 0.6), 30, 0.55, (1.0, 0.94, 0.85)),
]:
    bpy.ops.object.light_add(type='AREA', location=focus + Vector(offset))
    light = bpy.context.object
    light.name = name
    light.data.energy = power
    light.data.shape = 'DISK'
    light.data.size = size
    light.data.color = color
    light.rotation_euler = (focus - light.location).to_track_quat('-Z', 'Y').to_euler()
for obj in objects:
    if obj.type != 'MESH':
        continue
    for mat in obj.data.materials:
        for node in mat.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image and not node.image.packed_file:
                node.image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(EDITABLE / 'he-wen-study-v1.blend'))
if args.render:
    scene.render.filepath = str(ROOT / '_shots/he-wen-sculpt-study-v1.png')
    bpy.ops.render.render(write_still=True)
print('HE WEN STUDY EXPORTED', json.dumps(spec, ensure_ascii=True), flush=True)
