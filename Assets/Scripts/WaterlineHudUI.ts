/**
 * WaterlineHudUI — body-relative text: the depth tag and the summary line.
 *
 * Owns: two small UIKit BackPlate panels (DepthTag, SummaryLine) and their text. Passive view:
 * WaterlineBody moves this root with the user's head (yaw only) and pushes the depth text;
 * WaterlineMain shows/hides the summary line.
 * Must not: compute the body word or decide when things show.
 */
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"

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

@component
export class WaterlineHudUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineHudUI – depth tag + summary line</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Depth tag distance in front of the eyes (cm) — brief: about 60")
  @widget(new SliderWidget(40, 100, 1))
  depthTagDistanceCm: number = 60
  @input
  @hint("How far below eye level the depth tag sits (cm)")
  @widget(new SliderWidget(0, 30, 0.5))
  depthTagDropCm: number = 9
  @input
  @hint("Summary line distance in front of the eyes (cm)")
  @widget(new SliderWidget(40, 120, 1))
  summaryDistanceCm: number = 75
  @input("vec4", "{0.8, 0.97, 1.0, 1.0}")
  @hint("Depth tag text colour (keep light)")
  @widget(new ColorWidget())
  depthTextColor: vec4 = new vec4(0.8, 0.97, 1.0, 1.0)
  @ui.group_end

  private depthRoot!: SceneObject
  private depthText!: Text
  private summaryRoot!: SceneObject
  private summaryText!: Text
  private started = false
  private lastContent!: SceneObject
  private wantDepth = false
  private wantSummary = false

  onAwake() {
    // Depth tag (live text) — sized for the longest phrase: "Water here: 150 cm, above your ankles"
    this.depthRoot = this.makePanel("DepthTag", new vec3(0, -this.depthTagDropCm, -this.depthTagDistanceCm), 16, 2.2)
    this.depthText = this.addLine(this.lastContent, "Water here: 150 cm, up to your chin", "Headline2", 85, 16, 2.2, this.depthTextColor)

    this.summaryRoot = this.makePanel("SummaryLine", new vec3(0, -4, -this.summaryDistanceCm), 24, 3.2)
    this.summaryText = this.addLine(this.lastContent, "5 of 5 above water, 1:48", "HeadlineXL", 95, 20, 3.0, new vec4(1, 1, 1, 1))

    this.createEvent("OnStartEvent").bind(() => {
      const d = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
      d.bind(() => {
        this.started = true
        this.depthRoot.enabled = this.wantDepth
        this.summaryRoot.enabled = this.wantSummary
      })
      d.reset(0.15)
    })
  }

  // ---------- public API ----------

  setDepthText(s: string): void {
    if (this.depthText.text !== s) this.depthText.text = s
  }

  getDepthText(): string { return this.depthText.text }

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

  getSummaryText(): string { return this.summaryText.text }

  // ---------- layout ----------

  private makePanel(name: string, localPos: vec3, w: number, h: number): SceneObject {
    const root = global.scene.createSceneObject(name)
    root.setParent(this.getSceneObject())
    root.getTransform().setLocalPosition(localPos)
    root.createComponent("Component.Canvas")
    const plate = root.createComponent(BackPlate.getTypeName()) as BackPlate
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

  private addLine(parent: SceneObject, s: string, role: TextRole, distanceCm: number, w: number, h: number, color: vec4): Text {
    const so = global.scene.createSceneObject("Line")
    so.setParent(parent)
    const t = so.createComponent("Component.Text") as Text
    t.text = s
    t.depthTest = true
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
