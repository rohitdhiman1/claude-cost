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

const OPUS_PRICING = {
  inputPerMTok: 5,
  outputPerMTok: 25,
  contextWindow: 1_000_000,
  cacheWriteMultiplier5Min: 1.25,
  cacheWriteMultiplier1Hr: 2,
  cacheReadMultiplier: 0.1,
} as const;

const SONNET_PRICING = {
  inputPerMTok: 3,
  outputPerMTok: 15,
  contextWindow: 1_000_000,
  cacheWriteMultiplier5Min: 1.25,
  cacheWriteMultiplier1Hr: 2,
  cacheReadMultiplier: 0.1,
} as const;

const HAIKU_PRICING = {
  inputPerMTok: 1,
  outputPerMTok: 5,
  contextWindow: 200_000,
  cacheWriteMultiplier5Min: 1.25,
  cacheWriteMultiplier1Hr: 2,
  cacheReadMultiplier: 0.1,
} as const;

export const MODELS: Record<string, ModelPricing> = {
  "claude-opus-4-7": { id: "claude-opus-4-7", name: "Opus 4.7", ...OPUS_PRICING },
  "claude-opus-4-6": { id: "claude-opus-4-6", name: "Opus 4.6", ...OPUS_PRICING },
  "claude-opus-4-5-20250501": { id: "claude-opus-4-5-20250501", name: "Opus 4.5", ...OPUS_PRICING },
  "claude-sonnet-4-6": { id: "claude-sonnet-4-6", name: "Sonnet 4.6", ...SONNET_PRICING },
  "claude-sonnet-4-5-20241022": { id: "claude-sonnet-4-5-20241022", name: "Sonnet 4.5", ...SONNET_PRICING },
  "claude-haiku-4-5-20251001": { id: "claude-haiku-4-5-20251001", name: "Haiku 4.5", ...HAIKU_PRICING },
};

export const MODEL_ALIASES: Record<string, string> = {
  opus: "claude-opus-4-7",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
};

export const DEFAULT_MODEL = "claude-sonnet-4-6";

const FAMILY_FALLBACKS: Record<string, ModelPricing> = {
  opus: MODELS["claude-opus-4-7"],
  sonnet: MODELS["claude-sonnet-4-6"],
  haiku: MODELS["claude-haiku-4-5-20251001"],
};

export function inferModelFromId(modelId: string): ModelPricing | null {
  if (MODELS[modelId]) return MODELS[modelId];
  for (const [family, pricing] of Object.entries(FAMILY_FALLBACKS)) {
    if (modelId.includes(family)) {
      return { ...pricing, id: modelId, name: `${family} (unknown version)` };
    }
  }
  return null;
}

export function resolveModel(input: string): ModelPricing {
  const key = input.toLowerCase();
  const modelId = MODEL_ALIASES[key] ?? key;
  const model = MODELS[modelId] ?? inferModelFromId(modelId);
  if (!model) {
    const valid = [
      ...Object.keys(MODELS),
      ...Object.keys(MODEL_ALIASES),
    ].join(", ");
    throw new Error(`Unknown model: "${input}". Valid models: ${valid}`);
  }
  return model;
}
