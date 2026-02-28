import { writeFile, readFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { MatchArtifact } from "../types/contracts.js";

const ARTIFACTS_DIR = join(process.cwd(), ".raydar", "artifacts");

async function ensureDir() {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
}

export async function saveArtifact(artifact: MatchArtifact): Promise<string> {
  await ensureDir();
  const filename = `${artifact.match_id}.json`;
  const filepath = join(ARTIFACTS_DIR, filename);
  await writeFile(filepath, JSON.stringify(artifact, null, 2), "utf-8");
  return filepath;
}

export async function loadArtifact(matchId: string): Promise<MatchArtifact | null> {
  try {
    const filepath = join(ARTIFACTS_DIR, `${matchId}.json`);
    const data = await readFile(filepath, "utf-8");
    return JSON.parse(data) as MatchArtifact;
  } catch {
    return null;
  }
}

export async function listArtifacts(): Promise<string[]> {
  await ensureDir();
  const files = await readdir(ARTIFACTS_DIR);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}
