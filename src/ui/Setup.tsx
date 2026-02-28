import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import Spinner from "ink-spinner";
import type { MatchConfig, ScenarioKind } from "../types/contracts.js";
import { getScenario } from "../prompts/scenarios/index.js";
import {
  getAvailableSeries,
  fetchModelsForSeries,
  CHAT_SERIES,
  CODEX_ONLY,
  type ModelSeries,
  type ModelInfo,
} from "../services/modelCatalog.js";

type SetupPhase =
  | "loading"
  | "scenario"
  | "attacker_series" | "attacker_model"
  | "defender_series" | "defender_model"
  | "judge_series" | "judge_model"
  | "rounds"
  | "confirm";

interface SetupProps {
  onComplete: (config: MatchConfig) => void;
}

const SCENARIOS: { label: string; value: ScenarioKind }[] = [
  { label: "Prompt Injection", value: "prompt_injection" },
  { label: "Prompt Leaking", value: "prompt_leaking" },
  { label: "Jailbreaking", value: "jailbreaking" },
];

export function Setup({ onComplete }: SetupProps) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<SetupPhase>("loading");
  const [chatSeries, setChatSeries] = useState<ModelSeries[]>([]);
  const [judgeSeries, setJudgeSeries] = useState<ModelSeries[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [scenarioIdx, setScenarioIdx] = useState(0);

  const [attackerSeriesIdx, setAttackerSeriesIdx] = useState(0);
  const [attackerModels, setAttackerModels] = useState<ModelInfo[]>([]);
  const [attackerModelIdx, setAttackerModelIdx] = useState(0);

  const [defenderSeriesIdx, setDefenderSeriesIdx] = useState(0);
  const [defenderModels, setDefenderModels] = useState<ModelInfo[]>([]);
  const [defenderModelIdx, setDefenderModelIdx] = useState(0);

  const [judgeSeriesIdx, setJudgeSeriesIdx] = useState(0);
  const [judgeModels, setJudgeModels] = useState<ModelInfo[]>([]);
  const [judgeModelIdx, setJudgeModelIdx] = useState(0);

  const [rounds, setRounds] = useState(3);
  const [config, setConfig] = useState<MatchConfig | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [cs, js] = await Promise.all([
          getAvailableSeries(CHAT_SERIES),
          getAvailableSeries(CODEX_ONLY),
        ]);
        if (cs.length === 0) {
          setError("No text-generation models found. Check your OPENAI_API_KEY.");
          return;
        }
        setChatSeries(cs);
        setJudgeSeries(js);
        setPhase("scenario");
      } catch (e: any) {
        setError(`Failed to fetch models: ${e.message}`);
      }
    })();
  }, []);

  const loadModels = async (
    series: ModelSeries,
    setter: (m: ModelInfo[]) => void,
    idxSetter: (n: number) => void,
  ) => {
    const models = await fetchModelsForSeries(series);
    setter(models);
    idxSetter(0);
  };

  useInput((input, key) => {
    if (error) {
      if (input === "q" || key.escape) exit();
      return;
    }

    switch (phase) {
      case "scenario":
        if (key.upArrow) setScenarioIdx((i) => Math.max(0, i - 1));
        if (key.downArrow) setScenarioIdx((i) => Math.min(SCENARIOS.length - 1, i + 1));
        if (key.return) setPhase("attacker_series");
        break;

      case "attacker_series":
        if (key.upArrow) setAttackerSeriesIdx((i) => Math.max(0, i - 1));
        if (key.downArrow) setAttackerSeriesIdx((i) => Math.min(chatSeries.length - 1, i + 1));
        if (key.return) {
          loadModels(chatSeries[attackerSeriesIdx], setAttackerModels, setAttackerModelIdx);
          setPhase("attacker_model");
        }
        if (key.escape) setPhase("scenario");
        break;

      case "attacker_model":
        if (key.upArrow) setAttackerModelIdx((i) => Math.max(0, i - 1));
        if (key.downArrow) setAttackerModelIdx((i) => Math.min(attackerModels.length - 1, i + 1));
        if (key.return && attackerModels.length > 0) setPhase("defender_series");
        if (key.escape) setPhase("attacker_series");
        break;

      case "defender_series":
        if (key.upArrow) setDefenderSeriesIdx((i) => Math.max(0, i - 1));
        if (key.downArrow) setDefenderSeriesIdx((i) => Math.min(chatSeries.length - 1, i + 1));
        if (key.return) {
          loadModels(chatSeries[defenderSeriesIdx], setDefenderModels, setDefenderModelIdx);
          setPhase("defender_model");
        }
        if (key.escape) setPhase("attacker_model");
        break;

      case "defender_model":
        if (key.upArrow) setDefenderModelIdx((i) => Math.max(0, i - 1));
        if (key.downArrow) setDefenderModelIdx((i) => Math.min(defenderModels.length - 1, i + 1));
        if (key.return && defenderModels.length > 0) {
          // If only one judge series, skip series selection
          if (judgeSeries.length === 1) {
            loadModels(judgeSeries[0], setJudgeModels, setJudgeModelIdx);
            setPhase("judge_model");
          } else {
            setPhase("judge_series");
          }
        }
        if (key.escape) setPhase("defender_series");
        break;

      case "judge_series":
        if (key.upArrow) setJudgeSeriesIdx((i) => Math.max(0, i - 1));
        if (key.downArrow) setJudgeSeriesIdx((i) => Math.min(judgeSeries.length - 1, i + 1));
        if (key.return) {
          loadModels(judgeSeries[judgeSeriesIdx], setJudgeModels, setJudgeModelIdx);
          setPhase("judge_model");
        }
        if (key.escape) setPhase("defender_model");
        break;

      case "judge_model":
        if (key.upArrow) setJudgeModelIdx((i) => Math.max(0, i - 1));
        if (key.downArrow) setJudgeModelIdx((i) => Math.min(judgeModels.length - 1, i + 1));
        if (key.return && judgeModels.length > 0) setPhase("rounds");
        if (key.escape) {
          if (judgeSeries.length === 1) setPhase("defender_model");
          else setPhase("judge_series");
        }
        break;

      case "rounds":
        if (key.upArrow || key.rightArrow) setRounds((r) => Math.min(3, r + 1));
        if (key.downArrow || key.leftArrow) setRounds((r) => Math.max(1, r - 1));
        if (key.return) {
          const c: MatchConfig = {
            attackerModel: attackerModels[attackerModelIdx].id,
            defenderModel: defenderModels[defenderModelIdx].id,
            judgeModel: judgeModels[judgeModelIdx].id,
            scenarioKind: SCENARIOS[scenarioIdx].value,
            rounds,
          };
          setConfig(c);
          setPhase("confirm");
        }
        if (key.escape) setPhase("judge_model");
        break;

      case "confirm":
        if (key.return && config) onComplete(config);
        if (key.escape) setPhase("rounds");
        break;
    }
  });

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>Error: {error}</Text>
        <Text dimColor>Press q to quit</Text>
      </Box>
    );
  }

  if (phase === "loading") {
    return (
      <Box padding={1}>
        <Text color="cyan"><Spinner type="dots" /></Text>
        <Text> Fetching models from OpenAI API...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        {"⚡ R A Y D A R  ─  Adversarial Prompting Arena ⚡"}
      </Text>
      <Text dimColor>{"─".repeat(50)}</Text>
      <Box height={1} />

      {phase === "scenario" && (
        <Box flexDirection="column">
          <PickList title="Select Scenario" items={SCENARIOS.map((s) => s.label)} idx={scenarioIdx} />
          <Box flexDirection="column" marginTop={1} paddingX={2}>
            <Text dimColor>Defender personas <Text color="cyan">(picked at random per match)</Text>:</Text>
            {getScenario(SCENARIOS[scenarioIdx].value).defender_missions.map((m) => (
              <Text key={m.id} dimColor>  {"·"} {m.label}</Text>
            ))}
          </Box>
        </Box>
      )}

      {phase === "attacker_series" && (
        <PickList title="Attacker ─ Choose Series" items={chatSeries} idx={attackerSeriesIdx} hint="Esc to go back" />
      )}
      {phase === "attacker_model" && (
        <PickList title={`Attacker ─ ${chatSeries[attackerSeriesIdx]}`} items={attackerModels.map((m) => m.id)} idx={attackerModelIdx} hint="Esc to go back" />
      )}

      {phase === "defender_series" && (
        <PickList title="Defender ─ Choose Series" items={chatSeries} idx={defenderSeriesIdx} hint="Esc to go back" />
      )}
      {phase === "defender_model" && (
        <PickList title={`Defender ─ ${chatSeries[defenderSeriesIdx]}`} items={defenderModels.map((m) => m.id)} idx={defenderModelIdx} hint="Esc to go back" />
      )}

      {phase === "judge_series" && (
        <PickList title="Judge ─ Choose Series (Codex only)" items={judgeSeries} idx={judgeSeriesIdx} hint="Esc to go back" />
      )}
      {phase === "judge_model" && (
        <PickList
          title={`Judge ─ GPT-Codex series`}
          items={judgeModels.map((m) => m.id)}
          idx={judgeModelIdx}
          hint="Esc to go back"
        />
      )}

      {phase === "rounds" && (
        <Box flexDirection="column">
          <Text bold color="yellow">Rounds: {rounds}</Text>
          <Text dimColor>↑↓ to change (1-3), Enter to confirm │ Esc to go back</Text>
        </Box>
      )}

      {phase === "confirm" && config && (
        <Box flexDirection="column">
          <Text bold color="green">Match Configuration</Text>
          <Text>  Scenario:  <Text color="yellow">{SCENARIOS[scenarioIdx].label}</Text></Text>
          <Text>  Attacker:  <Text color="red">{config.attackerModel}</Text></Text>
          <Text>  Defender:  <Text color="blue">{config.defenderModel}</Text></Text>
          <Text>  Judge:     <Text color="magenta">{config.judgeModel}</Text></Text>
          <Text>  Rounds:    <Text color="cyan">{config.rounds}</Text></Text>
          <Box height={1} />
          <Text dimColor>Enter to start match │ Esc to go back</Text>
        </Box>
      )}
    </Box>
  );
}

function PickList({ title, items, idx, hint }: {
  title: string;
  items: string[];
  idx: number;
  hint?: string;
}) {
  const windowSize = 10;
  const start = Math.max(0, idx - Math.floor(windowSize / 2));
  const end = Math.min(items.length, start + windowSize);
  const visible = items.slice(start, end);

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">{title}</Text>
      {visible.map((item, i) => {
        const realIdx = start + i;
        const selected = realIdx === idx;
        return (
          <Text key={realIdx}>
            <Text color={selected ? "cyan" : "white"}>
              {selected ? "❯ " : "  "}{item}
            </Text>
          </Text>
        );
      })}
      <Text dimColor>
        ↑↓ to navigate ({idx + 1}/{items.length}), Enter to select{hint ? ` │ ${hint}` : ""}
      </Text>
    </Box>
  );
}
