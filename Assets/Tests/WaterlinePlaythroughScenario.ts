/**
 * WaterlinePlaythroughScenario — a first-time playthrough, not a pass/fail test.
 *
 * Plays the whole flow from the Start pose the way a first-time user would, through LEAF/SIK only:
 * the head moves at a modelled human pace (turn 120°/s, walk 1 m/s, 0.6 s to react to something new)
 * and the user only acts on what is in view or what a cue points to. When the next thing to do is
 * out of view and nothing points to it, that is logged as a PROBLEM and the user has to search
 * (a scan, which costs time). Overlaps between visible panels / cues are checked at every
 * checkpoint, and reach (distance, height) is logged for every pinch, grab and drop.
 *
 * Parameters: level = Danger | Alert | Warning; stopAt = a checkpoint id to stop and hold at
 * (camera kept, LEAF hands hidden) for a screenshot, or "none" to play to the end;
 * view = how to frame the held view: "none" (as played), "look:<SceneObjectName>" (stay, look at it)
 * or "x,z,yaw,pitch[,eyeCm]" (stand there: yaw 0 = facing -Z, +90 = facing -X; pitch + = up).
 * Output: "[Play]" lines — a step timeline, PROBLEM lines (with the checkpoint to stop at), and a
 * final timing table.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {ScenarioConfig} from "Leaf.lspkg/Scenarios/scenario/ScenarioConfig"
import {sleep, nextFrame, findSceneObjectByName} from "Leaf.lspkg/Utils/common/Utils"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {LeafHandInteractor} from "Leaf.lspkg/Interactors/interactor/LeafTwoHandInteractor"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {CameraRig, floorY, guidance, item, ITEM_OBJECTS, main, pinch, waitUntil, water} from "./WaterlineTestKit"
import {WaterlineBelonging} from "../Scripts/WaterlineBelonging"

const TURN_DEG_PER_S = 120
const WALK_CM_PER_S = 100
const REACT_S = 0.6
const SEARCH_S = 1.5 // extra time spent looking around when nothing says where to look

class StopHere extends Error {}

type Rect = {name: string; x0: number; y0: number; x1: number; y1: number}

@component
export class WaterlinePlaythroughScenario extends Scenario {
  private level = "Danger"
  private stopAt = "none"
  private view = "none"
  private t0 = 0
  private stepStart = 0
  private steps: string[] = []
  private problems: string[] = []
  private yaw = 0
  private pitch = 0
  private pos = vec3.zero()
  /** per lift: modelled human carry time minus the LEAF hand's carry time (s) */
  private carryModel: number[] = []

  async run(config?: ScenarioConfig): Promise<void> {
    this.level = (config && config.get("level")) || "Danger"
    this.stopAt = (config && config.get("stopAt")) || "none"
    this.view = (config && config.get("view")) || "none"
    print(`[Play] ===== first-time playthrough at ${this.level} (stopAt=${this.stopAt}) =====`)
    print(`[Play] pace model: turn ${TURN_DEG_PER_S}°/s, walk ${WALK_CM_PER_S / 100} m/s, react ${REACT_S} s, search +${SEARCH_S} s`)
    await sleep(1000)
    CameraRig.take()
    let stopped = false
    try {
      this.pos = CameraRig.standingAt(0, 0)
      this.yaw = 0
      this.pitch = 0
      CameraRig.setPose(this.pos, 0, 0)
      await nextFrame()
      this.t0 = getTime()
      this.stepStart = this.t0
      await this.play()
    } catch (e) {
      if (e instanceof StopHere) {
        stopped = true
        print(`[Play] STOPPED at checkpoint "${this.stopAt}" — holding this view`)
      } else {
        throw e
      }
    } finally {
      if (!stopped) {
        print("[Play] ---- step times ----")
        for (const s of this.steps) print(`[Play] ${s}`)
        print(`[Play] ---- problems (${this.problems.length}) ----`)
        for (const p of this.problems) print(`[Play] ${p}`)
        const adj = this.carryModel.reduce((a, b) => a + b, 0)
        print(`[Play] total ${(getTime() - this.t0).toFixed(1)} s as played; ${(getTime() - this.t0 + adj).toFixed(1)} s with carries at the modelled pace`)
        CameraRig.release()
      }
    }
  }

  // ------------------------------------------------------------ the flow

  private async play(): Promise<void> {
    const m = main()
    await this.checkpoint("start")

    // ---- tagging: follow the hint — look down at what is below ----
    await sleep(REACT_S * 1000)
    const low = ITEM_OBJECTS.filter((n) => item(n).getBaseWorldPos().y - floorY() < 50)
    const lowC = this.centroid(low.map((n) => item(n).getCenterWorldPos()))
    await this.lookAt(lowC)
    await this.checkpoint("looked-down")
    let k0 = 0
    for (const n of low) {
      if (!this.inView(item(n).getCenterWorldPos())) await this.lookAt(item(n).getCenterWorldPos())
      await this.reachLog(`pinch ${item(n).displayName}`, item(n).getCenterWorldPos())
      await pinch(n)
      k0++
      if (k0 === 1) await this.checkpoint("tag1")
      if (k0 === 2 && this.stopAt === "quiet") {
        // screenshot runs only: two tagged, ticks faded, nothing from the Lens on screen
        await waitUntil(() => !ITEM_OBJECTS.some((x) => item(x).isTickVisible()), 4)
        await this.checkpoint("quiet")
      }
      await sleep(400)
    }
    await this.checkpoint("tagged-low")
    // are there more to tag, and does anything say so?
    const rest = ITEM_OBJECTS.filter((n) => !item(n).tagged)
    if (rest.length > 0) {
      const seen = rest.filter((n) => this.inView(item(n).getCenterWorldPos()))
      if (seen.length === 0 && guidance().isArrowVisible()) {
        print(`[Play] ${this.now()} ${rest.length} more to tag, out of view; the edge cue (${guidance().getArrowMode()}) points to them`)
      }
      if (seen.length === 0 && !guidance().isArrowVisible()) {
        this.problem("tagged-low", `after tagging the ${low.length} low belongings, ${rest.length} more (${rest.map((n) => item(n).displayName).join(", ")}) are out of view and nothing tells me they exist or where they are`)
        await this.search()
      }
      for (const n of rest) {
        await this.walkNear(item(n).getCenterWorldPos(), 90)
        await this.lookAt(item(n).getCenterWorldPos())
        await this.reachLog(`pinch ${item(n).displayName}`, item(n).getCenterWorldPos())
        await pinch(n)
        await sleep(400)
      }
    }
    this.step("tagging (5 pinches)")
    await this.checkpoint("tagged-all")

    // ---- the river-alert card ----
    // the card comes ~1 s after the fifth tick fades
    const waited = await waitUntil(() => m.levelCard.isRendered(), 6)
    if (waited < 0) this.problem("tagged-all", "the river-alert card did not appear after the fifth tag")
    else print(`[Play] ${this.now()} the river-alert card appeared ${waited.toFixed(1)} s after the fifth pinch`)
    await sleep(REACT_S * 1000)
    const card = findSceneObjectByName("LevelCardPanel")
    const cardPos = card.getTransform().getWorldPosition()
    if (!this.inView(cardPos)) {
      this.problem("tagged-all", `the river-alert card appeared ${this.angleTo(cardPos).toFixed(0)}° away from where I am looking (it stays where the start view was), and nothing points to it`)
      await this.search()
    }
    await this.walkNear(cardPos, 80)
    await this.lookAt(cardPos)
    this.step("finding the river-alert card")
    await this.checkpoint("card")
    await sleep(REACT_S * 1000)
    const btn = findInteractableByName(`${this.level}Button`, undefined, true)
    if (!btn) throw new Error(`${this.level}Button not found`)
    const btnPos = btn.getSceneObject().getTransform().getWorldPosition()
    await this.reachLog(`press ${this.level}`, btnPos)
    await pinch(`${this.level}Button`)
    this.step(`choosing a level (${this.level})`)

    // ---- water rises ----
    await sleep(500)
    // watch the water come up, looking level (the brief's "seeing the water" look)
    await this.lookAt(this.pos.add(this.flatForward().uniformScale(200)).add(new vec3(0, -10, 0)))
    await this.checkpoint("rising")
    await waitUntil(() => water().getLevelCm() >= 0.5 * m.levelHeightFor(this.level), 8)
    await this.checkpoint("half")
    await waitUntil(() => m.getState() === "lifting" || m.getState() === "allSafe", 8)
    this.step(`water rising to ${m.getLevelCm()} cm`)
    await this.checkpoint("risen")

    // ---- lifts ----
    let k = 0
    while (m.getState() === "lifting") {
      const tgt = guidance().getTarget()
      if (!tgt) { await nextFrame(); continue }
      k++
      await this.liftOne(tgt, k)
    }

    // ---- the mains switch ----
    const sw = m.mainsSwitch.getSceneObject().getTransform().getWorldPosition()
    await this.checkpoint("all-safe")
    await sleep(REACT_S * 1000)
    if (!this.inView(sw) && guidance().isArrowVisible()) {
      print(`[Play] ${this.now()} the switch glows ${this.angleTo(sw).toFixed(0)}° away; the edge cue (${guidance().getArrowMode()}) points to it`)
    } else if (!this.inView(sw)) {
      this.problem("all-safe", `every item is safe and the switch glows, but it is ${this.angleTo(sw).toFixed(0)}° away from where I am looking and nothing points to it`)
      await this.search()
    }
    await this.walkNear(sw, 70)
    await this.lookAt(sw)
    await this.checkpoint("switch")
    await this.reachLog("pinch the mains switch", sw)
    await pinch("MainsSwitch")
    this.step("finding and pinching the switch")

    // ---- ending ----
    await sleep(500)
    await this.lookAt(this.pos.add(this.flatForward().uniformScale(200)))
    await waitUntil(() => m.getState() === "summary", 6)
    this.step("water draining")
    await sleep(800)
    await this.checkpoint("summary")
    await waitUntil(() => m.getState() === "choose", 8)
    this.step("summary line on screen")
    await sleep(500)
    const cardBack = card.getTransform().getWorldPosition()
    if (!this.inView(cardBack)) {
      this.problem("card-again", `the river-alert card came back ${this.angleTo(cardBack).toFixed(0)}° away from where I am looking; nothing points to it`)
    }
    await this.checkpoint("card-again")
  }

  private async liftOne(tgt: WaterlineBelonging, k: number): Promise<void> {
    const name = tgt.displayName
    const cp = `lift${k}`
    await sleep(REACT_S * 1000)
    // find it: in view, or follow the edge cue
    if (!this.inView(tgt.getCenterWorldPos())) {
      if (guidance().isArrowVisible()) {
        print(`[Play] ${this.now()} ${name} is out of view; the edge cue (${guidance().getArrowMode()}) points to it`)
      } else {
        this.problem(cp, `${name} is next but out of view and nothing points to it`)
        await this.search()
      }
    }
    await this.checkpoint(`${cp}-find`)
    // walk up to it and grab
    await this.walkNear(tgt.getCenterWorldPos(), 70)
    await this.lookAt(tgt.getCenterWorldPos())
    await this.checkpoint(`${cp}-at-item`)
    await this.reachLog(`grab ${name}`, tgt.getCenterWorldPos())
    // carry it to the cabinet, walking while holding it
    const spot = tgt.getSafeSpotWorldPos()
    const standAtCab = new vec3(spot.x, this.pos.y, spot.z + 60)
    const startPos = this.pos
    const it = findInteractableByName(tgt.getSceneObject().name, undefined, true)
    if (!it) throw new Error(`${name} interactable not found`)
    const hand = LeafHandInteractor.get("right")
    let pinSeen = false
    let lineSeen = false
    const carryT0 = getTime()
    for (let attempt = 0; attempt < 12 && !tgt.safe; attempt++) {
      const f = Math.min(1, (attempt + 1) / 3)
      this.pos = vec3.lerp(startPos, standAtCab, f)
      const remaining = spot.sub(tgt.getBaseWorldPos())
      if (remaining.length < 2) break
      CameraRig.lookAt(this.pos, tgt.getCenterWorldPos())
      this.syncAngles(tgt.getCenterWorldPos())
      await nextFrame()
      const stepLen = 6
      const dir = remaining.normalize()
      const total = Math.min(remaining.length, 90)
      let moved = 0
      const step = vec3.zero()
      const unsub = it.onDragUpdate.add(() => {
        const s = Math.min(stepLen, Math.max(0, total - moved))
        step.x = dir.x * s; step.y = dir.y * s; step.z = dir.z * s
        moved += s
      })
      try {
        await hand.drag(it, step, Math.max(700, (total / stepLen) * 40))
      } finally {
        unsub()
      }
      if (attempt === 0 && !tgt.safe) {
        // halfway: glance up at where it goes, as a person carrying it would
        const pinHead = spot.add(new vec3(0, 10, 0))
        await this.lookAt(pinHead)
        pinSeen = guidance().isPinVisible(tgt) && this.inView(pinHead)
        lineSeen = guidance().isDottedLineVisible()
        await this.checkpoint(`${cp}-carrying`)
      }
      await sleep(80)
    }
    const carryS = getTime() - carryT0
    const walked = startPos.distance(standAtCab)
    print(`[Play] ${this.now()} carry of ${name}: LEAF hand took ${carryS.toFixed(1)} s; at the modelled pace (walk ${(walked / 100).toFixed(1)} m + 1 s grab + 1 s place) it is ${(walked / WALK_CM_PER_S + 2).toFixed(1)} s`)
    this.carryModel.push(walked / WALK_CM_PER_S + 2 - carryS)
    await this.reachLog(`drop ${name} on its safe spot`, spot)
    if (!tgt.safe) this.problem(cp, `${name} did not snap after 10 carries (${tgt.distanceToSafeSpot().toFixed(1)} cm away)`)
    if (!pinSeen) this.problem(`${cp}-carrying`, `glancing at the cabinet while carrying ${name}, its pin was not in view`)
    if (!lineSeen) this.problem(`${cp}-carrying`, `while carrying ${name}, the dotted line was hidden`)
    this.step(`lift ${k}: ${name} (walked ${startPos.distance(standAtCab).toFixed(0)} cm)`)
    await this.checkpoint(`${cp}-placed`)
    await sleep(1300) // green fades, next lights
  }

  // ------------------------------------------------------------ head movement (human pace)

  private forward(): vec3 {
    const y = (this.yaw * Math.PI) / 180, p = (this.pitch * Math.PI) / 180
    return new vec3(-Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p))
  }
  private flatForward(): vec3 {
    const y = (this.yaw * Math.PI) / 180
    return new vec3(-Math.sin(y), 0, -Math.cos(y))
  }
  private anglesTo(p: vec3): {yaw: number; pitch: number} {
    const d = p.sub(this.pos)
    return {
      yaw: (Math.atan2(-d.x, -d.z) * 180) / Math.PI,
      pitch: (Math.atan2(d.y, Math.sqrt(d.x * d.x + d.z * d.z)) * 180) / Math.PI,
    }
  }
  private syncAngles(p: vec3): void {
    const a = this.anglesTo(p)
    this.yaw = a.yaw
    this.pitch = a.pitch
  }
  private angleTo(p: vec3): number {
    const d = p.sub(this.pos).normalize()
    return (Math.acos(Math.max(-1, Math.min(1, d.dot(this.forward())))) * 180) / Math.PI
  }

  /** Turn the head to look at p, at the modelled turn speed. */
  private async lookAt(p: vec3): Promise<void> {
    const a = this.anglesTo(p)
    let dy = a.yaw - this.yaw
    while (dy > 180) dy -= 360
    while (dy < -180) dy += 360
    const dp = a.pitch - this.pitch
    const dur = Math.max(0.15, Math.sqrt(dy * dy + dp * dp) / TURN_DEG_PER_S)
    const y0 = this.yaw, p0 = this.pitch, s = getTime()
    while (true) {
      const f = Math.min(1, (getTime() - s) / dur)
      const e = f * f * (3 - 2 * f)
      this.yaw = y0 + dy * e
      this.pitch = p0 + dp * e
      CameraRig.setPose(this.pos, this.yaw, this.pitch)
      if (f >= 1) break
      await nextFrame()
    }
    await nextFrame()
  }

  /** Walk (standing height) until within `distCm` (horizontal) of p, facing it. */
  private async walkNear(p: vec3, distCm: number): Promise<void> {
    const flat = new vec3(p.x - this.pos.x, 0, p.z - this.pos.z)
    const d = flat.length
    if (d <= distCm) return
    await this.lookAt(new vec3(p.x, this.pos.y, p.z))
    const to = this.pos.add(flat.normalize().uniformScale(d - distCm))
    const from = this.pos, dur = (d - distCm) / WALK_CM_PER_S, s = getTime()
    while (true) {
      const f = Math.min(1, (getTime() - s) / dur)
      this.pos = vec3.lerp(from, to, f)
      CameraRig.setPose(this.pos, this.yaw, this.pitch)
      if (f >= 1) break
      await nextFrame()
    }
  }

  /** Looking around with no cue: costs time (it is counted in the step). */
  private async search(): Promise<void> {
    print(`[Play] ${this.now()} searching (no cue)`)
    await sleep(SEARCH_S * 1000)
  }

  private inView(p: vec3): boolean { return guidance().isInView(p) }

  private centroid(ps: vec3[]): vec3 {
    let c = vec3.zero()
    for (const p of ps) c = c.add(p)
    return c.uniformScale(1 / Math.max(1, ps.length))
  }

  // ------------------------------------------------------------ logging + checks

  private now(): string { return `t=${(getTime() - this.t0).toFixed(1)}s` }

  private step(label: string): void {
    const t = getTime()
    const line = `${label}: ${(t - this.stepStart).toFixed(1)} s (at ${(t - this.t0).toFixed(1)} s)`
    this.steps.push(line)
    print(`[Play] ${this.now()} STEP ${line}`)
    this.stepStart = t
  }

  private problem(checkpoint: string, text: string): void {
    const line = `PROBLEM [${checkpoint}] ${text}`
    if (this.problems.indexOf(line) < 0) this.problems.push(line)
    print(`[Play] ${this.now()} ${line}`)
  }

  private async reachLog(what: string, p: vec3): Promise<void> {
    const eye = CameraRig.position()
    const flat = Math.sqrt((p.x - eye.x) * (p.x - eye.x) + (p.z - eye.z) * (p.z - eye.z))
    const h = p.y - floorY()
    print(`[Play] ${this.now()} REACH ${what}: ${flat.toFixed(0)} cm away, ${h.toFixed(0)} cm above the floor (eyes at ${(eye.y - floorY()).toFixed(0)} cm)`)
    if (h >= eye.y - floorY() - 5) this.problem(`reach`, `${what}: at ${h.toFixed(0)} cm, level with or above my eyes`)
    if (flat > 150) this.problem(`reach`, `${what}: ${flat.toFixed(0)} cm away when I act`)
  }

  /** Overlap check of everything drawn on screen, then stop here if asked. */
  private async checkpoint(id: string): Promise<void> {
    await nextFrame()
    const rects = this.visibleRects()
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j]
        if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) {
          this.problem(id, `${a.name} overlaps ${b.name} on screen`)
        }
      }
    }
    const drawn = main().getRenderedLensElements()
    if (drawn.indexOf("DepthTag") >= 0 && !main().hud.isDepthOnTop()) {
      this.problem(id, "the depth tag is drawn with depth testing on, so furniture can cut it off")
    }
    print(`[Play] ${this.now()} checkpoint ${id}: drawn [${drawn.join(", ")}]`)
    if (id === this.stopAt) {
      // screenshot runs only: hold the water where it is, so a mid-rise shot shows mid-rise
      // (a very slow animation to the same level: the rise stays "in progress", so nothing else lights up)
      if (id === "half") water().animateTo(water().getLevelCm(), 1000)
      // ...and keep a just-snapped item green (the green would fade, and the next light up, within ~1 s)
      if (id === "summary") main().summarySeconds = 1000 // keep the summary line up for its shot
      if (id.endsWith("-placed")) {
        guidance().greenSeconds = 1000
        main().holdNextForScreenshot()
      }
      this.applyView()
      await LeafHandInteractor.get("right").hand.hide()
      await LeafHandInteractor.get("left").hand.hide()
      const hv = findSceneObjectByName("HandVisuals")
      if (hv) hv.enabled = false
      // screenshot runs only: hide LEAF's own on-screen log (its "PASSED" banner)
      const leafLog = findSceneObjectByName("LeafDebugUICamera")
      if (leafLog) leafLog.enabled = false
      // let the depth tag's soft follow settle (a tick fades within 2 s and the green within ~1.4 s,
      // so those shots are taken sooner)
      await sleep(id === "tag1" || id.endsWith("-placed") ? 100 : 1200)
      throw new StopHere()
    }
  }

  /** Frame the held view for a screenshot (see the `view` parameter). */
  private applyView(): void {
    const v = this.view
    if (!v || v === "none") return
    if (v.indexOf("look:") === 0) {
      const so = findSceneObjectByName(v.substring(5))
      if (so) CameraRig.lookAt(CameraRig.position(), so.getTransform().getWorldPosition())
      return
    }
    const n = v.split(",").map((s) => parseFloat(s))
    if (n.length >= 4) {
      const eye = n.length >= 5 ? n[4] : 160
      CameraRig.setPose(new vec3(n[0], floorY() + eye, n[1]), n[2], n[3])
    }
  }

  private visibleRects(): Rect[] {
    const out: Rect[] = []
    const m = main()
    const panel = (name: string, label: string) => {
      const so = findSceneObjectByName(name)
      if (!so || !so.isEnabledInHierarchy || so.getTransform().getWorldScale().x < 0.01) return
      const bp = so.getComponent(BackPlate.getTypeName()) as BackPlate
      if (!bp) return
      const s = bp.size
      const wt = so.getTransform().getWorldTransform()
      const r = this.screenRect(label, [
        wt.multiplyPoint(new vec3(-s.x / 2, -s.y / 2, 0)), wt.multiplyPoint(new vec3(s.x / 2, -s.y / 2, 0)),
        wt.multiplyPoint(new vec3(-s.x / 2, s.y / 2, 0)), wt.multiplyPoint(new vec3(s.x / 2, s.y / 2, 0)),
      ])
      if (r) out.push(r)
    }
    panel("StartHint", "hint line")
    panel("DepthTag", "depth tag")
    panel("SummaryLine", "summary line")
    if (m.levelCard.isRendered()) panel("LevelCardPanel", "river-alert card")
    const g = guidance()
    if (g.isArrowVisible()) {
      const a = g.edgeArrow
      if (a) {
        const p = a.getTransform().getWorldPosition(), s = a.getTransform().getWorldScale().x
        const cam = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
        const r = this.screenRect(g.isStartCueOn() ? "start chevron" : "edge cue", [
          p.add(cam.right.uniformScale(-s / 2)).add(cam.up.uniformScale(-s / 2)),
          p.add(cam.right.uniformScale(s / 2)).add(cam.up.uniformScale(s / 2)),
        ])
        if (r) out.push(r)
      }
    }
    const tgt = g.getTarget()
    if (tgt && g.isPinVisible(tgt)) {
      const h = tgt.getSafeSpotWorldPos().add(new vec3(0, 10, 0))
      const r = this.screenRect("pin", [h.add(new vec3(-2, -2, 0)), h.add(new vec3(2, 2, 0))])
      if (r) out.push(r)
    }
    return out
  }

  private screenRect(name: string, ps: vec3[]): Rect | null {
    const cam = WorldCameraFinderProvider.getInstance().getComponent()
    const camT = cam.getTransform()
    const look = camT.forward.uniformScale(-1)
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
    for (const p of ps) {
      if (p.sub(camT.getWorldPosition()).dot(look) <= 0) return null
      const s = cam.worldSpaceToScreenSpace(p)
      x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y)
    }
    if (x1 < 0 || x0 > 1 || y1 < 0 || y0 > 1) return null
    return {name, x0, y0, x1, y1}
  }
}
