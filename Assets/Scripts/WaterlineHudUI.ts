/**
 * WaterlineHudUI — body-relative text: the depth tag, the summary line and the first-time hint.
 *
 * Owns: three small UIKit BackPlate panels (DepthTag, SummaryLine, StartHint) and their text.
 * Every panel starts shrunk to nothing and disabled, so nothing flashes while the Lens starts. Passive view:
 * WaterlineBody moves this root with the user's head (yaw only) and pushes the depth text;
 * WaterlineMain shows/hides the summary line.
 * Must not: compute the body word or decide when things show.
 */
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"

const FONT_SIZE_SCALE = 1.0
type TextRole = "Title1" | "Title2" | "HeadlineXL" | "Headline1" | "Headline2" | "Subheadline" | "Button" | "Callout" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title1: {size: 105, weight: 700}, Title2: {size: 93, weight: 700},
  HeadlineXL: {size: 62, weight: 700}, Headline1: {size: 54, weight: 700},
  Headline2: {size: 48, weight: 700}, Subheadline: {size: 41, weight: 700},
  Button: {size: 39, weight: 500}, Callout: {size: 39, weight: 700},
  Body: {size: 39, weight: 500}, Caption: {size: 38, weight: 500},
}
function roleSize(role: TextRole, distanceCm: number = 110): number {
  return TYPE_SCALE[role].size * FONT_SIZE_SCALE * (distanceCm / 110)
}
function applyTextRole(t: Text, role: TextRole, distanceCm: number = 110): void {
  t.size = roleSize(role, distanceCm)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

/** Scale a panel sits at until it is ready: too small to draw. */
export const HIDDEN_SCALE = new vec3(0.0001, 0.0001, 0.0001)

/** Enabled in the hierarchy and not shrunk to nothing. */
export function rendered(so: SceneObject): boolean {
  return !!so && so.isEnabledInHierarchy && so.getTransform().getWorldScale().x > 0.01
}

@component
export class WaterlineHudUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineHudUI – depth tag + summary line</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Depth tag distance in front of the eyes (cm) — round 5: about 100")
  @widget(new SliderWidget(40, 150, 1))
  depthTagDistanceCm: number = 100
  @input
  @hint("How far below eye level the depth tag sits (cm)")
  @widget(new SliderWidget(0, 30, 0.5))
  depthTagDropCm: number = 12
  @input
  @hint("Sideways offset of the depth tag (cm, negative = left of centre)")
  @widget(new SliderWidget(-25, 25, 0.5))
  depthTagOffsetXCm: number = -12
  @input
  @hint("Depth tag size (physical, relative to the round-1 panel at 60 cm). 1.63 at 100 cm = text about 40% larger to the eye than the round-2 tag (0.7 at 60 cm)")
  @widget(new SliderWidget(0.4, 3, 0.01))
  depthTagScale: number = 1.63
  @input("vec4", "{0.05, 0.08, 0.11, 0.88}")
  @hint("Depth tag panel colour (round 5: a dark plate behind light text)")
  @widget(new ColorWidget())
  depthPlateColor: vec4 = new vec4(0.05, 0.08, 0.11, 0.88)
  @input("vec4", "{0.42, 0.58, 0.72, 0.55}")
  @hint("First-time hint panel colour (light and see-through)")
  @widget(new ColorWidget())
  hintPlateColor: vec4 = new vec4(0.42, 0.58, 0.72, 0.55)
  @input
  @hint("Summary line distance in front of the eyes (cm)")
  @widget(new SliderWidget(40, 120, 1))
  summaryDistanceCm: number = 75
  @input("vec4", "{0.93, 0.99, 1.0, 1.0}")
  @hint("Depth tag text colour (keep light)")
  @widget(new ColorWidget())
  depthTextColor: vec4 = new vec4(0.93, 0.99, 1.0, 1.0)
  @input
  @hint("First-time hint shown before the first tag")
  hintText: string = "Look down. Pinch the things you'd save."
  @input
  @hint("First-time hint distance in front of the eyes (cm)")
  @widget(new SliderWidget(40, 100, 1))
  hintDistanceCm: number = 60
  @input
  @hint("How far below eye level the first-time hint sits (cm)")
  @widget(new SliderWidget(0, 30, 0.5))
  hintDropCm: number = 6
  @ui.group_end

  private depthRoot!: SceneObject
  private depthText!: Text
  private summaryRoot!: SceneObject
  private summaryText!: Text
  private started = false
  private lastContent!: SceneObject
  private lastPlate!: BackPlate
  private depthPlate!: BackPlate
  private depthSlot = 0
  private wantDepth = false
  private wantSummary = false
  private hintRoot!: SceneObject
  private hintPlate!: BackPlate
  private summaryPlate!: BackPlate
  private wantHint = false

  onAwake() {
    // Depth tag (live text) — sized for the longest phrase: "Water here: 150 cm, above your ankles"
    const k = this.depthTagScale
    this.depthRoot = this.makePanel("DepthTag", new vec3(this.depthTagOffsetXCm, -this.depthTagDropCm, -this.depthTagDistanceCm), 16 * k, 2.2 * k)
    this.depthText = this.addLine(this.lastContent, "Water here: 150 cm, up to your chin", "Headline2", 85 * k, 16 * k, 2.2 * k, this.depthTextColor)
    this.depthPlate = this.lastPlate

    this.summaryRoot = this.makePanel("SummaryLine", new vec3(0, -4, -this.summaryDistanceCm), 24, 3.2)
    this.summaryText = this.addLine(this.lastContent, "", "HeadlineXL", 95, 20, 3.0, new vec4(1, 1, 1, 1))
    this.summaryPlate = this.lastPlate

    const hk = 0.8
    this.hintRoot = this.makePanel("StartHint", new vec3(0, -this.hintDropCm, -this.hintDistanceCm), 21 * hk, 2.4 * hk)
    this.addLine(this.lastContent, this.hintText, "Headline2", 85 * hk, 21 * hk, 2.4 * hk, new vec4(1, 1, 1, 1))
    this.hintPlate = this.lastPlate

    // UIKit plates must be enabled for a moment to set themselves up (and be restyled light), so the
    // panels stay enabled but shrunk to nothing until then: nothing is ever drawn before it is asked for.
    for (const r of [this.depthRoot, this.summaryRoot, this.hintRoot]) r.getTransform().setLocalScale(HIDDEN_SCALE)

    this.createEvent("OnStartEvent").bind(() => {
      const d = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
      d.bind(() => {
        this.started = true
        this.lightenPlate(this.depthPlate, this.depthPlateColor)
        this.lightenPlate(this.hintPlate, this.hintPlateColor)
        // body-relative panels are drawn on top of everything (like the edge arrow), so furniture
        // never cuts them off when you stand close to it
        for (const p of [this.depthPlate, this.hintPlate, this.summaryPlate]) this.drawOnTop(p)
        this.depthRoot.enabled = this.wantDepth
        this.summaryRoot.enabled = this.wantSummary
        this.hintRoot.enabled = this.wantHint
        for (const r of [this.depthRoot, this.summaryRoot, this.hintRoot]) r.getTransform().setLocalScale(vec3.one())
      })
      d.reset(0.15)
    })
  }

  // ---------- public API ----------

  setDepthText(s: string): void {
    if (this.depthText.text !== s) this.depthText.text = s
  }

  getDepthText(): string { return this.depthText.text }

  /**
   * Where the depth tag sits. 0 = slightly below-left of centre (default); 1 = below-right;
   * 2 = lower-left; 3 = lower-right. WaterlineBody picks the slot that keeps the dotted line and pin clear.
   */
  setDepthSlot(slot: number): void {
    if (slot === this.depthSlot) return
    this.depthSlot = slot
    const c = this.slotCentre(slot)
    this.depthRoot.getTransform().setLocalPosition(new vec3(c.x, c.y, -this.depthTagDistanceCm))
  }

  getDepthSlot(): number { return this.depthSlot }

  /** Panel rectangle for a slot in the tag's plane (cm): (minX, minY, maxX, maxY). */
  getDepthRect(slot: number): vec4 {
    const c = this.slotCentre(slot)
    const hw = (16 * this.depthTagScale) / 2 + 1.2, hh = (2.2 * this.depthTagScale) / 2 + 0.7
    return new vec4(c.x - hw, c.y - hh, c.x + hw, c.y + hh)
  }

  private slotCentre(slot: number): vec2 {
    const x = Math.abs(this.depthTagOffsetXCm)
    const y = -this.depthTagDropCm
    switch (slot) {
      case 1: return new vec2(x, y)
      case 2: return new vec2(-x * 1.3, y - 5 * (this.depthTagDistanceCm / 60))
      case 3: return new vec2(x * 1.3, y - 5 * (this.depthTagDistanceCm / 60))
      default: return new vec2(-x, y)
    }
  }

  setDepthVisible(on: boolean): void {
    this.wantDepth = on
    if (this.started && this.depthRoot.enabled !== on) this.depthRoot.enabled = on
  }

  isDepthVisible(): boolean { return this.wantDepth }

  showSummary(s: string): void {
    this.summaryText.text = s
    this.wantSummary = true
    if (this.started) this.summaryRoot.enabled = true
  }

  hideSummary(): void {
    this.wantSummary = false
    if (this.started) this.summaryRoot.enabled = false
  }

  isSummaryVisible(): boolean { return this.wantSummary }

  /** What is actually drawn this frame (enabled and not shrunk away) — for the start-flash check. */
  isDepthRendered(): boolean { return rendered(this.depthRoot) }
  isHintRendered(): boolean { return rendered(this.hintRoot) }

  /** First-time hint: "Look down. Pinch the things you'd save." */
  setStartHint(on: boolean): void {
    this.wantHint = on
    if (this.started && this.hintRoot.enabled !== on) this.hintRoot.enabled = on
  }

  isStartHintVisible(): boolean { return this.wantHint }
  isSummaryRendered(): boolean { return rendered(this.summaryRoot) }

  getSummaryText(): string { return this.summaryText.text }

  // ---------- layout ----------

  private makePanel(name: string, localPos: vec3, w: number, h: number): SceneObject {
    const root = global.scene.createSceneObject(name)
    root.setParent(this.getSceneObject())
    root.getTransform().setLocalPosition(localPos)
    root.createComponent("Component.Canvas")
    const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.renderOrder = 1000 // after the water and the underwater tint, so the text stays crisp under water
    this.lastPlate = plate
    const content = global.scene.createSceneObject("Content")
    content.setParent(root)
    content.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.direction = FlexDirection.Column
    flex.alignItems = FlexAlign.Center
    flex.justifyContent = FlexJustify.Center
    flex.width = -1
    flex.height = -1
    flex.paddingTop = 0.7
    flex.paddingBottom = 0.7
    flex.paddingLeft = 1.2
    flex.paddingRight = 1.2
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })
    this.lastContent = content
    return root
  }

  /** No depth test on the plate: it is never hidden or cut by furniture, the water or the walls. */
  private drawOnTop(plate: BackPlate): void {
    const rmv = plate.getSceneObject().getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (rmv && rmv.mainMaterial) rmv.mainMaterial.mainPass.depthTest = false
  }

  /** True if the depth tag's plate draws on top of everything (for the tests). */
  isDepthOnTop(): boolean {
    const rmv = this.depthRoot.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    return !!rmv && !!rmv.mainMaterial && !rmv.mainMaterial.mainPass.depthTest && !this.depthText.depthTest
  }

  /** Lighter look: a flat, pale, see-through plate instead of the default dark gradient. */
  private lightenPlate(plate: BackPlate, color: vec4): void {
    plate.style = "simple"
    const rr = plate.getSceneObject().getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    if (rr) {
      rr.gradient = false
      rr.backgroundColor = color
    }
  }

  private addLine(parent: SceneObject, s: string, role: TextRole, distanceCm: number, w: number, h: number, color: vec4): Text {
    const so = global.scene.createSceneObject("Line")
    so.setParent(parent)
    const t = so.createComponent("Component.Text") as Text
    t.text = s
    t.depthTest = false // drawn on top of everything, like its plate
    t.setRenderOrder(1001)
    applyTextRole(t, role, distanceCm)
    t.textFill.color = color
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-w / 2, w / 2, -h / 2, h / 2)
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = w
    item.overrideHeight = h
    return t
  }
}
