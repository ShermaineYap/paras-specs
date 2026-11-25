/**
 * WaterlineBody — answers the user's body every frame.
 *
 * Owns: the ring on the surface under the head, the live depth-tag text and its show/hide
 * rule (looking roughly level, not carrying), the underwater tint and the muffled-sound switch,
 * and moving the HUD with the head (yaw only).
 * Expects: `water` (level + floor), `hud` (passive view), the authored `underwaterTint` under the
 * Camera, and `ringMaterial` (unlit base). WaterlineMain tells it when an item is being carried.
 * Must not: change the water level or the run state.
 */
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {WaterlineWater} from "./WaterlineWater"
import {WaterlineHudUI} from "./WaterlineHudUI"
import {WaterlineGuidance} from "./WaterlineGuidance"
import {buildAnnulusMesh, buildDiscMesh, tintedMaterial} from "./WaterlineGeometry"
import {bodyReading, BodyReading, depthTagText, DEFAULT_LANDMARKS} from "./WaterlineState"

@component
export class WaterlineBody extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineBody – ring, depth tag, underwater</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("The water (level + floor height)")
  water!: WaterlineWater
  @input
  @hint("HUD module that shows the depth tag")
  hud!: WaterlineHudUI
  @input
  @hint("Guidance (dotted line + pin) — the depth tag steps aside so it never covers them")
  guidance!: WaterlineGuidance
  @input
  @hint("Authored cool tint in front of the camera, shown while the eyes are under")
  underwaterTint!: SceneObject
  @input
  @hint("Unlit base material for the ring")
  ringMaterial!: Material
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Ring outer radius on the surface (cm)")
  @widget(new SliderWidget(4, 60, 1))
  ringRadiusCm: number = 32
  @input
  @hint("Ring radius as a share of the eye-to-surface distance (so it is visible when looking down, and never a band across the view at chin height); clamped to 10 cm … ringRadiusCm")
  @widget(new SliderWidget(0.1, 1, 0.05))
  ringRadiusPerCmBelow: number = 0.45
  @input
  @hint("Ring band width as a fraction of the radius")
  @widget(new SliderWidget(0.03, 0.5, 0.01))
  ringBand: number = 0.14
  @input
  @hint("See-through fill inside the ring (alpha, 0 = none)")
  @widget(new SliderWidget(0, 0.5, 0.01))
  ringFillAlpha: number = 0.16
  @input("vec4", "{0.95, 1.0, 1.0, 0.9}")
  @hint("Ring colour")
  @widget(new ColorWidget())
  ringColor: vec4 = new vec4(0.95, 1.0, 1.0, 0.9)
  @input
  @hint("Depth tag shows only while looking within this many degrees of level")
  @widget(new SliderWidget(5, 60, 1))
  levelLookDegrees: number = 25
  @input
  @hint("'Up to your …' when the water is within this many cm of the body landmark")
  @widget(new SliderWidget(0, 15, 0.5))
  upToToleranceCm: number = 5
  @ui.group_end

  private ring!: SceneObject
  private carrying = false
  private reading: BodyReading = {phrase: "", word: "", underwater: false}
  private eyeCm = 160

  onAwake() {
    this.ring = global.scene.createSceneObject("HeadRing")
    this.ring.setParent(this.getSceneObject())
    const rmv = this.ring.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = buildAnnulusMesh(1 - this.ringBand, 64)
    rmv.mainMaterial = tintedMaterial(this.ringMaterial, this.ringColor)
    rmv.setRenderOrder(900) // after the water sheet, so the ring stays bright on top of it
    const fill = global.scene.createSceneObject("HeadRingFill")
    fill.setParent(this.ring)
    fill.getTransform().setLocalPosition(new vec3(0, -0.05, 0))
    const frmv = fill.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    frmv.mesh = buildDiscMesh(48)
    frmv.mainMaterial = tintedMaterial(this.ringMaterial, new vec4(this.ringColor.x, this.ringColor.y, this.ringColor.z, this.ringFillAlpha))
    frmv.setRenderOrder(899)
    this.ring.getTransform().setLocalScale(new vec3(this.ringRadiusCm, 1, this.ringRadiusCm))
    this.ring.enabled = false
    this.underwaterTint.enabled = false
    // LateUpdate: runs after DeviceTracking / test rigs have moved the camera this frame.
    this.createEvent("LateUpdateEvent").bind(() => this.tick())
  }

  setCarrying(on: boolean): void { this.carrying = on }

  getEyeCm(): number { return this.eyeCm }
  getReading(): BodyReading { return this.reading }
  isRingVisible(): boolean { return this.ring.enabled }
  getRingWorldPos(): vec3 { return this.ring.getTransform().getWorldPosition() }
  isTintOn(): boolean { return this.underwaterTint.enabled }

  /**
   * Depth tag slot: 0 = below-left of centre (default), 1 = below-right, 2 = lower-left, 3 = lower-right.
   * Picks the first slot whose panel would not cover the dotted line or the pin (in the plane the
   * tag is drawn in).
   */
  private pickDepthSlot(): number {
    const g = this.guidance
    const tgt = g ? g.getTarget() : null
    if (!tgt || !g.isDottedLineVisible()) return 0
    // the tag is drawn in the HUD's frame (at the eyes, yaw only), so test in that frame
    const inv = this.hud.getSceneObject().getTransform().getInvertedWorldTransform()
    const D = this.hud.depthTagDistanceCm
    const toPlane = (w: vec3): vec2 | null => {
      const l = inv.multiplyPoint(w)
      if (l.z > -1) return null
      return new vec2((l.x * D) / -l.z, (l.y * D) / -l.z)
    }
    const pts: vec2[] = []
    for (let i = 0; i <= 30; i++) {
      const p = toPlane(g.getPathPoint(i / 30))
      if (p) pts.push(p)
    }
    for (let slot = 0; slot < 4; slot++) {
      const r = this.hud.getDepthRect(slot)
      const pad = 1.0
      let hit = false
      for (const p of pts) {
        if (p.x > r.x - pad && p.x < r.z + pad && p.y > r.y - pad && p.y < r.w + pad) { hit = true; break }
      }
      if (!hit) return slot
    }
    return 0
  }

  private tick(): void {
    const camT = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
    const cam = camT.getWorldPosition()
    const floorY = this.water.getSceneObject().getTransform().getWorldPosition().y
    this.eyeCm = cam.y - floorY
    const up = this.water.isUp()
    const level = this.water.getLevelCm()
    const surfaceY = this.water.getSurfaceWorldY()

    // Ring directly under the head, on the surface.
    this.ring.enabled = up
    if (up) {
      this.ring.getTransform().setWorldPosition(new vec3(cam.x, surfaceY + 0.3, cam.z))
      const r = Math.max(10, Math.min(this.ringRadiusCm, (cam.y - surfaceY) * this.ringRadiusPerCmBelow))
      this.ring.getTransform().setLocalScale(new vec3(r, 1, r))
    }

    // Body word, live.
    this.reading = bodyReading(level, this.eyeCm, DEFAULT_LANDMARKS, this.upToToleranceCm)
    const under = up && this.reading.underwater
    if (this.underwaterTint.enabled !== under) this.underwaterTint.enabled = under
    this.water.setUnderwater(under)

    // Depth tag: follows the head (yaw only), shows only while looking roughly level.
    const look = camT.forward.uniformScale(-1) // Lens cameras look down -forward
    const pitchDeg = (Math.asin(Math.max(-1, Math.min(1, look.y))) * 180) / Math.PI
    const flat = new vec3(look.x, 0, look.z)
    if (flat.length > 0.001) {
      const yaw = Math.atan2(-flat.x, -flat.z)
      const hudT = this.hud.getSceneObject().getTransform()
      hudT.setWorldPosition(cam)
      hudT.setWorldRotation(quat.angleAxis(yaw, vec3.up()))
    }
    if (up) this.hud.setDepthText(depthTagText(level, this.eyeCm, DEFAULT_LANDMARKS, this.upToToleranceCm))
    if (up) this.hud.setDepthSlot(this.pickDepthSlot())
    this.hud.setDepthVisible(up && !this.carrying && Math.abs(pitchDeg) <= this.levelLookDegrees)
  }
}
