import { describe, expect, it } from "vitest";

import { escapeHtml, tagHtml } from "./dom";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
  });

  it("escapes less-than signs", () => {
    expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
  });

  it("escapes greater-than signs", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("escapes all special characters in combination", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
  });

  it("returns the same string when no special characters", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("coerces non-string values via String()", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(escapeHtml(42 as any)).toBe("42");
  });
});

describe("tagHtml", () => {
  it("returns error badge for 'error' type", () => {
    const result = tagHtml("error");
    expect(result).toContain("tag-error");
    expect(result).toContain("ERROR");
    expect(result).toContain("ph-warning");
  });

  it("returns warn badge for 'warn' type", () => {
    const result = tagHtml("warn");
    expect(result).toContain("tag-warn");
    expect(result).toContain("WARN");
    expect(result).toContain("ph-warning");
  });

  it("returns OK badge for any other type", () => {
    expect(tagHtml("ok")).toContain("tag-ok");
    expect(tagHtml("ok")).toContain("OK");
  });

  it("returns OK badge for empty string", () => {
    expect(tagHtml("")).toContain("tag-ok");
  });

  it("includes aria-hidden on icons", () => {
    expect(tagHtml("error")).toContain('aria-hidden="true"');
    expect(tagHtml("warn")).toContain('aria-hidden="true"');
  });
});
