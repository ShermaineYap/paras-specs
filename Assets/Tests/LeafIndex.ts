import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {WaterlineC5bQuietStartScenario} from "./WaterlineC5bQuietStartScenario"
import {WaterlineC1LevelsScenario} from "./WaterlineC1LevelsScenario"
import {WaterlineC2BodyScenario} from "./WaterlineC2BodyScenario"
import {WaterlineC3OneThingScenario} from "./WaterlineC3OneThingScenario"
import {WaterlineC4SnapScenario} from "./WaterlineC4SnapScenario"
import {WaterlineC5EndingScenario} from "./WaterlineC5EndingScenario"
import {WaterlinePlaythroughScenario} from "./WaterlinePlaythroughScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c5b-quiet-before-level", typename: WaterlineC5bQuietStartScenario.getTypeName()},
    {id: "c1-levels", typename: WaterlineC1LevelsScenario.getTypeName()},
    {id: "c2-body", typename: WaterlineC2BodyScenario.getTypeName()},
    {id: "c3-one-thing", typename: WaterlineC3OneThingScenario.getTypeName()},
    {id: "c4-snap", typename: WaterlineC4SnapScenario.getTypeName()},
    {id: "c5-ending", typename: WaterlineC5EndingScenario.getTypeName()},
    // not a pass/fail test: a first-time playthrough with timings and problem log (see the file header)
    {id: "playthrough", typename: WaterlinePlaythroughScenario.getTypeName(), parameters: {level: "Danger", stopAt: "none"}},
  ]
}
