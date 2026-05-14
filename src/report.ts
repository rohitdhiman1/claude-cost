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
  brandedHeader,
  measureTableWidth,
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

function displayModel(model?: string): string {
  if (!model) return "?";
  return model;
}

function formatSummaryRow(summary: SessionSummary): string[] {
  return [
    dim(summary.sessionId.slice(0, 8)),
    summary.project ?? "-",
    displayModel(summary.model),
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

  const rows = summaries.map(formatSummaryRow);
  const table = drawTable(
    ["Session", "Project", "Model", "Turns", "Input", "Output", "Cost"],
    rows,
    [3, 4, 5, 6]
  );

  const tableWidth = measureTableWidth(table);
  const totalWidth = tableWidth + 2;
  const banner = brandedHeader("All Time Cost Report", totalWidth);

  const overviewLines = [
    header("Summary"),
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

  return (
    "\n" +
    banner +
    "\n" +
    drawBox(overviewLines, totalWidth - 4) +
    "\n\n  " +
    table.replace(/\n/g, "\n  ") +
    "\n"
  );
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function reportToday(): string {
  return reportSince(0, "today");
}

export function reportYesterday(): string {
  return reportSince(1, "yesterday", 0);
}

export function reportDays(n: number): string {
  return reportSince(n - 1, `past ${n} days`);
}

function reportSince(daysBack: number, label: string, daysUntil?: number): string {
  const since = daysAgo(daysBack);
  const until = daysUntil !== undefined ? daysAgo(daysUntil) : undefined;

  const summaries = getAllSummaries().filter((s) => {
    const date = s.endedAt.slice(0, 10);
    if (date < since) return false;
    if (until && date > until) return false;
    return true;
  });

  if (summaries.length === 0)
    return `\n  ${dim(`No sessions found for ${label}.`)}\n`;

  const totalCost = summaries.reduce((s, r) => s + r.totalCost, 0);
  const totalTurns = summaries.reduce((s, r) => s + r.turns, 0);
  const totalInput = summaries.reduce((s, r) => s + r.totalInputTokens, 0);
  const totalOutput = summaries.reduce((s, r) => s + r.totalOutputTokens, 0);

  const rows = summaries.map(formatSummaryRow);
  const table = drawTable(
    ["Session", "Project", "Model", "Turns", "Input", "Output", "Cost"],
    rows,
    [3, 4, 5, 6]
  );

  const tableWidth = measureTableWidth(table);
  const totalWidth = tableWidth + 2;
  const dateRange = until ? since : `${since} → now`;
  const banner = brandedHeader(`${label} (${dateRange})`, totalWidth);

  const overviewLines = [
    header("Summary"),
    "",
    `${dim("Sessions:")}      ${bold(String(summaries.length))}`,
    `${dim("Total turns:")}   ${bold(String(totalTurns))}`,
    `${dim("Input tokens:")}  ${totalInput.toLocaleString()}`,
    `${dim("Output tokens:")} ${totalOutput.toLocaleString()}`,
    `${dim("Total cost:")}    ${bold(formatCost(totalCost))}`,
  ];

  return (
    "\n" +
    banner +
    "\n" +
    drawBox(overviewLines, totalWidth - 4) +
    "\n\n  " +
    table.replace(/\n/g, "\n  ") +
    "\n"
  );
}
