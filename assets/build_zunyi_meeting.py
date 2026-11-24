"""Build the source scene in the connected Blender session."""
import bpy, math, numpy as np
from mathutils import Vector
from pathlib import Path
from math import sin,cos,pi
ROOT=Path("D:/长征星火3D剧情/p0-camera-sparse")
S=bpy.data.scenes.new("遵义核心会议室")
bpy.context.window.scene=S
S.render.engine="CYCLES"
S.cycles.samples=24
S.cycles.use_denoising=True
S.world=bpy.data.worlds.new("冬日室外")
S.world.use_nodes=True
next(n for n in S.world.node_tree.nodes if n.type=="BACKGROUND").inputs[0].default_value=(.36,.42,.54,1)
next(n for n in S.world.node_tree.nodes if n.type=="BACKGROUND").inputs[1].default_value=.45

def camera(name,pos,target,lens):
    d=bpy.data.cameras.new(name)
    o=bpy.data.objects.new(name,d)
    S.collection.objects.link(o)
    o.location=pos
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    d.lens=lens
    d.clip_start=.035
    return o

S.camera=camera("Overview",(-.13,3.12,1.62),(-.15,-.55,.79),17)
camera("BrazierDetail",(-.09,1.955,.77),(-.17,1.05,.43),17)
camera("EastWall",(-2.16,1.93,1.57),(2.03,-.09,1.3),25)

def material(name,c,rough=.48,grain=None,metal=0,emit=0):
    m=bpy.data.materials.new("ZY "+name)
    m.use_nodes=True
    n=m.node_tree.nodes
    link=m.node_tree.links.new
    p=next(v for v in n if v.type=="BSDF_PRINCIPLED")
    p.inputs["Base Color"].default_value=(*c,1)
    p.inputs["Roughness"].default_value=rough
    p.inputs["Metallic"].default_value=metal
    if emit:
        p.inputs["Emission Color"].default_value=(*c,1)
        p.inputs["Emission Strength"].default_value=emit
    if grain:
        coord=n.new("ShaderNodeTexCoord")
        v=n.new("ShaderNodeVectorMath")
        v.operation="MULTIPLY"
        v.inputs[1].default_value=grain
        link(coord.outputs["Object"],v.inputs[0])
        noise=n.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value=3
        noise.inputs["Detail"].default_value=4
        link(v.outputs[0],noise.inputs[0])
        ramp=n.new("ShaderNodeValToRGB")
        for e,f in zip(ramp.color_ramp.elements,(.84,1.12) if name=="lime plaster" else (.48,1.35)):
            e.color=(*(min(1,k*f) for k in c),1)
        link(noise.outputs["Fac"],ramp.inputs[0])
        link(ramp.outputs[0],p.inputs["Base Color"])
        bump=n.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value=.13
        bump.inputs["Distance"].default_value=.002
        link(noise.outputs["Fac"],bump.inputs["Height"])
        link(bump.outputs[0],p.inputs["Normal"])
    return m

wall=material("lime plaster",(.68,.62,.51),.89,(4,4,4))
floor=material("oxblood boards",(.19,.048,.027),.40,(17,1,2))
trim=material("chestnut",(.12,.045,.024),.43,(16,12,1))
cab=material("red cabinet",(.22,.066,.035),.43,(22,15,1))
ebony=material("blackened table",(.036,.026,.021),.43,(20,1,5))
worn=material("worn edges",(.098,.063,.042),.52,(19,2,3))
chairwood=material("polished bentwood",(.105,.053,.029),.38,(16,12,2))
cane=material("woven cane",(.36,.225,.103),.66)
iron=material("cast iron",(.056,.047,.043),.61,metal=.65)
brass=material("tarnished brass",(.36,.225,.077),.32,metal=.75)
mirror=material("silvered mirror",(.79,.82,.80),.075,metal=1)
glass=material("winter glass",(.78,.85,.90),.13)
pink=material("rose glass",(.82,.32,.38),.19)
amber=material("straw glass",(.89,.67,.27),.19)
for m in [glass,pink,amber]:
    p=next(n for n in m.node_tree.nodes if n.type=="BSDF_PRINCIPLED")
    p.inputs["Transmission Weight"].default_value=.93
    p.inputs["IOR"].default_value=1.46
paper=material("aged paper",(.59,.48,.30),.85,(6,6,6))
ink=material("dark ink",(.012,.017,.021),.26)
ember=material("banked coals",(.56,.071,.012),.86,emit=.8)
opal=material("milk glass",(.91,.78,.54),.27,emit=.32)
linen=material("journal cover",(.16,.107,.067),.78,(8,8,8))
# Tangent-space normals from interlaced ridges with alternating over/under crossings.
t=np.arange(512)*2*pi/512
x,y=np.meshgrid(t*16,t*16)
h=.60*(np.cos(x*2)*(1+.65*np.cos(x)*np.cos(y))+np.cos(y*2)*(1-.65*np.cos(x)*np.cos(y)))
dy,dx=np.gradient(h)
rgb=np.stack((-dx,-dy,np.ones_like(dx)),axis=-1)
rgb/=np.linalg.norm(rgb,axis=-1,keepdims=True)
im=bpy.data.images.new("Cane weave 512",512,512,alpha=False)
im.colorspace_settings.name="Non-Color"
im.pixels.foreach_set(np.dstack((rgb*.5+.5,np.ones_like(dx))).astype("f").ravel())
im.pack()
nt=cane.node_tree
tex=nt.nodes.new("ShaderNodeTexImage")
tex.image=im
normal=nt.nodes.new("ShaderNodeNormalMap")
nt.links.new(tex.outputs[0],normal.inputs["Color"])
nt.links.new(normal.outputs[0],next(n for n in nt.nodes if n.type=="BSDF_PRINCIPLED").inputs["Normal"])

class Parts:
    def __init__(self):
        self.v=[]; self.f=[]; self.mi=[]; self.mats=[]
    def add(self,vs,fs,m):
        if m not in self.mats: self.mats.append(m)
        base=len(self.v)
        self.v.extend(vs)
        self.f.extend([tuple(base+i for i in f) for f in fs])
        self.mi.extend([self.mats.index(m)]*len(fs))
    def box(self,p,d,m):
        self.add([tuple(a+b*c/2 for a,b,c in zip(p,d,k)) for k in
            [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]],
            [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],m)
    def rod(self,a,b,r,m,n=8,r2=None):
        axis=(Vector(b)-Vector(a)).normalized()
        u=axis.orthogonal().normalized(); v=axis.cross(u)
        vs=[Vector(c)+(u*cos(i*2*pi/n)+v*sin(i*2*pi/n))*rr for c,rr in [(a,r),(b,r if r2 is None else r2)] for i in range(n)]
        self.add(vs,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],m)
    def turn(self,p,profile,m,n=24,flute=0):
        vs=[(p[0]+(r+flute*cos(8*a))*cos(a),p[1]+(r+flute*cos(8*a))*sin(a),p[2]+z) for r,z in profile for a in (i*2*pi/n for i in range(n))]
        self.add(vs,[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(profile)-1) for i in range(n)],m)
    def finish(self,name):
        mesh=bpy.data.meshes.new(name)
        mesh.from_pydata(self.v,[],self.f)
        mesh.update()
        for m in self.mats:mesh.materials.append(m)
        uv=mesh.uv_layers.new(name="UVMap")
        for poly,idx in zip(mesh.polygons,self.mi):
            poly.material_index=idx
            axis=max(range(3),key=lambda j:abs(poly.normal[j]))
            a,b=[j for j in range(3) if j!=axis]
            for li in poly.loop_indices:
                co=mesh.vertices[mesh.loops[li].vertex_index].co
                uv.data[li].uv=(co[a]*3,co[b]*3)
        o=bpy.data.objects.new(name,mesh)
        S.collection.objects.link(o)
        return o

g=Parts()
# West wall opening from y -2.35 to 1.90, z .85 to 2.92.
for p,d in [((2.37,0,1.7),(.14,6.4,3.4)),((0,-3.27,1.7),(4.88,.14,3.4)),((0,3.27,1.7),(4.88,.14,3.4)),((-2.39,0,.425),(.18,6.4,.85)),((-2.39,0,3.16),(.18,6.4,.48)),((-2.39,-2.775,1.885),(.18,.85,2.07)),((-2.39,2.55,1.885),(.18,1.30,2.07)),((0,0,3.44),(4.8,6.6,.08))]:g.box(p,d,wall)
for i in range(26):
    xx=-2.3+(i+.5)*4.6/26
    cut=-1.7+(i%5)*.71
    for lo,hi in [(-3.2,cut),(cut,3.2)]:g.box((xx,(lo+hi)/2,-.028),(4.6/26-.001,hi-lo-.001,.056),floor)
for xx in [-2.29,2.29]:
    for z in [.065,3.30,3.35]:g.box((xx,0,z),(.035,6.4,.06 if z>3 else .13),trim)
for yy in [-3.19,3.19]:
    for z in [.065,3.30,3.35]:g.box((0,yy,z),(4.6,.035,.06 if z>3 else .13),trim)
for i in range(6):
    g.box((-2.46,-2.35+i*.85,1.885),(.07,.048,2.11),trim)
    g.box((-2.46,-.225,.85+i*.414),(.07,4.29,.048),trim)
for i in range(5):
    for j in range(5):
        g.box((-2.476,-2.35+(i+.5)*.85,.85+(j+.5)*.414),(.006,.802,.366),glass if j else [pink,amber][i%2])
g.finish("RoomShell")
g=Parts()
for x in [.94,1.94]:g.box((x,3.167,1.09),(.09,.067,2.18),trim)
g.box((1.44,3.166,2.16),(1.09,.07,.10),trim)
g.box((1.44,3.18,1.045),(.93,.035,2.09),trim)
for z in [.57,1.54]:g.box((1.44,3.148,z),(.72,.024,.79),cab)
g.rod((1.79,3.14,1.04),(1.79,3.08,1.04),.03,brass)
g.finish("Door_Exit")
def cupboard(y,name,fancy):
    g=Parts()
    for xx in [1.99,2.23]:
        for yy in [y-.45,y+.45]:g.box((xx,yy,.075),(.09,.09,.15),cab)
    g.box((2.12,y,1.05),(.34,1.09,1.87),cab)
    for z in [.16,.25,1.94,2.0]:g.box((2.11,y,z),(.38,1.16,.055),trim if z==.25 else cab)
    for off in [-.48,.48]:g.box((1.933,y+off,1.06),(.05,.065,1.69),cab)
    for off in [-.235,.235]:
        g.box((1.938,y+off,1.08),(.046,.442,1.62),trim)
        g.box((1.909,y+off,1.08),(.014,.377,1.50),mirror if fancy and off<0 else cab)
        g.rod((1.9,y+off*.31,1.05),(1.872,y+off*.31,1.05),.017,brass)
    if fancy:
        for i in range(19):
            q=(i-9)/9
            z=2.06+.15*(1-q*q)**3
            g.rod((2.04,y+q*.48,2.025),(2.04,y+q*.48,z),.034,cab,8,.019)
        for q in [-1,0,1]:
            g.turn((2.04,y+q*.50,2.025 if q else 2.21),[(.032,0),(.04,.032),(.008,.078)],cab,12)
    g.finish(name)
cupboard(-1.26,"Prop_WardrobeMirror",True)
cupboard(1.15,"Prop_WardrobePlain",False)
g=Parts()
g.box((2.245,-.06,1.84),(.11,.22,.50),trim)
g.box((2.185,-.06,1.76),(.012,.158,.21),ebony)
g.rod((2.178,-.06,1.84),(2.178,-.06,1.70),.005,brass)
for z,r,m in [(1.70,.031,brass),(1.955,.087,brass),(1.955,.079,paper)]:
    front=2.17 if m==paper else 2.175
    g.rod((front+.006,-.06,z),(front,-.06,z),r,m,32)
for i in range(12):
    a=i*pi/6
    g.rod((2.166,-.06+.064*sin(a),1.955+.064*cos(a)),(2.166,-.06+.073*sin(a),1.955+.073*cos(a)),.002,ink,6)
for a,l in [(.89,.040),(-1.1,.06)]:g.rod((2.162,-.06,1.955),(2.162,-.06+l*sin(a),1.955+l*cos(a)),.003,ink,6)
clock=g.finish("Prop_WallClock")
for v in clock.data.vertices:v.co.x=2.30+(v.co.x-2.30)*(.11/.141)
cx=-.16
g=Parts()
g.box((cx,0,.79),(1.14,3.30,.068),ebony)
for side in [-1,1]:
    g.box((cx+side*.543,0,.70),(.052,3.17,.134),ebony)
    g.box((cx,side*1.60,.70),(1.09,.05,.134),ebony)
    g.box((cx+side*.563,0,.796),(.012,3.29,.012),worn)
    for sy in [-1,1]:
        xx=cx+side*.48; yy=sy*1.53
        g.turn((xx,yy,0),[(.052,0),(.061,.035),(.043,.095),(.048,.45),(.066,.54),(.055,.59),(.071,.63),(.073,.755)],ebony,12)
g.finish("Prop_MeetingTable")
g=Parts()
g.box((cx-.27,-.63,.838),(.22,.30,.022),linen)
g.box((cx-.27,-.63,.852),(.21,.289,.009),paper)
g.box((cx-.27,-.63,.86),(.22,.30,.007),linen)
g.turn((cx+.17,-.68,.824),[(.032,0),(.04,.012),(.038,.065),(.021,.078),(.022,.09),(.001,.091)],ink,16)
g.finish("WritingSet")
g=Parts()
for xx in [-.17,.17]:
    for yy in [-.17,.17]:g.box((cx+xx,yy+.34,.066),(.046,.046,.132),trim)
    g.box((cx+xx,.34,.14),(.056,.40,.04),trim)
g.box((cx,.34,.153),(.39,.37,.03),trim)
g.turn((cx,.34,.168),[(.12,0),(.15,.022),(.19,.073),(.211,.102),(.215,.117),(.196,.12),(.17,.064),(.12,.033),(.001,.033)],iron,32)
for i in range(19):
    a=i*2.399; r=.031*math.sqrt(i)
    g.turn((cx+r*cos(a),.34+r*sin(a),.204),[(.021,0),(.027,.013),(.012,.026),(.001,.029)],ember if i%4==0 else iron,7)
g.finish("Prop_CharcoalBrazier").location.y=.96
g=Parts()
g.turn((0,0,2.18),[(.015,0),(.065,.01),(.098,.056),(.082,.094),(.041,.138),(.03,.19)],brass)
g.turn((0,0,2.30),[(.164,0),(.168,.016),(.128,.042),(.095,.096),(.045,.109)],opal,64,.009)
g.turn((0,0,2.37),[(.026,0),(.043,.048),(.022,.169),(.024,.20)],glass,24)
for a in [0,2.094,4.189]:g.rod((.14*cos(a),.14*sin(a),2.32),(0,0,2.64),.004,brass,6)
g.rod((0,0,2.62),(0,0,3.37),.008,brass)
g.turn((0,0,3.35),[(.018,0),(.077,.035),(.078,.05)],brass)
g.finish("Prop_HangingLamp")
g=Parts()
for s in [-1,1]:
    x=s*.181
    g.rod((x,-.181,.014),(x,.155,.466),.017,chairwood,8)
    g.rod((x,.194,.014),(x,-.147,.457),.017,chairwood,8)
    g.rod((x,.095,.434),(x,.205,.824),.018,chairwood,8)
    g.rod((x,-.116,.438),(x,-.146,.603),.012,chairwood,6)
    g.rod((x,-.184,.604),(x,.15,.642),.018,chairwood,8)
    g.rod((x-s*.012,.012,.241),(x+s*.021,.012,.241),.020,brass,8)
for yy,zz in [(-.161,.428),(.139,.439),(.159,.633),(.204,.817),(-.113,.13)]:
    g.rod((-.18,yy,zz),(.18,yy,zz),.016,chairwood,8)
g.box((0,-.01,.435),(.328,.293,.014),cane)
# Sloped woven back insert, with a narrow wood rail above and below.
g.add([(-.163,.154,.648),(.163,.154,.648),(.163,.199,.802),(-.163,.199,.802)],[(0,1,2,3)],cane)
for s in [-1,1]:
    g.rod((s*.164,-.16,.437),(s*.164,.14,.437),.012,chairwood,8)
    g.rod((s*.166,.14,.444),(s*.166,.159,.642),.009,chairwood,8)
master=g.finish("FoldingChair_01")
base_z=min(v.co.z for v in master.data.vertices)
for v in master.data.vertices:v.co.z-=base_z
def chair_places():
    for s in [-1,1]:
        for i in range(8):yield (cx+s*.847,(i-3.5)*.436,-s*90)
    for s in [-1,1]:
        for side in [-1,1]:yield(cx+side*.26,s*1.999,0 if s==1 else 180)
for i,(xx,yy,angle) in enumerate(chair_places()):
    o=master if i==0 else bpy.data.objects.new(f"FoldingChair_{i+1:02d}",master.data)
    if i:S.collection.objects.link(o)
    o.location=(xx,yy,0)
    o.rotation_euler.z=math.radians(angle+(-1 if i%2 else 1)*(3+i%4))
def light(name,kind,p,color,power,size,target=None):
    d=bpy.data.lights.new(name,kind); d.energy=power; d.color=color
    o=bpy.data.objects.new(name,d); S.collection.objects.link(o); o.location=p
    if kind=="AREA":
        d.shape="DISK"; d.size=size
        o.visible_glossy=False; o.visible_transmission=False
        o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    else:d.shadow_soft_size=size
light("West overcast","AREA",(-2.23,-.25,2.01),(.77,.85,1),410,2.55,(1.3,-.3,.58))
light("Window return","AREA",(-2.19,1.32,1.65),(.83,.89,1),118,1.15,(1.4,.7,.45))
light("Lamp glow","POINT",(0,0,2.16),(1,.72,.41),44,.12)
light("Embers","POINT",(cx,1.30,.263),(1,.156,.034),3.3,.095)
S.render.resolution_x=1000; S.render.resolution_y=660; S.render.resolution_percentage=100
bpy.context.view_layer.update()
bpy.data.libraries.write(str(ROOT/"assets/zunyi-meeting-room-master.blend"),{S},fake_user=True,compress=True)
print("MASTER",bpy.app.binary_path,master.data.name,len(master.data.polygons))
