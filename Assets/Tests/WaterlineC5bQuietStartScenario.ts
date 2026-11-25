/**
 * Done criterion 5 (second sentence) — before any level is pressed, nothing from the Lens is
 * visible apart from the tagging step and the level card.
 * Runs first after a Lens reset:
 *  1. Start flash: every frame of the first 8 s after the restart (recorded by WaterlineMain from
 *     its first frame), with no input, may draw only the tagging step's first-time hint line and
 *     its bottom chevron — never the level card, depth tag, summary, water or any other panel.
 *  2. The first tag hides the hint and the chevron; each tick fades within 2 s; nothing else shows.
 *  3. After the fifth tag, the level card appears on its own.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep, nextFrame} from "Leaf.lspkg/Utils/common/Utils"
import {CameraRig, item, ITEM_OBJECTS, main, pinch, waitUntil} from "./WaterlineTestKit"

/** Allowed during the untouched start: the tagging step's first-time guidance. */
const START_ALLOWED = ["StartHint", "StartChevron"]

@component
export class WaterlineC5bQuietStartScenario extends Scenario {
  async run(): Promise<void> {
    const m = main()

    // ---- 1. start flash: every frame of the first 8 s, untouched ----
    const fresh = m.getState() === "tagging" && ITEM_OBJECTS.every((n) => !item(n).tagged)
    await waitUntil(() => m.getStartWatch().done, 20)
    const w = m.getStartWatch()
    print(`[C5b] start watch: ${w.frames} frames sampled, first at ${w.firstFrameS.toFixed(3)} s after start`)
    for (const e of w.entries) print(`[C5b]   ${e}`)
    const seenNames = Object.keys(w.seen)
    for (const n of seenNames) {
      const s = w.seen[n]
      print(`[C5b]   drawn ${n}: ${s.frames} frames, ${s.first.toFixed(2)}–${s.last.toFixed(2)} s`)
    }
    expect(fresh, "scenario starts from a fresh Lens restart (nothing tagged)").toBe(true)
    expect(w.firstFrameS >= 0 && w.firstFrameS < 0.5, "watch starts on the Lens's first frames").toBe(true)
    expect(w.frames >= 8 * 15, "at least 15 frames per second sampled for 8 s").toBe(true)
    const forbidden = seenNames.filter((n) => START_ALLOWED.indexOf(n) < 0)
    expect(forbidden.join(", "), "nothing but the first-time hint and chevron drawn in the first 8 s").toBe("")
    expect(!!w.seen["StartHint"], "first-time hint line shows at the start").toBe(true)
    expect(!!w.seen["StartChevron"], "bottom chevron toward the belongings shows at the start").toBe(true)
    const nowDrawn = m.getRenderedLensElements()
    expect(nowDrawn.join(","), "at 8 s: the hint and the chevron, nothing else").toBe("StartHint,StartChevron")

    // ---- 2. tagging ----
    CameraRig.take()
    try {
      let worstTickS = 0
      let first = true
      for (const name of ITEM_OBJECTS) {
        if (item(name).tagged) continue
        CameraRig.lookAt(CameraRig.standingAt(0, 0), item(name).getCenterWorldPos())
        await nextFrame()
        await pinch(name)
        await nextFrame()
        if (first) {
          const afterFirst = m.getRenderedLensElements().filter((e) => START_ALLOWED.indexOf(e) >= 0)
          print(`[C5b] after the first tag, guidance still drawn: [${afterFirst.join(", ")}]`)
          expect(afterFirst.length, "hint and chevron disappear after the first tag").toBe(0)
          first = false
        }
        const shown = item(name).isTickVisible()
        const t = await waitUntil(() => !item(name).isTickVisible(), 3)
        worstTickS = Math.max(worstTickS, t)
        const others = m.getRenderedLensElements().filter((e) => e !== "LevelCard" && !e.startsWith("Outline:"))
        print(`[C5b] tagged ${name}: tick shown=${shown}, faded after ${t.toFixed(2)} s; other Lens elements: [${others.join(", ")}]`)
        expect(shown, `${name}: tick appears on pinch`).toBe(true)
        expect(t >= 0 && t <= 2.1, `${name}: tick fades within 2 s`).toBe(true)
        expect(others.length, "nothing else visible during tagging").toBe(0)
        if (name !== ITEM_OBJECTS[ITEM_OBJECTS.length - 1]) {
          expect(m.getRenderedLensElements().indexOf("LevelCard") < 0, "no level card before the fifth tag").toBe(true)
        }
      }

      // ---- 3. the level card, on its own ----
      await sleep(400)
      const beforeLevel = m.getRenderedLensElements().filter((e) => !e.startsWith("Outline:"))
      print(`[C5b] after tagging, before any level: state=${m.getState()} drawn=[${beforeLevel.join(", ")}]; slowest tick fade ${worstTickS.toFixed(2)} s`)
      expect(beforeLevel.join(","), "only the level card before a level is pressed").toBe("LevelCard")
      print("[C5b] PASS")
    } finally {
      CameraRig.release()
    }
  }
}
