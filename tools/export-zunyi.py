"""Export only the reviewed Zunyi scene from the live Blender session."""
target=R/'changzheng/assets/scenes/zunyi-realscan'
target.mkdir(parents=True,exist_ok=True)
bpy.context.window.scene=scene
geometry=[o for o in scene.objects if o.type=='MESH']
for o in geometry:
    o.data.calc_loop_triangles()
    for mat in o.data.materials:
        if mat and mat.use_nodes:
            for node in mat.node_tree.nodes:
                if node.type=='TEX_IMAGE' and node.image and not node.image.packed_file:
                    node.image.pack()
print('Street triangles:',sum(len(o.data.loop_triangles) for o in geometry))
bpy.data.libraries.write(str(out/'zunyi_street_master.blend'),{scene},fake_user=True,compress=True)
bpy.ops.object.select_all(action='DESELECT')
for o in geometry:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(target/'zunyi_street.glb'),export_format='GLB',
    use_selection=False,use_active_scene=True,export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,export_gpu_instances=True,
    export_image_format='JPEG',export_jpeg_quality=78,export_animations=False)
print('GLB bytes:',(target/'zunyi_street.glb').stat().st_size)
