/**
 * Done criterion 5 (second sentence) — before any level is pressed, nothing from the Lens is
 * visible apart from the tagging step and the level card.
 * Runs first after a Lens reset: checks the untouched start, then each tag (ticks fade within 2 s),
 * then the level card on its own.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep, nextFrame} from "Leaf.lspkg/Utils/common/Utils"
import {CameraRig, item, ITEM_OBJECTS, main, pinch, waitUntil} from "./WaterlineTestKit"

@component
export class WaterlineC5bQuietStartScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    CameraRig.take()
    try {
      const m = main()
      const fresh = m.getState() === "tagging"
      const atStart = m.getVisibleLensElements()
      print(`[C5b] state at start: ${m.getState()}, visible Lens elements: [${atStart.join(", ")}]`)
      if (fresh) expect(atStart.length, "nothing visible before tagging").toBe(0)

      let worstTickS = 0
      for (const name of ITEM_OBJECTS) {
        if (item(name).tagged) continue
        CameraRig.lookAt(CameraRig.standingAt(0, 0), item(name).getCenterWorldPos())
        await nextFrame()
        await pinch(name)
        const shown = item(name).isTickVisible()
        const t = await waitUntil(() => !item(name).isTickVisible(), 3)
        worstTickS = Math.max(worstTickS, t)
        const others = m.getVisibleLensElements().filter((e) => e !== "LevelCard")
        print(`[C5b] tagged ${name}: tick shown=${shown}, faded after ${t.toFixed(2)} s; other Lens elements: [${others.join(", ")}]`)
        expect(shown, `${name}: tick appears on pinch`).toBe(true)
        expect(t >= 0 && t <= 2.1, `${name}: tick fades within 2 s`).toBe(true)
        expect(others.length, "nothing else visible during tagging").toBe(0)
      }
      await sleep(300)
      const beforeLevel = m.getVisibleLensElements()
      print(`[C5b] after tagging, before any level: state=${m.getState()} visible=[${beforeLevel.join(", ")}]; slowest tick fade ${worstTickS.toFixed(2)} s`)
      expect(beforeLevel.join(","), "only the level card before a level is pressed").toBe("LevelCard")
      print("[C5b] PASS")
    } finally {
      CameraRig.release()
    }
  }
}
