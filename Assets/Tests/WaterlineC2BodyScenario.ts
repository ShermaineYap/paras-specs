/**
 * Done criterion 2 — the Lens answers the body every frame.
 * At Danger: walking 2 m sideways keeps the ring under the head (within 5 cm); crouching until
 * the eyes are 10 cm below the surface turns on the underwater tint + muffled sound within
 * 0.3 s; standing back up turns them off; the depth tag's body word changes when crouching.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep, nextFrame} from "Leaf.lspkg/Utils/common/Utils"
import {findSceneObjectByName} from "Leaf.lspkg/Utils/common/Utils"
import {WaterlineHudUI} from "../Scripts/WaterlineHudUI"
import {body, CameraRig, floorY, main, pressLevel, readyAtLevelCard, waitUntil, water} from "./WaterlineTestKit"

@component
export class WaterlineC2BodyScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    CameraRig.take()
    try {
      const hud = findSceneObjectByName("Hud").getComponent(WaterlineHudUI.getTypeName()) as WaterlineHudUI
      await readyAtLevelCard()
      await pressLevel("Danger")
      await waitUntil(() => !water().isAnimating() && water().getLevelCm() > 149, 6)
      await sleep(1200)

      // 1. Walk 2 m sideways in 10 cm steps, one step per frame; check the ring every frame.
      let worst = 0
      const z = 0
      for (let i = 0; i <= 20; i++) {
        CameraRig.setPose(CameraRig.standingAt(-100 + i * 10, z), 0, 0)
        await nextFrame()
        await nextFrame()
        const cam = CameraRig.position()
        const ring = body().getRingWorldPos()
        const d = Math.sqrt((ring.x - cam.x) ** 2 + (ring.z - cam.z) ** 2)
        worst = Math.max(worst, d)
      }
      const ringOnSurface = Math.abs(body().getRingWorldPos().y - water().getSurfaceWorldY())
      print(`[C2] walk 200 cm sideways: worst ring offset from under head = ${worst.toFixed(2)} cm; ring ${ringOnSurface.toFixed(2)} cm from surface`)
      expect(body().isRingVisible(), "ring visible while water is up").toBe(true)
      expect(worst, "ring stays under the head").toBeLessThan(5)

      // 2. Standing, level look: depth tag word.
      CameraRig.setPose(CameraRig.standingAt(0, 0), 0, 0)
      await sleep(300)
      const standingText = hud.getDepthText()
      const standingWord = body().getReading().word
      print(`[C2] standing (eyes ${body().getEyeCm().toFixed(1)} cm): "${standingText}" visible=${hud.isDepthVisible()}`)
      expect(hud.isDepthVisible(), "depth tag shows while standing and looking level").toBe(true)
      expect(standingText, "Danger text at 160 cm eyes").toBe("Water here: 150 cm, up to your chin")
      expect(body().isTintOn(), "no tint while standing").toBe(false)

      // 3. Crouch: eyes 10 cm below the surface.
      const surfaceY = water().getSurfaceWorldY()
      const t0 = getTime()
      CameraRig.setPose(new vec3(0, surfaceY - 10, 0), 0, 0)
      const tTint = await waitUntil(() => body().isTintOn() && water().isMuffled(), 1.0)
      const tTintAbs = tTint >= 0 ? getTime() - t0 : -1
      await sleep(200)
      const crouchText = hud.getDepthText()
      const crouchWord = body().getReading().word
      print(`[C2] crouch (eyes ${body().getEyeCm().toFixed(1)} cm, 10 cm under): tint+muffle on after ${tTintAbs.toFixed(3)} s; tag "${crouchText}"`)
      expect(tTintAbs >= 0 && tTintAbs <= 0.3, `tint + muffled within 0.3 s (took ${tTintAbs.toFixed(3)} s)`).toBe(true)
      expect(crouchWord !== standingWord, `body word changes on crouch (${standingWord} -> ${crouchWord})`).toBe(true)

      // 4. Stand up: off again.
      const t1 = getTime()
      CameraRig.setPose(CameraRig.standingAt(0, 0), 0, 0)
      const tOff = await waitUntil(() => !body().isTintOn() && !water().isMuffled(), 1.0)
      const tOffAbs = tOff >= 0 ? getTime() - t1 : -1
      print(`[C2] stand up: tint+muffle off after ${tOffAbs.toFixed(3)} s; floor y=${floorY().toFixed(1)}`)
      expect(tOffAbs >= 0 && tOffAbs <= 0.3, `tint + muffled off within 0.3 s (took ${tOffAbs.toFixed(3)} s)`).toBe(true)

      print("[C2] PASS")
    } finally {
      main().restartRun()
      CameraRig.release()
    }
  }
}
