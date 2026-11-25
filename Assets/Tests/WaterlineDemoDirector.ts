/**
 * WaterlineDemoDirector — preview-only tool that drives the Lens to a key moment and holds it,
 * so a screenshot (or a video take) can be captured. Off by default (stage = "off").
 * Uses the same LEAF/SIK interactions and camera rig as the tests.
 */
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {LeafHandInteractor} from "Leaf.lspkg/Interactors/interactor/LeafTwoHandInteractor"
import {
  CameraRig, floorY, guidance, item, liftCurrentTarget, main, pinch, pressLevel, readyAtLevelCard, waitUntil, water,
} from "./WaterlineTestKit"

@component
export class WaterlineDemoDirector extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineDemoDirector – hold a key moment for screenshots</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Moment to drive to on preview start")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("off", "off"), new ComboBoxItem("room", "room"), new ComboBoxItem("card", "card"),
    new ComboBoxItem("danger", "danger"), new ComboBoxItem("depthtag", "depthtag"), new ComboBoxItem("amber", "amber"),
    new ComboBoxItem("arrow", "arrow"), new ComboBoxItem("underwater", "underwater"), new ComboBoxItem("summary", "summary"),
  ]))
  stage: string = "off"
  @ui.group_end

  onAwake() {
    if (this.stage === "off") return
    this.createEvent("OnStartEvent").bind(() => {
      this.run().catch((e) => print(`[Director] error: ${e}`))
    })
  }

  private eye(x: number, z: number, h: number = 160): vec3 { return new vec3(x, floorY() + h, z) }

  private async run(): Promise<void> {
    await sleep(1500)
    CameraRig.take()
    const s = this.stage
    if (s === "room") {
      CameraRig.setPose(this.eye(20, 95), 8, -14)
      print("[Director] READY room")
      return
    }
    await readyAtLevelCard()
    if (s === "card") {
      CameraRig.setPose(this.eye(0, 0), 0, -26)
      await sleep(600)
      print("[Director] READY card")
      return
    }
    await pressLevel(s === "amber" ? "Warning" : "Danger")
    await waitUntil(() => main().getState() === "lifting", 7)
    await sleep(800)
    if (s === "danger") {
      CameraRig.setPose(this.eye(20, 95), 8, -14)
    } else if (s === "depthtag") {
      CameraRig.setPose(this.eye(0, 0), -8, -4)
    } else if (s === "amber") {
      // Warning: lift the plug and the bag, then frame the rice cooker (amber), its dotted line and pin.
      await liftCurrentTarget()
      await liftCurrentTarget()
      const c = item("Item_RiceCooker").getCenterWorldPos()
      const pin = item("Item_RiceCooker").getSafeSpotWorldPos().add(new vec3(0, 10, 0))
      CameraRig.lookAt(this.eye(105, 125, 130), vec3.lerp(c, pin, 0.4))
    } else if (s === "underwater") {
      CameraRig.setPose(this.eye(0, 0, 125), 0, -5)
    } else if (s === "arrow" || s === "summary") {
      for (let i = 0; i < 3; i++) await liftCurrentTarget()
      if (s === "arrow") {
        CameraRig.lookAt(this.eye(0, -20), new vec3(-50, floorY() + 150, -180))
        await waitUntil(() => guidance().isArrowVisible(), 2)
      } else {
        while (main().getState() === "lifting") await liftCurrentTarget()
        CameraRig.lookAt(this.eye(0, -40), new vec3(40, floorY() + 140, -204))
        await pinch("MainsSwitch")
        await LeafHandInteractor.get("right").hand.hide()
        CameraRig.setPose(this.eye(0, -40), 0, -3)
        await waitUntil(() => main().getState() === "summary", 6)
        print("[Director] READY summary")
        return
      }
    }
    // put the simulated LEAF hands away so they don't cover the shot
    await LeafHandInteractor.get("right").hand.hide()
    await LeafHandInteractor.get("left").hand.hide()
    await sleep(700)
    print(`[Director] READY ${s}`)
  }
}
