"""Street-front timber bays and low-poly rear rooflines, in metres.

Joints: sill laps plinth by 1 cm, columns lap stone shoes by 2 cm,
fascia caps exposed rafters, window mullions enter their rails.
x,y locate the footprint centre. Positive facing looks to the south.
"""


def _zunyi_roof(label, x, y, width, halfdepth, eave, rise, facing):
    # Five-section sagging tile plane, thick enough for underside silhouettes.
    section = [(-1, 0), (-.76, .13), (0, 1), (.76, .13), (1, 0)]
    verts = []
    for dz in [0, -.12]:
        for t, h in section:
            for side in [-1, 1]:
                verts.append((x + side * width / 2, y + t * halfdepth * facing,
                              eave + rise * h + dz))
    faces = []
    for i in range(0, 8, 2):
        faces.extend([(i, i+1, i+3, i+2), (i+12, i+13, i+11, i+10),
                      (i, i+2, i+12, i+10), (i+3, i+1, i+11, i+13)])
    faces.extend([(0, 10, 11, 1), (8, 9, 19, 18)])
    if facing == -1:
        faces = [tuple(reversed(f)) for f in faces]
    mesh(label, verts, faces, 'roof')
    # Fill both end elevations, so the sky cannot show below the ridge.
    for side in [-1, 1]:
        end_x = x + side*(width/2-.04)
        wall = []
        for t, height in [(-1, 0), (-.76, .13), (0, 1), (.76, .13), (1, 0)]:
            wall.extend([(end_x, y+t*halfdepth*facing, eave-.14),
                         (end_x, y+t*halfdepth*facing, eave+rise*height-.10)])
        quads = [(i,i+2,i+3,i+1) for i in range(0,8,2)]
        if side*facing < 0:
            quads = [tuple(reversed(f)) for f in quads]
        mesh(label+'_GableInfill',wall,quads,'wood')


def house(x, y, width, variant, facing):
    v = variant % 5
    depth = [5.65, 5.9, 5.6, 6.0, 5.75][v]
    h = [5.48, 5.76, 5.6, 6.04, 5.7][v]
    rise = [1.38, 1.55, 1.65, 1.42, 1.5][v]
    front = -depth / 2
    name = f'Street_{variant}_{x:.2f}_{y:.2f}_'

    def block(label, u, t, z, w, d, height, material):
        box(name + label, (x + u, y + facing*t, z), (w, d, height), material)

    def stick(label, a, b, w, d):
        def point(p):
            return x+p[0], y+facing*p[1], p[2]
        beam(name+label, point(a), point(b), w, d, 'wood')

    block('Footing', 0, 0, .17, width, depth, .34, 'stone')
    block('Infill', 0, .10, (h+.32)/2, width-.08, depth-.2, h-.32,
          ['plaster','wood','brick','plaster','wood'][v])
    block('Threshold', 0, front, .355, width-.08, .38, .08, 'stone')
    for sign in [-1, 1]:
        u = sign*(width/2-.16)
        block('PostShoe', u, front, .22, .32, .4, .44, 'stone')
        block('ThroughPost', u, front, (h+.42)/2, .18, .22, h-.42, 'wood')
        stick('EaveBrace', (u,front,h-.54), (u,front-.55,h-.12), .09,.11)
        block('DoorPier', sign*(width/2-.45), front-.14,.24,.30,.38,.48,'stone')
    for z in [.45,2.65,3.17,h-.17]:
        block('Ledger',0,front,z,width-.10,.21,.15,'wood')
    # Closed removable shutter leaves fit behind the front timber stiles.
    clear = width-.54
    leaves = 8+v%3
    for i in range(leaves):
        u = (i+.5)*clear/leaves-clear/2
        block('LiftOutLeaf',u,front+.038,1.53,clear/leaves-.012,.085,2.12,'wood')
    # Upper sash: two-to-four panes with shared rails and varied lattice spacing.
    windows = 2+v%3
    opening=clear/windows
    for i in range(windows):
        u = (i+.5)*opening-clear/2
        block('UpperSash',u,front+.029,4.14,opening-.10,.08,1.32,'glass')
        for j in range(4):
            block('LatticeUpright',u+(j/3-.5)*(opening-.07),
                  front-.036,4.14,.043,.070,1.38,'wood')
        for j in range(4):
            block('LatticeRail',u,front-.045,3.47+j*.445,opening-.045,.072,.047,'wood')
    for i in range(7):
        u = (i/6-.5)*(width-.24)
        stick('EaveRafter',(u,front+.26,h+.22),(u,front-.62,h-.05),.09,.105)
    block('EaveFascia',0,front-.56,h-.065,width+.03,.12,.16,'wood')
    _zunyi_roof(name+'CurvedTileRoof',x,y,width+.07,depth/2+.64,h+.095,rise,facing)
    block('RidgeTile',0,0,h+.095+rise,width+.09,.19,.18,'roof')
    # Stepped fire wall with descending capstones, alternating party-wall side.
    if v in (1,2,4):
        u = (width/2-.10)*(-1 if v==2 else 1)
        for step in range(5):
            t = (step-2)*depth/5
            summit = h+.64+rise*(1-abs(step-2)/2)
            block('FireGable',u,t,(h+summit)/2-.01,.19,depth/5+.008,summit-h+.04,'brick')
            block('GableCap',u,t,summit,.27,depth/5+.05,.12,'roof')


def distant(x,y,width,variant):
    h=4.8+(variant%5)*.47
    depth=4.7+(variant%3)*.65
    label=f'Skyline_{x:.2f}_{y:.2f}'
    box(label+'_Walls',(x,y,h/2),(width,depth,h),'plaster')
    _zunyi_roof(label+'_Roof',x,y,width+.55,depth/2+.4,h,1.4+(variant%4)*.21,1)
