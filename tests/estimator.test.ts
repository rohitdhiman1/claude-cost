import { describe, it, expect } from "vitest";
import { estimateCost } from "../src/estimator.js";
import { MODELS } from "../src/models.js";

describe("estimateCost", () => {
  const sonnet = MODELS["claude-sonnet-4-6"];

  it("calculates cost correctly", () => {
    const result = estimateCost(1_000_000, 500_000, sonnet);
    expect(result.inputCost).toBe(3);
    expect(result.outputCost).toBe(7.5);
    expect(result.totalCost).toBe(10.5);
  });

  it("handles zero tokens", () => {
    const result = estimateCost(0, 0, sonnet);
    expect(result.totalCost).toBe(0);
  });

  it("handles small token counts", () => {
    const result = estimateCost(100, 50, sonnet);
    expect(result.inputCost).toBeCloseTo(0.0003);
    expect(result.outputCost).toBeCloseTo(0.00075);
  });
});
