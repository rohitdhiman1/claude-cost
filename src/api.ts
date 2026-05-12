import { type ModelPricing } from "./models.js";
import { estimateCost, type EstimateResult } from "./estimator.js";

export async function countTokensViaApi(
  text: string,
  model: ModelPricing,
  apiKey: string
): Promise<number> {
  const response = await fetch(
    "https://api.anthropic.com/v1/messages/count_tokens",
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model.id,
        messages: [{ role: "user", content: text }],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Token counting API error (${response.status}): ${body}`
    );
  }

  const data = (await response.json()) as { input_tokens: number };
  return data.input_tokens;
}

export async function estimateViaApi(
  text: string,
  model: ModelPricing,
  apiKey: string,
  outputTokens?: number
): Promise<EstimateResult> {
  const inputTokens = await countTokensViaApi(text, model, apiKey);
  const out = outputTokens ?? Math.ceil(inputTokens * 0.5);
  const costs = estimateCost(inputTokens, out, model);
  return {
    inputTokens,
    outputTokens: out,
    model,
    ...costs,
  };
}
