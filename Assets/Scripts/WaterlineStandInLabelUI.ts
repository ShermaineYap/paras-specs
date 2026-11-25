/**
 * WaterlineStandInLabelUI — the small "preview stand-in" label on the wall.
 *
 * Owns: one static UIKit BackPlate with two short lines. Authored in the scene so a human can
 * move it. Must not: change at runtime (it is part of the stand-in room, always visible).
 */
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"

const FONT_SIZE_SCALE = 1.0
type TextRole = "Headline2" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Headline2: {size: 48, weight: 700},
  Body: {size: 39, weight: 500},
  Caption: {size: 38, weight: 500},
}
function applyTextRole(t: Text, role: TextRole, distanceCm: number = 110): void {
  t.size = TYPE_SCALE[role].size * FONT_SIZE_SCALE * (distanceCm / 110)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

@component
export class WaterlineStandInLabelUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineStandInLabelUI – "preview stand-in" wall label</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("First line")
  titleText: string = "PREVIEW STAND-IN"
  @input
  @hint("Second line")
  bodyText: string = "Room, belongings, cabinet and switch. Pinch each belonging to tag it."
  @input
  @hint("Distance the label is read from (cm) — scales the text")
  @widget(new SliderWidget(60, 300, 5))
  readingDistanceCm: number = 200
  @input("vec4", "{1.0, 0.86, 0.55, 1.0}")
  @hint("Title colour (keep light)")
  @widget(new ColorWidget())
  titleColor: vec4 = new vec4(1.0, 0.86, 0.55, 1.0)
  @input("vec4", "{0.36, 0.47, 0.58, 0.9}")
  @hint("Plate colour (a light slate, so it stays visible on an additive display)")
  @widget(new ColorWidget())
  plateColor: vec4 = new vec4(0.36, 0.47, 0.58, 0.9)
  @ui.group_end

  onAwake() {
    this.getSceneObject().createComponent("Component.Canvas")
    const plate = this.getSceneObject().createComponent(BackPlate.getTypeName()) as BackPlate
    const content = global.scene.createSceneObject("Content")
    content.setParent(this.getSceneObject())
    content.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.direction = FlexDirection.Column
    flex.alignItems = FlexAlign.Center
    flex.justifyContent = FlexJustify.Center
    flex.width = -1
    flex.height = -1
    flex.rowGap = 0.4
    flex.paddingTop = 1.2
    flex.paddingBottom = 1.2
    flex.paddingLeft = 2
    flex.paddingRight = 2
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })
    this.createEvent("OnStartEvent").bind(() => {
      const d = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
      d.bind(() => {
        plate.style = "simple"
        const rr = this.getSceneObject().getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
        if (rr) {
          rr.gradient = false
          rr.backgroundColor = this.plateColor
        }
      })
      d.reset(0.1)
    })
    const k = this.readingDistanceCm / 110
    this.addLine(content, this.titleText, "Headline2", 30 * k * 0.55, 2.6 * k, this.titleColor)
    this.addLine(content, this.bodyText, "Caption", 46 * k * 0.55, 2.2 * k, new vec4(1, 1, 1, 0.85))
  }

  private addLine(parent: SceneObject, s: string, role: TextRole, w: number, h: number, color: vec4): void {
    const so = global.scene.createSceneObject("Line")
    so.setParent(parent)
    const t = so.createComponent("Component.Text") as Text
    t.text = s
    t.depthTest = true
    applyTextRole(t, role, this.readingDistanceCm)
    t.textFill.color = color
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-w / 2, w / 2, -h / 2, h / 2)
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = w
    item.overrideHeight = h
  }
}
