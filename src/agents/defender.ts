import type { Scenario, StreamEvent, DefenderMission } from "../types/contracts.js";
import { compileDefenderPrompt } from "../prompts/defender/v1.js";
import { streamCompletion, collectStream } from "../services/openaiClient.js";

export async function runDefender(
  model: string,
  scenario: Scenario,
  attackerPrompt: string,
  mission: DefenderMission,
  onDelta?: (event: StreamEvent) => void,
): Promise<{ response: string; events: StreamEvent[] }> {
  const compiled = compileDefenderPrompt(scenario, attackerPrompt, mission);
  const gen = streamCompletion(model, compiled, "defender");
  const { text, events } = await collectStream(gen, onDelta);
  return { response: text.trim(), events };
}
