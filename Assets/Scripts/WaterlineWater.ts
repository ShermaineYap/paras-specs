/**
 * WaterlineWater — the water itself.
 *
 * Owns: the water level (cm above the floor) and its rise/drain animation, the rippling
 * see-through surface mesh, the bright contact line where the surface meets walls / furniture
 * / belongings, the rain-drop ripple rings, and the ambient sound at the surface (rain + low
 * rush, crossfading to a muffled loop while the viewer's eyes are under).
 * Expects: authored on the "Water" SceneObject whose world Y is the floor; `contactRoots`
 * are the room / belongings roots whose meshes get a contact line.
 * Must not: decide levels, track the user's body, or touch UI.
 */
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {buildAnnulusMesh, makeMeshChild, setAlpha, tintedMaterial} from "./WaterlineGeometry"
import {easeInOut} from "./WaterlineState"

interface Solid {
  rmv: RenderMeshVisual
  bars: SceneObject[] | null
}

interface Ripple {
  so: SceneObject
  mat: Material
  age: number
  life: number
  maxR: number
}

@component
export class WaterlineWater extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineWater – surface, contact line, rain, surface sound</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Lit material for the surface (cloned; made transparent at runtime)")
  surfaceMaterial!: Material
  @input
  @hint("Unlit base material cloned for the contact line and ripple rings")
  glowMaterial!: Material
  @input
  @hint("1 cm unit box mesh (contact-line bars)")
  boxMesh!: RenderMesh
  @input
  @hint("Stand-in room root — its meshes get a contact line where the water meets them")
  roomRoot!: SceneObject
  @input
  @hint("Belongings root — its meshes get a contact line too")
  belongingsRoot!: SceneObject
  @input
  @hint("Rain loop played at the surface")
  rainTrack!: AudioTrackAsset
  @input
  @hint("Low rushing-water loop played at the surface")
  rushTrack!: AudioTrackAsset
  @input
  @hint("Muffled loop heard while the eyes are under the surface")
  underwaterTrack!: AudioTrackAsset
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input("vec4", "{0.62, 0.93, 1.0, 0.34}")
  @hint("Surface colour and see-through amount (alpha). Keep it pale: black shows as transparent.")
  @widget(new ColorWidget())
  waterColor: vec4 = new vec4(0.62, 0.93, 1.0, 0.34)
  @input("vec4", "{0.9, 1.0, 1.0, 0.95}")
  @hint("Bright line where the water meets walls and furniture")
  @widget(new ColorWidget())
  contactLineColor: vec4 = new vec4(0.9, 1.0, 1.0, 0.95)
  @input
  @hint("Ripple height (cm)")
  @widget(new SliderWidget(0, 2, 0.05))
  rippleAmplitudeCm: number = 0.45
  @input
  @hint("Ripple speed multiplier (1 = slow, calm swell)")
  @widget(new SliderWidget(0.1, 3, 0.1))
  rippleSpeed: number = 1.0
  @input
  @hint("Rain-drop rings on the surface at once")
  @widget(new SliderWidget(0, 40, 1))
  rainRingCount: number = 22
  @input
  @hint("Surface sound volume (rain + rush)")
  @widget(new SliderWidget(0, 1, 0.05))
  ambienceVolume: number = 0.7
  @ui.group_end

  // Room interior the sheet spans (local XZ, cm) — matches the authored stand-in room walls.
  private readonly minX = -202
  private readonly maxX = 172
  private readonly minZ = -205
  private readonly maxZ = 132
  private readonly nx = 46
  private readonly nz = 42

  private levelCm = 0
  private fromCm = 0
  private toCm = 0
  private animT = 1
  private animDur = 1
  private rainOn = false
  private underwater = false
  private time = 0

  private surface!: SceneObject
  private mb!: MeshBuilder
  private surfaceMat!: Material
  private contactMat!: Material
  private solids: Solid[] = []
  private ripples: Ripple[] = []
  private ringMesh!: RenderMesh

  private audioRoot!: SceneObject
  private rain!: AudioComponent
  private rush!: AudioComponent
  private muffled!: AudioComponent
  private mixUnder = 0 // 0 = open air, 1 = fully muffled
  private ambienceGain = 0

  onAwake() {
    this.surfaceMat = this.surfaceMaterial.clone()
    this.surfaceMat.mainPass.baseColor = this.waterColor
    this.surfaceMat.mainPass.blendMode = BlendMode.Normal
    this.surfaceMat.mainPass.depthWrite = false
    this.surfaceMat.mainPass.twoSided = true
    ;(this.surfaceMat.mainPass as any).roughness = 0.12
    ;(this.surfaceMat.mainPass as any).metallic = 0.0

    this.contactMat = tintedMaterial(this.glowMaterial, this.contactLineColor)
    this.ringMesh = buildAnnulusMesh(0.9, 40)

    this.surface = global.scene.createSceneObject("WaterSurface")
    this.surface.setParent(this.getSceneObject())
    this.buildSurfaceMesh()

    for (let i = 0; i < this.rainRingCount; i++) {
      const so = global.scene.createSceneObject(`RainRing${i}`)
      so.setParent(this.surface)
      const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      rmv.mesh = this.ringMesh
      const mat = tintedMaterial(this.glowMaterial, new vec4(0.92, 1, 1, 0))
      rmv.mainMaterial = mat
      so.enabled = false
      this.ripples.push({so, mat, age: 0, life: 1, maxR: 8})
    }

    this.audioRoot = global.scene.createSceneObject("SurfaceAudio")
    this.audioRoot.setParent(this.getSceneObject())
    this.rain = this.makeLoop(this.rainTrack)
    this.rush = this.makeLoop(this.rushTrack)
    this.muffled = this.makeLoop(this.underwaterTrack)

    this.surface.enabled = false
    this.createEvent("OnStartEvent").bind(() => this.collectSolids())
    this.createEvent("UpdateEvent").bind(() => this.update())
  }

  // ---------------- public API ----------------

  /** Animate the level from where it is now to `cm` over `seconds`. */
  animateTo(cm: number, seconds: number): void {
    this.fromCm = this.levelCm
    this.toCm = cm
    this.animT = 0
    this.animDur = Math.max(0.01, seconds)
    if (cm > 0.5) this.surface.enabled = true
  }

  getLevelCm(): number { return this.levelCm }

  /** World Y of the surface (floor + level). */
  getSurfaceWorldY(): number {
    return this.getSceneObject().getTransform().getWorldPosition().y + this.levelCm
  }

  isUp(): boolean { return this.surface.enabled && this.levelCm > 0.5 }

  isAnimating(): boolean { return this.animT < 1 }

  /** Rain + rush at the surface; fades in/out. */
  setRain(on: boolean): void {
    this.rainOn = on
    if (on) {
      for (const a of [this.rain, this.rush, this.muffled]) {
        if (!a.isPlaying()) a.play(-1)
      }
    }
  }

  setUnderwater(on: boolean): void { this.underwater = on }

  isMuffled(): boolean { return this.mixUnder > 0.5 && this.muffled.isPlaying() && this.muffled.volume > 0.05 }

  /** Re-read furniture / belongings footprints (e.g. after the room is re-anchored). */
  collectSolids(): void {
    for (const s of this.solids) if (s.bars) for (const b of s.bars) b.destroy()
    this.solids = []
    for (const root of [this.roomRoot, this.belongingsRoot]) this.walk(root)
  }

  // ---------------- internals ----------------

  private makeLoop(track: AudioTrackAsset): AudioComponent {
    const a = this.audioRoot.createComponent("Component.AudioComponent") as AudioComponent
    a.audioTrack = track
    a.volume = 0
    try {
      a.spatialAudio.enabled = true
    } catch (e) {
      // spatial audio unavailable — plays non-spatially
    }
    return a
  }

  private walk(so: SceneObject): void {
    const n = so.name
    if (n === "Outline" || n === "TaggedTick" || n.indexOf("NC_") === 0) return
    const rmv = so.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (rmv) this.solids.push({rmv, bars: null})
    for (let i = 0; i < so.getChildrenCount(); i++) this.walk(so.getChild(i))
  }

  private buildSurfaceMesh(): void {
    this.mb = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3},
      {name: "texture0", components: 2},
    ])
    this.mb.topology = MeshTopology.Triangles
    this.mb.indexType = MeshIndexType.UInt16
    for (let j = 0; j <= this.nz; j++) {
      for (let i = 0; i <= this.nx; i++) {
        const x = this.minX + ((this.maxX - this.minX) * i) / this.nx
        const z = this.minZ + ((this.maxZ - this.minZ) * j) / this.nz
        this.mb.appendVerticesInterleaved([x, 0, z, 0, 1, 0, i / this.nx, j / this.nz])
      }
    }
    const row = this.nx + 1
    for (let j = 0; j < this.nz; j++) {
      for (let i = 0; i < this.nx; i++) {
        const a = j * row + i, b = a + 1, c = a + row, d = c + 1
        this.mb.appendIndices([a, c, b, b, c, d])
      }
    }
    this.mb.updateMesh()
    const rmv = this.surface.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = this.mb.getMesh()
    rmv.mainMaterial = this.surfaceMat
  }

  private updateSurfaceMesh(): void {
    const A = this.rippleAmplitudeCm
    const t = this.time * this.rippleSpeed
    const row = this.nx + 1
    for (let j = 0; j <= this.nz; j++) {
      const z = this.minZ + ((this.maxZ - this.minZ) * j) / this.nz
      for (let i = 0; i <= this.nx; i++) {
        const x = this.minX + ((this.maxX - this.minX) * i) / this.nx
        // three slow crossing swells
        const p1 = 0.045 * x + 0.55 * t
        const p2 = 0.058 * z - 0.42 * t
        const p3 = 0.032 * (x + z) + 0.7 * t
        const h = A * (Math.sin(p1) + 0.7 * Math.sin(p2) + 0.5 * Math.sin(p3)) / 2.2
        const dx = A * (0.045 * Math.cos(p1) + 0.5 * 0.032 * Math.cos(p3)) / 2.2
        const dz = A * (0.7 * 0.058 * Math.cos(p2) + 0.5 * 0.032 * Math.cos(p3)) / 2.2
        const nl = Math.sqrt(dx * dx + 1 + dz * dz)
        this.mb.setVertexInterleaved(j * row + i, [x, h, z, -dx / nl, 1 / nl, -dz / nl, i / this.nx, j / this.nz])
      }
    }
    this.mb.updateMesh()
  }

  private updateContactLines(surfaceY: number, show: boolean): void {
    for (const s of this.solids) {
      if (isNull(s.rmv) || !s.rmv.getSceneObject().isEnabledInHierarchy) {
        if (s.bars) for (const b of s.bars) b.enabled = false
        continue
      }
      const mn = s.rmv.worldAabbMin()
      const mx = s.rmv.worldAabbMax()
      const crosses = show && mn.y < surfaceY - 0.2 && mx.y > surfaceY + 0.2 && mx.y - mn.y > 1.5
      if (!crosses) {
        if (s.bars) for (const b of s.bars) b.enabled = false
        continue
      }
      if (!s.bars) {
        s.bars = []
        for (let k = 0; k < 4; k++) {
          s.bars.push(makeMeshChild(this.getSceneObject(), "ContactBar", vec3.zero(), vec3.one(), this.boxMesh, this.contactMat))
        }
      }
      const pad = 0.35, th = 0.55, hh = 0.4
      const cx = (mn.x + mx.x) / 2, cz = (mn.z + mx.z) / 2
      const w = mx.x - mn.x + 2 * pad, d = mx.z - mn.z + 2 * pad
      const y = surfaceY + 0.12
      const place = (b: SceneObject, p: vec3, sz: vec3) => {
        b.enabled = true
        b.getTransform().setWorldPosition(p)
        b.getTransform().setWorldRotation(quat.quatIdentity())
        b.getTransform().setWorldScale(sz)
      }
      place(s.bars[0], new vec3(cx, y, mn.z - pad), new vec3(w + th, hh, th))
      place(s.bars[1], new vec3(cx, y, mx.z + pad), new vec3(w + th, hh, th))
      place(s.bars[2], new vec3(mn.x - pad, y, cz), new vec3(th, hh, d + th))
      place(s.bars[3], new vec3(mx.x + pad, y, cz), new vec3(th, hh, d + th))
    }
  }

  private updateRipples(dt: number, camPos: vec3): void {
    const rootPos = this.surface.getTransform().getWorldPosition()
    for (const r of this.ripples) {
      if (!r.so.enabled) {
        if (!this.rainOn || !this.isUp() || Math.random() > dt * 2.2) continue
        // respawn a drop somewhere around the viewer, inside the room
        const ang = Math.random() * Math.PI * 2
        const dist = 70 + Math.random() * 160
        let x = camPos.x + Math.cos(ang) * dist - rootPos.x
        let z = camPos.z + Math.sin(ang) * dist - rootPos.z
        x = Math.min(this.maxX - 5, Math.max(this.minX + 5, x))
        z = Math.min(this.maxZ - 5, Math.max(this.minZ + 5, z))
        r.so.getTransform().setLocalPosition(new vec3(x, 0.25, z))
        r.age = 0
        r.life = 1.3 + Math.random() * 0.9
        r.maxR = 4 + Math.random() * 6
        r.so.enabled = true
      }
      r.age += dt
      const k = r.age / r.life
      if (k >= 1) {
        r.so.enabled = false
        continue
      }
      const rad = 0.8 + (r.maxR - 0.8) * Math.sqrt(k)
      r.so.getTransform().setLocalScale(new vec3(rad, 1, rad))
      setAlpha(r.mat, 0.55 * (1 - k) * (1 - k))
    }
  }

  private update(): void {
    const dt = getDeltaTime()
    this.time += dt

    if (this.animT < 1) {
      this.animT = Math.min(1, this.animT + dt / this.animDur)
      this.levelCm = this.fromCm + (this.toCm - this.fromCm) * easeInOut(this.animT)
      if (this.animT >= 1 && this.toCm <= 0.5) {
        this.levelCm = 0
        this.surface.enabled = false
      }
    }

    const up = this.isUp()
    this.surface.getTransform().setLocalPosition(new vec3(0, this.levelCm, 0))
    if (up) this.updateSurfaceMesh()
    const surfaceY = this.getSurfaceWorldY()
    this.updateContactLines(surfaceY, up)

    const cam = WorldCameraFinderProvider.getInstance().getComponent().getTransform().getWorldPosition()
    this.updateRipples(dt, cam)

    // Sound sits on the surface directly under the viewer.
    this.audioRoot.getTransform().setWorldPosition(new vec3(cam.x, surfaceY, cam.z))
    const targetGain = this.rainOn && up ? 1 : 0
    this.ambienceGain += (targetGain - this.ambienceGain) * Math.min(1, dt * 1.5)
    const targetUnder = this.underwater ? 1 : 0
    // fast crossfade: the switch must land within 0.3 s of the eyes crossing the surface
    this.mixUnder += (targetUnder - this.mixUnder) * Math.min(1, dt * 25)
    const g = this.ambienceGain * this.ambienceVolume
    this.rain.volume = g * (1 - this.mixUnder)
    this.rush.volume = g * 0.8 * (1 - this.mixUnder)
    this.muffled.volume = g * this.mixUnder
    if (!this.rainOn && this.ambienceGain < 0.01) {
      for (const a of [this.rain, this.rush, this.muffled]) if (a.isPlaying()) a.stop(false)
    }
  }
}
