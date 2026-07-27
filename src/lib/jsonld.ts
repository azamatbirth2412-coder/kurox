/**
 * Safe serialiser for JSON-LD injected via `dangerouslySetInnerHTML`.
 *
 * `JSON.stringify` escapes double-quote and backslash but NOT `<`, `>` or `&`.
 * Inside a `<script type="application/ld+json">` block the browser HTML
 * tokenizer runs BEFORE any JSON parsing, so a value containing the literal
 * text `</script>` terminates the script element early and everything after it
 * is parsed as markup - i.e. reflected/stored XSS.
 *
 * This was live: `/genre/<slug>` put the URL-decoded slug straight into a
 * BreadcrumbList `name`, so requesting
 *   /genre/%3C%2Fscript%3E%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E
 * executed attacker-supplied JS. The CSP does not help - `script-src` includes
 * `unsafe-inline`, and the injected `<img src=x>` is same-origin.
 *
 * Backslash-uXXXX escapes are valid inside JSON string literals, so the output
 * still parses as the exact same JSON-LD - only the HTML tokenizer sees a
 * difference. U+2028/U+2029 are escaped too: they are legal in JSON but are
 * line terminators in JavaScript.
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
