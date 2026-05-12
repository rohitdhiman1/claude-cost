import { getSessionSummary } from "../storage.js";
import { formatCostPlain } from "../format.js";

interface HookInput {
  session_id: string;
}

export function handleSessionEnd(input: HookInput): void {
  const summary = getSessionSummary(input.session_id);
  if (!summary) return;

  const costStr = formatCostPlain(summary.totalCost);
  process.stderr.write(
    `[claude-cost] Session total: ${costStr} (${summary.turns} turns)\n`
  );
}
