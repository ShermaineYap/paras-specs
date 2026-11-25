/**
 * WaterlineLeafRunner — runs registered LEAF scenarios in the preview through LEAF's own
 * DefaultScenarioManager (which prints the authoritative "PASSED: <id>" / "FAILED: <id> - ..."
 * lines). Off by default; tick `runOnStart` and set `scenarioIds` to run after a preview reset.
 * Run ONE scenario per preview reset (like the LEAF panel, which resets the Lens before every run):
 * LEAF's shared simulated hands are destroyed by LEAF's cleanup at the end of a scenario.
 */
import {DefaultScenarioManager} from "Leaf.lspkg/Scenarios/scenario/manager/DefaultLeafScenarioManager"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"

@component
export class WaterlineLeafRunner extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineLeafRunner – run LEAF scenarios on preview start</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Run scenarios automatically after the preview resets")
  runOnStart: boolean = false
  @input
  @hint("Comma-separated scenario ids to run, in order (empty = all registered)")
  scenarioIds: string = ""
  @ui.group_end

  onAwake() {
    if (!this.runOnStart) return
    this.createEvent("OnStartEvent").bind(() => {
      this.runAll().catch((e) => print(`[LeafRunner] aborted: ${e}`))
    })
  }

  private async runAll(): Promise<void> {
    await sleep(2500)
    const mgr = DefaultScenarioManager.getInstance()
    const all = mgr.listScenarioIds()
    const ids = this.scenarioIds.trim().length > 0 ? this.scenarioIds.split(",").map((s) => s.trim()) : all
    print(`[LeafRunner] registered: [${all.join(", ")}]; running: [${ids.join(", ")}]`)
    const results: string[] = []
    for (const id of ids) {
      const t0 = getTime()
      try {
        await mgr.startScenario(id)
        results.push(`${id}=PASS(${(getTime() - t0).toFixed(1)}s)`)
      } catch (e) {
        results.push(`${id}=FAIL(${(getTime() - t0).toFixed(1)}s)`)
      }
      print(`[LeafRunner] done ${id}`)
      await sleep(800)
    }
    print(`[LeafRunner] SUMMARY ${results.join(" ")}`)
  }
}
