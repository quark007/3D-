from pathlib import Path
import bpy
s=bpy.context.scene
out=Path(__file__).resolve().parents[1]/"evidence/ch3-meeting-room"
s.render.threads_mode="FIXED"
s.render.threads=8
for name,file in [("Overview","01-overview"),("BrazierDetail","02-table-brazier"),("EastWall","03-east-wall")]:
    s.camera=s.objects[name]
    s.render.filepath=str(out/(file+".png"))
    bpy.ops.render.render(write_still=True)
