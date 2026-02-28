import type { Verdict, StreamEvent } from "../types/contracts.js";
import { compileCommentatorPrompt } from "../prompts/commentator/v1.js";
import { streamCompletion, collectStream } from "../services/openaiClient.js";

export async function runCommentator(
  model: string,
  scenarioName: string,
  attackerPrompt: string,
  defenderResponse: string,
  verdict: Verdict | null,
  roundNumber: number,
  onDelta?: (event: StreamEvent) => void,
): Promise<{ line: string; events: StreamEvent[] }> {
  const compiled = compileCommentatorPrompt(
    scenarioName,
    attackerPrompt,
    defenderResponse,
    verdict,
    roundNumber,
  );
  const gen = streamCompletion(model, compiled, "commentator");
  const { text, events } = await collectStream(gen, onDelta);
  return { line: text.trim(), events };
}
