/**
 * WaterlineBelonging — one preview stand-in belonging (rice cooker, school bag, ...).
 *
 * Owns: this item's local state (tagged, safe, grabbable), its SIK collider / Interactable /
 * InteractableManipulation, its outline (amber / green / hover) and its "tagged" tick.
 * Expects: the authored item root (unit scale, identity rotation, positioned at the item's
 * centre) with authored visual children; `sizeCm` matching those visuals; `safeSpot` = the
 * authored anchor on the cabinet top where the item belongs.
 * Must not: decide which item is next, or know about water / levels (WaterlineMain does).
 */
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {buildOutline, makeMeshChild, setAlpha, setRgb, tintedMaterial} from "./WaterlineGeometry"

@component
export class WaterlineBelonging extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineBelonging – a preview stand-in belonging</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Authored anchor on the cabinet top where this item is safe (its pin stands here)")
  safeSpot!: SceneObject
  @input
  @hint("Unlit base material cloned for the outline and tick")
  glowMaterial!: Material
  @input
  @hint("1 cm unit box mesh used for outline edges and the tick")
  boxMesh!: RenderMesh
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Name used in logs and tests")
  displayName: string = "Belonging"
  @input
  @hint("Height of the item's base above the floor where it was tagged (cm). Drives flagging.")
  heightCm: number = 0
  @input
  @hint("Item size in cm (width, height, depth) — must match the authored visuals")
  sizeCm: vec3 = new vec3(30, 30, 30)
  @input
  @hint("Extra size added to the grab/pinch collider so the target is easy to hit (cm)")
  @widget(new SliderWidget(0, 20, 1))
  hitPaddingCm: number = 8
  @input("vec4", "{0.55, 1.0, 0.6, 1.0}")
  @hint("Colour of the 'tagged' tick")
  @widget(new ColorWidget())
  tickColor: vec4 = new vec4(0.55, 1.0, 0.6, 1.0)
  @ui.group_end

  private interactable!: Interactable
  private manipulation!: InteractableManipulation
  private outline!: SceneObject
  private outlineMat!: Material
  private tick!: SceneObject
  private tickMat!: Material
  private tickTimer = -1
  private homePos!: vec3
  private homeRot!: quat

  tagged = false
  safe = false
  private grabbable = false
  private hovered = false
  private highlightOn = false

  private _onPinched = new Event<WaterlineBelonging>()
  private _onGrabbed = new Event<WaterlineBelonging>()
  private _onReleased = new Event<WaterlineBelonging>()
  get onPinched(): PublicApi<WaterlineBelonging> { return this._onPinched.publicApi() }
  get onGrabbed(): PublicApi<WaterlineBelonging> { return this._onGrabbed.publicApi() }
  get onReleased(): PublicApi<WaterlineBelonging> { return this._onReleased.publicApi() }

  onAwake() {
    const t = this.getSceneObject().getTransform()
    this.homePos = t.getWorldPosition()
    this.homeRot = t.getWorldRotation()

    // Collider on the unit-scale item root (Hard Rule 6: no scale on collider owners).
    const col = this.getSceneObject().createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    const p = this.hitPaddingCm
    shape.size = new vec3(this.sizeCm.x + p, this.sizeCm.y + p, this.sizeCm.z + p)
    col.shape = shape
    col.fitVisual = false

    this.interactable = this.getSceneObject().createComponent(Interactable.getTypeName()) as Interactable
    this.manipulation = this.getSceneObject().createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    this.manipulation.setCanRotate(false)
    this.manipulation.setCanScale(false)
    this.manipulation.useFilter = false
    this.manipulation.enableStretchZ = false
    this.manipulation.enabled = false

    this.outlineMat = tintedMaterial(this.glowMaterial, new vec4(1, 0.72, 0.2, 1))
    this.outline = buildOutline(this.getSceneObject(), new vec3(this.sizeCm.x + 3, this.sizeCm.y + 3, this.sizeCm.z + 3), 0.7, this.boxMesh, this.outlineMat)
    // drawn after the water (700-850) and the underwater tint (950), so the outline stays bright amber
    for (let i = 0; i < this.outline.getChildrenCount(); i++) {
      const r = this.outline.getChild(i).getComponent("Component.RenderMeshVisual") as RenderMeshVisual
      if (r) r.setRenderOrder(970)
    }
    this.outline.enabled = false

    this.tickMat = tintedMaterial(this.glowMaterial, this.tickColor)
    this.tick = this.buildTick()
    this.tick.enabled = false

    this.createEvent("OnStartEvent").bind(() => {
      this.interactable.onTriggerEnd.add(() => {
        if (!this.grabbable) this._onPinched.invoke(this)
      })
      this.interactable.onHoverEnter.add(() => { this.hovered = true; this.refreshOutline() })
      this.interactable.onHoverExit.add(() => { this.hovered = false; this.refreshOutline() })
      this.manipulation.onManipulationStart.add(() => this._onGrabbed.invoke(this))
      this.manipulation.onManipulationEnd.add(() => this._onReleased.invoke(this))
    })
    this.createEvent("UpdateEvent").bind(() => this.update())
  }

  // ---- public API (called by WaterlineMain / WaterlineGuidance) ----

  /** Show the 'tagged' tick; it fades out within 2 s. */
  showTagged(): void {
    this.tagged = true
    this.tick.enabled = true
    this.tickTimer = 0
    setAlpha(this.tickMat, 1)
  }

  setGrabbable(on: boolean): void {
    this.grabbable = on
    this.manipulation.enabled = on
  }

  isGrabbable(): boolean { return this.grabbable }

  isBeingCarried(): boolean { return this.manipulation.enabled && this.manipulation.isManipulating() }

  /** Outline colour + alpha; alpha 0 hides it (hover highlight may still show). */
  setHighlight(rgb: vec3 | null, alpha: number = 1): void {
    if (rgb) setRgb(this.outlineMat, rgb)
    setAlpha(this.outlineMat, alpha)
    this.highlightOn = rgb !== null && alpha > 0.01
    this.refreshOutline()
  }

  isHighlighted(): boolean { return this.highlightOn }

  getCenterWorldPos(): vec3 { return this.getSceneObject().getTransform().getWorldPosition() }

  getBaseWorldPos(): vec3 {
    return this.getCenterWorldPos().sub(new vec3(0, this.sizeCm.y / 2, 0))
  }

  getTopWorldPos(): vec3 {
    return this.getCenterWorldPos().add(new vec3(0, this.sizeCm.y / 2, 0))
  }

  getSafeSpotWorldPos(): vec3 { return this.safeSpot.getTransform().getWorldPosition() }

  distanceToSafeSpot(): number { return this.getBaseWorldPos().distance(this.getSafeSpotWorldPos()) }

  /** Seat the item on its safe spot. */
  snapToSafeSpot(): void {
    const t = this.getSceneObject().getTransform()
    t.setWorldPosition(this.getSafeSpotWorldPos().add(new vec3(0, this.sizeCm.y / 2, 0)))
    t.setWorldRotation(this.homeRot)
    this.safe = true
  }

  /** Put the item back where it started (between runs). Tag state is kept. */
  resetHome(): void {
    const t = this.getSceneObject().getTransform()
    t.setWorldPosition(this.homePos)
    t.setWorldRotation(this.homeRot)
    this.safe = false
    this.setGrabbable(false)
    this.setHighlight(null, 0)
  }

  /** Home position re-anchored when WaterlineMain shifts the room to the measured floor. */
  rebaseHome(): void {
    const t = this.getSceneObject().getTransform()
    this.homePos = t.getWorldPosition()
    this.homeRot = t.getWorldRotation()
  }

  isTickVisible(): boolean { return this.tick.enabled }
  /** True if the outline is actually drawn this frame (amber, green or hover). */
  isOutlineRendered(): boolean { return this.outline.isEnabledInHierarchy }

  // ---- internals ----

  private refreshOutline(): void {
    if (this.highlightOn) {
      this.outline.enabled = true
      return
    }
    // Targets highlight when aimed at — a faint white outline, only while it is pinchable.
    if (this.hovered && !this.safe) {
      setRgb(this.outlineMat, new vec3(1, 1, 1))
      setAlpha(this.outlineMat, 0.55)
      this.outline.enabled = true
    } else {
      this.outline.enabled = false
    }
  }

  private buildTick(): SceneObject {
    const root = global.scene.createSceneObject("TaggedTick")
    root.setParent(this.getSceneObject())
    root.getTransform().setLocalPosition(new vec3(0, this.sizeCm.y / 2 + 9, 0))
    const th = 1.3
    const shortBar = makeMeshChild(root, "Short", new vec3(-2, -1, 0), new vec3(2.9, th, th), this.boxMesh, this.tickMat)
    shortBar.getTransform().setLocalRotation(quat.angleAxis(-Math.PI / 4, vec3.forward()))
    const longBar = makeMeshChild(root, "Long", new vec3(1.05, 0.3, 0), new vec3(6.2, th, th), this.boxMesh, this.tickMat)
    longBar.getTransform().setLocalRotation(quat.angleAxis((48 * Math.PI) / 180, vec3.forward()))
    return root
  }

  private update(): void {
    if (this.tickTimer >= 0) {
      this.tickTimer += getDeltaTime()
      // hold 1.1 s, fade over 0.8 s → gone within 2 s (brief: "fade within 2 seconds")
      const a = this.tickTimer < 1.1 ? 1 : Math.max(0, 1 - (this.tickTimer - 1.1) / 0.8)
      setAlpha(this.tickMat, a)
      // face the viewer (yaw only)
      const cam = WorldCameraFinderProvider.getInstance().getComponent().getTransform().getWorldPosition()
      const tt = this.tick.getTransform()
      const d = cam.sub(tt.getWorldPosition())
      tt.setWorldRotation(quat.angleAxis(Math.atan2(d.x, d.z), vec3.up()))
      if (a <= 0) {
        this.tick.enabled = false
        this.tickTimer = -1
      }
    }
  }
}
