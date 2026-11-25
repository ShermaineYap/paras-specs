/**
 * WaterlineRoomDetails — regular, repeated detail on the stand-in room (not semantic objects):
 * the patterned floor tiles (two-tone tiles, small diamond inlays, joints), rain streaks running
 * down outside the window, and the slow turn of the authored ceiling fan blades.
 *
 * Owns: the generated tiles, joints and rain streaks; the fan's spin. Expects: the authored Floor,
 * WindowGlass and (optional) fan blades objects. Must not: create furniture, belongings or
 * anything the flow depends on.
 * Child names start with "NC_" so the water's contact line ignores them.
 */
import {makeMeshChild, tintedMaterial} from "./WaterlineGeometry"

@component
export class WaterlineRoomDetails extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineRoomDetails – tile joints + window rain</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Authored floor (its scale is the floor size)")
  floor!: SceneObject
  @input
  @hint("Authored window glass (its scale is the opening size)")
  windowGlass!: SceneObject
  @input
  @hint("Ceiling fan blades root (spins slowly); optional")
  fanBlades!: SceneObject
  @input
  @hint("1 cm unit box mesh")
  boxMesh!: RenderMesh
  @input
  @hint("Unlit base material for joints and rain")
  glowMaterial!: Material
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Floor tile size (cm)")
  @widget(new SliderWidget(20, 100, 5))
  tileSizeCm: number = 60
  @input("vec4", "{0.99, 0.87, 0.78, 1.0}")
  @hint("Every other floor tile (light terracotta)")
  @widget(new ColorWidget())
  tileAccentColor: vec4 = new vec4(0.99, 0.87, 0.78, 1.0)
  @input("vec4", "{0.74, 0.88, 0.92, 1.0}")
  @hint("Small diamond inlay where four tiles meet (light teal)")
  @widget(new ColorWidget())
  inlayColor: vec4 = new vec4(0.74, 0.88, 0.92, 1.0)
  @input
  @hint("Ceiling fan speed (turns per second)")
  @widget(new SliderWidget(0, 2, 0.05))
  fanTurnsPerSecond: number = 0.35
  @input
  @hint("Rain streaks visible through the window")
  @widget(new SliderWidget(0, 80, 1))
  rainStreaks: number = 34
  @input
  @hint("Rain fall speed (cm/s)")
  @widget(new SliderWidget(50, 600, 10))
  rainSpeed: number = 260
  @ui.group_end

  private streaks: {so: SceneObject; x: number; y: number; len: number; v: number}[] = []
  private winW = 0
  private winH = 0
  private fanAngle = 0

  onAwake() {
    this.buildTileJoints()
    this.buildRain()
    this.createEvent("UpdateEvent").bind(() => {
      this.updateRain()
      if (this.fanBlades) {
        this.fanAngle += getDeltaTime() * this.fanTurnsPerSecond * Math.PI * 2
        this.fanBlades.getTransform().setLocalRotation(quat.angleAxis(this.fanAngle, vec3.up()))
      }
    })
  }

  private buildTileJoints(): void {
    const ft = this.floor.getTransform()
    const size = ft.getWorldScale()
    const c = ft.getWorldPosition()
    const topY = c.y + size.y / 2 + 0.05
    const mat = tintedMaterial(this.glowMaterial, new vec4(0.86, 0.82, 0.74, 1), false)
    const root = global.scene.createSceneObject("NC_TileJoints")
    root.setParent(this.getSceneObject())
    // lit tile tints: clones of the floor's own material, so they shade like the floor
    const floorMat = (this.floor.getComponent("Component.RenderMeshVisual") as RenderMeshVisual).mainMaterial
    const accent = floorMat.clone()
    accent.mainPass.baseColor = this.tileAccentColor
    const inlay = floorMat.clone()
    inlay.mainPass.baseColor = this.inlayColor
    const ts = this.tileSizeCm
    const x0 = c.x - size.x / 2, z0 = c.z - size.z / 2
    const nxT = Math.floor(size.x / ts), nzT = Math.floor(size.z / ts)
    for (let i = 0; i < nxT; i++) {
      for (let j = 0; j < nzT; j++) {
        if ((i + j) % 2 === 1) {
          const so = makeMeshChild(root, "NC_Tile", vec3.zero(), vec3.one(), this.boxMesh, accent)
          so.getTransform().setWorldPosition(new vec3(x0 + (i + 0.5) * ts, topY - 0.02, z0 + (j + 0.5) * ts))
          so.getTransform().setWorldScale(new vec3(ts - 0.4, 0.06, ts - 0.4))
        }
        if (i > 0 && j > 0) {
          const d = makeMeshChild(root, "NC_Inlay", vec3.zero(), vec3.one(), this.boxMesh, inlay)
          d.getTransform().setWorldPosition(new vec3(x0 + i * ts, topY + 0.02, z0 + j * ts))
          d.getTransform().setWorldRotation(quat.angleAxis(Math.PI / 4, vec3.up()))
          d.getTransform().setWorldScale(new vec3(ts * 0.2, 0.08, ts * 0.2))
        }
      }
    }
    for (let x = c.x - size.x / 2 + this.tileSizeCm; x < c.x + size.x / 2; x += this.tileSizeCm) {
      const so = makeMeshChild(root, "NC_JointX", vec3.zero(), vec3.one(), this.boxMesh, mat)
      so.getTransform().setWorldPosition(new vec3(x, topY, c.z))
      so.getTransform().setWorldScale(new vec3(0.5, 0.1, size.z))
    }
    for (let z = c.z - size.z / 2 + this.tileSizeCm; z < c.z + size.z / 2; z += this.tileSizeCm) {
      const so = makeMeshChild(root, "NC_JointZ", vec3.zero(), vec3.one(), this.boxMesh, mat)
      so.getTransform().setWorldPosition(new vec3(c.x, topY, z))
      so.getTransform().setWorldScale(new vec3(size.x, 0.1, 0.5))
    }
  }

  private buildRain(): void {
    const s = this.windowGlass.getTransform().getWorldScale()
    this.winW = s.x
    this.winH = s.y
    const mat = tintedMaterial(this.glowMaterial, new vec4(0.95, 0.99, 1.0, 0.85))
    const root = global.scene.createSceneObject("NC_WindowRain")
    root.setParent(this.windowGlass.getParent())
    const gp = this.windowGlass.getTransform().getLocalPosition()
    root.getTransform().setLocalPosition(new vec3(gp.x, gp.y, gp.z - 0.6))
    for (let i = 0; i < this.rainStreaks; i++) {
      const len = 5 + Math.random() * 9
      const so = makeMeshChild(root, "NC_Streak", vec3.zero(), new vec3(0.22, len, 0.1), this.boxMesh, mat)
      this.streaks.push({
        so,
        x: (Math.random() - 0.5) * (this.winW - 4),
        y: (Math.random() - 0.5) * this.winH,
        len,
        v: this.rainSpeed * (0.75 + Math.random() * 0.5),
      })
    }
  }

  private updateRain(): void {
    const dt = getDeltaTime()
    const half = this.winH / 2
    for (const r of this.streaks) {
      r.y -= r.v * dt
      if (r.y < -half + r.len / 2) {
        r.y = half - r.len / 2
        r.x = (Math.random() - 0.5) * (this.winW - 4)
      }
      r.so.getTransform().setLocalPosition(new vec3(r.x, r.y, 0))
    }
  }
}
