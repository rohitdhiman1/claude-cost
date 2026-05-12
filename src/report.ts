import {
  getAllSummaries,
  getSessionSummary,
  getSessionTurns,
  type SessionSummary,
} from "./storage.js";
import {
  c,
  formatCost,
  bold,
  dim,
  header,
  drawBox,
  drawTable,
  sparkline,
} from "./format.js";

function formatSummaryBox(summary: SessionSummary): string {
  const lines = [
    `${header("Session")} ${dim(summary.sessionId)}`,
    "",
    `${dim("Period:")}        ${summary.startedAt.slice(0, 19)}`,
    `${dim("               →")} ${summary.endedAt.slice(0, 19)}`,
    `${dim("Turns:")}         ${bold(String(summary.turns))}`,
    `${dim("Input tokens:")}  ${summary.totalInputTokens.toLocaleString()}`,
    `${dim("Output tokens:")} ${summary.totalOutputTokens.toLocaleString()}`,
    `${dim("Cache write:")}   ${summary.totalCacheWriteTokens.toLocaleString()}`,
    `${dim("Cache read:")}    ${summary.totalCacheReadTokens.toLocaleString()}`,
    `${dim("Total cost:")}    ${bold(formatCost(summary.totalCost))}`,
  ];

  const turns = getSessionTurns(summary.sessionId);
  if (turns.length > 1) {
    const costs = turns.map((t) => t.totalCost);
    lines.push(`${dim("Cost trend:")}    ${sparkline(costs)}`);
  }

  return drawBox(lines);
}

function formatSummaryRow(summary: SessionSummary): string[] {
  return [
    dim(summary.sessionId.slice(0, 12)),
    String(summary.turns),
    summary.totalInputTokens.toLocaleString(),
    summary.totalOutputTokens.toLocaleString(),
    formatCost(summary.totalCost),
  ];
}

export function reportSession(sessionId: string): string {
  const summary = getSessionSummary(sessionId);
  if (!summary) return `${c.red}No data found for session: ${sessionId}${c.reset}`;
  return "\n" + formatSummaryBox(summary) + "\n";
}

export function reportAll(): string {
  const summaries = getAllSummaries();
  if (summaries.length === 0)
    return `\n  ${dim("No session data found.")}\n`;

  const totalCost = summaries.reduce((s, r) => s + r.totalCost, 0);
  const totalTurns = summaries.reduce((s, r) => s + r.turns, 0);
  const totalInput = summaries.reduce((s, r) => s + r.totalInputTokens, 0);
  const totalOutput = summaries.reduce((s, r) => s + r.totalOutputTokens, 0);

  const overviewLines = [
    header("Cost Report — All Time"),
    "",
    `${dim("Sessions:")}      ${bold(String(summaries.length))}`,
    `${dim("Total turns:")}   ${bold(String(totalTurns))}`,
    `${dim("Input tokens:")}  ${totalInput.toLocaleString()}`,
    `${dim("Output tokens:")} ${totalOutput.toLocaleString()}`,
    `${dim("Total cost:")}    ${bold(formatCost(totalCost))}`,
  ];

  const costs = summaries.map((s) => s.totalCost).reverse();
  if (costs.length > 1) {
    overviewLines.push(`${dim("Trend:")}         ${sparkline(costs)}`);
  }

  const rows = summaries.map(formatSummaryRow);
  const table = drawTable(
    ["Session", "Turns", "Input", "Output", "Cost"],
    rows,
    [1, 2, 3, 4]
  );

  return (
    "\n" +
    drawBox(overviewLines) +
    "\n\n  " +
    table.replace(/\n/g, "\n  ") +
    "\n"
  );
}

export function reportToday(): string {
  const today = new Date().toISOString().slice(0, 10);
  const summaries = getAllSummaries().filter((s) =>
    s.startedAt.startsWith(today)
  );

  if (summaries.length === 0)
    return `\n  ${dim(`No sessions found for today (${today}).`)}\n`;

  const totalCost = summaries.reduce((s, r) => s + r.totalCost, 0);
  const totalTurns = summaries.reduce((s, r) => s + r.turns, 0);
  const totalInput = summaries.reduce((s, r) => s + r.totalInputTokens, 0);
  const totalOutput = summaries.reduce((s, r) => s + r.totalOutputTokens, 0);

  const overviewLines = [
    header(`Cost Report — ${today}`),
    "",
    `${dim("Sessions:")}      ${bold(String(summaries.length))}`,
    `${dim("Total turns:")}   ${bold(String(totalTurns))}`,
    `${dim("Input tokens:")}  ${totalInput.toLocaleString()}`,
    `${dim("Output tokens:")} ${totalOutput.toLocaleString()}`,
    `${dim("Total cost:")}    ${bold(formatCost(totalCost))}`,
  ];

  const rows = summaries.map(formatSummaryRow);
  const table = drawTable(
    ["Session", "Turns", "Input", "Output", "Cost"],
    rows,
    [1, 2, 3, 4]
  );

  return (
    "\n" +
    drawBox(overviewLines) +
    "\n\n  " +
    table.replace(/\n/g, "\n  ") +
    "\n"
  );
}
