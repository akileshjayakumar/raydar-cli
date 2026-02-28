import OpenAI from "openai";
import type { CompiledPrompt, AgentRole, StreamEvent } from "../types/contracts.js";

let client: OpenAI | null = null;

export function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI();
  }
  return client;
}

function buildParams(model: string, prompt: CompiledPrompt, temperature?: number) {
  return {
    model,
    instructions: prompt.instructions,
    input: prompt.input,
    stream: true as const,
    ...(temperature != null && { temperature }),
    ...(prompt.expected_output_mode === "json" && {
      text: { format: { type: "json_object" as const } },
    }),
  };
}

export async function* streamCompletion(
  model: string,
  prompt: CompiledPrompt,
  role: AgentRole,
): AsyncGenerator<StreamEvent> {
  const openai = getClient();
  const temperature = role === "judge" ? 0.2 : 0.9;

  let stream;
  try {
    stream = await openai.responses.create(buildParams(model, prompt, temperature));
  } catch (e: any) {
    if (e?.param === "temperature" || e?.message?.includes("temperature")) {
      stream = await openai.responses.create(buildParams(model, prompt));
    } else {
      throw e;
    }
  }

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      yield {
        role,
        timestamp: Date.now(),
        delta: event.delta,
      };
    }
  }
}

export async function collectStream(
  gen: AsyncGenerator<StreamEvent>,
  onDelta?: (event: StreamEvent) => void,
): Promise<{ text: string; events: StreamEvent[] }> {
  const events: StreamEvent[] = [];
  let text = "";
  for await (const event of gen) {
    events.push(event);
    text += event.delta;
    onDelta?.(event);
  }
  return { text, events };
}
