import { describe, it, expect } from "vitest";
import { estimateCostWithCache } from "../src/estimator.js";
import { MODELS } from "../src/models.js";

describe("estimateCostWithCache", () => {
  const opus = MODELS["claude-opus-4-7"];

  it("calculates cache costs correctly", () => {
    const result = estimateCostWithCache(500_000, 200_000, 100_000, 400_000, opus);
    expect(result.inputCost).toBe(2.5);
    expect(result.outputCost).toBe(5);
    expect(result.cacheWriteCost).toBeCloseTo(0.625);
    expect(result.cacheReadCost).toBeCloseTo(0.2);
    expect(result.totalCost).toBeCloseTo(8.325);
  });

  it("handles zero cache tokens", () => {
    const result = estimateCostWithCache(1_000_000, 500_000, 0, 0, opus);
    expect(result.cacheWriteCost).toBe(0);
    expect(result.cacheReadCost).toBe(0);
    expect(result.totalCost).toBe(17.5);
  });

  it("handles zero tokens", () => {
    const result = estimateCostWithCache(0, 0, 0, 0, opus);
    expect(result.totalCost).toBe(0);
  });
});
