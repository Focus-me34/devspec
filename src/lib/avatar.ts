/** Initials and a stable colour derived from a name, so the same person looks
 *  the same everywhere without storing an avatar anywhere. Shared rather than
 *  copied: two copies of the hash would drift and colour people differently on
 *  different screens. */

export function initials(n: string) {
  return n.replace(/[^a-zA-Z ]/g, " ").split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join("") || "?";
}

/** Kept inside the brand band, cyan through blue, deliberately stopping short
 *  of violet: the old range ran to hue 285 and handed some people a purple that
 *  belonged to nothing else in the app. Lightness varies in three steps so
 *  names are still told apart within the narrower band. */
export function tint(n: string) {
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 9973;
  const hue = 189 + (h % 42);
  const lightness = 38 + (h % 3) * 6;
  return `hsl(${hue} 58% ${lightness}%)`;
}
