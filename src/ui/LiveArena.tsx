import React, { useState, useEffect } from "react";
import { Box, Text, Static } from "ink";
import Spinner from "ink-spinner";
import type { MatchConfig, RoundResult, MatchArtifact, Verdict } from "../types/contracts.js";
import { VerdictSchema } from "../types/contracts.js";
import { runMatch, type RoundCallback } from "../core/arenaDirector.js";

interface LiveArenaProps {
  config: MatchConfig;
  onComplete: (artifact: MatchArtifact) => void;
}

const ROLE_COLORS: Record<string, string> = {
  attacker: "red",
  defender: "blue",
  judge: "magenta",
  commentator: "yellow",
};

const ROLE_LABELS: Record<string, string> = {
  attacker: "ATTACKER",
  defender: "DEFENDER",
  judge: "JUDGE",
  commentator: "COMMENTATOR",
};

interface StaticItem {
  id: string;
  kind: "header" | "panel";
  // header fields
  missionLabel?: string;
  missionDirective?: string;
  missionHint?: string;
  // panel fields
  role?: string;
  text?: string;
  round?: number;
}

function tryParseVerdict(text: string): Verdict | null {
  try {
    return VerdictSchema.parse(JSON.parse(text.trim()));
  } catch {
    return null;
  }
}

function JudgeVerdictDisplay({ text }: { text: string }) {
  const verdict = tryParseVerdict(text);
  if (!verdict) {
    return <Text wrap="wrap">{text}</Text>;
  }

  const outcomeColor = verdict.attacker_success ? "red" : "green";
  const outcomeText = verdict.attacker_success ? "ATTACKER SUCCESS" : "DEFENDER HOLDS";

  const severityColors: Record<string, string> = {
    none: "green",
    low: "yellow",
    medium: "yellow",
    high: "red",
    critical: "red",
  };

  return (
    <Box flexDirection="column">
      <Text bold color={outcomeColor}>Verdict: {outcomeText}</Text>
      <Text> </Text>
      <Text><Text bold>Confidence:</Text>  {(verdict.confidence * 100).toFixed(0)}%</Text>
      <Text><Text bold>Severity:</Text>    <Text color={severityColors[verdict.severity] ?? "white"}>{verdict.severity.toUpperCase()}</Text></Text>
      {verdict.breach_type && (
        <Text><Text bold>Breach Type:</Text> {verdict.breach_type}</Text>
      )}
      <Text> </Text>
      <Text bold>Reasoning:</Text>
      <Text wrap="wrap">{verdict.reasoning}</Text>
    </Box>
  );
}

function truncateToLastLines(text: string, maxLines: number): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  return "…\n" + lines.slice(-maxLines).join("\n");
}

export function LiveArena({ config, onComplete }: LiveArenaProps) {
  const [currentRound, setCurrentRound] = useState(1);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [activeText, setActiveText] = useState("");
  const [staticItems, setStaticItems] = useState<StaticItem[]>([]);
  const [matchDone, setMatchDone] = useState(false);

  useEffect(() => {
    const callback: RoundCallback = (event) => {
      if (event.type === "mission_selected") {
        setStaticItems((prev) => [
          ...prev,
          {
            id: "header",
            kind: "header",
            missionLabel: event.missionLabel,
            missionDirective: event.missionDirective,
            missionHint: event.missionHint,
          },
        ]);
      } else if (event.type === "role_start" && event.role) {
        setCurrentRound(event.round ?? 1);
        setActiveRole(event.role);
        setActiveText("");
      } else if (event.type === "delta" && event.delta) {
        setActiveText((prev) => prev + event.delta);
      } else if (event.type === "role_end" && event.role) {
        setActiveText((currentText) => {
          setStaticItems((prev) => [
            ...prev,
            {
              id: `r${event.round}-${event.role}`,
              kind: "panel",
              role: event.role!,
              text: currentText,
              round: event.round ?? 1,
            },
          ]);
          return "";
        });
        setActiveRole(null);
      }
    };

    runMatch(config, callback).then((artifact) => {
      setMatchDone(true);
      setTimeout(() => onComplete(artifact), 500);
    });
  }, []);

  return (
    <Box flexDirection="column">
      <Static items={staticItems}>
        {(item) => {
          if (item.kind === "header") {
            return (
              <Box key="header" flexDirection="column" paddingX={1} paddingTop={1}>
                <Text bold color="cyan">
                  {"⚡ LIVE ARENA ─ "}{config.scenarioKind.replace(/_/g, " ").toUpperCase()}{" ⚡"}
                </Text>
                <Text dimColor>{"─".repeat(60)}</Text>
                <Text>
                  <Text color="red">{config.attackerModel}</Text>
                  {" vs "}
                  <Text color="blue">{config.defenderModel}</Text>
                  {" │ Judge: "}
                  <Text color="magenta">{config.judgeModel}</Text>
                </Text>
                {item.missionLabel && (
                  <Box flexDirection="column" marginTop={1}>
                    <Text bold color="yellow">{"🎯 Mission: "}{item.missionLabel}</Text>
                    {item.missionDirective && (
                      <Text dimColor wrap="wrap">   {item.missionDirective}</Text>
                    )}
                    {item.missionHint && (
                      <Text color="red" wrap="wrap">{"🗡  Attacker knows: "}{item.missionHint}</Text>
                    )}
                  </Box>
                )}
                <Text>{" "}</Text>
              </Box>
            );
          }

          const color = ROLE_COLORS[item.role!] ?? "white";
          const label = ROLE_LABELS[item.role!] ?? item.role!.toUpperCase();
          const showRoundHeader = item.role === "attacker";
          const isJudge = item.role === "judge";

          return (
            <Box key={item.id} flexDirection="column" paddingX={1}>
              {showRoundHeader && (
                <Text bold color="cyan">── Round {item.round}/{config.rounds} ──</Text>
              )}
              <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor={color} paddingX={1}>
                <Text bold color={color}>{label} ✓</Text>
                {isJudge ? (
                  <JudgeVerdictDisplay text={item.text!} />
                ) : (
                  <Text wrap="wrap">{item.text}</Text>
                )}
              </Box>
            </Box>
          );
        }}
      </Static>

      <Box flexDirection="column" paddingX={1}>
        {activeRole && (
          <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor={ROLE_COLORS[activeRole] ?? "white"} paddingX={1}>
            <Box>
              <Text bold color={ROLE_COLORS[activeRole] ?? "white"}>
                <Spinner type="dots" />
                {" "}{ROLE_LABELS[activeRole] ?? activeRole.toUpperCase()}
              </Text>
            </Box>
            <Text wrap="wrap">{truncateToLastLines(activeText, 12) || "..."}</Text>
          </Box>
        )}

        {matchDone && (
          <Text bold color="green">Match complete! Loading results...</Text>
        )}

        {!matchDone && !activeRole && (
          <Text dimColor>Waiting...</Text>
        )}
      </Box>
    </Box>
  );
}
