import React from "react";
import { Box, Text, useInput, useApp } from "ink";
import type { MatchArtifact } from "../types/contracts.js";

interface ResultsProps {
  artifact: MatchArtifact;
  onExit: () => void;
}

export function Results({ artifact, onExit }: ResultsProps) {
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      onExit();
      exit();
    }
    if (input === "r") onExit();
  });

  const { summary } = artifact;
  const winner =
    summary.attacker_wins > summary.defender_wins
      ? "ATTACKER"
      : summary.defender_wins > summary.attacker_wins
        ? "DEFENDER"
        : "DRAW";

  const winnerColor =
    winner === "ATTACKER" ? "red" : winner === "DEFENDER" ? "green" : "yellow";

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        {"⚡ MATCH RESULTS ⚡"}
      </Text>
      <Text dimColor>{"─".repeat(50)}</Text>
      <Box height={1} />

      <Text bold color={winnerColor}>
        {winner === "DRAW" ? "IT'S A DRAW!" : `${winner} WINS!`}
      </Text>
      <Box height={1} />

      <Text>Match ID:   <Text color="cyan">{artifact.match_id}</Text></Text>
      <Text>Scenario:   <Text color="yellow">{artifact.scenario_name}</Text></Text>
      <Text>Mission:    <Text color="yellow">{artifact.defender_mission.label}</Text></Text>
      <Text>Attacker:   <Text color="red">{artifact.attacker_model}</Text></Text>
      <Text>Defender:   <Text color="blue">{artifact.defender_model}</Text></Text>
      <Text>Judge:      <Text color="magenta">{artifact.judge_model}</Text></Text>
      <Box height={1} />

      <Text bold>Scoreboard</Text>
      <Text>  Attacker wins:  <Text color="red">{summary.attacker_wins}</Text></Text>
      <Text>  Defender wins:  <Text color="green">{summary.defender_wins}</Text></Text>
      <Text>  Invalid rounds: <Text color="yellow">{summary.invalid_rounds}</Text></Text>
      <Text>  Total rounds:   {summary.total_rounds}</Text>
      <Box height={1} />

      <Box height={1} />
      <Text dimColor>Artifact saved to .raydar/artifacts/{artifact.match_id}.json</Text>
      <Text dimColor>Press r for new match │ q to quit</Text>
    </Box>
  );
}
