/**
 * Done criterion 5 — the ending.
 * Once all flagged items are safe and the mains switch is pinched, the water drains to the floor
 * within 4 s, the summary line shows and then hides, and 9 s later nothing from the Lens is
 * visible apart from the returning level card.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep, nextFrame, findSceneObjectByName} from "Leaf.lspkg/Utils/common/Utils"
import {WaterlineHudUI} from "../Scripts/WaterlineHudUI"
import {WaterlineSwitch} from "../Scripts/WaterlineSwitch"
import {CameraRig, liftCurrentTarget, main, pinch, pressLevel, readyAtLevelCard, waitUntil, water} from "./WaterlineTestKit"

@component
export class WaterlineC5EndingScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    CameraRig.take()
    try {
      const hud = findSceneObjectByName("Hud").getComponent(WaterlineHudUI.getTypeName()) as WaterlineHudUI
      const sw = findSceneObjectByName("MainsSwitch").getComponent(WaterlineSwitch.getTypeName()) as WaterlineSwitch
      await readyAtLevelCard()
      await pressLevel("Alert")
      await waitUntil(() => main().getState() === "lifting", 7)
      while (main().getState() === "lifting") await liftCurrentTarget()
      expect(main().getState(), "all flagged items safe").toBe("allSafe")
      expect(sw.isArmed(), "mains switch glows once everything flagged is safe").toBe(true)

      CameraRig.lookAt(CameraRig.standingAt(0, -40), sw.getSceneObject().getTransform().getWorldPosition())
      await nextFrame()
      const tPress = getTime()
      await pinch("MainsSwitch")
      const tDrained = await waitUntil(() => !water().isUp(), 6)
      const drainS = tDrained >= 0 ? getTime() - tPress : -1
      print(`[C5] drained to the floor ${drainS.toFixed(2)} s after the switch pinch (level now ${water().getLevelCm().toFixed(2)} cm)`)
      expect(drainS >= 0 && drainS <= 4, `drains within 4 s (took ${drainS.toFixed(2)} s)`).toBe(true)

      const tShow = await waitUntil(() => hud.isSummaryVisible(), 3)
      const summary = hud.getSummaryText()
      print(`[C5] summary shown ${(getTime() - tPress).toFixed(2)} s after the pinch: "${summary}"`)
      expect(tShow >= 0, "summary line shows").toBe(true)
      expect(/^\d+ of \d+ above water, \d+:\d\d$/.test(summary), `summary format ("${summary}")`).toBe(true)
      const tHide = await waitUntil(() => !hud.isSummaryVisible(), 6)
      const shownFor = tHide
      print(`[C5] summary hid after ${shownFor.toFixed(2)} s on screen`)
      expect(tHide >= 0, "summary line hides").toBe(true)

      const wait = 9 - (getTime() - tPress)
      if (wait > 0) await sleep(wait * 1000)
      const visible = main().getVisibleLensElements()
      print(`[C5] ${(getTime() - tPress).toFixed(2)} s after the pinch, visible Lens elements: [${visible.join(", ")}]`)
      expect(visible.join(","), "only the level card is visible").toBe("LevelCard")
      print("[C5] PASS")
    } finally {
      main().restartRun()
      CameraRig.release()
    }
  }
}
