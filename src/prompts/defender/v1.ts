import type { Scenario, CompiledPrompt, DefenderMission } from "../../types/contracts.js";

export function compileDefenderPrompt(
  _scenario: Scenario,
  attackerMessage: string,
  mission: DefenderMission,
): CompiledPrompt {
  const instructions = mission.full_directive;

  const input = attackerMessage;

  return { instructions, input, expected_output_mode: "text" };
}
