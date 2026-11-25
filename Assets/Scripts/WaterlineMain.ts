/**
 * WaterlineMain — orchestrates the Waterline flow.
 *
 * Owns: the run state (tagging → choose level → water rising → lifting → all safe → draining →
 * summary → choose level again), the chosen level, the flagged list, the run timer, and which
 * belonging is next. Pushes state into the views (level card, HUD, guidance, switch).
 * Expects: every @input in References wired by the scene bootstrap; belongings are the children
 * of `belongingsRoot` carrying a WaterlineBelonging component.
 * Must not: render UI itself, or own per-item state (each WaterlineBelonging does).
 */
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {WaterlineBelonging} from "./WaterlineBelonging"
import {WaterlineWater} from "./WaterlineWater"
import {WaterlineBody} from "./WaterlineBody"
import {WaterlineGuidance} from "./WaterlineGuidance"
import {WaterlineSwitch} from "./WaterlineSwitch"
import {WaterlineAudio} from "./WaterlineAudio"
import {WaterlineLevelCardUI} from "./WaterlineLevelCardUI"
import {WaterlineHudUI} from "./WaterlineHudUI"
import {flaggedItems, nextItem, summaryLine} from "./WaterlineState"

/** The room is authored with its floor at this world Y (eyes at 0 in the preview). */
const AUTHORED_FLOOR_Y = -160

/** How long after the Lens starts the start-flash watch records every frame (s). */
export const START_WATCH_S = 8

export type RunState = "tagging" | "choose" | "rising" | "lifting" | "allSafe" | "draining" | "summary"

@component
export class WaterlineMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineMain – flood-night flow</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("River-alert card")
  levelCard!: WaterlineLevelCardUI
  @input
  @hint("Depth tag + summary line")
  hud!: WaterlineHudUI
  @input
  @hint("The water")
  water!: WaterlineWater
  @input
  @hint("Ring, depth tag rule, underwater")
  body!: WaterlineBody
  @input
  @hint("Amber item, dotted line, pin, edge arrow")
  guidance!: WaterlineGuidance
  @input
  @hint("Wall mains switch")
  mainsSwitch!: WaterlineSwitch
  @input
  @hint("Placed sound cues")
  audio!: WaterlineAudio
  @input
  @hint("Parent of the five belongings")
  belongingsRoot!: SceneObject
  @ui.group_end
  @ui.separator
  @ui.group_start("Levels")
  @input
  @hint("Level 1 name (river gauge)")
  alertName: string = "Alert"
  @input
  @hint("Level 1 in-room height (cm, sample data)")
  @widget(new SliderWidget(5, 200, 1))
  alertHeightCm: number = 30
  @input
  @hint("Level 2 name")
  warningName: string = "Warning"
  @input
  @hint("Level 2 in-room height (cm, sample data)")
  @widget(new SliderWidget(5, 200, 1))
  warningHeightCm: number = 80
  @input
  @hint("Level 3 name")
  dangerName: string = "Danger"
  @input
  @hint("Level 3 in-room height (cm) — the reported 2021 depth in a Bentong home")
  @widget(new SliderWidget(5, 200, 1))
  dangerHeightCm: number = 150
  @ui.group_end
  @ui.separator
  @ui.group_start("Timing")
  @input
  @hint("Eye height above the floor at start (cm) — the preview floor is 160 cm below the eyes")
  @widget(new SliderWidget(100, 200, 1))
  eyeHeightCm: number = 160
  @input
  @hint("Water rises from the floor over this many seconds")
  @widget(new SliderWidget(1, 10, 0.5))
  riseSeconds: number = 4
  @input
  @hint("Water drains to the floor over this many seconds")
  @widget(new SliderWidget(1, 10, 0.5))
  drainSeconds: number = 3
  @input
  @hint("Summary line stays this many seconds")
  @widget(new SliderWidget(1, 10, 0.5))
  summarySeconds: number = 4
  @input
  @hint("Released within this distance of the safe spot, an item snaps into place (cm)")
  @widget(new SliderWidget(2, 30, 1))
  snapRadiusCm: number = 10
  @ui.group_end
  @ui.separator
  @ui.group_start("Debug")
  @input
  @hint("Print state changes to the log")
  debugLogs: boolean = true
  @ui.group_end

  private items: WaterlineBelonging[] = []
  private state: RunState = "tagging"
  private levelCm = 0
  private flagged: WaterlineBelonging[] = []
  private runStart = 0
  private runSeconds = 0
  private timer = 0
  private anchored = false
  private pendingNextAt = -1
  private awakeAt = 0
  private watchFrames = 0
  private watchFirstFrameS = -1
  private watchEntries: string[] = []
  private watchSeen: {[name: string]: {first: number; last: number; frames: number}} = {}

  onAwake() {
    if (!this.validate()) return
    for (let i = 0; i < this.belongingsRoot.getChildrenCount(); i++) {
      const so = this.belongingsRoot.getChild(i)
      const b = so.getComponent(WaterlineBelonging.getTypeName()) as WaterlineBelonging
      if (b) this.items.push(b)
    }
    this.log(`found ${this.items.length} belongings`)

    this.createEvent("OnStartEvent").bind(() => {
      this.levelCard.setLevels(this.levelNames(), this.levelHeights())
      this.levelCard.onLevelChosen.add((i) => this.chooseLevel(i))
      this.mainsSwitch.onPressed.add(() => this.onMainsPressed())
      for (const it of this.items) {
        it.onPinched.add((b) => this.onItemPinched(b))
        it.onGrabbed.add(() => this.body.setCarrying(true))
        it.onReleased.add((b) => this.onItemReleased(b))
      }
      this.levelCard.hide()
      this.setStartGuidance(this.state === "tagging" && !this.items.some((i) => i.tagged))
    })
    this.createEvent("UpdateEvent").bind(() => this.update())
    this.awakeAt = getTime()
    this.createEvent("LateUpdateEvent").bind(() => this.watchStart())
  }

  // ---------------- public read API (tests + inspector debugging) ----------------

  getState(): RunState { return this.state }
  getLevelCm(): number { return this.levelCm }
  getItems(): WaterlineBelonging[] { return this.items }
  getFlaggedNames(): string[] { return this.flagged.map((b) => b.displayName) }
  getTargetName(): string { const t = this.guidance.getTarget(); return t ? t.displayName : "" }
  getRunSeconds(): number { return this.runSeconds }

  /**
   * Names of everything the Lens itself is showing right now (beyond the stand-in room,
   * belongings, cabinet and switch). Used by the "nothing visible" checks.
   */
  getVisibleLensElements(): string[] {
    const out: string[] = []
    if (this.levelCard.isShown()) out.push("LevelCard")
    if (this.water.isUp()) out.push("Water")
    if (this.body.isRingVisible()) out.push("Ring")
    if (this.hud.isDepthVisible()) out.push("DepthTag")
    if (this.hud.isSummaryVisible()) out.push("Summary")
    if (this.hud.isStartHintVisible()) out.push("StartHint")
    if (this.body.isTintOn()) out.push("UnderwaterTint")
    if (this.guidance.isArrowVisible()) out.push(this.guidance.isStartCueOn() ? "StartChevron" : "EdgeArrow")
    if (this.guidance.isDottedLineVisible()) out.push("DottedLine")
    if (this.mainsSwitch.isArmed()) out.push("SwitchGlow")
    for (const it of this.items) {
      if (it.isHighlighted()) out.push(`Outline:${it.displayName}`)
      if (it.isTickVisible()) out.push(`Tick:${it.displayName}`)
      if (this.guidance.isPinVisible(it)) out.push(`Pin:${it.displayName}`)
    }
    return out
  }

  /**
   * What the Lens is actually drawing this frame (scene objects enabled and not shrunk away),
   * as opposed to what it intends to show. Used by the start-flash check.
   */
  getRenderedLensElements(): string[] {
    const out: string[] = []
    if (this.levelCard.isRendered()) out.push("LevelCard")
    if (this.water.isSurfaceRendered()) out.push("Water")
    if (this.body.isRingVisible()) out.push("Ring")
    if (this.hud.isDepthRendered()) out.push("DepthTag")
    if (this.hud.isSummaryRendered()) out.push("Summary")
    if (this.body.isTintOn()) out.push("UnderwaterTint")
    if (this.hud.isHintRendered()) out.push("StartHint")
    if (this.guidance.isArrowVisible()) out.push(this.guidance.isStartCueOn() ? "StartChevron" : "EdgeArrow")
    if (this.guidance.isDottedLineVisible()) out.push("DottedLine")
    if (this.mainsSwitch.isGlowRendered()) out.push("SwitchGlow")
    for (const it of this.items) {
      if (it.isOutlineRendered()) out.push(`Outline:${it.displayName}`)
      if (it.isTickVisible()) out.push(`Tick:${it.displayName}`)
      if (this.guidance.isPinVisible(it)) out.push(`Pin:${it.displayName}`)
    }
    return out
  }

  /**
   * Every frame of the first START_WATCH_S seconds after the Lens starts: what was drawn.
   * frames = frames sampled; entries = "t s [elements]" whenever the drawn set changed.
   */
  getStartWatch(): {done: boolean; frames: number; firstFrameS: number; entries: string[]; seen: {[name: string]: {first: number; last: number; frames: number}}} {
    return {
      done: getTime() - this.awakeAt >= START_WATCH_S,
      frames: this.watchFrames,
      firstFrameS: this.watchFirstFrameS,
      entries: this.watchEntries,
      seen: this.watchSeen,
    }
  }

  private watchStart(): void {
    const t = getTime() - this.awakeAt
    if (t > START_WATCH_S) return
    if (this.watchFirstFrameS < 0) this.watchFirstFrameS = t
    this.watchFrames++
    const els = this.getRenderedLensElements()
    for (const e of els) {
      const s = this.watchSeen[e]
      if (s) { s.last = t; s.frames++ } else this.watchSeen[e] = {first: t, last: t, frames: 1}
    }
    const line = `[${els.join(", ")}]`
    const prev = this.watchEntries.length ? this.watchEntries[this.watchEntries.length - 1] : ""
    if (!prev.endsWith(line) && this.watchEntries.length < 60) this.watchEntries.push(`${t.toFixed(2)} s ${line}`)
  }

  /**
   * Return to the level card with the water down and every belonging back home (tags kept).
   * Used between test scenarios; the normal flow reaches the same state after the summary.
   */
  restartRun(): void {
    this.water.animateTo(0, 0.01)
    this.water.setRain(false)
    this.guidance.clearAll(this.items)
    this.mainsSwitch.setArmed(false)
    this.hud.hideSummary()
    this.body.setCarrying(false)
    for (const it of this.items) it.resetHome()
    this.flagged = []
    this.levelCm = 0
    this.pendingNextAt = -1
    if (this.items.every((i) => i.tagged)) {
      this.setState("choose")
      this.levelCard.show()
    } else {
      this.setState("tagging")
      this.levelCard.hide()
    }
    this.setStartGuidance(this.state === "tagging" && !this.items.some((i) => i.tagged))
  }

  /** First-time guidance: the hint line and the chevron toward the belongings. Off after the first tag. */
  private setStartGuidance(on: boolean): void {
    this.hud.setStartHint(on)
    this.guidance.setStartCue(on ? this.items : null)
  }

  // ---------------- flow ----------------

  private onItemPinched(b: WaterlineBelonging): void {
    if (this.state !== "tagging" && this.state !== "choose") return
    const first = !b.tagged
    b.showTagged()
    this.setStartGuidance(false)
    this.audio.playTagPop(b.getCenterWorldPos())
    if (first) this.log(`tagged ${b.displayName}`)
    if (this.state === "tagging" && this.items.every((i) => i.tagged)) {
      this.setState("choose")
      this.levelCard.show()
    }
  }

  private chooseLevel(index: number): void {
    if (this.state !== "choose") return
    this.levelCm = this.levelHeights()[index]
    this.levelCard.hide()
    this.flagged = flaggedItems(this.items, this.levelCm)
    this.log(`level ${this.levelNames()[index]} ${this.levelCm} cm flags [${this.getFlaggedNames().join(", ")}]`)
    this.runStart = getTime()
    this.water.animateTo(this.levelCm, this.riseSeconds)
    this.water.setRain(true)
    this.setState("rising")
  }

  private onItemReleased(b: WaterlineBelonging): void {
    this.body.setCarrying(false)
    // ignore duplicate / late release events for an item already on its safe spot
    if (this.state !== "lifting" || b.safe || this.guidance.getTarget() !== b) return
    const d = b.distanceToSafeSpot()
    this.log(`released ${b.displayName} ${d.toFixed(1)} cm from its safe spot`)
    if (d <= this.snapRadiusCm) {
      b.snapToSafeSpot()
      b.setGrabbable(false)
      this.guidance.markSafe(b)
      this.audio.playSafeTick(b.getCenterWorldPos())
      // the next lowest item lights up as the green fades
      this.pendingNextAt = getTime() + this.guidance.greenSeconds
    }
    // otherwise it stays amber and stays the target
  }

  private lightNext(): void {
    const n = nextItem(this.items, this.levelCm)
    for (const it of this.items) it.setGrabbable(it === n)
    if (n) {
      this.guidance.setTarget(n)
      this.log(`next: ${n.displayName}`)
      this.setState("lifting")
    } else {
      this.guidance.setTarget(null)
      this.mainsSwitch.setArmed(true)
      this.setState("allSafe")
    }
  }

  private onMainsPressed(): void {
    if (this.state !== "allSafe") return
    this.runSeconds = getTime() - this.runStart
    this.audio.playSwitchClick(this.mainsSwitch.getSceneObject().getTransform().getWorldPosition())
    this.water.animateTo(0, this.drainSeconds)
    this.water.setRain(false)
    const cam = WorldCameraFinderProvider.getInstance().getComponent().getTransform().getWorldPosition()
    this.audio.playBirds(cam.add(new vec3(0, 60, 0)))
    this.timer = 0
    this.setState("draining")
  }

  private update(): void {
    if (!this.anchored) this.anchorToFloor()
    const dt = getDeltaTime()

    if (this.state === "rising" && !this.water.isAnimating()) {
      this.lightNext()
    }
    if (this.state === "lifting" && this.pendingNextAt > 0 && getTime() >= this.pendingNextAt) {
      this.pendingNextAt = -1
      this.lightNext()
    }
    if (this.state === "draining" && !this.water.isAnimating()) {
      const saved = this.flagged.filter((b) => b.safe).length
      this.hud.showSummary(summaryLine(saved, this.flagged.length, this.runSeconds))
      this.log(`summary: ${this.hud.getSummaryText()}`)
      this.timer = 0
      this.setState("summary")
    }
    if (this.state === "summary") {
      this.timer += dt
      if (this.timer >= this.summarySeconds) {
        this.hud.hideSummary()
        for (const it of this.items) it.resetHome()
        this.guidance.clearAll(this.items)
        this.levelCard.show()
        this.setState("choose")
      }
    }
  }

  /** The room is authored with the floor 160 cm below the eyes; re-anchor to the measured eyes. */
  private anchorToFloor(): void {
    this.anchored = true
    const camY = WorldCameraFinderProvider.getInstance().getComponent().getTransform().getWorldPosition().y
    const floorY = camY - this.eyeHeightCm
    const shift = floorY - AUTHORED_FLOOR_Y
    if (Math.abs(shift) > 0.5) {
      const t = this.getSceneObject().getTransform()
      t.setWorldPosition(t.getWorldPosition().add(new vec3(0, shift, 0)))
      for (const it of this.items) it.rebaseHome()
      this.water.collectSolids()
      this.log(`re-anchored room by ${shift.toFixed(1)} cm (floor at world y ${floorY.toFixed(1)})`)
    }
  }

  private levelNames(): string[] { return [this.alertName, this.warningName, this.dangerName] }
  private levelHeights(): number[] { return [this.alertHeightCm, this.warningHeightCm, this.dangerHeightCm] }

  private setState(s: RunState): void {
    if (this.state !== s) this.log(`state ${this.state} -> ${s}`)
    this.state = s
  }

  private validate(): boolean {
    const missing: string[] = []
    if (!this.levelCard) missing.push("levelCard")
    if (!this.hud) missing.push("hud")
    if (!this.water) missing.push("water")
    if (!this.body) missing.push("body")
    if (!this.guidance) missing.push("guidance")
    if (!this.mainsSwitch) missing.push("mainsSwitch")
    if (!this.audio) missing.push("audio")
    if (!this.belongingsRoot) missing.push("belongingsRoot")
    if (missing.length > 0) {
      print(`[Waterline] ERROR: unwired inputs: ${missing.join(", ")}`)
      return false
    }
    return true
  }

  private log(s: string): void {
    if (this.debugLogs) print(`[Waterline] ${s}`)
  }
}
