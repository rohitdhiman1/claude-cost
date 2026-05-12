import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const ORIGINAL_HOME = process.env.HOME;

describe("storage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-cost-test-"));
    process.env.HOME = tmpDir;
  });

  afterEach(() => {
    process.env.HOME = ORIGINAL_HOME;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("appends and reads turns", async () => {
    // Re-import to pick up new HOME
    const { appendTurn, getSessionTurns } = await import("../src/storage.js");

    const record = {
      timestamp: "2025-05-12T10:00:00Z",
      sessionId: "test-123",
      inputTokens: 1000,
      outputTokens: 500,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      model: "claude-sonnet-4-6",
      inputCost: 0.003,
      outputCost: 0.0075,
      cacheWriteCost: 0,
      cacheReadCost: 0,
      totalCost: 0.0105,
    };

    appendTurn(record);
    appendTurn({ ...record, timestamp: "2025-05-12T10:01:00Z" });

    const turns = getSessionTurns("test-123");
    expect(turns).toHaveLength(2);
    expect(turns[0].inputTokens).toBe(1000);
    expect(turns[1].timestamp).toBe("2025-05-12T10:01:00Z");
  });
});
