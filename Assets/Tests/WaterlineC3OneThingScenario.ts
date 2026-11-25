/**
 * Done criterion 3 — only one thing asks for attention.
 * At Danger, at every step exactly one belonging has the amber outline + dotted line + pin, and it
 * is always the lowest tagged item still below the water. The edge arrow shows only when that item
 * is out of view. When the album becomes next (facing the cabinet) it is out of view and the arrow
 * shows until the head turns to face it.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep, nextFrame} from "Leaf.lspkg/Utils/common/Utils"
import {nextItem} from "../Scripts/WaterlineState"
import {
  CameraRig, guidance, highlightedItems, item, ITEM_OBJECTS, liftCurrentTarget, main, pressLevel,
  readyAtLevelCard, waitUntil, water,
} from "./WaterlineTestKit"

@component
export class WaterlineC3OneThingScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    CameraRig.take()
    try {
      await readyAtLevelCard()
      await pressLevel("Danger")
      await waitUntil(() => main().getState() === "lifting", 7)
      await sleep(200)

      const order: string[] = []
      for (let step = 0; step < 5; step++) {
        const g = guidance()
        const t = g.getTarget()
        expect(t !== null, `step ${step + 1}: a target is lit`).toBe(true)
        const lit = highlightedItems()
        const items = ITEM_OBJECTS.map((n) => item(n))
        const expected = nextItem(items, main().getLevelCm())
        const pins = ITEM_OBJECTS.filter((n) => g.isPinVisible(item(n)))
        print(
          `[C3] step ${step + 1}: amber=[${lit.join(", ")}] pins=[${pins.join(", ")}] dotted=${g.isDottedLineVisible()} ` +
            `target=${t!.getSceneObject().name} lowest-below-water=${expected ? expected.getSceneObject().name : "none"}`,
        )
        expect(lit.length, `step ${step + 1}: exactly one item has an outline`).toBe(1)
        expect(pins.length, `step ${step + 1}: exactly one pin`).toBe(1)
        expect(g.isDottedLineVisible(), `step ${step + 1}: dotted line on`).toBe(true)
        expect(t === expected, `step ${step + 1}: target is the lowest tagged item still below the water`).toBe(true)

        // Arrow rule, sampled from two head poses: looking at the item (in view) and looking away.
        CameraRig.lookAt(CameraRig.standingAt(0, -20), t!.getCenterWorldPos())
        await nextFrame(); await nextFrame()
        const inViewArrow = g.isArrowVisible()
        CameraRig.setPose(CameraRig.standingAt(0, -20), 180, 0) // facing away
        await nextFrame(); await nextFrame()
        const awayArrow = g.isArrowVisible()
        print(`[C3] step ${step + 1}: arrow when facing item=${inViewArrow}, when facing away=${awayArrow}`)
        expect(inViewArrow, `step ${step + 1}: no arrow while the item is in view`).toBe(false)
        expect(awayArrow, `step ${step + 1}: arrow while the item is out of view`).toBe(true)

        if (t!.getSceneObject().name === "Item_PhotoAlbum") {
          // As a user who has just put the rice cooker on the cabinet: facing the cabinet.
          CameraRig.lookAt(CameraRig.standingAt(0, -20), new vec3(-60, water().getSceneObject().getTransform().getWorldPosition().y + 150, -223))
          await nextFrame(); await nextFrame()
          const albumInView = g.isInView(t!.getCenterWorldPos())
          const arrowFacingCabinet = g.isArrowVisible()
          print(`[C3] album next, facing the cabinet: album in view=${albumInView}, arrow=${arrowFacingCabinet}`)
          expect(albumInView, "album is out of view when it becomes next (facing the cabinet)").toBe(false)
          expect(arrowFacingCabinet, "edge arrow shows while the album is out of view").toBe(true)
          // Turn toward the album in 10° steps; the arrow must stay until it is in view, then hide.
          const start = CameraRig.position()
          let turnedDeg = 0
          let arrowWhileOut = true
          for (let yaw = 20; yaw >= -110; yaw -= 10) {
            CameraRig.setPose(start, yaw, -20)
            await nextFrame(); await nextFrame()
            const inView = g.isInView(t!.getCenterWorldPos())
            if (!inView && !g.isArrowVisible()) arrowWhileOut = false
            if (inView) { turnedDeg = yaw; break }
          }
          const arrowAfterFacing = g.isArrowVisible()
          print(`[C3] turned to yaw ${turnedDeg}°: album in view, arrow=${arrowAfterFacing}; arrow stayed on while out of view=${arrowWhileOut}`)
          expect(arrowWhileOut, "arrow stays on until the album is faced").toBe(true)
          expect(arrowAfterFacing, "arrow hides once the album is faced").toBe(false)
        }

        order.push(await liftCurrentTarget())
        if (main().getState() === "allSafe") break
      }
      print(`[C3] lift order: ${order.join(" -> ")}`)
      expect(order.join(","), "lift order = lowest first").toBe(
        "Item_ExtensionPlug,Item_SchoolBag,Item_RiceCooker,Item_PhotoAlbum,Item_ICFolder",
      )
      expect(main().getState(), "all flagged items safe").toBe("allSafe")
      print("[C3] PASS")
    } finally {
      main().restartRun()
      CameraRig.release()
    }
  }
}
