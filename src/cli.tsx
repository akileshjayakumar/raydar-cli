#!/usr/bin/env node
import React, { useState } from "react";
import { render, Box, Text, useApp } from "ink";
import type { MatchConfig, MatchArtifact } from "./types/contracts.js";
import { Setup } from "./ui/Setup.js";
import { LiveArena } from "./ui/LiveArena.js";
import { Results } from "./ui/Results.js";

// Reject extra args
if (process.argv.length > 2) {
  console.error("Usage: npm run raydar");
  console.error("No additional arguments are supported.");
  process.exit(1);
}

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY environment variable is not set.");
  console.error("Export it before running: export OPENAI_API_KEY=your-key");
  process.exit(1);
}

type AppPhase = "setup" | "live" | "results";

function App() {
  const [phase, setPhase] = useState<AppPhase>("setup");
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [artifact, setArtifact] = useState<MatchArtifact | null>(null);

  if (phase === "setup") {
    return (
      <Setup
        onComplete={(c) => {
          setConfig(c);
          setPhase("live");
        }}
      />
    );
  }

  if (phase === "live" && config) {
    return (
      <LiveArena
        config={config}
        onComplete={(a) => {
          setArtifact(a);
          setPhase("results");
        }}
      />
    );
  }

  if (phase === "results" && artifact) {
    return (
      <Results
        artifact={artifact}
        onExit={() => {
          setConfig(null);
          setArtifact(null);
          setPhase("setup");
        }}
      />
    );
  }

  return <Text>Loading...</Text>;
}

render(<App />);
