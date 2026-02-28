import { nanoid } from "nanoid";
import type {
  Scenario,
  SeedTemplate,
  AttackerModifiers,
  AttackerGenerationTrace,
  StreamEvent,
} from "../types/contracts.js";
import { compileAttackerPrompt } from "../prompts/attacker/v1.js";
import { streamCompletion, collectStream } from "../services/openaiClient.js";

const TONES = ["formal", "casual", "urgent", "friendly", "confused", "assertive", "pleading"];
const SOCIAL_FRAMINGS = [
  "authority figure",
  "fellow developer",
  "concerned user",
  "security researcher",
  "confused beginner",
  "system administrator",
  "QA tester",
];
const URGENCY_LEVELS = ["low", "medium", "high", "critical"];
const INDIRECTION_TACTICS = [
  "direct",
  "nested context",
  "multi-step",
  "encoded",
  "role-based",
  "emotional appeal",
  "logical misdirection",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateModifiers(): AttackerModifiers {
  return {
    tone: pickRandom(TONES),
    social_framing: pickRandom(SOCIAL_FRAMINGS),
    urgency_level: pickRandom(URGENCY_LEVELS),
    indirection_tactic: pickRandom(INDIRECTION_TACTICS),
  };
}

function computeSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export async function runAttacker(
  model: string,
  scenario: Scenario,
  matchId: string,
  roundNumber: number,
  previousPrompts: string[],
  usedSeedIds: Set<string>,
  missionCategoryHint: string,
  onDelta?: (event: StreamEvent) => void,
): Promise<{
  prompt: string;
  trace: AttackerGenerationTrace;
  events: StreamEvent[];
}> {
  // Pick unused seed first, fallback to random
  const availableSeeds = scenario.seed_bank.filter((s) => !usedSeedIds.has(s.id));
  const seed: SeedTemplate =
    availableSeeds.length > 0 ? pickRandom(availableSeeds) : pickRandom(scenario.seed_bank);

  const roundNonce = `${matchId}-R${roundNumber}-${Date.now()}`;
  let regen_count = 0;
  let finalPrompt = "";
  let finalEvents: StreamEvent[] = [];
  let modifiers = generateModifiers();

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      modifiers = generateModifiers();
      regen_count = attempt;
    }

    const compiled = compileAttackerPrompt(
      scenario,
      seed.template,
      modifiers,
      roundNumber,
      roundNonce,
      missionCategoryHint,
    );

    const gen = streamCompletion(model, compiled, "attacker");
    const { text, events } = await collectStream(gen, onDelta);
    finalPrompt = text.trim();
    finalEvents = events;

    // Check similarity against previous prompts
    const maxSim = previousPrompts.reduce(
      (max, prev) => Math.max(max, computeSimilarity(finalPrompt, prev)),
      0,
    );

    if (maxSim < 0.6 || attempt === 3) {
      break;
    }
  }

  const maxSim = previousPrompts.reduce(
    (max, prev) => Math.max(max, computeSimilarity(finalPrompt, prev)),
    0,
  );

  const trace: AttackerGenerationTrace = {
    seed_id: seed.id,
    modifiers,
    round_nonce: roundNonce,
    similarity_score: maxSim,
    regen_count,
  };

  return { prompt: finalPrompt, trace, events: finalEvents };
}
