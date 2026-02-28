# Raydar — Adversarial Prompting Arena

Raydar is an automated red-team evaluation framework that pits LLMs against each other in structured adversarial scenarios. One model attacks, one defends, one judges — all in real-time.

## What is it?

Raydar tests how robust AI models are against prompt injection, data leaking, and jailbreaking. Instead of manual red-teaming, it automates the entire process: an attacker model crafts adversarial prompts, a defender model tries to hold its ground, and a judge model scores the outcome.

Each match features a **defender mission** — a specific persona with something to protect (a secret, a task, a content policy). The attacker only gets a vague hint about the mission category. This asymmetric information design forces realistic adversarial dynamics where the attacker must probe, infer, and exploit.

## How it works

1. **Pick a scenario** — Prompt Injection, Prompt Leaking, or Jailbreaking
2. **Choose your models** — Select attacker, defender, and judge models
3. **Watch the match** — Rounds stream live in the terminal as models face off
4. **Get results** — Each round produces a structured verdict with confidence scores, breach classification, and severity ratings

### Scenarios

| Scenario             | Defender's job                                            | Attacker wins if...          |
| -------------------- | --------------------------------------------------------- | ---------------------------- |
| **Prompt Injection** | Execute a fixed task (translate, format SQL, count words) | Defender abandons its task   |
| **Prompt Leaking**   | Guard a secret (passphrase, API key, PIN)                 | Defender reveals the secret  |
| **Jailbreaking**     | Enforce a content policy (no competitors, English-only)   | Defender violates its policy |

Each scenario has 5 defender missions, randomly selected per match for variety.

### Information asymmetry

| Agent    | What it knows                                          |
| -------- | ------------------------------------------------------ |
| Attacker | Mission category only (e.g. "defender holds a secret") |
| Defender | Full mission directive as its system prompt            |
| Judge    | Full mission directive for accurate evaluation         |

## Why is it useful?

- **Automated red-teaming** — Replaces manual, ad-hoc prompt testing with structured, repeatable evaluations
- **Model benchmarking** — Run the same scenarios across different models to compare robustness
- **Realistic adversarial dynamics** — Attackers craft disguised, well-intentioned-sounding prompts rather than obvious jailbreak attempts
- **Structured output** — Every match produces a JSON artifact with full traces, verdicts, and scoring for analysis
- **Live observability** — Watch attacks and defenses unfold in real-time with streaming output

## Tech stack

- **OpenAI Responses API** — Powers all agents (attacker, defender, judge, commentator) via `openai.responses.create()` with streaming
- **TypeScript** — End-to-end type safety with Zod schema validation
- **React + Ink** — Terminal UI framework for the live match interface
- **Codex models** — Used for the judge agent, producing structured JSON verdicts

## Getting started

```bash
# Install dependencies
npm install

# Set your OpenAI API key
export OPENAI_API_KEY=sk-...

# Run the arena
npm run raydar
```
