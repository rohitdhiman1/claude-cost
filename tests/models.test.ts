import { describe, it, expect } from "vitest";
import { resolveModel, MODELS } from "../src/models.js";

describe("resolveModel", () => {
  it("resolves full model IDs", () => {
    expect(resolveModel("claude-sonnet-4-6").id).toBe("claude-sonnet-4-6");
    expect(resolveModel("claude-opus-4-7").id).toBe("claude-opus-4-7");
    expect(resolveModel("claude-haiku-4-5-20251001").id).toBe(
      "claude-haiku-4-5-20251001"
    );
  });

  it("resolves short aliases", () => {
    expect(resolveModel("opus").id).toBe("claude-opus-4-7");
    expect(resolveModel("sonnet").id).toBe("claude-sonnet-4-6");
    expect(resolveModel("haiku").id).toBe("claude-haiku-4-5-20251001");
  });

  it("is case-insensitive", () => {
    expect(resolveModel("OPUS").id).toBe("claude-opus-4-7");
    expect(resolveModel("Sonnet").id).toBe("claude-sonnet-4-6");
  });

  it("throws on unknown model", () => {
    expect(() => resolveModel("gpt-4")).toThrow("Unknown model");
  });
});

describe("model pricing", () => {
  it("has correct pricing for opus", () => {
    const opus = MODELS["claude-opus-4-7"];
    expect(opus.inputPerMTok).toBe(5);
    expect(opus.outputPerMTok).toBe(25);
    expect(opus.contextWindow).toBe(1_000_000);
  });

  it("has correct pricing for sonnet", () => {
    const sonnet = MODELS["claude-sonnet-4-6"];
    expect(sonnet.inputPerMTok).toBe(3);
    expect(sonnet.outputPerMTok).toBe(15);
  });

  it("has correct pricing for haiku", () => {
    const haiku = MODELS["claude-haiku-4-5-20251001"];
    expect(haiku.inputPerMTok).toBe(1);
    expect(haiku.outputPerMTok).toBe(5);
    expect(haiku.contextWindow).toBe(200_000);
  });
});
