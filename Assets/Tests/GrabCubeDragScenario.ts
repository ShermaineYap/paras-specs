import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {LeafHandInteractor} from "Leaf.lspkg/Interactors/interactor/LeafTwoHandInteractor"

const TARGET_NAME = "GrabCube"
const DRAG_DISTANCE_CM = 20
const STEP_CM = 0.5
const DRAG_DURATION_MS = 3000
const TOLERANCE_CM = 3

function fmt(v: vec3): string {
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`
}

/**
 * Grabs GrabCube with the simulated right hand (pinch), drags it 20 cm along
 * world +X, releases, and asserts the cube's world position moved by ~20 cm
 * along +X with negligible Y/Z drift.
 *
 * In this LEAF version the drag vector is applied on EVERY onDragUpdate, so the
 * step is passed as a mutable vec3 and a listener caps the accumulated
 * interactor motion at exactly DRAG_DISTANCE_CM. The assertion measures the
 * cube's actual displacement, not the interactor's.
 */
@component
export class GrabCubeDragScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)

    const cube = findInteractableByName(TARGET_NAME, undefined, true)
    if (!cube) {
      throw new Error(`Interactable "${TARGET_NAME}" not found or not enabled`)
    }
    const cubeTransform = cube.getSceneObject().getTransform()
    const start = cubeTransform.getWorldPosition()
    print(`[GrabCubeDrag] start=${fmt(start)}`)

    const step = new vec3(STEP_CM, 0, 0)
    let accumulated = 0
    let dragUpdates = 0
    let dragStarted = false
    let dragEnded = false
    const unsubStart = cube.onDragStart.add(() => {
      dragStarted = true
    })
    const unsubEnd = cube.onDragEnd.add(() => {
      dragEnded = true
    })
    // Registered before the interactor's own listener, so step is set before it is applied.
    const unsubUpdate = cube.onDragUpdate.add(() => {
      dragUpdates++
      const remaining = Math.max(0, DRAG_DISTANCE_CM - accumulated)
      step.x = Math.min(STEP_CM, remaining)
      accumulated += step.x
    })

    const hand = LeafHandInteractor.get("right")
    try {
      await hand.drag(cube, step, DRAG_DURATION_MS)
    } finally {
      unsubUpdate()
      unsubStart()
      unsubEnd()
    }
    await sleep(500)

    const end = cubeTransform.getWorldPosition()
    const delta = end.sub(start)
    print(
      `[GrabCubeDrag] end=${fmt(end)} delta=${fmt(delta)} |delta|=${delta.length.toFixed(2)} ` +
        `interactorMoved=${accumulated.toFixed(2)} dragUpdates=${dragUpdates} ` +
        `dragStarted=${dragStarted} dragEnded=${dragEnded}`,
    )

    expect(dragStarted, "onDragStart fired").toBe(true)
    expect(dragEnded, "onDragEnd fired (released)").toBe(true)
    expect(
      Math.abs(delta.x - DRAG_DISTANCE_CM),
      `dx=${delta.x.toFixed(2)} should be ${DRAG_DISTANCE_CM}±${TOLERANCE_CM} cm`,
    ).toBeLessThan(TOLERANCE_CM)
    expect(
      Math.abs(delta.y),
      `|dy|=${Math.abs(delta.y).toFixed(2)} should be < ${TOLERANCE_CM} cm`,
    ).toBeLessThan(TOLERANCE_CM)
    expect(
      Math.abs(delta.z),
      `|dz|=${Math.abs(delta.z).toFixed(2)} should be < ${TOLERANCE_CM} cm`,
    ).toBeLessThan(TOLERANCE_CM)

    print("[GrabCubeDrag] PASS")
  }
}
