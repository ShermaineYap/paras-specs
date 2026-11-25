/**
 * Done criterion 1 — levels.
 * Tag all five, press Danger: the surface reaches 150 cm (±2) within 5 s and all 5 are flagged.
 * Alert stops at 30 cm and flags only the items below 30 cm (2). Warning stops at 80 cm and
 * flags exactly 3.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {CameraRig, main, pressLevel, readyAtLevelCard, waitUntil, water} from "./WaterlineTestKit"

@component
export class WaterlineC1LevelsScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    CameraRig.take()
    try {
      const cases: {level: "Alert" | "Warning" | "Danger"; cm: number; flagged: number}[] = [
        {level: "Danger", cm: 150, flagged: 5},
        {level: "Alert", cm: 30, flagged: 2},
        {level: "Warning", cm: 80, flagged: 3},
      ]
      for (const c of cases) {
        await readyAtLevelCard()
        await pressLevel(c.level)
        const tReach = await waitUntil(() => Math.abs(water().getLevelCm() - c.cm) <= 2, 6)
        await waitUntil(() => !water().isAnimating(), 6)
        await sleep(300)
        const surfaceAboveFloor = water().getSurfaceWorldY() - water().getSceneObject().getTransform().getWorldPosition().y
        const flagged = main().getFlaggedNames()
        print(
          `[C1] ${c.level}: reached ${c.cm}±2 cm after ${tReach.toFixed(2)} s; final surface ${surfaceAboveFloor.toFixed(2)} cm above floor; ` +
            `flagged ${flagged.length}: [${flagged.join(", ")}]`,
        )
        expect(tReach >= 0 && tReach <= 5, `${c.level}: reached ${c.cm}±2 cm within 5 s (took ${tReach.toFixed(2)} s)`).toBe(true)
        expect(Math.abs(surfaceAboveFloor - c.cm), `${c.level}: surface ${surfaceAboveFloor.toFixed(2)} cm`).toBeLessThan(2.01)
        expect(flagged.length, `${c.level}: flagged count`).toBe(c.flagged)
        if (c.level === "Alert") {
          for (const n of flagged) expect(n === "Extension plug" || n === "School bag", `Alert flags only items below 30 cm (got ${n})`).toBe(true)
        }
      }
      print("[C1] PASS")
    } finally {
      main().restartRun()
      CameraRig.release()
    }
  }
}
