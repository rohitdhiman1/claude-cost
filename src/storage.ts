import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const DATA_DIR = path.join(os.homedir(), ".claude-cost");
const SESSIONS_DIR = path.join(DATA_DIR, "sessions");
const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");

export interface TurnRecord {
  timestamp: string;
  sessionId: string;
  project?: string;
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
  project?: string;
  model?: string;
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

function decodeProjectName(encodedDir: string): string | undefined {
  const raw = encodedDir.startsWith("-") ? encodedDir.slice(1) : encodedDir;
  const segments = raw.split("-");

  let current = "";
  let pending = "";

  for (const seg of segments) {
    const tryPath = pending
      ? `${current}/${pending}-${seg}`
      : `${current}/${seg}`;

    const tryAsDir = pending ? tryPath : `${current}/${seg}`;

    if (fs.existsSync(tryAsDir) && fs.statSync(tryAsDir).isDirectory()) {
      current = tryAsDir;
      pending = "";
    } else if (pending) {
      const extended = `${pending}-${seg}`;
      const extendedPath = `${current}/${extended}`;
      if (fs.existsSync(extendedPath) && fs.statSync(extendedPath).isDirectory()) {
        current = extendedPath;
        pending = "";
      } else {
        pending = extended;
      }
    } else {
      pending = seg;
    }
  }

  if (pending) {
    current = `${current}/${pending}`;
  }

  return path.basename(current) || undefined;
}

function deriveProjectFromClaude(sessionId: string): string | undefined {
  if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) return undefined;
  try {
    const dirs = fs.readdirSync(CLAUDE_PROJECTS_DIR);
    for (const dir of dirs) {
      const file = path.join(CLAUDE_PROJECTS_DIR, dir, `${sessionId}.jsonl`);
      if (fs.existsSync(file)) {
        return decodeProjectName(dir);
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function getSessionSummary(sessionId: string): SessionSummary | null {
  const turns = getSessionTurns(sessionId);
  if (turns.length === 0) return null;

  const project =
    turns.find((t) => t.project)?.project ?? deriveProjectFromClaude(sessionId);
  const model = turns[turns.length - 1].model;

  return {
    sessionId,
    project,
    model,
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

function summarizeTurns(sessionId: string, turns: TurnRecord[]): SessionSummary | null {
  if (turns.length === 0) return null;
  const project =
    turns.find((t) => t.project)?.project ?? deriveProjectFromClaude(sessionId);
  const model = turns[turns.length - 1].model;
  return {
    sessionId,
    project,
    model,
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

function toLocalDate(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getSummariesForDateRange(since: string, until?: string): SessionSummary[] {
  return listSessions()
    .map((id) => {
      const turns = getSessionTurns(id).filter((t) => {
        const date = toLocalDate(t.timestamp);
        if (date < since) return false;
        if (until && date >= until) return false;
        return true;
      });
      return summarizeTurns(id, turns);
    })
    .filter((s): s is SessionSummary => s !== null)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
