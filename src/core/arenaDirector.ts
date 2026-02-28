import { nanoid } from "nanoid";
import type {
  MatchConfig,
  MatchArtifact,
  RoundResult,
  StreamEvent,
  MatchSummary,
} from "../types/contracts.js";
import { getScenario } from "../prompts/scenarios/index.js";
import { runAttacker } from "../agents/attacker.js";
import { runDefender } from "../agents/defender.js";
import { runJudge } from "../agents/judge.js";
import { runCommentator } from "../agents/commentator.js";
import { saveArtifact } from "../persistence/artifactStore.js";

export type RoundCallback = (event: {
  type: "role_start" | "delta" | "role_end" | "round_end" | "mission_selected";
  role?: string;
  round?: number;
  delta?: string;
  result?: RoundResult;
  missionLabel?: string;
  missionDirective?: string;
  missionHint?: string;
}) => void;

export async function runMatch(
  config: MatchConfig,
  onEvent: RoundCallback,
): Promise<MatchArtifact> {
  const matchId = nanoid(12);
  const scenario = getScenario(config.scenarioKind);
  const rounds: RoundResult[] = [];
  const previousPrompts: string[] = [];
  const usedSeedIds = new Set<string>();
  const startedAt = new Date().toISOString();

  // Select a random defender mission for this match
  const missions = scenario.defender_missions;
  const selectedMission = missions[Math.floor(Math.random() * missions.length)];

  onEvent({
    type: "mission_selected",
    missionLabel: selectedMission.label,
    missionDirective: selectedMission.full_directive,
    missionHint: selectedMission.category_hint,
  });

  for (let r = 1; r <= config.rounds; r++) {
    const allEvents: StreamEvent[] = [];

    // 1. Attacker
    onEvent({ type: "role_start", role: "attacker", round: r });
    const attacker = await runAttacker(
      config.attackerModel,
      scenario,
      matchId,
      r,
      previousPrompts,
      usedSeedIds,
      selectedMission.category_hint,
      (e) => {
        allEvents.push(e);
        onEvent({ type: "delta", role: "attacker", round: r, delta: e.delta });
      },
    );
    usedSeedIds.add(attacker.trace.seed_id);
    previousPrompts.push(attacker.prompt);
    onEvent({ type: "role_end", role: "attacker", round: r });

    // 2. Defender
    onEvent({ type: "role_start", role: "defender", round: r });
    const defender = await runDefender(
      config.defenderModel,
      scenario,
      attacker.prompt,
      selectedMission,
      (e) => {
        allEvents.push(e);
        onEvent({ type: "delta", role: "defender", round: r, delta: e.delta });
      },
    );
    onEvent({ type: "role_end", role: "defender", round: r });

    // 3. Judge
    onEvent({ type: "role_start", role: "judge", round: r });
    const judge = await runJudge(
      config.judgeModel,
      scenario,
      attacker.prompt,
      defender.response,
      selectedMission,
      (e) => {
        allEvents.push(e);
        onEvent({ type: "delta", role: "judge", round: r, delta: e.delta });
      },
    );
    onEvent({ type: "role_end", role: "judge", round: r });

    // 4. Commentator (uses attacker model for commentary)
    onEvent({ type: "role_start", role: "commentator", round: r });
    const commentator = await runCommentator(
      config.attackerModel,
      scenario.name,
      attacker.prompt,
      defender.response,
      judge.verdict,
      r,
      (e) => {
        allEvents.push(e);
        onEvent({ type: "delta", role: "commentator", round: r, delta: e.delta });
      },
    );
    onEvent({ type: "role_end", role: "commentator", round: r });

    const roundResult: RoundResult = {
      round_number: r,
      attacker_prompt: attacker.prompt,
      attacker_trace: attacker.trace,
      defender_response: defender.response,
      verdict: judge.verdict,
      verdict_raw: judge.raw,
      verdict_status: judge.status,
      commentator_line: commentator.line,
      stream_timeline: allEvents,
    };

    rounds.push(roundResult);
    onEvent({ type: "round_end", round: r, result: roundResult });
  }

  const summary: MatchSummary = {
    attacker_wins: rounds.filter((r) => r.verdict?.attacker_success === true).length,
    defender_wins: rounds.filter((r) => r.verdict?.attacker_success === false).length,
    invalid_rounds: rounds.filter((r) => r.verdict_status === "judge_invalid_output").length,
    total_rounds: rounds.length,
  };

  const artifact: MatchArtifact = {
    match_id: matchId,
    scenario_kind: config.scenarioKind,
    scenario_name: scenario.name,
    defender_mission: selectedMission,
    attacker_model: config.attackerModel,
    defender_model: config.defenderModel,
    judge_model: config.judgeModel,
    rounds_requested: config.rounds,
    rounds,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    summary,
  };

  await saveArtifact(artifact);
  return artifact;
}
