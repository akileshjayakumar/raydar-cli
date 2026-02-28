import { promptInjection } from "./promptInjection.js";
import { promptLeaking } from "./promptLeaking.js";
import { jailbreaking } from "./jailbreaking.js";
import type { Scenario, ScenarioKind } from "../../types/contracts.js";

export const SCENARIOS: Record<ScenarioKind, Scenario> = {
  prompt_injection: promptInjection,
  prompt_leaking: promptLeaking,
  jailbreaking: jailbreaking,
};

export function getScenario(kind: ScenarioKind): Scenario {
  return SCENARIOS[kind];
}
