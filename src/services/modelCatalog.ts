import { getClient } from "./openaiClient.js";

export interface ModelInfo {
  id: string;
  owned_by: string;
}

export const MODEL_SERIES = ["GPT-5 series", "GPT-4 series", "GPT-Codex series"] as const;
export type ModelSeries = (typeof MODEL_SERIES)[number];

// For attacker/defender — no Codex
export const CHAT_SERIES: readonly ModelSeries[] = ["GPT-5 series", "GPT-4 series"];
// For judge — Codex only
export const CODEX_ONLY: readonly ModelSeries[] = ["GPT-Codex series"];

let cachedRaw: ModelInfo[] | null = null;

async function fetchRawModels(): Promise<ModelInfo[]> {
  if (cachedRaw) return cachedRaw;

  const openai = getClient();
  const list = await openai.models.list();
  const models: ModelInfo[] = [];

  for await (const model of list) {
    models.push({ id: model.id, owned_by: model.owned_by });
  }

  cachedRaw = models;
  return models;
}

function classifySeries(id: string): ModelSeries | null {
  const lower = id.toLowerCase();

  // Codex series — must check before GPT-5 since codex IDs contain "gpt-5"
  if (lower.includes("codex")) return "GPT-Codex series";

  // GPT-5 series
  if (
    lower.startsWith("gpt-5") ||
    lower.startsWith("chatgpt-5")
  ) {
    return "GPT-5 series";
  }

  // GPT-4 series
  if (
    lower.startsWith("gpt-4") ||
    lower.startsWith("chatgpt-4")
  ) {
    return "GPT-4 series";
  }

  return null;
}

function isTextGenerationModel(id: string): boolean {
  const lower = id.toLowerCase();
  const exclude = [
    "embedding", "embed", "tts", "whisper", "dall-e",
    "moderation", "search", "similarity", "audio",
    "realtime", "transcription",
  ];
  return !exclude.some((p) => lower.includes(p));
}

export async function fetchModelsForSeries(series: ModelSeries): Promise<ModelInfo[]> {
  const raw = await fetchRawModels();
  return raw
    .filter((m) => isTextGenerationModel(m.id) && classifySeries(m.id) === series)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function getAvailableSeries(restrict?: readonly ModelSeries[]): Promise<ModelSeries[]> {
  const raw = await fetchRawModels();
  const pool = restrict ?? MODEL_SERIES;

  const available: ModelSeries[] = [];
  for (const series of pool) {
    const has = raw.some((m) => isTextGenerationModel(m.id) && classifySeries(m.id) === series);
    if (has) available.push(series);
  }
  return available;
}
