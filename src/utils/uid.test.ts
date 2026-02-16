import { describe, expect, it, vi } from "vitest";

import { uid } from "./uid";

describe("uid", () => {
  it("returns a string with the default 'id' prefix", () => {
    const result = uid();
    expect(result).toMatch(/^id_/);
  });

  it("returns a string with a custom prefix", () => {
    const result = uid("mod");
    expect(result).toMatch(/^mod_/);
  });

  it("generates unique IDs on successive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });

  it("uses crypto.randomUUID when available", () => {
    const mockUUID = "550e8400-e29b-41d4-a716-446655440000";
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      mockUUID as `${string}-${string}-${string}-${string}-${string}`,
    );

    const result = uid("test");
    expect(result).toBe(`test_${mockUUID}`);

    vi.restoreAllMocks();
  });

  it("falls back when crypto.randomUUID is unavailable", () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });

    const result = uid("fb");
    expect(result).toMatch(/^fb_[0-9a-f]+_[0-9a-f]+$/);

    Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
  });

  it("accepts empty string as prefix", () => {
    const result = uid("");
    expect(result).toMatch(/^_/);
  });
});
