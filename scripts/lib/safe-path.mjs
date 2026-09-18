import { join, relative, isAbsolute, sep } from 'node:path';

/**
 * Resolve a URL path to a file inside `root`, or null if it escapes.
 *
 * The obvious version of this check is `resolved.startsWith(root)`, and it is
 * wrong: startsWith compares STRINGS, not path boundaries. With root
 * ".../site", the path ".../site-secret/leak.txt" starts with ".../site" and
 * sails through, even though it is a different directory entirely.
 *
 * relative() answers the question we actually meant: how do you get from root
 * to this path? If the answer begins with "..", the path is outside root.
 */
export function resolveSitePath(root, urlPath) {
  const decoded = safeDecode(urlPath.split('?')[0]);
  if (decoded === null) return null;

  const resolved = join(root, decoded === '/' ? 'index.html' : decoded);
  const rel = relative(root, resolved);

  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return null;
  return resolved;
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return null; // malformed percent-encoding, e.g. "%zz"
  }
}
