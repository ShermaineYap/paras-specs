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
import {buildChevronMesh, setAlpha, tintedMaterial} from "./WaterlineGeometry"

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
  @hint("Edge arrow distance from the centre of view (cm, at 60 cm ahead)")
  @widget(new SliderWidget(4, 25, 0.5))
  arrowOffsetCm: number = 13
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
    rmv.mesh = buildChevronMesh()
    rmv.mainMaterial = this.arrowMat
    rmv.setRenderOrder(1000) // after the transparent water sheet, so the cue is never tinted
    this.edgeArrow.getTransform().setWorldScale(new vec3(3.2, 3.2, 3.2))
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

    // dotted line: item top → pin head (10 cm above the spot)
    const a = tgt.getTopWorldPos()
    const b = tgt.getSafeSpotWorldPos().add(new vec3(0, 10, 0))
    const len = a.distance(b)
    const n = Math.min(this.dots.length, Math.max(2, Math.floor(len / this.dotSpacingCm)))
    const crawl = (this.t * 0.8) % 1
    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i]
      if (i < n) {
        const k = (i + crawl) / n
        d.enabled = true
        d.getTransform().setWorldPosition(vec3.lerp(a, b, k))
      } else if (d.enabled) {
        d.enabled = false
      }
    }

    // edge arrow when the target is out of view
    const camT = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
    const inView = this.isInView(tgt.getCenterWorldPos())
    if (!inView) {
      const camPos = camT.getWorldPosition()
      const inv = camT.getInvertedWorldTransform()
      const local = inv.multiplyPoint(tgt.getCenterWorldPos())
      let dir = new vec2(local.x, local.y)
      if (dir.length < 0.001) dir = new vec2(1, 0)
      dir = dir.normalize()
      const right = camT.right
      const up = camT.up
      const look = camT.forward.uniformScale(-1)
      const pos = camPos
        .add(look.uniformScale(60))
        .add(right.uniformScale(dir.x * this.arrowOffsetCm))
        .add(up.uniformScale(dir.y * this.arrowOffsetCm * 0.75))
      this.edgeArrow.enabled = true
      this.edgeArrow.getTransform().setWorldPosition(pos)
      const angle = Math.atan2(dir.y, dir.x)
      this.edgeArrow.getTransform().setWorldRotation(camT.getWorldRotation().multiply(quat.angleAxis(angle, vec3.forward())))
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
