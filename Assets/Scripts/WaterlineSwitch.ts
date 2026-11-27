/**
 * WaterlineSwitch — the wall mains switch (stand-in), the last step before the water drains.
 *
 * Owns: its SIK collider + Interactable, the glow that shows only when armed, and the rocker
 * flip. Expects: authored on the "MainsSwitch" root (unit scale) with an authored "Glow" child
 * (disabled) and a "Rocker" child. Emits onPressed only while armed.
 * Must not: drain the water or end the run itself (WaterlineMain does).
 */
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

@component
export class WaterlineSwitch extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineSwitch – mains switch</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Glow plate behind the switch, shown only when every flagged item is safe")
  glow!: SceneObject
  @input
  @hint("The rocker that flips when pressed")
  rocker!: SceneObject
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Pinch collider size (cm) — a big target")
  hitSizeCm: vec3 = new vec3(20, 22, 8)
  @ui.group_end

  private interactable!: Interactable
  private armed = false
  private t = 0
  private glowScale = vec3.one()
  private _onPressed = new Event<void>()
  get onPressed(): PublicApi<void> { return this._onPressed.publicApi() }

  onAwake() {
    const col = this.getSceneObject().createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = this.hitSizeCm
    col.shape = shape
    col.fitVisual = false
    this.interactable = this.getSceneObject().createComponent(Interactable.getTypeName()) as Interactable
    this.glowScale = this.glow.getTransform().getLocalScale() // authored size; the pulse scales this
    this.glow.enabled = false
    this.createEvent("OnStartEvent").bind(() => {
      this.interactable.onTriggerEnd.add(() => {
        if (!this.armed) return
        this.armed = false
        this.glow.enabled = false
        this.setRocker(true)
        this._onPressed.invoke()
      })
    })
    this.createEvent("UpdateEvent").bind(() => {
      if (!this.armed) return
      this.t += getDeltaTime()
      const s = 1 + 0.06 * Math.sin(this.t * 4)
      // pulse around the authored size (it used to overwrite it with ~1 cm, so the glow never showed)
      this.glow.getTransform().setLocalScale(new vec3(this.glowScale.x * s, this.glowScale.y * s, this.glowScale.z))
    })
  }

  setArmed(on: boolean): void {
    this.armed = on
    this.glow.enabled = on
    if (on) this.setRocker(false)
  }

  isArmed(): boolean { return this.armed }
  /** True if the glow is actually drawn this frame. */
  isGlowRendered(): boolean { return this.glow.isEnabledInHierarchy }

  private setRocker(off: boolean): void {
    this.rocker.getTransform().setLocalRotation(quat.angleAxis(((off ? -14 : 14) * Math.PI) / 180, vec3.right()))
  }
}
