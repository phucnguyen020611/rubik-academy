"""
Rubik Academy – Blender asset builder.

Run headless:
  blender --background --factory-startup --python blender/build_models.py -- <out_dir> [--render]

Builds:
  cubie.glb   – one premium speed-cube piece: bevelled plastic body + rounded, slightly
                domed sticker tile (meshes "CubieBody" and "CubieSticker").
  trophy.glb  – lathe-turned trophy cup for the showroom shelf.
  plant.glb   – potted four-leaf-clover plant (brand mascot) for the showroom.
Optionally renders a Cycles preview of an assembled 3x3 to preview.png.
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else os.path.join(os.path.dirname(__file__), "..", "public", "models")
RENDER = "--render" in argv
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def mat(name, color, rough=0.4, metal=0.0, coat=0.0, trans=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if "Coat Weight" in b.inputs:
        b.inputs["Coat Weight"].default_value = coat
    if trans and "Transmission Weight" in b.inputs:
        b.inputs["Transmission Weight"].default_value = trans
    return m


def apply_all(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)


def shade_smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


def export(objs, path):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True,
        export_apply=True, export_yup=True, export_normals=True,
        export_materials="EXPORT",
    )


# ------------------------------------------------------------------ cubie
def build_body(segments=5):
    me = bpy.data.meshes.new("CubieBody")
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.bevel(bm, geom=bm.edges[:] + bm.verts[:], offset=0.075, segments=segments,
                    profile=0.5, affect="EDGES", clamp_overlap=True)
    bm.to_mesh(me)
    bm.free()
    obj = link(bpy.data.objects.new("CubieBody", me))
    shade_smooth(obj)
    obj.data.materials.append(mat("Plastic", (0.012, 0.012, 0.014), rough=0.32, coat=0.3))
    return obj


def build_sticker(size=0.82, radius=0.11, thick=0.014, corner_segs=8, rim=True):
    me = bpy.data.meshes.new("CubieSticker")
    bm = bmesh.new()
    h = size / 2
    c = h - radius
    pts = []
    for cx, cy, a0 in ((c, c, 0), (-c, c, 90), (-c, -c, 180), (c, -c, 270)):
        for i in range(corner_segs + 1):
            a = math.radians(a0 + i * 90 / corner_segs)
            pts.append((cx + radius * math.cos(a), cy + radius * math.sin(a)))
    vs = [bm.verts.new((x, y, 0)) for x, y in pts]
    bm.faces.new(vs)
    # extrude to give the tile thickness
    ext = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
    top = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=top, vec=(0, 0, thick))
    # soften the top rim so it catches a highlight
    top_set = set(top)
    rim_edges = [e for e in bm.edges if all(v in top_set for v in e.verts) and len(e.link_faces) == 2
           and any(abs(fc.normal.z) < 0.5 for fc in e.link_faces)]
    if rim:
        bmesh.ops.bevel(bm, geom=rim_edges, offset=thick * 0.55, segments=2, affect="EDGES", clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # sit on the +Z face of the body
    bmesh.ops.translate(bm, verts=bm.verts[:], vec=(0, 0, 0.5 - 0.004))
    bm.to_mesh(me)
    bm.free()
    obj = link(bpy.data.objects.new("CubieSticker", me))
    shade_smooth(obj)
    # flat shading for the cap so the face stays crisp; smooth the rim
    for p in obj.data.polygons:
        p.use_smooth = abs(p.normal.z) < 0.999
    obj.data.materials.append(mat("Sticker", (1, 1, 1), rough=0.22, coat=0.6))
    return obj


# ------------------------------------------------------------------ trophy
def build_trophy():
    # profile (radius, height) revolved around Z
    prof = [(0.0, 0.0), (0.42, 0.0), (0.42, 0.08), (0.36, 0.1), (0.36, 0.22), (0.30, 0.24),
            (0.12, 0.28), (0.08, 0.36), (0.07, 0.62), (0.10, 0.70), (0.16, 0.76),
            (0.30, 0.86), (0.40, 1.02), (0.45, 1.25), (0.47, 1.42), (0.44, 1.42),
            (0.42, 1.26), (0.37, 1.05), (0.0, 1.05)]
    me = bpy.data.meshes.new("Trophy")
    bm = bmesh.new()
    verts = [bm.verts.new((r, 0, z)) for r, z in prof]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1),
                   angle=math.tau, steps=48, use_duplicate=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    cup = link(bpy.data.objects.new("Trophy", me))
    shade_smooth(cup)
    gold = mat("Gold", (1.0, 0.72, 0.28), rough=0.18, metal=1.0)
    cup.data.materials.append(gold)
    # handles: torus halves
    parts = [cup]
    for side in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.2, minor_radius=0.035,
                                         major_segments=32, minor_segments=12,
                                         location=(side * 0.5, 0, 1.12),
                                         rotation=(math.pi / 2, 0, 0))
        h = bpy.context.active_object
        h.name = f"TrophyHandle{side}"
        shade_smooth(h)
        h.data.materials.append(gold)
        parts.append(h)
    # walnut base block
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.12))
    base = bpy.context.active_object
    base.name = "TrophyBase"
    base.scale = (0.95, 0.95, 0.24)
    bpy.ops.object.transform_apply(scale=True)
    bev = base.modifiers.new("b", "BEVEL"); bev.width = 0.03; bev.segments = 3
    apply_all(base)
    base.data.materials.append(mat("Walnut", (0.13, 0.07, 0.035), rough=0.45, coat=0.4))
    parts.append(base)
    return parts


# ------------------------------------------------------------------ clover plant
def heart_leaf(name, angle, material, tilt=0.35):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    pts = []
    n = 40
    for i in range(n):
        t = math.tau * i / n
        # heart curve, pointing +Y (tip at origin)
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 34.0, (-y + 17) / 34.0))
    vs = [bm.verts.new((x, y, 0)) for x, y in pts]
    f = bm.faces.new(vs)
    bmesh.ops.triangulate(bm, faces=[f])
    # cup the leaf a bit
    for v in bm.verts:
        v.co.z = -0.18 * (v.co.x ** 2) + 0.12 * v.co.y
    ext = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
    bmesh.ops.translate(bm, verts=[e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)], vec=(0, 0, 0.012))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    obj = link(bpy.data.objects.new(name, me))
    shade_smooth(obj)
    obj.data.materials.append(material)
    obj.rotation_euler = (tilt, 0, angle)
    return obj


def build_plant():
    parts = []
    # terracotta-white ceramic pot (lathe)
    prof = [(0, 0), (0.3, 0), (0.32, 0.02), (0.38, 0.5), (0.42, 0.52), (0.42, 0.58),
            (0.38, 0.58), (0.35, 0.52), (0, 0.52)]
    me = bpy.data.meshes.new("Pot"); bm = bmesh.new()
    verts = [bm.verts.new((r, 0, z)) for r, z in prof]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1), angle=math.tau, steps=40)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    pot = link(bpy.data.objects.new("Pot", me)); shade_smooth(pot)
    pot.data.materials.append(mat("Ceramic", (0.92, 0.9, 0.86), rough=0.35, coat=0.5))
    parts.append(pot)
    leaf_mats = [mat("Clover", (0.06, 0.42, 0.16), rough=0.5), mat("CloverLight", (0.12, 0.55, 0.22), rough=0.5)]
    stem_mat = mat("Stem", (0.12, 0.35, 0.1), rough=0.6)
    import random
    random.seed(4)
    stems = [((0, 0), 0.95, 4), ((0.14, 0.08), 0.75, 3), ((-0.15, 0.05), 0.82, 3),
             ((0.03, -0.16), 0.7, 3), ((-0.06, 0.15), 0.62, 3), ((0.17, -0.1), 0.58, 3)]
    for si, ((sx, sy), height, count) in enumerate(stems):
        top = Vector((sx * 1.4, sy * 1.4, 0.5 + height))
        curve = bpy.data.curves.new(f"StemC{si}", "CURVE"); curve.dimensions = "3D"
        curve.bevel_depth = 0.012; curve.bevel_resolution = 2
        sp = curve.splines.new("BEZIER"); sp.bezier_points.add(1)
        a, b = sp.bezier_points
        a.co = (sx, sy, 0.5); b.co = top
        a.handle_left = a.handle_right = (sx, sy, 0.5 + height * 0.5)
        b.handle_left = b.handle_right = top - Vector((0, 0, height * 0.3))
        st = link(bpy.data.objects.new(f"Stem{si}", curve))
        st.data.materials.append(stem_mat)
        bpy.context.view_layer.objects.active = st
        st.select_set(True); bpy.ops.object.convert(target="MESH"); st.select_set(False)
        parts.append(st)
        spin = random.random() * math.tau
        for li in range(count):
            leaf = heart_leaf(f"Leaf{si}_{li}", spin + li * math.tau / count, leaf_mats[(si + li) % 2])
            s = 0.32 if count == 4 else 0.26
            leaf.scale = (s, s, s)
            leaf.location = top
            parts.append(leaf)
    # soil
    bpy.ops.mesh.primitive_cylinder_add(radius=0.355, depth=0.02, location=(0, 0, 0.5), vertices=40)
    soil = bpy.context.active_object; soil.name = "Soil"
    soil.data.materials.append(mat("Soil", (0.06, 0.04, 0.03), rough=0.95))
    parts.append(soil)
    return parts


# ------------------------------------------------------------------ build + export
reset()
body = build_body()
sticker = build_sticker()
export([body, sticker], os.path.join(OUT, "cubie.glb"))

# low-poly variant for the showroom shelves
reset()
export([build_body(2), build_sticker(corner_segs=3, rim=False)], os.path.join(OUT, "cubie_lo.glb"))

reset()
export(build_trophy(), os.path.join(OUT, "trophy.glb"))

reset()
export(build_plant(), os.path.join(OUT, "plant.glb"))

stats = {}
for fn in ("cubie.glb", "cubie_lo.glb", "trophy.glb", "plant.glb"):
    stats[fn] = os.path.getsize(os.path.join(OUT, fn))
print("EXPORTED", stats)

# ------------------------------------------------------------------ preview render
if RENDER:
    reset()
    scn = bpy.context.scene
    body = build_body(); sticker = build_sticker()
    COLORS = {(0, 0, 1): (0.95, 0.95, 0.95), (0, 0, -1): (1.0, 0.82, 0.0),
              (1, 0, 0): (0.8, 0.03, 0.05), (-1, 0, 0): (1.0, 0.33, 0.0),
              (0, 1, 0): (0.0, 0.62, 0.27), (0, -1, 0): (0.0, 0.27, 0.8)}
    smats = {k: mat(f"S{k}", c, rough=0.22, coat=0.6) for k, c in COLORS.items()}
    gap = 1.02
    for x in (-1, 0, 1):
        for y in (-1, 0, 1):
            for z in (-1, 0, 1):
                b = body.copy(); b.location = (x * gap, y * gap, z * gap); link(b)
                for n, m in smats.items():
                    if (n[0] and n[0] == x) or (n[1] and n[1] == y) or (n[2] and n[2] == z):
                        s = sticker.copy(); s.data = sticker.data.copy()
                        s.data.materials[0] = m
                        rot = Vector((0, 0, 1)).rotation_difference(Vector(n)).to_matrix().to_4x4()
                        s.matrix_world = Matrix.Translation((x * gap, y * gap, z * gap)) @ rot
                        link(s)
    bpy.data.objects.remove(body); bpy.data.objects.remove(sticker)
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -1.55))
    floor = bpy.context.active_object
    floor.data.materials.append(mat("Floor", (0.85, 0.9, 0.86), rough=0.6))
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); link(cam)
    cam.location = (6.5, -6.5, 5.2)
    cam.rotation_euler = (math.radians(62), 0, math.radians(45))
    cam.data.lens = 70
    scn.camera = cam
    key = bpy.data.objects.new("Key", bpy.data.lights.new("Key", "AREA")); link(key)
    key.data.energy = 900; key.data.size = 4
    key.location = (4, -2, 7); key.rotation_euler = (math.radians(30), math.radians(25), 0)
    rim = bpy.data.objects.new("Rim", bpy.data.lights.new("Rim", "AREA")); link(rim)
    rim.data.energy = 500; rim.data.size = 3; rim.location = (-5, 4, 4)
    rim.rotation_euler = (math.radians(-50), math.radians(-35), 0)
    world = bpy.data.worlds.new("W"); scn.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.82, 0.78, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    scn.render.engine = "CYCLES"
    scn.cycles.samples = 48
    scn.view_settings.view_transform = "Standard"
    scn.cycles.use_denoising = True
    scn.render.resolution_x = 900; scn.render.resolution_y = 700
    scn.render.filepath = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "preview.png"))
    bpy.ops.render.render(write_still=True)
    print("RENDERED", scn.render.filepath)
