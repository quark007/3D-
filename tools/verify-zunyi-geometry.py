"""Check metric component placements before Blender joins the render meshes."""
from collections import defaultdict
from pathlib import Path

parts = defaultdict(list)

def capture_box(name, center, size, material):
    parts[name].append(tuple((value - width / 2, value + width / 2)
                             for value, width in zip(center, size)))

def ignore_geometry(*args):
    pass

def verify_bounds(name, index):
    return parts[name][index]

def verify_overlap(first, second, index, axis, minimum):
    a, b = verify_bounds(first, index)[axis], verify_bounds(second, index)[axis]
    overlap = min(a[1], b[1]) - max(a[0], b[0])
    assert overlap >= minimum - 1e-8, (first, second, index, overlap)
    return overlap

root = Path(__file__).resolve().parent
context = {'box': capture_box, 'beam': ignore_geometry, 'mesh': ignore_geometry}
for source in ['zunyi-landmark.py', 'zunyi-houses.py']:
    exec(compile((root / source).read_text(encoding='utf-8-sig'), source, 'exec'), context)
context['build_landmark']()
assert verify_bounds('主楼台基', 0)[2][0] == 0
seams = [verify_overlap('青砖柱', name, index, 2, .005)
         for index in range(18) for name in ['柱座', '柱头']]
gate_width = verify_bounds('门楼柱础', 1)[0][0] - verify_bounds('门楼柱础', 0)[0][1]
assert gate_width >= 2.2
print(f'Gate at base: {gate_width:.3f} m; 36 pier joints: min {min(seams):.3f} m engagement')
for variant in range(5):
    context['house'](0, 0, 4, variant, 1)
    label = f'Street_{variant}_0.00_0.00_'
    assert verify_bounds(label + 'Footing', 0)[2][0] == 0
    for index in range(2):
        verify_overlap(label + 'PostShoe', label + 'ThroughPost', index, 2, .005)
print('Five timber bay variants: foundations at z=0; 10 post/shoe joints pass')
