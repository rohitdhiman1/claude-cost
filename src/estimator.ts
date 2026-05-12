import { type ModelPricing } from "./models.js";

const CHARS_PER_TOKEN_TEXT = 4;
const CHARS_PER_TOKEN_CODE = 3.5;

export interface EstimateResult {
  inputTokens: number;
  outputTokens: number;
  model: ModelPricing;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  method: "local" | "api";
}

function looksLikeCode(text: string): boolean {
  const codeIndicators = [
    /[{};]/,
    /^\s*(import|export|const|let|var|function|class|def|if|for|while)\b/m,
    /=>/,
    /\(\) ?[{=]/,
    /^\s*\/\//m,
    /^\s*#\s*(include|define|pragma|import)/m,
  ];
  const matches = codeIndicators.filter((r) => r.test(text)).length;
  return matches >= 2;
}

export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  const charsPerToken = looksLikeCode(text)
    ? CHARS_PER_TOKEN_CODE
    : CHARS_PER_TOKEN_TEXT;
  return Math.ceil(text.length / charsPerToken);
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

export function estimate(
  text: string,
  model: ModelPricing,
  outputRatio = 0.5
): EstimateResult {
  const inputTokens = estimateTokens(text);
  const outputTokens = Math.ceil(inputTokens * outputRatio);
  const costs = estimateCost(inputTokens, outputTokens, model);
  return {
    inputTokens,
    outputTokens,
    model,
    ...costs,
    method: "local",
  };
}
