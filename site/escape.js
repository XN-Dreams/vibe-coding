const HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for insertion into HTML, including inside a quoted attribute. */
export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => HTML[c]);
}

const SAFE_SCHEME = /^https?:$/;

/**
 * Escaping is not enough for a URL.
 *
 * esc() stops someone breaking OUT of the href attribute, but it does nothing
 * about what the URL then does: href="javascript:..." is perfectly well-formed
 * HTML and runs code on click. So the scheme gets checked, not just the quotes.
 * Anything that is not http/https, or does not parse at all, becomes '#'.
 */
export function safeUrl(value) {
  const raw = String(value).trim();

  // Relative links never carry a scheme, so they are safe by construction.
  if (raw.startsWith('/') || raw.startsWith('#') || raw.startsWith('./')) return raw;

  try {
    const url = new URL(raw);
    return SAFE_SCHEME.test(url.protocol) ? raw : '#';
  } catch {
    return '#';
  }
}
