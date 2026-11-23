# Join plan: the trunk penetrates the planter fill, roots taper down through soil
# inside the existing blocked footprint, branches seat into their parent wood,
# and the court-side tile nose seats into the existing wall cap.
import math
import random
from mathutils import Vector

def foliage_tree(x,y):
    rng=random.Random(193501)
    a=Vector((x,y,.29))
    trunk=[a,a+Vector((.05,.03,.55)),a+Vector((-.15,.12,1.41)),
        a+Vector((-.31,.29,2.42)),a+Vector((-.34,.38,3.32)),a+Vector((-.61,.47,4.0))]

    def tube(points,radii,sides,phase=0):
        verts=[]
        for j,(p,r) in enumerate(zip(points,radii)):
            axis=(points[min(len(points)-1,j+1)]-points[max(0,j-1)]).normalized()
            u=axis.cross(Vector((.81,.16,.04))).normalized()
            v=axis.cross(u)
            for i in range(sides):
                t=math.tau*i/sides
                flare=1+.12*math.sin(3*t+phase+.17*j)+.085*math.sin(5*t-.22*j)
                verts.append(p+(u*math.cos(t)+v*math.sin(t))*r*flare)
        faces=[(j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i)
            for j in range(len(points)-1) for i in range(sides)]
        mesh('槐木',verts,faces,'bark')

    tube(trunk,[.61,.48,.41,.35,.26,.09],12)
    for i in range(9):
        t=i*math.tau/9+rng.uniform(-.16,.16)
        d=Vector((math.cos(t),math.sin(t),0))
        u=Vector((-d.y,d.x,0))
        tube([a+Vector((0,0,.27)),a+d*.38+u*.09,a+d*.70+u*.11+Vector((0,0,.13)),
              a+d*rng.uniform(.76,.86)+Vector((0,0,.10)),a+d*.91+Vector((0,0,.06))],
             [.21,.21,.16,.08,.017],8,t)

    tips=[]
    def grow(origin,angle,length,radius,depth,phase):
        d=Vector((math.cos(angle),math.sin(angle),0))
        cross=Vector((-d.y,d.x,0))
        points=[origin]
        for t in (.29,.59,1):
            points.append(origin+d*(length*t)+cross*(.15*length*math.sin(t*4+phase)*t)
                          +Vector((0,0,length*(.31*t+.64*t*t))))
        tube(points,[radius,radius*.83,radius*.56,radius*.24],8 if depth>1 else 6,phase)
        if depth:
            for off,point in [(-1,points[2]),(1,points[3])]:
                grow(point,angle+off*rng.uniform(.34,.92),length*rng.uniform(.50,.68),radius*.54,depth-1,phase+off)
        else: tips.append((points[-1],angle))

    for i,(level,length) in enumerate([(2,1.95),(2,1.67),(3,1.98),(3,2.3),(4,1.93),(4,1.5),(5,1.36)]):
        grow(trunk[level-1].lerp(trunk[level],.86),i*2.399+0.3,length,.17 if i<5 else .13,2,i)
    # Pairs of curved silhouettes cross at the branch tip, then fan upward and out.
    for tip,angle in tips:
        for side in (0,math.pi/2):
            foliage_card(tip-Vector((0,0,.10)),angle+side,1.42+rng.random()*.64,1.68+rng.random()*.57,'twig')
    assert len(tips)*2==56


def foliage_card(root,angle,width,height,key):
    u=Vector((math.cos(angle),math.sin(angle),0))
    normal=Vector((-u.y,u.x,0))
    vertices=[root+u*(value*width)+normal*(.10*width*(1-abs(value)*2)*row)+Vector((0,0,row*height))
        for row in (0,.5,1) for value in (-.5,0,.5)]
    mesh('弧面树冠',vertices,[(0,1,4,3),(1,2,5,4),(3,4,7,6),(4,5,8,7)],key)


def foliage_outside():
    rng=random.Random(193502)
    for i,(x,y,z) in enumerate([(64,15.1,3.4),(68,15.0,4),(74,14,3.55),(79,15.8,4.2),
        (88,14,3.8),(95,15,4),(101,14.4,3.1),(105.5,24,3.1),(106.7,30,3.6),
        (105.2,38.3,3.55),(106,46,3.25),(105.5,55,3.35),(104.7,62,3.65),(96,67.7,3.25)]):
        root=Vector((*xy(x,y),z))
        for angle in (.18,1.34,2.52):
            foliage_card(root+Vector((rng.uniform(-.43,.43),rng.uniform(-.43,.43),rng.uniform(-.21,.24))),
                angle+i*.67,3.1+rng.random()*2,3.8+rng.random()*2.0,'crown')
