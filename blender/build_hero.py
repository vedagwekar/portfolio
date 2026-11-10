"""
Build the portfolio hero in Blender, headless.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/build_hero.py
    /Applications/Blender.app/Contents/MacOS/Blender -b blender/hero.blend -P blender/animate_hero.py

An original web-slinger (not any existing character): a graphite tech-weave suit, red seams
running down the limbs and sides, a chevron "V" on the chest, angular glowing eye slits, and
wrist web-shooters.

Input:  blender/src/Xbot.glb   (rigged mannequin from the three.js examples, used as the base body + rig)
Output: assets/hero.glb        (suit baked to colour / emission / normal maps, gear rigged to bones)
        blender/hero.blend     (the working file, to open and tweak by hand)

Steps:
  1. import the rig, drop its stock clips
  2. re-sculpt the mannequin into an athletic build (radial slimming along each bone)
  3. paint per-vertex suit data (seam angles, armour zones, emblem distance) from the rig
  4. shade the suit procedurally and bake colour + emission + normal maps with Cycles
  5. model the eye slits and web-shooters, parent them to the head / forearm bones
  6. export a single GLB (animate_hero.py then adds the clips)
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "blender", "src", "Xbot.glb")
OUT = os.path.join(ROOT, "assets", "hero.glb")
BLEND = os.path.join(ROOT, "blender", "hero.blend")
TEX_DIR = os.path.join(ROOT, "blender", "textures")
os.makedirs(TEX_DIR, exist_ok=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)

# ------------------------------------------------------------------ 1. import
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)

# the source file ships a stray helper icosphere; drop it
for o in [o for o in bpy.data.objects if o.type == "MESH" and o.parent is None]:
    bpy.data.objects.remove(o, do_unlink=True)

arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
surface = next(o for o in meshes if "Surface" in o.name)
joints = next(o for o in meshes if "Joint" in o.name)
print("armature:", arm.name, "meshes:", [m.name for m in meshes])

# put everything in rest pose and drop the stock clips
arm.animation_data_clear()
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
arm.data.pose_position = "REST"
bpy.context.view_layer.update()

# ------------------------------------------------------------------ 2. athletic build
# The mannequin is chunky. Pull each limb in toward its bone axis; keep the chest and
# shoulders full so the silhouette tapers into a V.
CHILD = {"Hips": "Spine", "Spine": "Spine1", "Spine1": "Spine2", "Spine2": "Neck", "Neck": "Head", "Head": "HeadTop_End",
         "Arm": "ForeArm", "ForeArm": "Hand", "Hand": "HandMiddle1",
         "UpLeg": "Leg", "Leg": "Foot", "Foot": "ToeBase", "Shoulder": "Arm"}
SLIM = {"Arm": 0.92, "ForeArm": 0.86, "Hand": 0.94, "UpLeg": 0.9, "Leg": 0.86, "Foot": 0.95,
        "Hips": 0.84, "Spine": 1.3, "Spine1": 1.12, "Spine2": 1.0, "Neck": 1.25, "Head": 0.93, "Shoulder": 1.0}

def split(name):
    n = name.replace("mixamorig:", "")
    for side, sgn in (("Left", 1), ("Right", -1)):
        if n.startswith(side):
            return n[len(side):], sgn, side
    return n, 0, ""

def segment(name):
    """bone head -> child joint, in world space (metres)"""
    base, sgn, side = split(name)
    b = arm.data.bones.get(name)
    a = arm.matrix_world @ b.head_local
    child = arm.data.bones.get("mixamorig:" + side + CHILD.get(base, "")) if base in CHILD else None
    t = arm.matrix_world @ (child.head_local if child else b.tail_local)
    return a, t

SEG = {b.name: segment(b.name) for b in arm.data.bones}

def reshape(obj):
    mw, inv = obj.matrix_world, obj.matrix_world.inverted()
    names = {g.index: g.name for g in obj.vertex_groups}
    for v in obj.data.vertices:
        p = mw @ v.co
        acc = Vector()
        for g in v.groups:
            n = names[g.group]
            f = SLIM.get(split(n)[0])
            if f is None or n not in SEG:
                continue
            a, t = SEG[n]
            d = t - a
            if d.length < 1e-5:
                continue
            u = max(-0.3, min(1.3, (p - a).dot(d) / d.length_squared))
            c = a + d * u
            acc += ((c + (p - c) * f) - p) * g.weight
        v.co = inv @ (p + acc)
    obj.data.update()

reshape(surface)
reshape(joints)

def torso_profile(body):
    """Re-cut the torso to an athletic profile: the mannequin has a wasp waist and hips wider than
    the chest. Per 1 cm slice, scale x/y toward target half-width / depth (cm, object space)."""
    W = [(86, 15.8), (92, 15.6), (100, 14.6), (108, 14.0), (116, 14.2), (124, 15.0), (130, 15.4), (134, 15.6)]
    D = [(86, 18.0), (96, 20.5), (106, 21.0), (114, 21.5), (122, 25.5), (130, 28.0), (134, 28.0)]
    def lerp(tbl, z):
        for (z0, v0), (z1, v1) in zip(tbl, tbl[1:]):
            if z0 <= z <= z1:
                return v0 + (v1 - v0) * (z - z0) / (z1 - z0)
        return None
    me = body.data
    verts = [v for v in me.vertices if abs(v.co.x) < 30 and 84 <= v.co.z <= 136]
    stats = {}
    for z in range(84, 137):
        sl = [v.co for v in verts if abs(v.co.z - z) < 1.0]
        if len(sl) > 10:
            ys = [c.y for c in sl]
            stats[z] = (max(abs(c.x) for c in sl), (max(ys) + min(ys)) / 2, max(ys) - min(ys))
    kx, ky = {}, {}
    for z, (hw, yc, dp) in stats.items():
        tw, td = lerp(W, z), lerp(D, z)
        kx[z] = min(1.8, max(0.78, tw / hw)) if tw else 1.0
        ky[z] = min(1.4, max(0.85, td / dp)) if td else 1.0
    def smooth(k):
        return {z: sum(k.get(z + d, k[z]) for d in range(-2, 3)) / 5 for z in k}
    kx, ky = smooth(kx), smooth(ky)
    for v in verts:
        z = int(round(v.co.z))
        if z not in kx:
            continue
        fade = min(1.0, (z - 84) / 4.0, (136 - z) / 4.0)
        yc = stats[z][1]
        v.co.x *= 1 + (kx[z] - 1) * fade
        v.co.y = yc + (v.co.y - yc) * (1 + (ky[z] - 1) * fade)
    me.update()
    print("torso profile: x", round(min(kx.values()), 2), "-", round(max(kx.values()), 2), " y", round(min(ky.values()), 2), "-", round(max(ky.values()), 2))

# One continuous body instead of mannequin parts: join, voxel-remesh, smooth the ball joints away
# (not the hands), decimate, then pull the skin weights back from the original parts.
def fuse():
    src = []
    for o in (surface, joints):
        c = o.copy(); c.data = o.data.copy(); bpy.context.collection.objects.link(c); src.append(c)
    bpy.ops.object.select_all(action="DESELECT")
    for c in src: c.select_set(True)
    bpy.context.view_layer.objects.active = src[0]
    bpy.ops.object.join()
    ref = src[0]; ref.name = "WeightsRef"
    for m in list(ref.modifiers): ref.modifiers.remove(m)

    body = ref.copy(); body.data = ref.data.copy(); bpy.context.collection.objects.link(body)
    body.name = "Hero_Body"
    body.vertex_groups.clear()
    body.data.remesh_voxel_size = 0.6          # object units are cm
    body.data.use_remesh_fix_poles = True
    bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body
    bpy.ops.object.voxel_remesh()

    def transfer():
        for g in ref.vertex_groups:
            if g.name not in body.vertex_groups:
                body.vertex_groups.new(name=g.name)
        dt = body.modifiers.new("weights", "DATA_TRANSFER")
        dt.object = ref
        dt.use_vert_data = True
        dt.data_types_verts = {"VGROUP_WEIGHTS"}
        dt.vert_mapping = "POLYINTERP_NEAREST"
        dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
        bpy.ops.object.modifier_apply(modifier=dt.name)
    transfer()
    torso_profile(body)

    # smooth everything except hands/fingers, then decimate
    mask = body.vertex_groups.new(name="smoothmask")
    names = {g.index: g.name for g in body.vertex_groups}
    for v in body.data.vertices:
        hand = sum(g.weight for g in v.groups if "Hand" in names.get(g.group, ""))
        mask.add([v.index], max(0.0, 1.0 - hand * 1.6), "REPLACE")
    sm = body.modifiers.new("smooth", "LAPLACIANSMOOTH")
    sm.iterations = 12; sm.lambda_factor = 0.9; sm.lambda_border = 0.0
    sm.use_volume_preserve = True; sm.use_normalized = True
    sm.vertex_group = "smoothmask"
    bpy.ops.object.modifier_apply(modifier=sm.name)
    sm2 = body.modifiers.new("smooth2", "SMOOTH")
    sm2.factor = 0.75; sm2.iterations = 14; sm2.vertex_group = "smoothmask"
    bpy.ops.object.modifier_apply(modifier=sm2.name)
    dec = body.modifiers.new("decimate", "DECIMATE")
    dec.ratio = min(1.0, 42000 / max(1, len(body.data.polygons)))
    bpy.ops.object.modifier_apply(modifier=dec.name)
    body.vertex_groups.remove(body.vertex_groups["smoothmask"])

    # re-transfer weights onto the final topology, then tidy them for glTF (4 influences)
    body.vertex_groups.clear()
    transfer()
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    for poly in body.data.polygons:
        poly.use_smooth = True

    body.parent = arm
    for m in list(body.modifiers): body.modifiers.remove(m)
    am = body.modifiers.new("Armature", "ARMATURE"); am.object = arm
    for o in (surface, joints, ref):
        bpy.data.objects.remove(o, do_unlink=True)
    print("fused body:", len(body.data.vertices), "verts")
    return body

surface = fuse()

# ------------------------------------------------------------------ 3. suit data, painted from the rig
FWD = Vector((0, -1, 0))       # he faces -Y
ARMOUR = ("ForeArm", "Hand", "Leg", "Foot", "ToeBase")
EMB_TOP, EMB_TIP, EMB_X, EMB_W = 1.425, 1.255, 0.135, 0.0085   # chest chevron, metres

def chevron_field(p):
    """signed distance to the chest 'V' stroke (negative inside the stroke); only on the front"""
    x, z = abs(p.x), p.z
    a, b = Vector((0.0, EMB_TIP)), Vector((EMB_X, EMB_TOP))
    q = Vector((x, z))
    ab = b - a
    u = max(0.0, min(1.0, (q - a).dot(ab) / ab.length_squared))
    d = (q - (a + ab * u)).length - EMB_W
    if p.y > -0.02:                       # back half of the torso: no emblem
        d = max(d, 0.05)
    return d

def paint_suit_data(obj):
    me, mw = obj.data, obj.matrix_world
    names = {g.index: g.name for g in obj.vertex_groups}
    A = me.color_attributes.get("suit") or me.color_attributes.new("suit", "FLOAT_COLOR", "POINT")
    E = me.color_attributes.get("emblem") or me.color_attributes.new("emblem", "FLOAT_COLOR", "POINT")
    for v in me.vertices:
        p = mw @ v.co
        best, bw = None, 0.0
        armour = 0.0
        for g in v.groups:
            if g.weight > bw:
                best, bw = names[g.group], g.weight
            if split(names[g.group])[0].startswith(ARMOUR):
                armour += g.weight
        phi, fade = 0.0, 0.0
        if best in SEG:
            base, sgn, side = split(best)
            a, t = SEG[best]
            d = (t - a).normalized()
            r = p - a; r -= d * r.dot(d)
            if r.length > 1e-6 and not base.startswith(("Head", "Neck", "HeadTop")):
                r.normalize()
                f = (FWD - d * FWD.dot(d)).normalized()
                s = d.cross(f)
                pref = Vector((0, 0, 1)) if base.startswith(("Arm", "ForeArm", "Hand", "Shoulder")) else Vector((sgn or 1, 0, 0))
                if s.dot(pref) < 0:
                    s = -s
                fc, sc = r.dot(f), r.dot(s)
                if sgn == 0:                  # torso: a seam down each side
                    sc = abs(sc)
                phi = math.atan2(fc, sc)      # 0 on the seam line, signed so it interpolates cleanly
                fade = max(0.0, min(1.0, (bw - 0.55) / 0.25))
                if "Hand" in base and base != "Hand":
                    fade = 0.0                # no seams on fingers
        A.data[v.index].color = (phi / math.pi * 0.5 + 0.5, fade, min(1.0, armour), 1.0)
        e = chevron_field(p)
        E.data[v.index].color = (e + 0.5, 0.0, 0.0, 1.0)

paint_suit_data(surface)

# ------------------------------------------------------------------ 4. suit shader + bake
FABRIC = os.path.join(ROOT, "blender", "src", "polyhaven", "bi_stretch_Diffuse.jpg")  # CC0, polyhaven.com/a/bi_stretch

def suit_material(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    N.clear()

    def node(kind, **kw):
        n = N.new(kind)
        for k, v in kw.items():
            setattr(n, k, v)
        return n

    def op(o, a, b=None, clamp=False):
        n = node("ShaderNodeMath", operation=o, use_clamp=clamp)
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                L.new(v, n.inputs[i])
        return n.outputs[0]

    def band(v, inner, outer):
        """1 where |v| < inner, smooth falloff to 0 at outer"""
        mr = node("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP")
        L.new(op("ABSOLUTE", v), mr.inputs["Value"])
        mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = inner, outer
        mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = 1.0, 0.0
        return mr.outputs[0]

    def rgb(r, g, b):
        n = node("ShaderNodeRGB"); n.outputs[0].default_value = (r, g, b, 1); return n.outputs[0]

    def mix(fac, a, b):
        n = node("ShaderNodeMix", data_type="RGBA")
        L.new(fac, n.inputs["Factor"]); L.new(a, n.inputs[6]); L.new(b, n.inputs[7])
        return n.outputs[2]

    tc = node("ShaderNodeTexCoord")
    to_m = node("ShaderNodeVectorMath", operation="SCALE")      # object coords are cm
    to_m.inputs["Scale"].default_value = 0.01
    L.new(tc.outputs["Object"], to_m.inputs[0])

    suit = node("ShaderNodeVertexColor"); suit.layer_name = "suit"
    sep = node("ShaderNodeSeparateColor"); L.new(suit.outputs["Color"], sep.inputs[0])
    phi = op("MULTIPLY", op("SUBTRACT", sep.outputs[0], 0.5), 2 * math.pi)
    fade, armour = sep.outputs[1], sep.outputs[2]
    emb = node("ShaderNodeVertexColor"); emb.layer_name = "emblem"
    esep = node("ShaderNodeSeparateColor"); L.new(emb.outputs["Color"], esep.inputs[0])
    efield = op("SUBTRACT", esep.outputs[0], 0.5)

    seam = op("MULTIPLY", band(phi, 0.035, 0.06), fade)                            # thin red line
    panel = op("MULTIPLY", op("SUBTRACT", band(phi, 0.13, 0.17), band(phi, 0.06, 0.09)), fade)   # dark channel either side
    emblem = band(op("MAXIMUM", efield, 0.0), 0.0, 0.0018)                          # the V
    emb_edge = op("SUBTRACT", band(op("MAXIMUM", efield, 0.0), 0.006, 0.0085), emblem)  # dark keyline around it

    img = bpy.data.images.load(FABRIC)
    fab = node("ShaderNodeTexImage", projection="BOX", projection_blend=0.3); fab.image = img
    fs = node("ShaderNodeVectorMath", operation="SCALE"); fs.inputs["Scale"].default_value = 60.0
    L.new(to_m.outputs[0], fs.inputs[0]); L.new(fs.outputs[0], fab.inputs["Vector"])
    fab_lum = node("ShaderNodeRGBToBW"); L.new(fab.outputs["Color"], fab_lum.inputs[0])

    graphite = rgb(0.030, 0.032, 0.040)
    plate = rgb(0.011, 0.012, 0.016)
    channel = rgb(0.006, 0.006, 0.008)
    red = rgb(0.62, 0.018, 0.03)
    c = mix(armour, graphite, plate)
    c = mix(op("MULTIPLY", panel, 0.85), c, channel)
    c = mix(op("MINIMUM", op("ADD", emb_edge, 0.0), 1.0), c, channel)
    c = mix(op("MINIMUM", op("ADD", seam, emblem), 1.0), c, red)
    grain = node("ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
    grain.inputs["Factor"].default_value = 0.35
    L.new(c, grain.inputs[6]); L.new(fab.outputs["Color"], grain.inputs[7])

    # glow mask for the emission bake: seams glow softly, the emblem harder
    glow = op("ADD", op("MULTIPLY", seam, 0.55), emblem)
    glow_col = node("ShaderNodeMix", data_type="RGBA")
    L.new(op("MINIMUM", glow, 1.0), glow_col.inputs["Factor"])
    glow_col.inputs[6].default_value = (0, 0, 0, 1); glow_col.inputs[7].default_value = (1.0, 0.06, 0.05, 1)

    bump = node("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.7
    bump.inputs["Distance"].default_value = 0.0015
    height = op("ADD", op("ADD", op("MULTIPLY", seam, 0.8), op("MULTIPLY", panel, -0.6)),
                op("ADD", op("MULTIPLY", fab_lum.outputs[0], 0.25), op("MULTIPLY", op("ADD", emblem, emb_edge), 0.9)))
    L.new(height, bump.inputs["Height"])

    bsdf = node("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.55
    L.new(grain.outputs[2], bsdf.inputs["Base Color"])
    L.new(bump.outputs[0], bsdf.inputs["Normal"])
    out = node("ShaderNodeOutputMaterial")
    L.new(bsdf.outputs[0], out.inputs[0])
    m["_color_socket"] = grain.name
    m["_glow_socket"] = glow_col.name
    return m

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 16
scene.render.bake.margin = 8

def fresh_uvs(obj):
    """Xbot's UVs overlap (mirrored halves), which a bake can't represent. Unwrap a clean layout."""
    me = obj.data
    for uv in list(me.uv_layers):
        me.uv_layers.remove(uv)
    me.uv_layers.new(name="UVMap")
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.004, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode="OBJECT")

def bake(obj, size):
    fresh_uvs(obj)
    mat = suit_material(f"Suit_{obj.name}")
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    nt = mat.node_tree
    imgs = {}
    for kind in ("color", "emit", "normal"):
        im = bpy.data.images.new(f"{obj.name}_{kind}", size, size)
        if kind == "normal":
            im.colorspace_settings.name = "Non-Color"
        imgs[kind] = im
    tex = nt.nodes.new("ShaderNodeTexImage")
    nt.nodes.active = tex
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    emit = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(emit.outputs[0], out.inputs[0])
    for kind, sock in (("color", "_color_socket"), ("emit", "_glow_socket")):
        nt.links.new(nt.nodes[mat[sock]].outputs[2], emit.inputs["Color"])
        tex.image = imgs[kind]
        bpy.ops.object.bake(type="EMIT")
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    tex.image = imgs["normal"]
    bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT")
    for kind, im in imgs.items():
        im.filepath_raw = os.path.join(TEX_DIR, f"{obj.name}_{kind}.png"); im.file_format = "PNG"; im.save()

    # final, export-friendly material
    nt.nodes.clear()
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.48
    bsdf.inputs["Metallic"].default_value = 0.1
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.3
        bsdf.inputs["Coat Roughness"].default_value = 0.4
    ct = nt.nodes.new("ShaderNodeTexImage"); ct.image = imgs["color"]
    nt.links.new(ct.outputs[0], bsdf.inputs["Base Color"])
    et = nt.nodes.new("ShaderNodeTexImage"); et.image = imgs["emit"]
    nt.links.new(et.outputs[0], bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = 2.5
    nt_img = nt.nodes.new("ShaderNodeTexImage"); nt_img.image = imgs["normal"]
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(nt_img.outputs[0], nmap.inputs["Color"])
    nt.links.new(nmap.outputs[0], bsdf.inputs["Normal"])
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    for im in imgs.values():
        im.pack()

bake(surface, 2048)

# ------------------------------------------------------------------ 5. eyes + web-shooters
def bone(name):
    return arm.data.bones.get(name) or arm.data.bones.get("mixamorig:" + name)

def mat(name, color, rough=0.35, metal=0.0, emit=None, strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m

GLOW = mat("EyeGlow", (1.0, 0.18, 0.12), 0.2, emit=(1.0, 0.16, 0.1), strength=7.0)
SOCKET = mat("EyeSocket", (0.004, 0.004, 0.005), 0.18, 0.4)
METAL = mat("Gunmetal", (0.05, 0.055, 0.065), 0.32, 0.85)
STRIP = mat("ShooterGlow", (1.0, 0.1, 0.08), 0.3, emit=(1.0, 0.1, 0.06), strength=6.0)

deps = bpy.context.evaluated_depsgraph_get()
surf_eval = surface.evaluated_get(deps)
inv = surface.matrix_world.inverted()

def poly_object(name, pts2d, depth, material):
    """extruded flat polygon in local XZ (x = outward, z = up), thickness along local Y"""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    front = [bm.verts.new((x, -depth / 2, z)) for x, z in pts2d]
    back = [bm.verts.new((x, depth / 2, z)) for x, z in pts2d]
    bm.faces.new(front[::-1]); bm.faces.new(back)
    n = len(pts2d)
    for i in range(n):
        bm.faces.new((front[i], front[(i + 1) % n], back[(i + 1) % n], back[i]))
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    return o

# angular slit, inner corner low, outer corner swept up: focused, not cartoon-round
SLIT = [(-0.016, -0.0045), (0.012, -0.002), (0.022, 0.0075), (-0.012, 0.0035)]
SOCK = [(-0.021, -0.0085), (0.016, -0.0055), (0.028, 0.0115), (-0.016, 0.0075)]

def make_eye(side):
    e = arm.matrix_world @ bone("LeftEye" if side > 0 else "RightEye").head_local
    target = Vector((e.x + side * 0.006, e.y, e.z + 0.006))
    hit, loc, nrm, _ = surf_eval.ray_cast(inv @ (target + Vector((0, -0.5, 0))), (inv.to_3x3() @ Vector((0, 1, 0))).normalized())
    if hit:
        loc_w, nrm_w = surface.matrix_world @ loc, (surface.matrix_world.to_3x3() @ nrm).normalized()
    else:
        loc_w, nrm_w = target + Vector((0, -0.09, 0)), Vector((0, -1, 0))
    # local frame: Y = into the face (-normal), X = outward (toward his side), Z = up
    yax = -nrm_w
    xax = Vector((side, 0, 0)); xax = (xax - yax * xax.dot(yax)).normalized()
    zax = xax.cross(yax).normalized()
    if zax.z < 0:
        zax = -zax
    rot = Matrix((xax, yax, zax)).transposed().to_4x4()
    out = []
    for name, pts, depth, m, push in (("Socket", SOCK, 0.006, SOCKET, 0.0015), ("Slit", SLIT, 0.006, GLOW, 0.0035)):
        o = poly_object(f"{name}_{'L' if side > 0 else 'R'}", pts, depth, m)
        o.matrix_world = Matrix.Translation(loc_w + nrm_w * push) @ rot
        out.append(o)
    return out

def make_shooter(side):
    s = "Left" if side > 0 else "Right"
    fa, hand = bone(s + "ForeArm"), bone(s + "Hand")
    a, b = arm.matrix_world @ fa.head_local, arm.matrix_world @ hand.head_local
    d = (b - a).normalized()
    centre = a + (b - a) * 0.8
    # radius from the (already slimmed) forearm surface around that point
    mw = surface.matrix_world
    rs = []
    for v in surface.data.vertices:
        p = mw @ v.co
        u = (p - a).dot(d)
        if abs(u - (b - a).length * 0.8) < 0.015:
            r = (p - a) - d * u
            if r.length < 0.08:
                rs.append(r.length)
    radius = (sorted(rs)[len(rs) * 3 // 4] if rs else 0.035) + 0.004
    up = Vector((0, 0, 1))
    xax = d; zax = (up - d * up.dot(d)).normalized(); yax = zax.cross(xax)
    frame = Matrix((xax, yax, zax)).transposed().to_4x4()
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1, depth=1)
    band = bpy.context.active_object; band.name = f"Shooter_{s}"
    band.data.materials.append(METAL)
    bpy.ops.object.shade_smooth()
    band.matrix_world = Matrix.Translation(centre) @ frame @ Matrix.Rotation(math.radians(90), 4, "Y") @ Matrix.Diagonal((radius, radius, 0.055, 1))
    bpy.ops.mesh.primitive_cube_add(size=1)
    pod = bpy.context.active_object; pod.name = f"ShooterPod_{s}"
    pod.data.materials.append(METAL)
    pod.matrix_world = Matrix.Translation(centre + zax * (radius + 0.006)) @ frame @ Matrix.Diagonal((0.05, 0.026, 0.014, 1))
    bpy.ops.mesh.primitive_cube_add(size=1)
    strip = bpy.context.active_object; strip.name = f"ShooterGlow_{s}"
    strip.data.materials.append(STRIP)
    strip.matrix_world = Matrix.Translation(centre + zax * (radius + 0.0135)) @ frame @ Matrix.Diagonal((0.036, 0.008, 0.002, 1))
    return [band, pod, strip], fa.name

def parent_to(objs, bone_name):
    for o in objs:
        mw = o.matrix_world.copy()
        o.parent = arm; o.parent_type = "BONE"; o.parent_bone = bone_name
        o.matrix_world = mw

parent_to(make_eye(1) + make_eye(-1), bone("Head").name)
for side in (1, -1):
    objs, bn = make_shooter(side)
    parent_to(objs, bn)

# ------------------------------------------------------------------ 5. export
arm.data.pose_position = "POSE"
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format="GLB",
    export_animations=False, export_skins=True, export_yup=True,
    export_materials="EXPORT", export_texcoords=True, export_normals=True,   # per threejs-export skill
    export_image_format="JPEG", export_jpeg_quality=88,
    export_attributes=False,
)
print("wrote", OUT, os.path.getsize(OUT) // 1024, "KB")
