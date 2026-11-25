/**
 * WaterlineLevelCardUI — the river-alert card (UIKit BackPlate + three large Buttons).
 *
 * Owns: layout and look of the card, and the three level buttons (AlertButton,
 * WarningButton, DangerButton). Passive view: WaterlineMain pushes the level names/heights in
 * with setLevels(), shows/hides it, and listens to onLevelChosen.
 * Must not: start the water or hold any run state.
 */
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

// ── Type scale — single source of truth (see specs-build-ui patterns.md → Typography)
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

const ICON_FLOOD: Texture = requireAsset("../Icons/flood.png") as Texture
const IMAGE_MATERIAL: Material = requireAsset("../Materials/ImageMaterial.mat") as Material
const BUTTON_LABEL_Z = 0.08

@component
export class WaterlineLevelCardUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineLevelCardUI – river-alert card</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Card title")
  titleText: string = "River alert"
  @input
  @hint("Line under the title")
  subtitleText: string = "Sungai Bentong. Choose the water level."
  @input
  @hint("Width of each level button (cm)")
  @widget(new SliderWidget(6, 16, 0.5))
  buttonWidthCm: number = 10.5
  @input
  @hint("Height of each level button (cm) — big targets")
  @widget(new SliderWidget(4, 10, 0.5))
  buttonHeightCm: number = 6.5
  @input("vec4", "{0.75, 0.95, 1.0, 1.0}")
  @hint("Colour of the height line on each button")
  @widget(new ColorWidget())
  heightTextColor: vec4 = new vec4(0.75, 0.95, 1.0, 1.0)
  @ui.group_end

  private _onLevelChosen = new Event<number>()
  get onLevelChosen(): PublicApi<number> { return this._onLevelChosen.publicApi() }

  private nameTexts: Text[] = []
  private heightTexts: Text[] = []
  private card!: SceneObject
  private wantVisible = false
  private started = false

  onAwake() {
    this.card = global.scene.createSceneObject("LevelCardPanel")
    this.card.setParent(this.getSceneObject())
    this.card.createComponent("Component.Canvas")
    const plate = this.card.createComponent(BackPlate.getTypeName()) as BackPlate

    const content = global.scene.createSceneObject("Content")
    content.setParent(this.card)
    content.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.direction = FlexDirection.Column
    flex.alignItems = FlexAlign.Center
    flex.justifyContent = FlexJustify.Start
    flex.width = -1
    flex.height = -1
    flex.rowGap = 1.0
    flex.paddingTop = 1.6
    flex.paddingBottom = 1.8
    flex.paddingLeft = 1.8
    flex.paddingRight = 1.8
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })

    const rowW = this.buttonWidthCm * 3 + 2 * 1.2
    this.addHeaderRow(content, rowW)
    this.addText(content, this.subtitleText, "Body", rowW, 1.8, new vec4(1, 1, 1, 0.75))
    this.addButtonRow(content, rowW)

    this.createEvent("OnStartEvent").bind(() => {
      const d = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
      d.bind(() => {
        this.started = true
        this.card.enabled = this.wantVisible
      })
      d.reset(0.15)
    })
  }

  // ---------- public API ----------

  setLevels(names: string[], heightsCm: number[]): void {
    for (let i = 0; i < 3; i++) {
      if (this.nameTexts[i]) this.nameTexts[i].text = names[i]
      if (this.heightTexts[i]) this.heightTexts[i].text = `${Math.round(heightsCm[i])} cm`
    }
  }

  show(): void {
    this.wantVisible = true
    if (this.started) this.card.enabled = true
  }

  hide(): void {
    this.wantVisible = false
    if (this.started) this.card.enabled = false
  }

  isShown(): boolean { return this.wantVisible }

  // ---------- layout ----------

  private addHeaderRow(parent: SceneObject, rowW: number): void {
    const row = global.scene.createSceneObject("Header")
    row.setParent(parent)
    const f = row.createComponent(FlexLayout.getTypeName()) as FlexLayout
    f.direction = FlexDirection.Row
    f.alignItems = FlexAlign.Center
    f.justifyContent = FlexJustify.Center
    f.columnGap = 0.8
    f.width = rowW
    f.height = 3.2
    row.createComponent(FlexItem.getTypeName())

    const iconSO = global.scene.createSceneObject("FloodIcon")
    iconSO.setParent(row)
    const img = iconSO.createComponent("Component.Image") as Image
    const mat = IMAGE_MATERIAL.clone()
    mat.mainPass.baseTex = ICON_FLOOD
    mat.mainPass.depthTest = true
    mat.mainPass.depthWrite = false
    img.clearMaterials()
    img.addMaterial(mat)
    iconSO.getTransform().setLocalScale(new vec3(2.8, 2.8, 1))
    const iconItem = iconSO.createComponent(FlexItem.getTypeName()) as FlexItem
    iconItem.overrideWidth = 2.8
    iconItem.overrideHeight = 2.8

    const tSO = global.scene.createSceneObject("Title")
    tSO.setParent(row)
    const t = tSO.createComponent("Component.Text") as Text
    t.text = this.titleText
    t.depthTest = true
    applyTextRole(t, "HeadlineXL")
    t.horizontalAlignment = HorizontalAlignment.Left
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-7, 7, -1.6, 1.6)
    const ti = tSO.createComponent(FlexItem.getTypeName()) as FlexItem
    ti.overrideWidth = 14
    ti.overrideHeight = 3.2
  }

  private addText(parent: SceneObject, s: string, role: TextRole, w: number, h: number, color: vec4): Text {
    const so = global.scene.createSceneObject("Text")
    so.setParent(parent)
    const t = so.createComponent("Component.Text") as Text
    t.text = s
    t.depthTest = true
    applyTextRole(t, role)
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

  private addButtonRow(parent: SceneObject, rowW: number): void {
    const row = global.scene.createSceneObject("Levels")
    row.setParent(parent)
    const f = row.createComponent(FlexLayout.getTypeName()) as FlexLayout
    f.direction = FlexDirection.Row
    f.alignItems = FlexAlign.Center
    f.justifyContent = FlexJustify.Center
    f.columnGap = 1.2
    f.width = rowW
    f.height = this.buttonHeightCm
    const rowItem = row.createComponent(FlexItem.getTypeName()) as FlexItem
    rowItem.marginTop = 0.4

    const names = ["Alert", "Warning", "Danger"]
    for (let i = 0; i < 3; i++) {
      const so = global.scene.createSceneObject(`${names[i]}Button`)
      so.setParent(row)
      const btn = so.createComponent(Button.getTypeName()) as Button
      btn.size = new vec3(this.buttonWidthCm, this.buttonHeightCm, 1)
      const bi = so.createComponent(FlexItem.getTypeName()) as FlexItem
      bi.overrideWidth = this.buttonWidthCm
      bi.overrideHeight = this.buttonHeightCm

      // Label column on the button face: level name over its height.
      const labels = global.scene.createSceneObject("ButtonLabels")
      labels.setParent(so)
      labels.getTransform().setLocalPosition(new vec3(0, 0, BUTTON_LABEL_Z))
      const lf = labels.createComponent(FlexLayout.getTypeName()) as FlexLayout
      lf.direction = FlexDirection.Column
      lf.alignItems = FlexAlign.Center
      lf.justifyContent = FlexJustify.Center
      lf.rowGap = 0.2
      lf.width = this.buttonWidthCm - 0.5
      lf.height = this.buttonHeightCm - 0.5
      this.nameTexts.push(this.addText(labels, names[i], "HeadlineXL", this.buttonWidthCm - 0.5, 2.6, new vec4(1, 1, 1, 1)))
      this.heightTexts.push(this.addText(labels, "000 cm", "Headline1", this.buttonWidthCm - 0.5, 2.2, this.heightTextColor))

      const idx = i
      btn.onTriggerUp.add(() => {
        if (this.wantVisible) this._onLevelChosen.invoke(idx)
      })
    }
  }
}
