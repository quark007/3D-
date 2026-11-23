"""Metric landmark kit. Helpers append geometry to the active material batches."""
import math
import random

ARCH_POLISH = globals().get('ARCH_POLISH', False)


def zy_arc(name, x, y, spring, radius, thickness, depth, top):
    """Brick spandrel pierced by a semicircle and projecting voussoirs."""
    for i in range(14):
        a, b = (math.pi * j / 14 for j in (i, i + 1))
        def pt(angle, r):
            return (x + r*math.cos(angle), spring + r*math.sin(angle))
        pa,pb = pt(a,radius),pt(b,radius)
        def extrude(profile, cy, thick, material):
            verts=[(u,cy+s*thick/2,v) for s in (-1,1) for u,v in profile]
            faces=[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
            mesh(name, verts, [face[::-1] for face in faces], material)
        extrude([pa,(pa[0],top),(pb[0],top),pb],y,depth,'brick')
        extrude([pt(a+.003,radius-.014),pt(a+.003,radius+thickness),
                 pt(b-.003,radius+thickness),pt(b-.003,radius-.014)],
                y-depth/2-.024,.075,'trim' if ARCH_POLISH else 'brick')


def zy_roof(cx,cy,hx,hy,eave,peak):
    # Three bands form flared lower hip, vertical gable and curved upper pitch.
    tip=min(.55,(peak-eave)*.13)
    for side in (-1,1):
        rings=[]
        for t in (0,.18,.38,.60,.80,1):
            pts=[]
            for i in range(25):
                u=i/12-1
                width=hx-min(hy*.62,hx*.48)*min(1,t/.58)
                lift=tip*abs(u)**9*(1-t)
                pts.append((cx+u*width,cy+side*(1-t)*hy,eave+(peak-eave)*(.48*t+.52*t*t)+lift))
            rings.append(pts)
        verts=sum(rings,[])
        faces=[(r*25+i,r*25+i+1,(r+1)*25+i+1,(r+1)*25+i) for r in range(5) for i in range(24)]
        mesh('瓦坡',verts,[f if side<0 else f[::-1] for f in faces],'roof')
        for i in range(24):
            beam('檐口',rings[0][i],rings[0][i+1],.15,.14,'wood')
        if ARCH_POLISH:
            for i in range(24):
                for j in (.18,.70) if hx>10 else (.5,):
                    start=Vector(rings[0][i]).lerp(Vector(rings[0][i+1]),j)
                    end=Vector(rings[1][i]).lerp(Vector(rings[1][i+1]),j)
                    beam('檐端筒瓦',start,start.lerp(end,.62),.115,.11,'roof')
                    if j<.51: beam('出檐椽',start-Vector((0,0,.13)),start.lerp(end,.5)-Vector((0,0,.13)),.088,.085,'wood')
        for i in (0,24):
            for r in range(5):
                beam('垂脊',rings[r][i],rings[r+1][i],.15,.16,'roof')
        for i in (0,24):
            idx=0 if i==0 else -1
            edge=[r[idx] for r in rings]
            outer=edge[0]; inner=edge[3]
            center=(inner[0],cy,inner[2])
            ridge=edge[-1]
            mesh('山花', [inner,center,ridge],[(0,1,2)],'plaster')
            mesh('下层庑殿坡',edge[:4]+[center,(outer[0],cy,outer[2]-.12)],[(0,1,2,3,4,5)],'roof')
    rx=hx-min(hy*.62,hx*.48)
    beam('正脊',(cx-rx-.18,cy,peak),(cx+rx+.18,cy,peak),.27,.24,'roof')


def zy_window(x,y,z,w=1.4,h=1.8):
    box('窗玻璃',(x,y,z),(w,.075,h),'amber' if ARCH_POLISH else 'glass')
    for side in (-1,1):
        box('窗边框',(x+side*w/2,y-.06,z),(.105,.13,h+.11),'wood')
        box('窗槛',(x,y-.06,z+side*h/2),(w+.12,.14,.105),'wood')
    for u in (-.25,0,.25):
        box('直棂',(x+w*u,y-.068,z),(.043,.085,h),'wood')
    for v in (-.23,.23):
        box('横棂',(x,y-.073,z+h*v),(w,.085,.047),'wood')
    for u in (-.25,.25):
        for s in (-1,1):
            beam('花格',(x+w*u,y-.12,z+h*.23),(x+w*(u+s*.22),y-.12,z+h*.48),.04,.045,'wood')


def zy_tree(x,y):
    rng=random.Random(1935)
    def limb(a,b,r1,r2):
        pts=[]
        for center,rad in [(a,r1),(b,r2)]:
            for i in range(9):
                t=math.tau*i/9
                pts.append((center[0]+rad*math.cos(t),center[1]+rad*math.sin(t),center[2]))
        mesh('槐枝',pts,[(i,(i+1)%9,(i+1)%9+9,i+9) for i in range(9)],'wood')
    trunk=(x+.24,y,2.7)
    limb((x,y,-.04),trunk,.62,.42)
    def branch(a,t,length,rad,depth):
        b=(a[0]+math.cos(t)*length,a[1]+math.sin(t)*length,a[2]+length*rng.uniform(.7,1.4))
        limb(a,b,rad,rad*.62)
        if depth:
            for sign in (-1,1):
                branch(b,t+sign*rng.uniform(.37,1.02),length*rng.uniform(.56,.83),rad*.57,depth-1)
    for i in range(6):branch(trunk,math.tau*i/6,2.0,.22,4)


def round_column(x,y,z,height,bottom_radius,top_radius,material):
    sides=14
    points=[(x+radius*math.cos(i*math.tau/sides),y+radius*math.sin(i*math.tau/sides),h)
        for h,radius in ((z,bottom_radius),(z+height,top_radius)) for i in range(sides)]
    faces=[(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)]
    mesh('圆柱',points,faces+[tuple(reversed(range(sides))),tuple(range(sides,2*sides))],material)


def recessed_wall(x0,x1,front,back,z0,z1,openings,material):
    # Open pockets penetrate the 34 cm front skin. The continuous inner wythe
    # closes each pocket behind the timber frame and supports the upper courses.
    depth=.34
    cuts=sorted({z0,z1,*(z for _,_,lo,hi in openings for z in (lo,hi))})
    box('内墙',( (x0+x1)/2,(front+depth+back)/2,(z0+z1)/2),
        (x1-x0,back-front-depth,z1-z0),material)
    for lo,hi in zip(cuts,cuts[1:]):
        edges=[x0]
        for left,right,bottom,top in sorted(openings):
            if bottom<=lo and hi<=top: edges.extend((left,right))
        edges.append(x1)
        for left,right in zip(edges[::2],edges[1::2]):
            assert right-left>.005
            box('洞口外墙',((left+right)/2,front+depth/2,(lo+hi)/2),
                (right-left,depth,hi-lo),material)


def build_landmark(gate=(-2,-20),tree=(-12,-11), bays=8):
    # Floor -> plinth -> shafts -> capitals -> springers -> ring -> cornice -> roof.
    box('主楼台基',(0,0,.23),(25.75,12,.46),'stone')
    if ARCH_POLISH:
        openings=[]
        for floor in range(2):
            base=.46+3.57*floor
            for i in range(bays):
                c=(i-(bays-1)/2)*25.2/bays
                if floor==0 and i in (3,4): openings.append((c-.97,c+.97,.44,base+2.66))
                else: openings.append((c-.82,c+.82,base+.67,base+2.61))
        recessed_wall(-12.65,12.65,-3.05,5.95,.44,7.62,openings,'plaster')
    else: box('主楼外墙',(0,1.45,4.03),(25.3,9.0,7.18),'plaster')
    box('北翼墙身',(8.7,8.1,3.82),(7.65,5.7,7.65),'plaster')
    zy_roof(8.7,8.1,4.42,3.42,7.62,9.54)
    spacing=25.2/bays
    for floor in range(2):
        base=.46+3.57*floor
        box('廊面',(0,-4.51,base-.095),(25.75,3.04,.2),'stone')
        for i in range(bays+1):
            x=(i-bays/2)*spacing
            round_column(x,-5.62,base+.225,1.84,.255,.235,'brick')
            box('柱座',(x,-5.62,base+.15),(.64,.68,.3),'stone')
            if ARCH_POLISH:
                box('灰塑柱础线',(x,-5.62,base+.265),(.674,.704,.078),'trim')
                box('灰塑柱颈线',(x,-5.62,base+1.934),(.51,.54,.063),'trim')
            round_column(x,-5.62,base+1.94,.16,.28,.34,'plaster')
            box('浅灰柱头',(x,-5.62,base+2.12),(.61,.66,.13),'trim' if ARCH_POLISH else 'plaster')
            if i==bays: continue
            c=x+spacing/2
            zy_arc('廊拱',c,-5.62,base+1.95,(spacing-.47)/2,.15,.52,base+3.57)
            box('柱顶填墙',(x,-5.62,base+2.85),(.48,.52,1.47),'brick')
            if not floor and i in (3,4):
                front=-2.74 if ARCH_POLISH else -3.08
                box('板门',(c,front,base+1.27),(1.65,.13,2.54),'wood')
                for side in (-1,1): box('门框',(c+side*.85,front-.03,base+1.3),(.13,.16,2.63),'wood')
                if ARCH_POLISH:
                    zy_window(c,front-.145,base+1.98,1.12,.53)
            else: zy_window(c,-2.738 if ARCH_POLISH else -3.08,base+1.64)
            if floor:
                for z in (.22,.91):box('廊栏',(c,-5.65,base+z),(spacing-.44,.13,.11),'wood')
                for j in range(1,10):
                    box('栏芯',(x+.20+j*(spacing-.40)/10,-5.65,base+.57),(.065,.08,.72),'wood')
        box('右边券肩',(bays/2*spacing,-5.62,base+2.85),(.48,.52,1.47),'brick')
        box('腰线',(0,-5.65,base+3.52),(25.74,.69,.15),'trim' if ARCH_POLISH else 'plaster')
        if ARCH_POLISH: box('灰塑腰线滴水',(0,-5.65,base+3.43),(25.74,.73,.075),'trim')
    zy_roof(0,0,13.55,6.68,7.66,11.88)
    for j in range(3):
        height=(3-j)*.145
        box('石阶',(0,-6.18-.35*j,height/2),(6.3,.38,height),'stone')
    if gate is not None:
        gx,gy=gate
        for s in (-1,1):
            box('门楼墩',(gx+s*2.12,gy,2.25),(1.20,1.44,4.5),'brick')
            box('门楼柱础',(gx+s*2.15,gy,.26),(1.27,1.62,.52),'stone')
            box('门楼翼墙',(gx+s*5.45,gy,1.52),(5.5,.46,3.04),'brick')
            zy_roof(gx+s*5.45,gy,2.81,.47,3.02,3.34)
        zy_arc('门楼券',gx,gy,2.3,1.52,.22,1.42,4.50)
        zy_roof(gx,gy,3.12,1.37,4.47,5.67)
    if tree is not None:
        zy_tree(*tree)
