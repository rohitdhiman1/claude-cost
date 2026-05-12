import * as fs from "node:fs";
import { inferModelFromId } from "../models.js";
import { estimateCostWithCache } from "../estimator.js";
import { appendTurn } from "../storage.js";

interface HookInput {
  session_id: string;
  transcript_path: string;
}

interface TranscriptUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface TranscriptMessage {
  model?: string;
  usage?: TranscriptUsage;
}

interface TranscriptEntry {
  type?: string;
  model?: string;
  usage?: TranscriptUsage;
  message?: TranscriptMessage;
}

function extractLastUsage(transcriptPath: string): {
  usage: TranscriptUsage;
  model: string;
} | null {
  if (!fs.existsSync(transcriptPath)) return null;

  const lines = fs
    .readFileSync(transcriptPath, "utf-8")
    .split("\n")
    .filter((l) => l.trim());

  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]) as TranscriptEntry;
      if (entry.type === "assistant") {
        const usage = entry.message?.usage ?? entry.usage;
        const model = entry.message?.model ?? entry.model;
        if (usage) {
          return {
            usage,
            model: model ?? "claude-sonnet-4-6",
          };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function handleStop(input: HookInput): void {
  const result = extractLastUsage(input.transcript_path);
  if (!result) return;

  const { usage, model: modelId } = result;
  const modelPricing = inferModelFromId(modelId);
  if (!modelPricing) return;

  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;

  const costs = estimateCostWithCache(
    inputTokens,
    outputTokens,
    cacheWriteTokens,
    cacheReadTokens,
    modelPricing
  );

  appendTurn({
    timestamp: new Date().toISOString(),
    sessionId: input.session_id,
    inputTokens,
    outputTokens,
    cacheWriteTokens,
    cacheReadTokens,
    model: modelId,
    inputCost: costs.inputCost,
    outputCost: costs.outputCost,
    cacheWriteCost: costs.cacheWriteCost,
    cacheReadCost: costs.cacheReadCost,
    totalCost: costs.totalCost,
  });
}
