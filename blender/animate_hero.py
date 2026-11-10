"""
Author the hero's animation clips and export the final GLB.

    /Applications/Blender.app/Contents/MacOS/Blender -b blender/hero.blend -P blender/animate_hero.py

Run after build_hero.py. Poses are written as *directions* in character space
(x = his left, y = up, z = forward) and solved onto the rig, then keyframed.

Clips (all exported to assets/hero.glb):
  swingR / swingL  one swing arc, web in the right / left hand. The site scrubs these by the
                   pendulum angle, so frame 0 = start of the arc, last frame = top of the far side.
  flip             a tuck somersault after letting go (the body spin itself comes from physics).
  fall             looping free-fall / glide.
"""
import bpy, os
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(bpy.data.filepath), ".."))
OUT = os.path.join(ROOT, "assets", "hero.glb")
FPS = 24

scene = bpy.context.scene
scene.render.fps = FPS
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
arm.data.pose_position = "POSE"
P = "mixamorig:"

def bone(name):
    return arm.pose.bones.get(P + name) or arm.pose.bones.get(name)

# character space -> Blender world (he faces -Y, up is +Z, his left is +X)
def cs(x, y, z):
    return Vector((x, -z, y)).normalized()

ORDER = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head",
         "LeftArm", "LeftForeArm", "LeftHand", "RightArm", "RightForeArm", "RightHand",
         "LeftUpLeg", "LeftLeg", "LeftFoot", "RightUpLeg", "RightLeg", "RightFoot"]

CHILD = {"Hips": "Spine", "Spine": "Spine1", "Spine1": "Spine2", "Spine2": "Neck", "Neck": "Head", "Head": "HeadTop_End",
         "LeftArm": "LeftForeArm", "LeftForeArm": "LeftHand", "LeftHand": "LeftHandMiddle1",
         "RightArm": "RightForeArm", "RightForeArm": "RightHand", "RightHand": "RightHandMiddle1",
         "LeftUpLeg": "LeftLeg", "LeftLeg": "LeftFoot", "LeftFoot": "LeftToeBase",
         "RightUpLeg": "RightLeg", "RightLeg": "RightFoot", "RightFoot": "RightToeBase"}

for pb in arm.pose.bones:
    pb.rotation_mode = "QUATERNION"

def apply_pose(dirs):
    """dirs: {bone: (x, y, z)} in character space. Bones not listed stay at rest."""
    for pb in arm.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
    world_rot_inv = arm.matrix_world.to_quaternion().inverted()
    for name in ORDER:
        if name not in dirs:
            continue
        pb = bone(name)
        if pb is None:
            continue
        bpy.context.view_layer.update()
        target = world_rot_inv @ cs(*dirs[name])          # armature space
        M = pb.matrix.copy()
        # aim along the real joint-to-joint direction: the glTF importer re-orients bones,
        # so a bone's own +Y axis is NOT reliably pointing at its child here
        child = bone(CHILD.get(name, ""))
        if child is None:
            child = next((c for c in pb.children), None)
        cur = ((child.matrix.translation - M.translation) if child else M.to_3x3().col[1]).normalized()
        q = cur.rotation_difference(target)
        R = q.to_matrix() @ M.to_3x3().normalized()
        pb.matrix = Matrix.Translation(M.translation) @ R.to_4x4()
    bpy.context.view_layer.update()

def key_all(frame):
    for name in ORDER:
        pb = bone(name)
        if pb:
            pb.keyframe_insert("rotation_quaternion", frame=frame)

def mirror(pose):
    out = {}
    for k, (x, y, z) in pose.items():
        k2 = k.replace("Left", "§").replace("Right", "Left").replace("§", "Right")
        out[k2] = (-x, y, z)
    return out

def make_action(name, keys, cyclic=False):
    """keys: [(seconds, pose_dict), ...]"""
    arm.animation_data_create()
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data.action = act
    for t, pose in keys:
        apply_pose(pose)
        key_all(round(t * FPS) + 1)
    # smooth interpolation everywhere
    for fc in _fcurves(act):
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"
            kp.easing = "AUTO"
        if cyclic:
            fc.modifiers.new("CYCLES")
    act.frame_range = (1, round(keys[-1][0] * FPS) + 1)
    print(f"action {name}: {len(keys)} keys, {act.frame_range[1]:.0f} frames")
    return act

def _fcurves(act):
    # Blender 4.4+ layered actions keep curves inside layers/strips/channelbags
    if hasattr(act, "layers") and act.layers:
        for layer in act.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    yield from bag.fcurves
    else:
        yield from act.fcurves

# ------------------------------------------------------------------ poses
WEB_R = {"RightArm": (-0.12, 1.0, 0.12), "RightForeArm": (-0.08, 1.0, 0.1), "RightHand": (-0.05, 1.0, 0.1)}

def pose(**k):
    d = dict(WEB_R)
    d.update(k)
    return d

# swing arc, web in the RIGHT hand. Body "up" points along the web line at runtime.
SWING_START = pose(          # behind the anchor, dropping in: long body, legs trailing
    Spine=(0, 1, -0.10), Spine1=(0, 1, -0.08), Spine2=(0, 1, -0.10), Neck=(0, 1, 0.15), Head=(0, 0.75, 0.66),
    LeftArm=(0.85, -0.25, -0.45), LeftForeArm=(0.7, -0.2, -0.25), LeftHand=(0.6, -0.4, -0.2),
    LeftUpLeg=(0.08, -0.95, -0.28), LeftLeg=(0.06, -0.92, -0.42), LeftFoot=(0.05, -0.6, -0.8),
    RightUpLeg=(-0.08, -0.97, -0.18), RightLeg=(-0.06, -0.95, -0.3), RightFoot=(-0.05, -0.6, -0.8))
SWING_BOTTOM = pose(         # through the bottom: knees snap up, chest curls, free arm reaches forward
    Spine=(0, 1, 0.12), Spine1=(0, 1, 0.16), Spine2=(0, 1, 0.2), Neck=(0, 1, 0.25), Head=(0, 0.5, 0.86),
    LeftArm=(0.75, -0.35, 0.55), LeftForeArm=(0.45, -0.1, 0.9), LeftHand=(0.3, -0.2, 0.95),
    LeftUpLeg=(0.12, -0.42, 0.9), LeftLeg=(0.08, -0.97, 0.05), LeftFoot=(0.05, -0.3, 0.95),
    RightUpLeg=(-0.1, -0.62, 0.78), RightLeg=(-0.06, -0.95, -0.2), RightFoot=(-0.05, -0.4, 0.9))
SWING_END = pose(            # up the far side: legs shoot forward, back arches, ready to let go
    Spine=(0, 1, -0.14), Spine1=(0, 1, -0.16), Spine2=(0, 1, -0.2), Neck=(0, 1, 0.05), Head=(0, 0.85, 0.5),
    LeftArm=(0.6, 0.45, 0.6), LeftForeArm=(0.35, 0.7, 0.6), LeftHand=(0.3, 0.8, 0.5),
    LeftUpLeg=(0.1, -0.5, 0.86), LeftLeg=(0.06, -0.55, 0.84), LeftFoot=(0.05, 0.2, 0.98),
    RightUpLeg=(-0.1, -0.72, 0.68), RightLeg=(-0.06, -0.85, 0.5), RightFoot=(-0.05, 0.0, 1.0))

FALL_A = {                   # open glide
    "Spine": (0, 1, -0.12), "Spine2": (0, 1, -0.15), "Head": (0, 0.7, 0.7),
    "LeftArm": (0.95, 0.05, 0.2), "LeftForeArm": (0.85, 0.3, 0.35), "LeftHand": (0.8, 0.3, 0.4),
    "RightArm": (-0.95, 0.05, 0.2), "RightForeArm": (-0.85, 0.3, 0.35), "RightHand": (-0.8, 0.3, 0.4),
    "LeftUpLeg": (0.25, -0.95, 0.06), "LeftLeg": (0.2, -0.88, -0.38), "LeftFoot": (0.1, -0.5, -0.85),
    "RightUpLeg": (-0.2, -0.95, -0.08), "RightLeg": (-0.16, -0.85, -0.5), "RightFoot": (-0.1, -0.5, -0.85),
}
FALL_B = {**FALL_A,
    "LeftArm": (0.95, 0.18, 0.1), "RightArm": (-0.95, -0.05, 0.28),
    "LeftUpLeg": (0.22, -0.96, -0.08), "RightUpLeg": (-0.24, -0.94, 0.1),
    "LeftLeg": (0.18, -0.9, -0.48), "RightLeg": (-0.18, -0.88, -0.35)}

TUCK = {                     # knees to chest, arms wrapped
    "Spine": (0, 1, 0.35), "Spine1": (0, 1, 0.4), "Spine2": (0, 1, 0.45), "Neck": (0, 1, 0.4), "Head": (0, 0.3, 0.95),
    "LeftArm": (0.55, -0.45, 0.7), "LeftForeArm": (-0.25, -0.35, 0.9), "LeftHand": (-0.4, -0.5, 0.75),
    "RightArm": (-0.55, -0.45, 0.7), "RightForeArm": (0.25, -0.35, 0.9), "RightHand": (0.4, -0.5, 0.75),
    "LeftUpLeg": (0.16, 0.35, 0.92), "LeftLeg": (0.1, -0.95, -0.15), "LeftFoot": (0.05, -0.2, 0.98),
    "RightUpLeg": (-0.16, 0.35, 0.92), "RightLeg": (-0.1, -0.95, -0.15), "RightFoot": (-0.05, -0.2, 0.98),
}

# ------------------------------------------------------------------ actions
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)

make_action("swingR", [(0.0, SWING_START), (0.5, SWING_BOTTOM), (1.0, SWING_END)])
make_action("swingL", [(0.0, mirror(SWING_START)), (0.5, mirror(SWING_BOTTOM)), (1.0, mirror(SWING_END))])
make_action("flip", [(0.0, FALL_A), (0.22, TUCK), (0.62, TUCK), (0.9, FALL_A)])
make_action("fall", [(0.0, FALL_A), (0.8, FALL_B), (1.6, FALL_A)], cyclic=True)

arm.animation_data.action = None
for pb in arm.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0)

# preview stills of each key pose for checking
PREV = os.path.join(ROOT, "blender", "previews")
os.makedirs(PREV, exist_ok=True)

bpy.ops.wm.save_mainfile()
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format="GLB",
    export_animations=True, export_animation_mode="ACTIONS", export_skins=True, export_yup=True,
    export_force_sampling=True, export_frame_step=1, export_optimize_animation_size=True,
    export_materials="EXPORT", export_texcoords=True, export_normals=True,
    export_image_format="JPEG", export_jpeg_quality=88, export_attributes=False,
)
print("wrote", OUT, os.path.getsize(OUT) // 1024, "KB")
