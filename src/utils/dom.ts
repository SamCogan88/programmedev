/**
 * DOM utility functions for safe HTML generation and rendering.
 * @module utils/dom
 */

/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Converts &, <, >, ", and ' to their HTML entity equivalents.
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>');
 * // "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
 */
export function escapeHtml(s: string): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Generates HTML markup for a status badge (error, warning, or OK).
 */
export function tagHtml(type: string): string {
  if (type === "error") {
    return `<span class="tag tag-error"><i class="ph ph-warning" aria-hidden="true"></i> ERROR</span>`;
  }
  if (type === "warn") {
    return `<span class="tag tag-warn"><i class="ph ph-warning" aria-hidden="true"></i> WARN</span>`;
  }
  return `<span class="tag tag-ok">OK</span>`;
}
