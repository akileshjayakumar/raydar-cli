import type { Scenario, Verdict, StreamEvent, DefenderMission } from "../types/contracts.js";
import { VerdictSchema } from "../types/contracts.js";
import { compileJudgePrompt } from "../prompts/judge/v1.js";
import { streamCompletion, collectStream } from "../services/openaiClient.js";

export async function runJudge(
  model: string,
  scenario: Scenario,
  attackerPrompt: string,
  defenderResponse: string,
  mission: DefenderMission,
  onDelta?: (event: StreamEvent) => void,
): Promise<{
  verdict: Verdict | null;
  raw: string;
  status: "valid" | "judge_invalid_output";
  events: StreamEvent[];
}> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const compiled = compileJudgePrompt(scenario, attackerPrompt, defenderResponse, mission);
    const gen = streamCompletion(model, compiled, "judge");
    const { text, events } = await collectStream(gen, onDelta);

    try {
      const parsed = JSON.parse(text.trim());
      const verdict = VerdictSchema.parse(parsed);
      return { verdict, raw: text, status: "valid", events };
    } catch {
      if (attempt === 1) {
        return { verdict: null, raw: text, status: "judge_invalid_output", events };
      }
    }
  }

  // Unreachable but satisfies TS
  return { verdict: null, raw: "", status: "judge_invalid_output", events: [] };
}
