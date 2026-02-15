import { describe, expect, it } from "vitest";
import {
  detectLanguage,
  LANGUAGE_STOPWORDS,
  lintLearningOutcome,
  lintLearningOutcomes,
  LO_LINT_RULES,
} from "./lo-lint";

describe("detectLanguage", () => {
  it("detects English text", () => {
    const result = detectLanguage(
      "The student will be able to analyse and evaluate the data from the research",
    );
    expect(result.lang).toBe("en");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("detects French text", () => {
    const result = detectLanguage(
      "Le programme est conçu pour les étudiants dans le domaine de la recherche avec des outils",
    );
    expect(result.lang).toBe("fr");
  });

  it("detects German text", () => {
    const result = detectLanguage(
      "Der Student ist in der Lage die Daten von dem Forschungsprojekt zu analysieren und zu bewerten",
    );
    expect(result.lang).toBe("de");
  });

  it("returns unknown for very short text", () => {
    const result = detectLanguage("hello");
    expect(result.lang).toBe("unknown");
    expect(result.confidence).toBe(0);
  });

  it("returns unknown when no stopwords match", () => {
    const result = detectLanguage("xyz abc def ghi jkl mno pqr stu vwx yzz");
    expect(result.lang).toBe("unknown");
  });

  it("respects custom minTokens option", () => {
    const result = detectLanguage("the and to of", { minTokens: 2 });
    expect(result.lang).toBe("en");
  });

  it("returns scores for all languages", () => {
    const result = detectLanguage(
      "The student will be able to analyse the data from the research and evaluate it",
    );
    expect(result.scores).toHaveProperty("en");
    expect(result.scores).toHaveProperty("fr");
    expect(result.scores).toHaveProperty("de");
    expect(result.scores).toHaveProperty("es");
    expect(result.scores).toHaveProperty("ga");
  });
});

describe("LANGUAGE_STOPWORDS", () => {
  it("has entries for 5 languages", () => {
    expect(Object.keys(LANGUAGE_STOPWORDS)).toHaveLength(5);
    expect(LANGUAGE_STOPWORDS).toHaveProperty("en");
    expect(LANGUAGE_STOPWORDS).toHaveProperty("ga");
    expect(LANGUAGE_STOPWORDS).toHaveProperty("fr");
    expect(LANGUAGE_STOPWORDS).toHaveProperty("es");
    expect(LANGUAGE_STOPWORDS).toHaveProperty("de");
  });

  it("each language has stopwords as a Set", () => {
    for (const lang of Object.keys(LANGUAGE_STOPWORDS)) {
      expect(LANGUAGE_STOPWORDS[lang]).toBeInstanceOf(Set);
      expect(LANGUAGE_STOPWORDS[lang].size).toBeGreaterThan(0);
    }
  });
});

describe("LO_LINT_RULES", () => {
  it("has 4 rules", () => {
    expect(LO_LINT_RULES).toHaveLength(4);
  });

  it("each rule has required properties", () => {
    for (const rule of LO_LINT_RULES) {
      expect(rule).toHaveProperty("id");
      expect(rule).toHaveProperty("severity");
      expect(rule).toHaveProperty("pattern");
      expect(rule).toHaveProperty("message");
      expect(rule).toHaveProperty("suggestions");
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(Array.isArray(rule.suggestions)).toBe(true);
    }
  });
});

describe("lintLearningOutcome", () => {
  it("returns empty issues for empty text", () => {
    const result = lintLearningOutcome("");
    expect(result.issues).toHaveLength(0);
    expect(result.language.lang).toBe("unknown");
  });

  it("detects vague 'understand' verb", () => {
    const result = lintLearningOutcome(
      "The student will understand the principles of computing and apply them to the field",
    );
    const vagueIssues = result.issues.filter((i) => i.id === "vague_understand");
    expect(vagueIssues.length).toBeGreaterThan(0);
    expect(vagueIssues[0].match.toLowerCase()).toContain("understand");
  });

  it("detects 'knowledge of' phrasing", () => {
    const result = lintLearningOutcome(
      "Have knowledge of the main concepts in the field of data science and analysis",
    );
    const issues = result.issues.filter((i) => i.id === "vague_knowledge");
    expect(issues.length).toBeGreaterThan(0);
  });

  it("detects 'familiar with' phrasing", () => {
    const result = lintLearningOutcome(
      "Be familiar with the tools and techniques for data analysis in the computing domain",
    );
    const issues = result.issues.filter((i) => i.id === "vague_familiar");
    expect(issues.length).toBeGreaterThan(0);
  });

  it("detects 'aware of' phrasing", () => {
    const result = lintLearningOutcome(
      "Be aware of the ethical implications in the field of artificial intelligence research",
    );
    const issues = result.issues.filter((i) => i.id === "vague_aware");
    expect(issues.length).toBeGreaterThan(0);
  });

  it("returns no vague verb issues for well-written LO", () => {
    const result = lintLearningOutcome(
      "Analyse and evaluate the performance of different sorting algorithms in the context of large datasets",
    );
    const vagueIssues = result.issues.filter((i) => i.id.startsWith("vague_"));
    expect(vagueIssues).toHaveLength(0);
  });

  it("includes position information in issues", () => {
    const result = lintLearningOutcome(
      "The student will understand the concepts and apply them to the computing domain effectively",
    );
    const issue = result.issues.find((i) => i.id === "vague_understand");
    expect(issue).toBeDefined();
    expect(issue!.start).toBeGreaterThanOrEqual(0);
    expect(issue!.end).toBeGreaterThan(issue!.start);
  });

  it("includes suggestions for vague verbs", () => {
    const result = lintLearningOutcome(
      "Understand the principles and methods of software engineering in the computing field",
    );
    const issue = result.issues.find((i) => i.id === "vague_understand");
    expect(issue!.suggestions.length).toBeGreaterThan(0);
  });

  it("detects language mismatch when expected language differs", () => {
    const result = lintLearningOutcome(
      "Analyse and evaluate the data from the research in the computing field effectively",
      { expectedLanguage: "fr" },
    );
    const mismatch = result.issues.find((i) => i.id === "language_mismatch");
    expect(mismatch).toBeDefined();
    expect(mismatch!.message).toContain("en");
  });

  it("reports unknown language when allowUnknownLanguage is false", () => {
    const result = lintLearningOutcome("xyz abc", {
      allowUnknownLanguage: false,
    });
    const unknown = result.issues.find((i) => i.id === "language_unknown");
    expect(unknown).toBeDefined();
  });

  it("does not report unknown language by default", () => {
    const result = lintLearningOutcome("xyz abc");
    const unknown = result.issues.find((i) => i.id === "language_unknown");
    expect(unknown).toBeUndefined();
  });
});

describe("lintLearningOutcomes", () => {
  it("lints multiple outcomes", () => {
    const results = lintLearningOutcomes([
      "Analyse the data from the research and evaluate the performance in the computing domain",
      "Understand the concepts and principles in the field of software engineering for computing",
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].index).toBe(0);
    expect(results[1].index).toBe(1);
  });

  it("returns correct text for each result", () => {
    const outcomes = ["First outcome text", "Second outcome text"];
    const results = lintLearningOutcomes(outcomes);
    expect(results[0].text).toBe("First outcome text");
    expect(results[1].text).toBe("Second outcome text");
  });

  it("handles empty array", () => {
    const results = lintLearningOutcomes([]);
    expect(results).toHaveLength(0);
  });

  it("passes options through to lintLearningOutcome", () => {
    const results = lintLearningOutcomes(["xyz abc"], {
      allowUnknownLanguage: false,
    });
    const unknown = results[0].issues.find((i) => i.id === "language_unknown");
    expect(unknown).toBeDefined();
  });
});
