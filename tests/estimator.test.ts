import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  estimateCost,
  estimateCostWithCache,
  estimate,
} from "../src/estimator.js";
import { MODELS } from "../src/models.js";

describe("estimateTokens", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("estimates plain English text at ~4 chars/token", () => {
    const text = "Hello, this is a test of the token estimator for English text.";
    const tokens = estimateTokens(text);
    expect(tokens).toBe(Math.ceil(text.length / 4));
  });

  it("estimates code at ~3.5 chars/token", () => {
    const code = `import { foo } from "bar";
const x = () => {
  return 42;
};`;
    const tokens = estimateTokens(code);
    expect(tokens).toBe(Math.ceil(code.length / 3.5));
  });
});

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
});

describe("estimate", () => {
  const haiku = MODELS["claude-haiku-4-5-20251001"];

  it("returns full estimate result", () => {
    const result = estimate("Hello, world!", haiku);
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.outputTokens).toBeGreaterThan(0);
    expect(result.model.id).toBe("claude-haiku-4-5-20251001");
    expect(result.method).toBe("local");
    expect(result.totalCost).toBeGreaterThan(0);
  });

  it("respects output ratio", () => {
    const result = estimate("Hello, world!", haiku, 1.0);
    expect(result.outputTokens).toBe(result.inputTokens);
  });
});
