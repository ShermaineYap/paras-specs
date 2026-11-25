/**
 * WaterlineDemoDirector — preview-only tool that drives the Lens to a key moment and holds it,
 * so a screenshot (or a video take) can be captured. Off by default (stage = "off").
 * Uses the same LEAF/SIK interactions and camera rig as the tests.
 */
import {sleep, findSceneObjectByName} from "Leaf.lspkg/Utils/common/Utils"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {LeafHandInteractor} from "Leaf.lspkg/Interactors/interactor/LeafTwoHandInteractor"
import {
  CameraRig, floorY, guidance, liftCurrentTarget, main, pinch, pressLevel, readyAtLevelCard, waitUntil, water,
} from "./WaterlineTestKit"

@component
export class WaterlineDemoDirector extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineDemoDirector – hold a key moment for screenshots</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Moment to drive to on preview start")
  @widget(new ComboBoxWidget([
    new ComboBoxItem("off", "off"), new ComboBoxItem("start", "start"), new ComboBoxItem("room", "room"),
    new ComboBoxItem("card", "card"), new ComboBoxItem("below", "below"),
    new ComboBoxItem("danger", "danger"), new ComboBoxItem("depthtag", "depthtag"), new ComboBoxItem("amber", "amber"),
    new ComboBoxItem("arrow", "arrow"), new ComboBoxItem("underwater", "underwater"), new ComboBoxItem("summary", "summary"),
  ]))
  stage: string = "off"
  @input
  @hint("Extra yaw for the 'start' / 'room' stages (deg, + = left) — to look around the room")
  @widget(new SliderWidget(-180, 180, 1))
  yawDeg: number = 0
  @input
  @hint("Pitch for the 'start' / 'room' stages (deg, + = up)")
  @widget(new SliderWidget(-80, 60, 1))
  pitchDeg: number = 0
  @ui.group_end

  onAwake() {
    if (this.stage === "off") return
    this.createEvent("OnStartEvent").bind(() => {
      this.run().catch((e) => print(`[Director] error: ${e}`))
    })
  }

  /** Screenshot-only: hide the simulated hand meshes (interaction is unaffected). */
  private hideHands(): void {
    const hv = findSceneObjectByName("HandVisuals")
    if (hv) hv.enabled = false
  }

  private eye(x: number, z: number, h: number = 160): vec3 { return new vec3(x, floorY() + h, z) }

  private async run(): Promise<void> {
    await sleep(1500)
    CameraRig.take()
    const s = this.stage
    const cam = WorldCameraFinderProvider.getInstance().getComponent()
    print(`[Director] camera fov ${((cam.fov * 180) / Math.PI).toFixed(1)} deg (vertical), aspect ${cam.aspect.toFixed(3)}`)
    if (s === "start" || s === "room") {
      // 'start': the start pose (eyes 160 cm above the floor, at the origin). 'room': further back.
      CameraRig.setPose(s === "start" ? this.eye(0, 0) : this.eye(0, 120), this.yawDeg, this.pitchDeg)
      await sleep(400)
      print(`[Director] READY ${s}`)
      return
    }
    await readyAtLevelCard()
    if (s === "card") {
      // readyAtLevelCard leaves the head facing the card, which appears in front of wherever you looked
      await LeafHandInteractor.get("right").hand.hide()
      await LeafHandInteractor.get("left").hand.hide()
      this.hideHands()
      await sleep(600)
      print("[Director] READY card")
      return
    }
    await pressLevel(s === "amber" || s === "below" ? "Warning" : "Danger")
    await waitUntil(() => main().getState() === "lifting", 7)
    await sleep(800)
    if (s === "danger") {
      CameraRig.setPose(this.eye(0, 60), 6, -10)
    } else if (s === "depthtag") {
      CameraRig.setPose(this.eye(0, 0), 0, -3)
    } else if (s === "amber") {
      // Warning: lift the plug and the bag; the rice cooker is next. Standing well back so the amber
      // cooker, its dotted line and its pin all fit, looking within 25 deg of level so the tag shows.
      await liftCurrentTarget()
      await liftCurrentTarget()
      CameraRig.setPose(this.eye(0, 130), 4, -13)
    } else if (s === "below") {
      // Warning, plug is next on the floor below the view: bottom-edge chevron.
      CameraRig.setPose(this.eye(0, 0), 0, 0)
    } else if (s === "underwater") {
      CameraRig.setPose(this.eye(0, 0, 125), 0, -5)
    } else if (s === "arrow" || s === "summary") {
      for (let i = 0; i < 3; i++) await liftCurrentTarget()
      if (s === "arrow") {
        CameraRig.lookAt(this.eye(0, -20), new vec3(-60, floorY() + 150, -223))
        await waitUntil(() => guidance().isArrowVisible(), 2)
      } else {
        while (main().getState() === "lifting") await liftCurrentTarget()
        const sw = findSceneObjectByName("MainsSwitch").getTransform().getWorldPosition()
        CameraRig.lookAt(this.eye(30, -60), sw)
        await pinch("MainsSwitch")
        await LeafHandInteractor.get("right").hand.hide()
        this.hideHands()
        CameraRig.setPose(this.eye(0, 0), 0, -3)
        await waitUntil(() => main().getState() === "summary", 6)
        print("[Director] READY summary")
        return
      }
    }
    // put the simulated LEAF hands away so they don't cover the shot
    await LeafHandInteractor.get("right").hand.hide()
    await LeafHandInteractor.get("left").hand.hide()
    this.hideHands()
    await sleep(700)
    if (guidance().isArrowVisible()) {
      const a = guidance().getArrowLocal()
      print(`[Director] edge cue ${guidance().getArrowMode()} at camera-space (${a.x.toFixed(1)}, ${a.y.toFixed(1)}, ${a.z.toFixed(1)}) cm`)
    }
    print(`[Director] READY ${s}`)
  }
}
