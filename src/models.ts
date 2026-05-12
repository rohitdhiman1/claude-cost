export interface ModelPricing {
  id: string;
  name: string;
  inputPerMTok: number;
  outputPerMTok: number;
  contextWindow: number;
  cacheWriteMultiplier5Min: number;
  cacheWriteMultiplier1Hr: number;
  cacheReadMultiplier: number;
}

export const MODELS: Record<string, ModelPricing> = {
  "claude-opus-4-7": {
    id: "claude-opus-4-7",
    name: "Opus 4.7",
    inputPerMTok: 5,
    outputPerMTok: 25,
    contextWindow: 1_000_000,
    cacheWriteMultiplier5Min: 1.25,
    cacheWriteMultiplier1Hr: 2,
    cacheReadMultiplier: 0.1,
  },
  "claude-sonnet-4-6": {
    id: "claude-sonnet-4-6",
    name: "Sonnet 4.6",
    inputPerMTok: 3,
    outputPerMTok: 15,
    contextWindow: 1_000_000,
    cacheWriteMultiplier5Min: 1.25,
    cacheWriteMultiplier1Hr: 2,
    cacheReadMultiplier: 0.1,
  },
  "claude-haiku-4-5-20251001": {
    id: "claude-haiku-4-5-20251001",
    name: "Haiku 4.5",
    inputPerMTok: 1,
    outputPerMTok: 5,
    contextWindow: 200_000,
    cacheWriteMultiplier5Min: 1.25,
    cacheWriteMultiplier1Hr: 2,
    cacheReadMultiplier: 0.1,
  },
};

export const MODEL_ALIASES: Record<string, string> = {
  opus: "claude-opus-4-7",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
};

export const DEFAULT_MODEL = "claude-sonnet-4-6";

export function resolveModel(input: string): ModelPricing {
  const key = input.toLowerCase();
  const modelId = MODEL_ALIASES[key] ?? key;
  const model = MODELS[modelId];
  if (!model) {
    const valid = [
      ...Object.keys(MODELS),
      ...Object.keys(MODEL_ALIASES),
    ].join(", ");
    throw new Error(`Unknown model: "${input}". Valid models: ${valid}`);
  }
  return model;
}
