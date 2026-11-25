/**
 * WaterlineTestKit — shared helpers for the Waterline LEAF scenarios and the screenshot director.
 *
 * Camera rig: pauses the Camera's DeviceTracking so a scenario can put the head anywhere
 * (walk sideways, crouch, turn) — the same effect as WASD / Q-E / right-drag in Interactive
 * Preview. All interactions go through LEAF interactors (SIK), never through private Lens code.
 */
import {findSceneObjectByName, sleep, nextFrame} from "Leaf.lspkg/Utils/common/Utils"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {LeafHandInteractor} from "Leaf.lspkg/Interactors/interactor/LeafTwoHandInteractor"
import {LeafLifecycle} from "Leaf.lspkg/Utils/common/LeafLifecycle"
import {WaterlineMain} from "../Scripts/WaterlineMain"
import {WaterlineBelonging} from "../Scripts/WaterlineBelonging"
import {WaterlineWater} from "../Scripts/WaterlineWater"
import {WaterlineBody} from "../Scripts/WaterlineBody"
import {WaterlineGuidance} from "../Scripts/WaterlineGuidance"

export const ITEM_OBJECTS = ["Item_ExtensionPlug", "Item_SchoolBag", "Item_RiceCooker", "Item_PhotoAlbum", "Item_ICFolder"]

export function fmt(v: vec3): string {
  return `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`
}

export function main(): WaterlineMain {
  return findSceneObjectByName("Waterline").getComponent(WaterlineMain.getTypeName()) as WaterlineMain
}
export function water(): WaterlineWater {
  return findSceneObjectByName("Water").getComponent(WaterlineWater.getTypeName()) as WaterlineWater
}
export function body(): WaterlineBody {
  return findSceneObjectByName("Body").getComponent(WaterlineBody.getTypeName()) as WaterlineBody
}
export function guidance(): WaterlineGuidance {
  return findSceneObjectByName("Guidance").getComponent(WaterlineGuidance.getTypeName()) as WaterlineGuidance
}
export function item(objName: string): WaterlineBelonging {
  return findSceneObjectByName(objName).getComponent(WaterlineBelonging.getTypeName()) as WaterlineBelonging
}
export function floorY(): number {
  return water().getSceneObject().getTransform().getWorldPosition().y
}

// ---------------- camera rig ----------------

export class CameraRig {
  private static cam(): SceneObject { return findSceneObjectByName("Camera Object") }

  static take(): void {
    const dt = this.cam().getComponent("Component.DeviceTracking")
    if (dt) dt.enabled = false
  }

  static release(): void {
    const dt = this.cam().getComponent("Component.DeviceTracking")
    if (dt) dt.enabled = true
  }

  /** Eye position (world) + yaw (deg, 0 = facing -Z, +90 = facing -X/left) + pitch (deg, + = up). */
  static setPose(pos: vec3, yawDeg: number, pitchDeg: number): void {
    const t = this.cam().getTransform()
    t.setWorldPosition(pos)
    const yaw = quat.angleAxis((yawDeg * Math.PI) / 180, vec3.up())
    const pitch = quat.angleAxis((pitchDeg * Math.PI) / 180, vec3.right())
    t.setWorldRotation(yaw.multiply(pitch))
  }

  /** Put the eyes at `pos` looking at `target`. */
  static lookAt(pos: vec3, target: vec3): void {
    const d = target.sub(pos)
    const yaw = (Math.atan2(-d.x, -d.z) * 180) / Math.PI
    const pitch = (Math.atan2(d.y, Math.sqrt(d.x * d.x + d.z * d.z)) * 180) / Math.PI
    this.setPose(pos, yaw, pitch)
  }

  static position(): vec3 { return this.cam().getTransform().getWorldPosition() }

  /** Eyes at standing height (160 cm) above the floor, at x/z. */
  static standingAt(x: number, z: number): vec3 { return new vec3(x, floorY() + 160, z) }
}

// ---------------- flow helpers (all through SIK via LEAF) ----------------

// LEAF destroys its interactors when each scenario finishes, so create one per scenario.
let cachedLeaf: DefaultLeafInteractor | null = null
function leafInteractor(): DefaultLeafInteractor {
  if (!cachedLeaf) {
    cachedLeaf = new DefaultLeafInteractor()
    LeafLifecycle.getInstance().onCleanup.add(() => {
      cachedLeaf = null
    })
  }
  return cachedLeaf
}

export async function pinch(objName: string): Promise<void> {
  const it = findInteractableByName(objName, undefined, true)
  if (!it) throw new Error(`Interactable "${objName}" not found or not enabled`)
  await leafInteractor().trigger(it)
  await sleep(150)
}

/** Reset to the level card (tags kept); tag any untagged belongings by pinching them. */
export async function readyAtLevelCard(): Promise<void> {
  const m = main()
  m.restartRun()
  await sleep(300)
  for (const name of ITEM_OBJECTS) {
    if (!item(name).tagged) {
      CameraRig.lookAt(CameraRig.standingAt(0, 0), item(name).getCenterWorldPos())
      await nextFrame()
      await pinch(name)
    }
  }
  if (m.getState() !== "choose") throw new Error(`expected state 'choose' after tagging, got '${m.getState()}'`)
  // face the level card
  CameraRig.setPose(CameraRig.standingAt(0, 0), 0, -30)
  await sleep(300)
}

/** Press a level button; returns getTime() at the press. */
export async function pressLevel(level: "Alert" | "Warning" | "Danger"): Promise<number> {
  CameraRig.setPose(CameraRig.standingAt(0, 0), 0, -30)
  await nextFrame()
  const it = findInteractableByName(`${level}Button`, undefined, true)
  if (!it) throw new Error(`${level}Button not found / not enabled`)
  const t0 = getTime()
  await leafInteractor().trigger(it)
  return t0
}

export async function waitUntil(pred: () => boolean, timeoutS: number): Promise<number> {
  const t0 = getTime()
  while (!pred()) {
    if (getTime() - t0 > timeoutS) return -1
    await nextFrame()
  }
  return getTime() - t0
}

/**
 * Grab the item and carry it so its base lands at `targetBase`, release. Closed-loop: each drag
 * moves by the remaining offset, repeated until within `tolCm` (max 8 grabs — the cabinet is
 * ~250 cm from the start, and one simulated drag covers roughly 40-55 cm).
 * Returns the final distance from the target.
 */
export async function carryTo(objName: string, targetBase: vec3, tolCm: number = 2): Promise<number> {
  const b = item(objName)
  const it = findInteractableByName(objName, undefined, true)
  if (!it) throw new Error(`Interactable "${objName}" not found`)
  const hand = LeafHandInteractor.get("right")
  for (let attempt = 0; attempt < 8; attempt++) {
    const remaining = targetBase.sub(b.getBaseWorldPos())
    if (remaining.length <= tolCm || b.safe || !b.isGrabbable()) break
    // look at the item so the hand ray can reach it
    CameraRig.lookAt(CameraRig.position(), b.getCenterWorldPos())
    await nextFrame()
    const stepLen = 3.0
    const step = new vec3(0, 0, 0)
    let moved = 0
    const total = remaining.length
    const dir = remaining.normalize()
    const unsub = it.onDragUpdate.add(() => {
      const s = Math.min(stepLen, Math.max(0, total - moved))
      step.x = dir.x * s
      step.y = dir.y * s
      step.z = dir.z * s
      moved += s
    })
    try {
      await hand.drag(it, step, Math.max(1500, (total / stepLen) * 45))
    } finally {
      unsub()
    }
    await sleep(120)
  }
  return b.distanceToSafeSpot() >= 0 ? targetBase.distance(b.getBaseWorldPos()) : -1
}

/** Carry the current amber target onto its safe spot; waits for the next one to light. */
export async function liftCurrentTarget(): Promise<string> {
  const g = guidance()
  const t = g.getTarget()
  if (!t) throw new Error("no amber target to lift")
  const objName = t.getSceneObject().name
  // like a user, walk halfway between the item and the cabinet before lifting (standing height)
  const a = t.getCenterWorldPos(), b = t.getSafeSpotWorldPos()
  CameraRig.setPose(CameraRig.standingAt((a.x + b.x) / 2, (a.z + b.z) / 2 + 60), 0, -20)
  await nextFrame()
  for (let round = 0; round < 3 && !t.safe; round++) {
    await carryTo(objName, t.getSafeSpotWorldPos())
  }
  await sleep(1500) // green fades after 1 s, then the next lights up
  return objName
}

export function amberItems(): string[] {
  return ITEM_OBJECTS.filter((n) => {
    const b = item(n)
    return b.isHighlighted() && guidance().getTarget() === b
  })
}

export function highlightedItems(): string[] {
  return ITEM_OBJECTS.filter((n) => item(n).isHighlighted())
}
