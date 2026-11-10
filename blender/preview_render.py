"""Studio preview renders of blender/hero.blend (lighting per the product-polish skill's 'studio' preset).
    Blender -b blender/hero.blend -P blender/preview_render.py -- <out_dir>
"""
import bpy, sys, os
from mathutils import Vector
out_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.path.join(os.path.dirname(bpy.data.filepath), "previews")
os.makedirs(out_dir, exist_ok=True)
sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE"
if hasattr(sc.eevee, "use_raytracing"): sc.eevee.use_raytracing = True
sc.render.resolution_x = sc.render.resolution_y = 900
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Punchy" if "AgX - Punchy" in [l.name for l in bpy.types.ColorManagedViewSettings.bl_rna.properties["look"].enum_items] else "None"
w = bpy.data.worlds.new("studio"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.03, 0.035, 0.06, 1)
def area(name, loc, watts, size, col=(1, 1, 1)):
    l = bpy.data.lights.new(name, "AREA"); l.energy = watts; l.size = size; l.color = col
    o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector((0, 0, 1.1)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
area("Key", (2.2, -2.6, 2.6), 350, 1.5, (1, 0.95, 0.9))
area("Fill", (-2.6, -1.8, 1.6), 250, 2.5, (0.85, 0.9, 1))
area("Rim", (0.4, 2.8, 2.4), 250, 1.0, (0.7, 0.8, 1))
area("Bounce", (0, -1.5, -0.6), 100, 3.0)
cam = bpy.data.cameras.new("cam"); co = bpy.data.objects.new("cam", cam); sc.collection.objects.link(co); sc.camera = co
for name, loc, tgt, lens in [("front", (0.9, -4.2, 1.1), (0, 0, 0.92), 50), ("face", (0.3, -0.95, 1.68), (0, 0, 1.6), 60), ("back", (-1.0, 3.9, 1.2), (0, 0, 0.95), 50)]:
    co.location = loc; cam.lens = lens
    co.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(out_dir, f"r_{name}.png"); bpy.ops.render.render(write_still=True)
