"""王贵模型精修：表情形态 + 体型轮廓 + 远景低模。在你本地的 Blender（3.6 及以上，4.x 均可）里后台运行：

    blender -b --factory-startup -P wang-gui-refine.py -- --in wang-gui-web.glb --out-dir 输出文件夹

可选参数：
    --dry-run            只测量、打印要改的内容，不导出
    --no-renders         不出检查图（默认会出 8 张，放在 输出文件夹/wang-gui-refine-check/）
    --lod-tris 8000      远景版本的目标三角面数
    --forearm 0.12       前臂加粗比例（0 表示不改）
    --leg 0.05           大腿、小腿加粗比例
    --shoulder 0.35      肩顶压平强度（0~1）

输入用 Quick 生成的 wang-gui-web.glb（已含走路动画和布料法线贴图）。脚本导入后：
  1. 在头、眉毛、胡茬上加 5 个表情形态：browDownLeft / browDownRight / browUpLeft / browUpRight / smile
     （名字和 character-preview.html 的「皱眉」「微笑」滑块、游戏里的交谈表情一致）
  2. 前臂、大腿小腿按骨骼权重径向加粗，肩顶的圆鼓轮廓压平一些（只改绑定姿势下的网格，不动骨骼和动画）
  3. 导出 wang-gui-web.glb（Draco 压缩，含 Talk / Idle / Walk）
  4. 去掉小零件、去掉表情形态、减面到约 8000 面、贴图降到 512，导出 wang-gui-lod.glb
  5. 读回两个导出文件做自检，结果写进 wang-gui-refine-report.json
坐标约定：下面所有数值都按 glTF 坐标写（米，x 向角色左侧，y 向上，z 向前），脚本内部再换成 Blender 坐标。
"""
import bpy, sys, os, re, json, math, struct, argparse
from mathutils import Vector

# ---------------- 参数 ----------------
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--in', dest='src', required=True)
ap.add_argument('--out-dir', dest='out', required=True)
ap.add_argument('--dry-run', action='store_true')
ap.add_argument('--no-renders', action='store_true')
ap.add_argument('--lod-tris', type=int, default=8000)
ap.add_argument('--forearm', type=float, default=.12)
ap.add_argument('--leg', type=float, default=.05)
ap.add_argument('--shoulder', type=float, default=.35)
A = ap.parse_args(argv)
os.makedirs(A.out, exist_ok=True)
CHECK = os.path.join(A.out, 'wang-gui-refine-check')
REPORT = {'input': os.path.abspath(A.src), 'blender': bpy.app.version_string, 'steps': []}
def log(*items):
    text = ' '.join(str(i) for i in items); print('[wang-gui]', text); REPORT['steps'].append(text)

# glTF <-> Blender 坐标：blender (x, y, z) = gltf (x, -z, y)
def to_g(v): return Vector((v.x, v.z, -v.y))
def g_to_b(d): return Vector((d[0], -d[2], d[1]))
def smooth(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
def gauss(v, c, w): t = (v - c) / w; return math.exp(-t * t)

# ---------------- 导入 ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=A.src)
scene = bpy.context.scene
meshes = [o for o in scene.objects if o.type == 'MESH']
arm = next((o for o in scene.objects if o.type == 'ARMATURE'), None)
assert arm and meshes, '没有找到骨架或网格，确认输入是王贵的 glb'
bpy.context.view_layer.update()   # 测量只读网格原始数据（绑定姿势），与当前动作帧无关
def find(pattern, among=None):
    return [o for o in (among or meshes) if re.search(pattern, o.name, re.I) or re.search(pattern, o.data.name, re.I)]
head = next((o for o in meshes if o.data.shape_keys and 'jawOpen' in o.data.shape_keys.key_blocks), None)
assert head, '没有找到带 jawOpen 形态的头部网格'
brows, stubble, iris = find(r'brow'), find(r'stubble'), find(r'iris')
log('网格', len(meshes), '个；头', head.name, '；眉毛', [o.name for o in brows], '；胡茬', [o.name for o in stubble], '；虹膜', [o.name for o in iris])

def world_verts(o):
    mw = o.matrix_world; return [to_g(mw @ v.co) for v in o.data.vertices]
def bbox_center(objs):
    pts = [p for o in objs for p in world_verts(o)]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return (lo + hi) / 2

# ---------------- 面部特征点（与 character-weathering.js 同一套测法） ----------------
F = {'socketX': .025, 'eye': Vector((0, 1.600, .090)), 'brow': Vector((0, 1.625, .088)),
     'nose': Vector((0, 1.566, .118)), 'mouth': Vector((0, 1.530, .100)), 'chin': Vector((0, 1.492, .088))}
if len(iris) >= 2:
    c = [bbox_center([o]) for o in iris[:2]]
    F['eye'] = Vector((0, (c[0].y + c[1].y) / 2, (c[0].z + c[1].z) / 2)); F['socketX'] = abs(c[0].x - c[1].x) / 2
if brows:
    c = bbox_center(brows); F['brow'] = Vector((0, c.y, c.z))
kb = head.data.shape_keys.key_blocks; basis = head.data.shape_keys.reference_key; jaw = kb['jawOpen']
mw = head.matrix_world
hp = [to_g(mw @ v.co) for v in basis.data]
moves = [((mw @ jaw.data[i].co) - (mw @ basis.data[i].co)).length for i in range(len(hp))]
mmax = max(moves) or 1
strip = [i for i, p in enumerate(hp) if abs(p.x) < .008 and p.z > F['eye'].z - .03 and p.y < F['eye'].y]
if strip:
    chin_y = min(hp[i].y for i in strip)
    moved = [hp[i].y for i in strip if moves[i] > mmax * .3]
    if moved:
        mouth_y = max(moved) + .002
        nose_c = [hp[i] for i in strip if mouth_y + .01 < hp[i].y < F['eye'].y - .005]
        if nose_c and chin_y < mouth_y:
            n = max(nose_c, key=lambda p: p.z)
            F['chin'] = Vector((0, chin_y + .004, F['chin'].z)); F['mouth'] = Vector((0, mouth_y, n.z - .018)); F['nose'] = Vector((0, n.y, n.z))
REPORT['face'] = {k: (list(v) if isinstance(v, Vector) else v) for k, v in F.items()}
log('面部特征点', {k: ([round(x, 4) for x in v] if isinstance(v, Vector) else round(v, 4)) for k, v in F.items()})
sx = F['socketX']; eye, brow, mouth, nose = F['eye'], F['brow'], F['mouth'], F['nose']

# ---------------- 1. 表情形态 ----------------
def front(p, back=.045): return smooth(eye.z - back, eye.z - .015, p.z)
def brow_field(side, up):
    def d(p):
        s = 1 if p.x * side > -.004 else 0
        if not s: return None
        w = gauss(p.x, side * sx * 1.1, .022) * gauss(p.y, brow.y, .016) * front(p)
        w *= smooth(eye.y + .004, eye.y + .014, p.y)            # 上眼睑以下不动，避免眼皮穿进眼球
        if w < 1e-4: return None
        inner = 1 + .6 * max(0.0, (sx * 1.5 - abs(p.x)) / (sx * 1.5))
        if up: return (0.0, .005 * w * (2 - inner * .6), .0005 * w)          # 挑眉：外侧抬得多
        return (-side * .0025 * w * inner, -.0045 * w * inner, .0012 * w)   # 皱眉：往中间、往下，眉间微微隆起
    return d
def smile_field(p):
    if p.z < mouth.z - .035: return None
    ax, sg = abs(p.x), (1 if p.x >= 0 else -1)
    wc = gauss(ax, sx * .95, .012) * gauss(p.y, mouth.y, .010)                 # 嘴角
    wk = gauss(ax, sx * 1.15, .018) * gauss(p.y, nose.y + .003, .014) * front(p, .06)   # 颧部上提
    wl = gauss(ax, sx, .012) * gauss(p.y, eye.y - .010, .004) * front(p)         # 下眼睑微抬（笑眼）
    wm = gauss(p.x, 0, .012) * gauss(p.y, mouth.y, .006)                          # 唇中横向拉开
    d = Vector((sg * .0025 * wc + sg * .0008 * wk + p.x * .06 * wm, .0035 * wc + .0022 * wk + .0010 * wl, -.0015 * wc + .0012 * wk - .0005 * wm))
    return None if d.length < 1e-6 else tuple(d)
EXPR = {'browDownLeft': (brow_field(1, False), [head] + brows), 'browDownRight': (brow_field(-1, False), [head] + brows),
        'browUpLeft': (brow_field(1, True), [head] + brows), 'browUpRight': (brow_field(-1, True), [head] + brows),
        'smile': (smile_field, [head] + stubble)}
def add_key(obj, name, field):
    if not obj.data.shape_keys: obj.shape_key_add(name='Basis', from_mix=False)
    blocks = obj.data.shape_keys.key_blocks
    key = blocks.get(name) or obj.shape_key_add(name=name, from_mix=False)
    ref = obj.data.shape_keys.reference_key
    m = obj.matrix_world; inv = m.to_3x3().inverted(); peak = 0.0; moved = 0
    for i, bv in enumerate(ref.data):
        d = field(to_g(m @ bv.co))
        if d is None: key.data[i].co = bv.co.copy(); continue
        dl = inv @ g_to_b(d); key.data[i].co = bv.co + dl; peak = max(peak, dl.length); moved += 1
    key.value = 0.0
    return moved, peak
if not A.dry_run:
    for name, (field, objs) in EXPR.items():
        for o in objs:
            moved, peak = add_key(o, name, field)
            log(f'形态 {name} @ {o.name}：移动 {moved} 个顶点，最大 {peak * 1000:.1f} mm')

# ---------------- 2. 体型轮廓 ----------------
bones = {b.name: (to_g(arm.matrix_world @ b.head_local), to_g(arm.matrix_world @ b.tail_local)) for b in arm.data.bones}
SKIP = set([head.name] + [o.name for o in brows + stubble + iris] + [o.name for o in find(r'sclera|crop|cap|eye')])
def weight(o, v, names):
    total = 0.0
    for g in v.groups:
        if o.vertex_groups[g.group].name in names: total += g.weight
    return total
def radial(o, bone_names, amount, peak_t=.35, width=.4):
    if amount <= 0: return 0
    m = o.matrix_world; inv = m.to_3x3().inverted(); count = 0
    keys = o.data.shape_keys.key_blocks if o.data.shape_keys else None
    for v in o.data.vertices:
        for bn in bone_names:
            w = weight(o, v, {bn})
            if w < .05: continue
            a, b = bones[bn]; p = to_g(m @ v.co); ab = b - a
            t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared)); c = a + ab * t
            k = amount * w * gauss(t, peak_t, width)
            d = (p - c) * k
            dl = inv @ g_to_b(d)
            v.co += dl
            if keys:   # 有形态时，所有形态（含 Basis）一起移动，否则下次更新会被 Basis 覆盖
                for kb_ in keys: kb_.data[v.index].co += dl
            count += 1
    return count
def flatten_shoulders(o, strength):
    if strength <= 0: return 0
    m = o.matrix_world; inv = m.to_3x3().inverted(); count = 0
    for side, up, cl in (('l', 'upperarm_l', 'clavicle_l'), ('r', 'upperarm_r', 'clavicle_r')):
        sh = bones[up][0]
        for v in o.data.vertices:
            w = weight(o, v, {up, cl})
            if w < .05: continue
            p = to_g(m @ v.co)
            if p.y <= sh.y - .01: continue
            lat = gauss(abs(p.x) - abs(sh.x), 0, .05)
            dy = -min(.012, strength * max(0.0, p.y - sh.y) * lat * min(1.0, w) * smooth(sh.y - .01, sh.y + .04, p.y))
            if dy > -1e-5: continue
            dl = inv @ g_to_b((0, dy, 0)); v.co += dl; count += 1
            if o.data.shape_keys:
                for kb_ in o.data.shape_keys.key_blocks: kb_.data[v.index].co += dl
    return count
if not A.dry_run:
    body = [o for o in meshes if o.name not in SKIP]
    for o in body:
        n1 = radial(o, ['lowerarm_l', 'lowerarm_r'], A.forearm, .3, .35)
        n2 = radial(o, ['thigh_l', 'thigh_r', 'calf_l', 'calf_r'], A.leg, .45, .5)
        n3 = flatten_shoulders(o, A.shoulder) if o.data.vertices and find(r'casualsuit|suit|tunic|base', [o]) else 0
        if n1 or n2 or n3: log(f'体型 {o.name}：前臂 {n1}、腿 {n2}、肩顶 {n3} 个顶点')
    for o in meshes: o.data.update()

# ---------------- 导出与自检 ----------------
def export(path, morph=True):
    props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    want = dict(filepath=path, export_format='GLB', export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                export_animations=True, export_animation_mode='ACTIONS', export_morph=morph, export_morph_normal=False,
                export_skins=True, export_yup=True, export_apply=False, export_tangents=False, export_extras=True,
                export_force_sampling=True, export_def_bones=False, export_all_influences=False, export_image_format='AUTO')
    bpy.ops.export_scene.gltf(**{k: v for k, v in want.items() if k in props})
def read_glb(path):
    with open(path, 'rb') as f: b = f.read()
    n = struct.unpack('<I', b[12:16])[0]; G = json.loads(b[20:20 + n])
    tris = 0
    for m in G['meshes']:
        for p in m['primitives']:
            tris += G['accessors'][p['indices']]['count'] // 3 if 'indices' in p else 0
    return {'bytes': len(b), 'animations': [a['name'] for a in G.get('animations', [])], 'triangles': tris,
            'morphs': sorted({t for m in G['meshes'] for t in (m.get('extras', {}).get('targetNames') or [])}),
            'normalMaps': sum(1 for m in G.get('materials', []) if 'normalTexture' in m)}
if A.dry_run:
    log('dry-run：只测量，不导出'); json.dump(REPORT, open(os.path.join(A.out, 'wang-gui-refine-report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2); sys.exit(0)
full = os.path.join(A.out, 'wang-gui-web.glb'); export(full)
REPORT['full'] = read_glb(full); log('完整版', REPORT['full'])

# ---------------- 检查图（Workbench，绑定姿势） ----------------
def render_set():
    os.makedirs(CHECK, exist_ok=True)
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'; scene.display.shading.color_type = 'TEXTURE'
    scene.display.shading.show_cavity = True; scene.display.shading.cavity_type = 'BOTH'
    scene.render.resolution_x = scene.render.resolution_y = 640; scene.render.film_transparent = False
    cam = bpy.data.objects.new('CheckCam', bpy.data.cameras.new('CheckCam')); scene.collection.objects.link(cam); scene.camera = cam
    cam.data.type = 'ORTHO'
    def shot(name, at_g, from_g, scale):
        loc = g_to_b(from_g); tgt = g_to_b(at_g)
        cam.location = loc; cam.rotation_euler = (tgt - loc).to_track_quat('-Z', 'Y').to_euler(); cam.data.ortho_scale = scale
        scene.render.filepath = os.path.join(CHECK, name + '.png'); bpy.ops.render.render(write_still=True)
    def keys(values):
        for o in [head] + brows + stubble:
            if not o.data.shape_keys: continue
            for k in o.data.shape_keys.key_blocks:
                if k != o.data.shape_keys.reference_key: k.value = values.get(k.name, 0.0)
    face_at = (0, (brow.y + mouth.y) / 2, eye.z); face_from = (0, (brow.y + mouth.y) / 2, 1.0)
    for name, vals in (('face-neutral', {}), ('face-browDown', {'browDownLeft': 1, 'browDownRight': 1}),
                       ('face-browUpLeft', {'browUpLeft': 1}), ('face-smile', {'smile': 1})):
        keys(vals); shot(name, face_at, face_from, .2)
    keys({})
    shot('body-front', (0, .88, 0), (0, .88, 4), 1.95); shot('body-side', (0, .88, 0), (4, .88, 0), 1.95)
    shot('arm-detail', (.33, 1.15, .05), (.33, 1.15, 3), .55)
if not A.no_renders:
    arm.data.pose_position = 'REST'   # 检查图用绑定姿势；导出前必须切回 POSE，否则动画会被采样成静止
    try: render_set(); log('检查图已输出到', CHECK)
    except Exception as error: log('检查图输出失败（不影响导出）：', repr(error))
    finally: arm.data.pose_position = 'POSE'

# ---------------- 远景低模 ----------------
for o in list(meshes):
    if o.name in bpy.data.objects:
        dims = o.dimensions
        if re.search(r'iris|sclera|eye', o.name + o.data.name, re.I): continue   # 眼球保留，否则眼窝是空的
        tiny = max(dims) < .03 or re.search(r'stud|stitch|weave|buckle|sphere|stopper', o.name + o.data.name, re.I)
        if tiny: bpy.data.objects.remove(o, do_unlink=True)
meshes = [o for o in scene.objects if o.type == 'MESH']
for o in meshes:
    if o.data.shape_keys:
        with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]): bpy.ops.object.shape_key_remove(all=True)
def tris_of(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
total = sum(tris_of(o) for o in meshes); ratio = max(.05, min(1.0, A.lod_tris / max(total, 1)))
for o in meshes:
    if tris_of(o) < 200: continue
    mod = o.modifiers.new('LOD', 'DECIMATE'); mod.ratio = ratio; mod.use_collapse_triangulate = True
    with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
        bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0); bpy.ops.object.modifier_apply(modifier=mod.name)
for img in bpy.data.images:
    if img.size[0] > 512: img.scale(512, 512 * img.size[1] // img.size[0])
log(f'远景：减面前 {total} 面，比例 {ratio:.3f}，减面后 {sum(tris_of(o) for o in meshes)} 面')
lod = os.path.join(A.out, 'wang-gui-lod.glb'); export(lod, morph=False)
REPORT['lod'] = read_glb(lod); log('远景版', REPORT['lod'])

# ---------------- 自检 ----------------
problems = []
if not {'Idle', 'Talk', 'Walk'} <= set(REPORT['full']['animations']): problems.append('完整版缺动画：' + str(REPORT['full']['animations']))
if not {'browDownLeft', 'browDownRight', 'browUpLeft', 'browUpRight', 'smile', 'jawOpen'} <= set(REPORT['full']['morphs']): problems.append('完整版缺表情形态：' + str(REPORT['full']['morphs']))
if REPORT['full']['normalMaps'] < 6: problems.append('法线贴图数量偏少：' + str(REPORT['full']['normalMaps']))
if not {'Idle', 'Talk', 'Walk'} <= set(REPORT['lod']['animations']): problems.append('远景版缺动画')
if REPORT['lod']['triangles'] > A.lod_tris * 1.25: problems.append(f"远景版面数 {REPORT['lod']['triangles']} 超出目标")
REPORT['problems'] = problems
json.dump(REPORT, open(os.path.join(A.out, 'wang-gui-refine-report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
log('完成' if not problems else '完成，但有问题：' + '；'.join(problems))
