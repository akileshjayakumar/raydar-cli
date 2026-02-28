import { z } from "zod";

// ── Scenario ────────────────────────────────────────────────
export const ScenarioKind = z.enum([
  "prompt_injection",
  "prompt_leaking",
  "jailbreaking",
]);
export type ScenarioKind = z.infer<typeof ScenarioKind>;

export interface DefenderMission {
  id: string;
  full_directive: string;
  category_hint: string;
  label: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  attack_style: string;
  success_definition: string;
  failure_signals: string[];
  seed_bank: SeedTemplate[];
  allowed_attack_patterns: string[];
  disallowed_content_bounds: string[];
  defender_missions: DefenderMission[];
}

export interface SeedTemplate {
  id: string;
  template: string;
  tactic: string;
}

// ── Attacker Generation Trace ───────────────────────────────
export interface AttackerGenerationTrace {
  seed_id: string;
  modifiers: AttackerModifiers;
  round_nonce: string;
  similarity_score: number;
  regen_count: number;
}

export interface AttackerModifiers {
  tone: string;
  social_framing: string;
  urgency_level: string;
  indirection_tactic: string;
}

// ── Judge Verdict ───────────────────────────────────────────
export const VerdictSchema = z.object({
  attacker_success: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  breach_type: z.string().nullable(),
  severity: z.enum(["none", "low", "medium", "high", "critical"]),
});
export type Verdict = z.infer<typeof VerdictSchema>;

// ── Round Result ────────────────────────────────────────────
export interface RoundResult {
  round_number: number;
  attacker_prompt: string;
  attacker_trace: AttackerGenerationTrace;
  defender_response: string;
  verdict: Verdict | null;
  verdict_raw: string;
  verdict_status: "valid" | "judge_invalid_output";
  commentator_line: string;
  stream_timeline: StreamEvent[];
}

export interface StreamEvent {
  role: AgentRole;
  timestamp: number;
  delta: string;
}

// ── Match Artifact ──────────────────────────────────────────
export interface MatchArtifact {
  match_id: string;
  scenario_kind: ScenarioKind;
  scenario_name: string;
  defender_mission: DefenderMission;
  attacker_model: string;
  defender_model: string;
  judge_model: string;
  rounds_requested: number;
  rounds: RoundResult[];
  started_at: string;
  finished_at: string;
  summary: MatchSummary;
}

export interface MatchSummary {
  attacker_wins: number;
  defender_wins: number;
  invalid_rounds: number;
  total_rounds: number;
}

// ── Agent Roles ─────────────────────────────────────────────
export type AgentRole = "attacker" | "defender" | "judge" | "commentator";

// ── Prompt Template ─────────────────────────────────────────
export interface PromptTemplate {
  role: string;
  objective: string;
  context: string;
  constraints: string[];
  required_behavior: string[];
  output_format: string;
}

export interface CompiledPrompt {
  instructions: string;
  input: string;
  expected_output_mode: "text" | "json";
}

// ── Setup Config ────────────────────────────────────────────
export interface MatchConfig {
  attackerModel: string;
  defenderModel: string;
  judgeModel: string;
  scenarioKind: ScenarioKind;
  rounds: number;
}
