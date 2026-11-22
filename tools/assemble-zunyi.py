for file in ['zunyi-landmark.py','zunyi-houses.py']:
    exec(compile((R/'tools'/file).read_text(encoding='utf-8-sig'),file,'exec'))
group='L1_landmark'
build_landmark()
flush()
group='L1_paving'
box('前院',(0,-13.42,.012),(33,15.18,.032),'stone')
road=[(6,58),(40,58),(80,56),(120,54),(154,52)]
for (x,y),(xx,yy) in zip(road,road[1:]):
    mesh('子尹路',[(x-81,30-y-3.7,.03),(xx-81,30-yy-3.7,.03),(xx-81,30-yy+3.7,.03),(x-81,30-y+3.7,.03)],[(0,1,2,3)],'stone')
box('门前',(-2,-22.3,.018),(16.4,4.6,.032),'stone')
flush()
# Local mesh origins allow linked timber bay modules and GPU instancing.
variants={}
instancing=bpy.data.objects.new('Timber street bays',None)
scene.collection.objects.link(instancing)
index=0
for cy,coords,face in [(48,[*range(23,60,4),*range(103,116,4)],1),(68,range(43,72,4),-1),(64,range(99,128,4),-1)]:
    for cx in coords:
        v=index%5;index+=1
        if v not in variants:
            group='L2_bay_'+str(v)
            house(0,0,4,v,1)
            variants[v]=flush()
            copies=variants[v]
        else:
            copies=[o.copy() for o in variants[v]]
            for o in copies:scene.collection.objects.link(o)
        for o in copies:
            o.parent=instancing
            o.location=(cx-81,30-cy,0)
            o.rotation_euler.z=0 if face==1 else math.pi
group='L3_skyline'
for i,x in enumerate(range(-85,86,12)):
    distant(x,34+(i%3)*2,10+(i%3),i)
    distant(x,-84-(i%3)*2,11,i+2)
for i,y in enumerate(range(-72,33,12)):
    distant(-86,y,9,i);distant(84,y,9,i+1)
flush()
for folder,xy,height in [('tree_tree_stump_01',(-12,-11),1.25),('tree_tree_stump_02',(-23,-20),.85),('prop_rock_moss_set_01',(8,-19),.65)]:
    bpy.ops.import_scene.gltf(filepath=str(next((raw/'models'/folder).glob('*.gltf'))))
    meshes=[o for o in bpy.context.selected_objects if o.type=='MESH']
    original=[o for o in bpy.context.selected_objects if o.type!='MESH']
    for o in meshes:
        mat=o.matrix_world.copy()
        o.parent=None;o.matrix_world=mat
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:o.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    if len(meshes)>1:bpy.ops.object.join()
    o=bpy.context.object;o.name=folder
    if o.name not in scene.objects:
        scene.collection.objects.link(o)
    for collection in list(o.users_collection):
        if collection != scene.collection:collection.objects.unlink(o)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    me=o.data;me.calc_loop_triangles()
    if len(me.loop_triangles)>1000:
        mod=o.modifiers.new('Scan reduction','DECIMATE');mod.ratio=950/len(me.loop_triangles)
        bpy.ops.object.modifier_apply(modifier=mod.name)
    vs=[v.co.copy() for v in o.data.vertices]
    lo=Vector([min(p[j] for p in vs) for j in range(3)])
    hi=Vector([max(p[j] for p in vs) for j in range(3)])
    center=(lo+hi)/2;center.z=lo.z
    for v in o.data.vertices:v.co=(v.co-center)*(height/(hi.z-lo.z))
    o.location=(*xy,0)
    for obj in original:
        if obj.name in bpy.data.objects:bpy.data.objects.remove(obj,do_unlink=True)
    o.data.calc_loop_triangles()
    print(folder,len(o.data.loop_triangles))
exec(compile((R/'tools/enrich-zunyi.py').read_text(encoding='utf-8-sig'),'enrich-zunyi.py','exec'))
scene.render.engine='CYCLES'
scene.cycles.samples=4
scene.cycles.use_denoising=True
scene.render.resolution_x=850;scene.render.resolution_y=530;scene.render.resolution_percentage=100
sun=bpy.data.lights.new('Cloudbreak','SUN');sun.energy=2.1;sun.angle=.25
ob=bpy.data.objects.new('Cloudbreak',sun);scene.collection.objects.link(ob)
ob.rotation_euler=(.49,-.6,-.4)
camera=bpy.data.objects.new('Street camera',bpy.data.cameras.new('Street camera'))
scene.collection.objects.link(camera);scene.camera=camera
views=[('01-aerial',(32,-55,33),(-4,-12,2),32),('02-facade',(1,-17,3),(0,0,5),15),('03-street',(-39,-28,1.65),(-8,-24,2.2),23),('04-courtyard',(-8,-15,1.65),(1,-2,6),17)]
def setview(view):
    name,eye,target,lens=view
    camera.location=eye;camera.rotation_euler=(Vector(target)-Vector(eye)).to_track_quat('-Z','Y').to_euler()
    camera.data.lens=lens
    scene.render.filepath=str(ev/(name+'.jpg'));scene.render.image_settings.file_format='JPEG'
def render_view(view):
    setview(view)
    bpy.ops.render.render(write_still=True,scene=scene.name)
setview(views[0])
bpy.context.view_layer.update()
print(len(scene.objects),'objects')
