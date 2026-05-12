import { type ModelPricing } from "./models.js";

export interface EstimateResult {
  inputTokens: number;
  outputTokens: number;
  model: ModelPricing;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: ModelPricing
): { inputCost: number; outputCost: number; totalCost: number } {
  const inputCost = (inputTokens / 1_000_000) * model.inputPerMTok;
  const outputCost = (outputTokens / 1_000_000) * model.outputPerMTok;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

export function estimateCostWithCache(
  inputTokens: number,
  outputTokens: number,
  cacheWriteTokens: number,
  cacheReadTokens: number,
  model: ModelPricing
): {
  inputCost: number;
  outputCost: number;
  cacheWriteCost: number;
  cacheReadCost: number;
  totalCost: number;
} {
  const inputCost = (inputTokens / 1_000_000) * model.inputPerMTok;
  const outputCost = (outputTokens / 1_000_000) * model.outputPerMTok;
  const cacheWriteCost =
    (cacheWriteTokens / 1_000_000) *
    model.inputPerMTok *
    model.cacheWriteMultiplier5Min;
  const cacheReadCost =
    (cacheReadTokens / 1_000_000) *
    model.inputPerMTok *
    model.cacheReadMultiplier;
  return {
    inputCost,
    outputCost,
    cacheWriteCost,
    cacheReadCost,
    totalCost: inputCost + outputCost + cacheWriteCost + cacheReadCost,
  };
}
