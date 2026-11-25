/**
 * WaterlineGuidance — "only one thing asks for attention".
 *
 * Owns: the look of the one current target — amber outline on the item, its raised glowing pin
 * on the cabinet, the dotted line from the item up to the pin, the green "safe" flash, and the
 * small edge arrow (+ soft splash) when the target is out of view.
 * Expects: WaterlineMain to call setTarget()/markSafe(); pins are authored children named "Pin"
 * under each item's safe-spot anchor; `edgeArrow` is an authored SceneObject.
 * Must not: pick which item is next (WaterlineMain does, via WaterlineState.nextItem).
 */
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {WaterlineBelonging} from "./WaterlineBelonging"
import {WaterlineAudio} from "./WaterlineAudio"
import {buildChevronMesh, buildVChevronMesh, setAlpha, tintedMaterial} from "./WaterlineGeometry"

@component
export class WaterlineGuidance extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineGuidance – amber item, dotted line, pin, edge arrow</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Unlit base material cloned for dots and the arrow")
  glowMaterial!: Material
  @input
  @hint("1 cm unit sphere mesh for the dotted line")
  sphereMesh!: RenderMesh
  @input
  @hint("Authored edge arrow object (mesh is built at runtime)")
  edgeArrow!: SceneObject
  @input
  @hint("Placed one-shot cues (splash)")
  audio!: WaterlineAudio
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input("vec3", "{1.0, 0.7, 0.18}")
  @hint("Amber: the one item to lift next")
  @widget(new ColorWidget())
  amberColor: vec3 = new vec3(1.0, 0.7, 0.18)
  @input("vec3", "{0.45, 1.0, 0.55}")
  @hint("Green flash when an item snaps onto its safe spot")
  @widget(new ColorWidget())
  greenColor: vec3 = new vec3(0.45, 1.0, 0.55)
  @input
  @hint("How long the green stays before fading (s)")
  @widget(new SliderWidget(0.2, 3, 0.1))
  greenSeconds: number = 1.0
  @input
  @hint("Gap between dots on the dotted line (cm)")
  @widget(new SliderWidget(2, 15, 0.5))
  dotSpacingCm: number = 6
  @input
  @hint("How high the dotted line arcs above the pin head, so it clears the cabinet's front edge (cm)")
  @widget(new SliderWidget(0, 60, 1))
  arcRiseCm: number = 22
  @input
  @hint("Distance ahead of the eyes the edge arrow is drawn at (cm)")
  @widget(new SliderWidget(30, 120, 1))
  arrowDistanceCm: number = 60
  @input
  @hint("How far inside the true edge of the view the arrow's centre sits (cm, at the arrow distance)")
  @widget(new SliderWidget(0.5, 6, 0.1))
  edgeInsetCm: number = 1.8
  @input
  @hint("Side arrow size (cm)")
  @widget(new SliderWidget(1, 6, 0.1))
  arrowSizeCm: number = 2.8
  @input
  @hint("Bottom-edge chevron size (cm) — shown when the next item is below the view")
  @widget(new SliderWidget(1, 6, 0.1))
  chevronSizeCm: number = 2.2
  @input
  @hint("Screen margin: an item this close to the edge counts as out of view (0-0.4)")
  @widget(new SliderWidget(0, 0.4, 0.01))
  viewMargin: number = 0.08
  @ui.group_end

  private target: WaterlineBelonging | null = null
  private dots: SceneObject[] = []
  private dotMat!: Material
  private arrowMat!: Material
  private arrowShown = false
  private arrowRmv!: RenderMeshVisual
  private arrowMesh!: RenderMesh
  private chevronMesh!: RenderMesh
  private arrowMode = "" // "side" | "below"
  private greenItem: WaterlineBelonging | null = null
  private greenT = 0
  private t = 0

  onAwake() {
    this.dotMat = tintedMaterial(this.glowMaterial, new vec4(this.amberColor.x, this.amberColor.y, this.amberColor.z, 0.9))
    for (let i = 0; i < 60; i++) {
      const so = global.scene.createSceneObject(`Dot${i}`)
      so.setParent(this.getSceneObject())
      so.getTransform().setLocalScale(new vec3(1.1, 1.1, 1.1))
      const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      rmv.mesh = this.sphereMesh
      rmv.mainMaterial = this.dotMat
      so.enabled = false
      this.dots.push(so)
    }
    this.arrowMat = tintedMaterial(this.glowMaterial, new vec4(this.amberColor.x, this.amberColor.y, this.amberColor.z, 0.95))
    this.arrowMat.mainPass.depthTest = false // the arrow is a view cue: never hidden by the water or furniture
    const rmv = this.edgeArrow.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    this.arrowMesh = buildChevronMesh()
    this.chevronMesh = buildVChevronMesh()
    rmv.mesh = this.arrowMesh
    rmv.mainMaterial = this.arrowMat
    rmv.setRenderOrder(1000) // after the transparent water sheet, so the cue is never tinted
    this.arrowRmv = rmv
    this.edgeArrow.enabled = false
    this.createEvent("LateUpdateEvent").bind(() => this.update())
  }

  // ---------- public API ----------

  setTarget(item: WaterlineBelonging | null): void {
    if (this.target && this.target !== item && this.target !== this.greenItem) {
      this.target.setHighlight(null, 0)
      this.setPin(this.target, false)
    }
    this.target = item
    this.arrowShown = false
    if (item) {
      item.setHighlight(this.amberColor, 1)
      this.setPin(item, true)
    }
  }

  getTarget(): WaterlineBelonging | null { return this.target }

  /**
   * Point at t (0 = item top, 1 = pin head) on the dotted line: a gentle arc whose control point
   * sits `arcRiseCm` above the pin head, halfway out, so the line clears the cabinet's front edge.
   */
  getPathPoint(t: number): vec3 {
    const tgt = this.target
    if (!tgt) return vec3.zero()
    const a = tgt.getTopWorldPos()
    const b = tgt.getSafeSpotWorldPos().add(new vec3(0, 10, 0))
    const c = new vec3((a.x + b.x) / 2, Math.max(a.y, b.y) + this.arcRiseCm, (a.z + b.z) / 2)
    const u = 1 - t
    return a.uniformScale(u * u).add(c.uniformScale(2 * u * t)).add(b.uniformScale(t * t))
  }

  /** Green with a soft tick; the green fades after `greenSeconds`. */
  markSafe(item: WaterlineBelonging): void {
    this.setPin(item, false)
    item.setHighlight(this.greenColor, 1)
    this.greenItem = item
    this.greenT = 0
    if (this.target === item) this.target = null
  }

  clearAll(items: WaterlineBelonging[]): void {
    this.target = null
    this.greenItem = null
    for (const it of items) {
      it.setHighlight(null, 0)
      this.setPin(it, false)
    }
    for (const d of this.dots) d.enabled = false
    this.edgeArrow.enabled = false
    this.arrowShown = false
  }

  isArrowVisible(): boolean { return this.edgeArrow.enabled }
  isDottedLineVisible(): boolean { return this.dots.length > 0 && this.dots[0].enabled }
  isPinVisible(item: WaterlineBelonging): boolean {
    const pin = this.findPin(item)
    return pin ? pin.enabled : false
  }

  /** True if the world point is inside the camera view (with margin) and in front. */
  isInView(p: vec3): boolean {
    const camC = WorldCameraFinderProvider.getInstance().getComponent()
    const camT = camC.getTransform()
    const look = camT.forward.uniformScale(-1)
    if (p.sub(camT.getWorldPosition()).dot(look) <= 0) return false
    const s = camC.worldSpaceToScreenSpace(p)
    const m = this.viewMargin
    return s.x >= m && s.x <= 1 - m && s.y >= m && s.y <= 1 - m
  }

  // ---------- internals ----------

  private findPin(item: WaterlineBelonging): SceneObject | null {
    const spot = item.safeSpot
    for (let i = 0; i < spot.getChildrenCount(); i++) {
      if (spot.getChild(i).name === "Pin") return spot.getChild(i)
    }
    return null
  }

  private setPin(item: WaterlineBelonging, on: boolean): void {
    const pin = this.findPin(item)
    if (pin) pin.enabled = on
  }

  /**
   * Put the cue on the edge of the view, `arrowDistanceCm` ahead, `edgeInsetCm` inside the edge.
   * Item below the view (but horizontally inside it): small chevron on the bottom edge, offset
   * toward the item's side (never mid-view, so it can't sit on the depth tag). Otherwise: an arrow
   * on the edge where the line from the centre toward the item leaves the view.
   */
  private placeEdgeCue(camC: Camera, camT: Transform, target: vec3): void {
    const D = this.arrowDistanceCm
    const inv = camT.getInvertedWorldTransform()
    // half-size of the view at distance D, measured from the camera itself (true edge)
    const edgeR = inv.multiplyPoint(camC.screenSpaceToWorldSpace(new vec2(1, 0.5), D))
    const edgeB = inv.multiplyPoint(camC.screenSpaceToWorldSpace(new vec2(0.5, 1), D))
    const depth = -edgeR.z
    const halfW = Math.abs(edgeR.x) * (D / depth)
    const halfH = Math.abs(edgeB.y) * (D / depth)
    const local = inv.multiplyPoint(target)
    // direction in view-plane tangent units (x right, y up)
    let px: number, py: number
    if (local.z < -1) {
      px = (local.x / -local.z) * D
      py = (local.y / -local.z) * D
    } else {
      const l = Math.max(0.001, Math.sqrt(local.x * local.x + local.y * local.y))
      px = (local.x / l) * 1000
      py = (local.y / l) * 1000
    }
    const ex = halfW - this.edgeInsetCm
    const ey = halfH - this.edgeInsetCm
    let x: number, y: number, angle: number
    let mode: string
    if (py < -ey && Math.abs(px) <= halfW) {
      mode = "below"
      // follows the item sideways along the bottom edge
      const side = Math.max(-0.8 * ex, Math.min(0.8 * ex, px))
      x = side
      y = -ey
      angle = -Math.PI / 2
    } else {
      mode = "side"
      const k = Math.min(ex / Math.max(0.0001, Math.abs(px)), ey / Math.max(0.0001, Math.abs(py)))
      x = px * k
      y = py * k
      angle = Math.atan2(py, px)
    }
    if (mode !== this.arrowMode) {
      this.arrowMode = mode
      this.arrowRmv.mesh = mode === "below" ? this.chevronMesh : this.arrowMesh
    }
    const s = mode === "below" ? this.chevronSizeCm : this.arrowSizeCm
    const t = this.edgeArrow.getTransform()
    t.setWorldPosition(camT.getWorldTransform().multiplyPoint(new vec3(x, y, -D)))
    t.setWorldRotation(camT.getWorldRotation().multiply(quat.angleAxis(angle, vec3.forward())))
    t.setWorldScale(new vec3(s, s, s))
  }

  /** Where the edge cue sits, in camera space (cm): for tests and screenshots. */
  getArrowLocal(): vec3 {
    const camT = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
    return camT.getInvertedWorldTransform().multiplyPoint(this.edgeArrow.getTransform().getWorldPosition())
  }

  getArrowMode(): string { return this.arrowMode }

  private update(): void {
    const dt = getDeltaTime()
    this.t += dt

    // green fade
    if (this.greenItem) {
      this.greenT += dt
      if (this.greenT > this.greenSeconds) {
        const a = Math.max(0, 1 - (this.greenT - this.greenSeconds) / 0.4)
        this.greenItem.setHighlight(this.greenColor, a)
        if (a <= 0) {
          this.greenItem.setHighlight(null, 0)
          this.greenItem = null
        }
      }
    }

    const tgt = this.target
    if (!tgt) {
      for (const d of this.dots) if (d.enabled) d.enabled = false
      this.edgeArrow.enabled = false
      return
    }

    // pulse the pin head so it reads as glowing
    const pin = this.findPin(tgt)
    if (pin) {
      const s = 1 + 0.12 * Math.sin(this.t * 4)
      pin.getTransform().setLocalScale(new vec3(s, 1, s))
    }

    // dotted line: item top → pin head, arcing over the cabinet's front edge
    const a = tgt.getTopWorldPos()
    const b = tgt.getSafeSpotWorldPos().add(new vec3(0, 10, 0))
    const len = a.distance(b) * 1.15
    const n = Math.min(this.dots.length, Math.max(2, Math.floor(len / this.dotSpacingCm)))
    const crawl = (this.t * 0.8) % 1
    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i]
      if (i < n) {
        const k = (i + crawl) / n
        d.enabled = true
        d.getTransform().setWorldPosition(this.getPathPoint(k))
      } else if (d.enabled) {
        d.enabled = false
      }
    }

    // edge arrow when the target is out of view: drawn at the true edge of the view
    const camC = WorldCameraFinderProvider.getInstance().getComponent()
    const camT = camC.getTransform()
    const inView = this.isInView(tgt.getCenterWorldPos())
    if (!inView) {
      this.placeEdgeCue(camC, camT, tgt.getCenterWorldPos())
      this.edgeArrow.enabled = true
      setAlpha(this.arrowMat, 0.85 + 0.15 * Math.sin(this.t * 5))
      if (!this.arrowShown) {
        this.arrowShown = true
        this.audio.playSplash(tgt.getCenterWorldPos()) // attention cue from the item's direction
      }
    } else {
      if (this.arrowShown) {
        this.arrowShown = false
        this.audio.playSplash(tgt.getCenterWorldPos()) // faced it: soft splash from the item
      }
      this.edgeArrow.enabled = false
    }
  }
}
