import { getSessionSummary, getSessionTurns } from "../storage.js";
import {
  c,
  formatCost,
  bold,
  dim,
  header,
  drawBox,
  sparkline,
} from "../format.js";

interface HookInput {
  session_id: string;
}

export function handleSessionEnd(input: HookInput): void {
  const summary = getSessionSummary(input.session_id);
  if (!summary) return;

  const turns = getSessionTurns(input.session_id);
  const costs = turns.map((t) => t.totalCost);

  const lines = [
    header("Session Cost Summary"),
    "",
    `${dim("Turns:")}         ${bold(String(summary.turns))}`,
    `${dim("Input tokens:")}  ${summary.totalInputTokens.toLocaleString()}`,
    `${dim("Output tokens:")} ${summary.totalOutputTokens.toLocaleString()}`,
    `${dim("Cache write:")}   ${summary.totalCacheWriteTokens.toLocaleString()}`,
    `${dim("Cache read:")}    ${summary.totalCacheReadTokens.toLocaleString()}`,
    "",
    `${dim("Total cost:")}    ${c.bold}${formatCost(summary.totalCost)}${c.reset}`,
  ];

  if (costs.length > 1) {
    lines.push(`${dim("Cost trend:")}    ${sparkline(costs)}`);
  }

  process.stderr.write("\n" + drawBox(lines) + "\n\n");
}
