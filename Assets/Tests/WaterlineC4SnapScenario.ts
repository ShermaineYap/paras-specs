/**
 * Done criterion 4 — grab, carry, snap.
 * Releasing the amber item away from its safe spot leaves it amber (still the target). Releasing
 * it within 10 cm of the spot snaps it there, turns it green and lights up the next lowest item.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {CameraRig, carryTo, fmt, guidance, item, main, pressLevel, readyAtLevelCard, waitUntil} from "./WaterlineTestKit"

@component
export class WaterlineC4SnapScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    CameraRig.take()
    try {
      await readyAtLevelCard()
      await pressLevel("Warning")
      await waitUntil(() => main().getState() === "lifting", 7)
      await sleep(200)
      const g = guidance()
      const plug = item("Item_ExtensionPlug")
      expect(g.getTarget() === plug, "first target is the extension plug").toBe(true)

      // A. Release somewhere else: 40 cm up and 20 cm toward the cabinet.
      const start = plug.getBaseWorldPos()
      const elsewhere = start.add(new vec3(0, 40, -20))
      CameraRig.lookAt(CameraRig.standingAt(0, 0), plug.getCenterWorldPos())
      const errA = await carryTo("Item_ExtensionPlug", elsewhere)
      await sleep(400)
      const dA = plug.distanceToSafeSpot()
      print(`[C4] released elsewhere at ${fmt(plug.getBaseWorldPos())} (${errA.toFixed(1)} cm from the aim), ${dA.toFixed(1)} cm from its spot: amber=${plug.isHighlighted()} safe=${plug.safe} target=${main().getTargetName()}`)
      expect(plug.getBaseWorldPos().distance(start) > 20, "the plug was actually carried").toBe(true)
      expect(dA > 10, "release point is more than 10 cm from the safe spot").toBe(true)
      expect(plug.safe, "not snapped").toBe(false)
      expect(g.getTarget() === plug && plug.isHighlighted(), "still amber and still the target").toBe(true)

      // B. Release within 10 cm of the spot: aim 6 cm off the spot.
      const spot = plug.getSafeSpotWorldPos()
      const near = spot.add(new vec3(6, 0.5, 0))
      const errB = await carryTo("Item_ExtensionPlug", near, 1.5)
      const tRelease = getTime()
      await sleep(150)
      const snappedDist = plug.distanceToSafeSpot()
      const greenNow = plug.isHighlighted() && g.getTarget() !== plug
      print(`[C4] released ${errB.toFixed(1)} cm from the aim (aim was 6 cm from the spot): safe=${plug.safe}, now ${snappedDist.toFixed(2)} cm from the spot, green=${greenNow}`)
      expect(plug.safe, "snapped").toBe(true)
      expect(snappedDist, "sits on its safe spot").toBeLessThan(0.5)
      expect(greenNow, "turned green").toBe(true)
      const tNext = await waitUntil(() => g.getTarget() === item("Item_SchoolBag"), 3)
      print(`[C4] next lowest (school bag) lit ${(getTime() - tRelease).toFixed(2)} s after release; plug outline ${plug.isHighlighted() ? "still on" : "faded"}`)
      expect(tNext >= 0, "next lowest item lights up").toBe(true)
      expect(item("Item_SchoolBag").isHighlighted(), "school bag is amber").toBe(true)
      print("[C4] PASS")
    } finally {
      main().restartRun()
      CameraRig.release()
    }
  }
}
