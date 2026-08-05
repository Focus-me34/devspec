/** Initials and a stable colour derived from a name, so the same person looks
 *  the same everywhere without storing an avatar anywhere. Shared rather than
 *  copied: two copies of the hash would drift and colour people differently on
 *  different screens. */

export function initials(n: string) {
  return n.replace(/[^a-zA-Z ]/g, " ").split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join("") || "?";
}

export function tint(n: string) {
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${(h % 100) + 185} 62% 42%)`;
}
