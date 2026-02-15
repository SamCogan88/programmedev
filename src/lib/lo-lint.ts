/**
 * Learning Outcome (LO) linting and language detection.
 * Provides quality checks for learning outcome text including vague verb detection.
 * @module lib/lo-lint
 */

/** A single lint issue found in a learning outcome. */
export interface LintIssue {
  id: string;
  severity: string;
  start: number;
  end: number;
  match: string;
  message: string;
  suggestions: string[];
}

/** Result of language detection. */
export interface LanguageResult {
  lang: string;
  confidence: number;
  scores: Record<string, number>;
}

/** Result of linting a single learning outcome. */
export interface LintResult {
  issues: LintIssue[];
  language: LanguageResult;
}

/** Options for linting learning outcomes. */
export interface LintOptions {
  expectedLanguage?: string;
  allowUnknownLanguage?: boolean;
  language?: { minTokens?: number };
}

/** A lint rule definition. */
interface LintRule {
  id: string;
  severity: string;
  pattern: RegExp;
  message: string;
  suggestions: string[];
}

/**
 * Normalizes text by collapsing whitespace and trimming.
 */
function normalise(text: string): string {
  return (text ?? "").toString().normalize("NFKC").replace(/\s+/g, " ").trim();
}

/**
 * Tokenizes text into lowercase words for analysis.
 */
function tokenize(text: string): string[] {
  return normalise(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Counts how many tokens match a set of stopwords.
 */
function countMatches(tokens: string[], stopwordsSet: Set<string>): number {
  let score = 0;
  for (const t of tokens) {
    if (stopwordsSet.has(t)) {
      score++;
    }
  }
  return score;
}

// ---------- language detection (heuristic) ----------
/** Stopwords by language for heuristic language detection */
export const LANGUAGE_STOPWORDS: Record<string, Set<string>> = {
  en: new Set([
    "the",
    "and",
    "to",
    "of",
    "in",
    "for",
    "with",
    "on",
    "by",
    "as",
    "from",
    "that",
    "this",
    "these",
    "those",
    "will",
    "can",
    "be",
    "is",
    "are",
    "an",
    "a",
    "at",
    "or",
    "into",
    "using",
  ]),
  ga: new Set([
    "agus",
    "an",
    "na",
    "ar",
    "le",
    "go",
    "i",
    "is",
    "ní",
    "mar",
    "don",
    "do",
    "seo",
    "sin",
    "atá",
    "bhfuil",
  ]),
  fr: new Set([
    "le",
    "la",
    "les",
    "et",
    "de",
    "des",
    "du",
    "un",
    "une",
    "dans",
    "pour",
    "avec",
    "sur",
    "par",
    "est",
    "être",
    "au",
  ]),
  es: new Set([
    "el",
    "la",
    "los",
    "las",
    "y",
    "de",
    "del",
    "un",
    "una",
    "en",
    "para",
    "con",
    "por",
    "es",
    "ser",
    "al",
    "que",
  ]),
  de: new Set([
    "der",
    "die",
    "das",
    "und",
    "zu",
    "von",
    "mit",
    "für",
    "im",
    "auf",
    "ist",
    "sein",
    "eine",
    "ein",
    "den",
    "dem",
  ]),
};

/**
 * Detects the language of text using stopword frequency heuristics.
 */
export function detectLanguage(
  text: string,
  { minTokens = 6 }: { minTokens?: number } = {},
): LanguageResult {
  const tokens = tokenize(text);
  if (tokens.length < minTokens) {
    return { lang: "unknown", confidence: 0, scores: {} };
  }

  const scores: Record<string, number> = {};
  for (const [lang, sw] of Object.entries(LANGUAGE_STOPWORDS)) {
    scores[lang] = countMatches(tokens, sw);
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestLang, bestScore] = ranked[0] || ["unknown", 0];
  const secondScore = ranked[1]?.[1] ?? 0;

  const confidence = bestScore === 0 ? 0 : (bestScore - secondScore) / Math.max(1, tokens.length);

  if (bestScore < 2) {
    return { lang: "unknown", confidence: 0, scores };
  }

  return { lang: bestLang, confidence, scores };
}

// ---------- LO wording lint ----------
/** Lint rules for detecting vague or non-measurable language in learning outcomes */
export const LO_LINT_RULES: LintRule[] = [
  {
    id: "vague_understand",
    severity: "warn",
    pattern: /\b(understand|understands|understanding)\b/gi,
    message: "'Understand' is hard to assess directly. Use an observable verb instead.",
    suggestions: ["describe", "explain", "apply", "analyse", "evaluate"],
  },
  {
    id: "vague_knowledge",
    severity: "warn",
    pattern: /\b(have knowledge of|has knowledge of|knowledge of|be knowledgeable about)\b/gi,
    message: "Vague knowledge phrasing. Prefer a demonstrable action.",
    suggestions: ["identify", "summarise", "compare", "apply", "justify"],
  },
  {
    id: "vague_familiar",
    severity: "warn",
    pattern: /\b(be familiar with|become familiar with|familiar with)\b/gi,
    message: "'Familiar with' is usually not measurable. State what learners will *do*.",
    suggestions: ["use", "select", "demonstrate", "interpret"],
  },
  {
    id: "vague_aware",
    severity: "warn",
    pattern: /\b(aware of|awareness of)\b/gi,
    message: "'Aware of' is often too soft. Specify the behaviour or output.",
    suggestions: ["recognise", "identify", "explain", "evaluate"],
  },
];

/**
 * Lints a single learning outcome for quality issues.
 * Checks for vague verbs, language consistency, and measurability.
 */
export function lintLearningOutcome(text: string, opts: LintOptions = {}): LintResult {
  const t = normalise(text);
  const issues: LintIssue[] = [];

  if (!t) {
    return { issues, language: { lang: "unknown", confidence: 0, scores: {} } };
  }

  const language = detectLanguage(t, opts.language || undefined);

  const expected = (opts.expectedLanguage || "en").toLowerCase();
  const allowUnknown = opts.allowUnknownLanguage ?? true;

  if (language.lang !== "unknown") {
    if (language.lang !== expected) {
      issues.push({
        id: "language_mismatch",
        severity: "warn",
        start: 0,
        end: 0,
        match: "",
        message: `Detected language looks like "${language.lang}" (expected "${expected}").`,
        suggestions: [],
      });
    }
  } else if (!allowUnknown) {
    issues.push({
      id: "language_unknown",
      severity: "info",
      start: 0,
      end: 0,
      match: "",
      message: "Could not detect language reliably (short text).",
      suggestions: [],
    });
  }

  for (const rule of LO_LINT_RULES) {
    rule.pattern.lastIndex = 0;
    let m;
    while ((m = rule.pattern.exec(t)) !== null) {
      issues.push({
        id: rule.id,
        severity: rule.severity,
        start: m.index,
        end: m.index + m[0].length,
        match: m[0],
        message: rule.message,
        suggestions: rule.suggestions ?? [],
      });
      if (m.index === rule.pattern.lastIndex) {
        rule.pattern.lastIndex++;
      }
    }
  }

  return { issues, language };
}

/**
 * Lints multiple learning outcomes.
 */
export function lintLearningOutcomes(
  outcomes: string[],
  opts: LintOptions = {},
): Array<{ index: number; text: string } & LintResult> {
  return (outcomes ?? []).map((loText, idx) => ({
    index: idx,
    text: loText,
    ...lintLearningOutcome(loText, opts),
  }));
}
