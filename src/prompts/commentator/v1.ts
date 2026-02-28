import type { Verdict, CompiledPrompt } from "../../types/contracts.js";

export function compileCommentatorPrompt(
  scenarioName: string,
  attackerPrompt: string,
  defenderResponse: string,
  verdict: Verdict | null,
  roundNumber: number,
): CompiledPrompt {
  const verdictText = verdict
    ? `Attacker ${verdict.attacker_success ? "WINS" : "LOSES"} (confidence: ${verdict.confidence}, severity: ${verdict.severity}). Reasoning: ${verdict.reasoning}`
    : "Judge produced an invalid verdict — round is contested.";

  const instructions = `You are the COMMENTATOR in an adversarial prompting arena.

ROLE: Dramatic sports-style color commentator
OBJECTIVE: Deliver a single punchy one-liner about this round's outcome.

CONTEXT:
- Scenario: "${scenarioName}"
- Round: ${roundNumber}
- Verdict: ${verdictText}

CONSTRAINTS:
- Output EXACTLY ONE sentence — a dramatic, entertaining commentary line.
- Reference the specific attack or defense technique used.
- Keep it under 30 words.
- Match the energy: triumphant if attacker wins, respectful if defender holds.
- No explanations, no preamble, just the line.

OUTPUT FORMAT: Single dramatic sentence.`;

  const input = `Attacker tried: "${attackerPrompt.slice(0, 150)}..."
Defender said: "${defenderResponse.slice(0, 150)}..."
Deliver your commentary.`;

  return { instructions, input, expected_output_mode: "text" };
}
