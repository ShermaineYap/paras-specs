/**
 * WaterlineGeometry — small runtime geometry + material helpers shared by the Waterline
 * controllers. Used only for transient / regular / high-cardinality pieces (outline edges,
 * dotted-line dots, ripple rings, contact lines). Semantic objects are authored in the scene.
 * Must not: hold state or create semantic roots.
 */

/** Clone a base material and tint it. `transparent` switches to normal alpha blending. */
export function tintedMaterial(base: Material, color: vec4, transparent: boolean = true): Material {
  const m = base.clone()
  m.mainPass.baseColor = color
  m.mainPass.twoSided = true
  if (transparent) {
    m.mainPass.blendMode = BlendMode.Normal
    m.mainPass.depthWrite = false
  }
  return m
}

export function setAlpha(mat: Material, alpha: number): void {
  const c = mat.mainPass.baseColor as vec4
  mat.mainPass.baseColor = new vec4(c.x, c.y, c.z, alpha)
}

export function setRgb(mat: Material, rgb: vec3): void {
  const c = mat.mainPass.baseColor as vec4
  mat.mainPass.baseColor = new vec4(rgb.x, rgb.y, rgb.z, c.w)
}

/** Create a child SceneObject with a scaled unit mesh. The unit mesh is 1 cm on every axis. */
export function makeMeshChild(
  parent: SceneObject,
  name: string,
  localPos: vec3,
  sizeCm: vec3,
  mesh: RenderMesh,
  mat: Material,
): SceneObject {
  const so = global.scene.createSceneObject(name)
  so.setParent(parent)
  const t = so.getTransform()
  t.setLocalPosition(localPos)
  t.setLocalScale(sizeCm)
  const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
  rmv.mesh = mesh
  rmv.mainMaterial = mat
  return so
}

/**
 * 12 thin edge bars around a box of `sizeCm`, centered on the parent's origin.
 * All bars share `mat`, so one material write recolors / fades the whole outline.
 */
export function buildOutline(parent: SceneObject, sizeCm: vec3, thicknessCm: number, mesh: RenderMesh, mat: Material): SceneObject {
  const root = global.scene.createSceneObject("Outline")
  root.setParent(parent)
  const hx = sizeCm.x / 2, hy = sizeCm.y / 2, hz = sizeCm.z / 2
  const th = thicknessCm
  let i = 0
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      makeMeshChild(root, `EdgeX${i++}`, new vec3(0, sy * hy, sz * hz), new vec3(sizeCm.x + th, th, th), mesh, mat)
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      makeMeshChild(root, `EdgeY${i++}`, new vec3(sx * hx, 0, sz * hz), new vec3(th, sizeCm.y + th, th), mesh, mat)
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      makeMeshChild(root, `EdgeZ${i++}`, new vec3(sx * hx, sy * hy, 0), new vec3(th, th, sizeCm.z + th), mesh, mat)
    }
  }
  return root
}

/** Flat annulus in the XZ plane (normal +Y), radius 1 = outer edge. */
export function buildAnnulusMesh(innerRatio: number, segments: number = 48): RenderMesh {
  const mb = new MeshBuilder([
    {name: "position", components: 3},
    {name: "normal", components: 3},
    {name: "texture0", components: 2},
  ])
  mb.topology = MeshTopology.Triangles
  mb.indexType = MeshIndexType.UInt16
  for (let s = 0; s <= segments; s++) {
    const a = (s / segments) * Math.PI * 2
    const c = Math.cos(a), sn = Math.sin(a)
    mb.appendVerticesInterleaved([c * innerRatio, 0, sn * innerRatio, 0, 1, 0, s / segments, 0])
    mb.appendVerticesInterleaved([c, 0, sn, 0, 1, 0, s / segments, 1])
  }
  for (let s = 0; s < segments; s++) {
    const i0 = s * 2, i1 = s * 2 + 1, i2 = s * 2 + 2, i3 = s * 2 + 3
    mb.appendIndices([i0, i2, i1, i1, i2, i3])
  }
  mb.updateMesh()
  return mb.getMesh()
}

/** Flat triangle chevron in the XY plane pointing +X, unit size. Used for the edge arrow. */
export function buildChevronMesh(): RenderMesh {
  const mb = new MeshBuilder([
    {name: "position", components: 3},
    {name: "normal", components: 3},
  ])
  mb.topology = MeshTopology.Triangles
  mb.indexType = MeshIndexType.UInt16
  // arrow head (triangle) + stem (quad)
  const v = [
    [0.5, 0, 0], [-0.1, 0.45, 0], [-0.1, -0.45, 0],
    [-0.1, 0.16, 0], [-0.5, 0.16, 0], [-0.5, -0.16, 0], [-0.1, -0.16, 0],
  ]
  for (const p of v) mb.appendVerticesInterleaved([p[0], p[1], p[2], 0, 0, 1])
  mb.appendIndices([0, 1, 2, 3, 4, 5, 3, 5, 6])
  mb.updateMesh()
  return mb.getMesh()
}
