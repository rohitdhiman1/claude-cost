import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const DATA_DIR = path.join(os.homedir(), ".claude-cost");
const SESSIONS_DIR = path.join(DATA_DIR, "sessions");

export interface TurnRecord {
  timestamp: string;
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  model: string;
  inputCost: number;
  outputCost: number;
  cacheWriteCost: number;
  cacheReadCost: number;
  totalCost: number;
}

export interface SessionSummary {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  turns: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheWriteTokens: number;
  totalCacheReadTokens: number;
  totalCost: number;
}

function ensureDirs(): void {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function sessionFile(sessionId: string): string {
  return path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
}

export function appendTurn(record: TurnRecord): void {
  ensureDirs();
  const line = JSON.stringify(record) + "\n";
  fs.appendFileSync(sessionFile(record.sessionId), line);
}

export function getSessionTurns(sessionId: string): TurnRecord[] {
  const file = sessionFile(sessionId);
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as TurnRecord);
}

export function getSessionSummary(sessionId: string): SessionSummary | null {
  const turns = getSessionTurns(sessionId);
  if (turns.length === 0) return null;

  return {
    sessionId,
    startedAt: turns[0].timestamp,
    endedAt: turns[turns.length - 1].timestamp,
    turns: turns.length,
    totalInputTokens: turns.reduce((s, t) => s + t.inputTokens, 0),
    totalOutputTokens: turns.reduce((s, t) => s + t.outputTokens, 0),
    totalCacheWriteTokens: turns.reduce((s, t) => s + t.cacheWriteTokens, 0),
    totalCacheReadTokens: turns.reduce((s, t) => s + t.cacheReadTokens, 0),
    totalCost: turns.reduce((s, t) => s + t.totalCost, 0),
  };
}

export function listSessions(): string[] {
  ensureDirs();
  return fs
    .readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => f.replace(".jsonl", ""));
}

export function getAllSummaries(): SessionSummary[] {
  return listSessions()
    .map(getSessionSummary)
    .filter((s): s is SessionSummary => s !== null)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
