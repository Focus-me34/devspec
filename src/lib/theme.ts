/** Fired when the signed in user's own details change. The bar listens for it,
 *  because it loads the profile once on mount and a route change is not what
 *  happens when you save your name on the page you are already standing on. */
export const ME_CHANGED = "devspec:me-changed";

export type Theme = "light" | "dark";

/** Deliberately long and app specific. Cookies are shared across every app on
 *  the same host, so a bare "theme" would collide with anything else running on
 *  localhost during development, or on another *.vercel.app subdomain. */
export const THEME_COOKIE = "devspec_theme";

const YEAR = 60 * 60 * 24 * 365;

/** Runs before first paint, inlined into the document head. Reads the cookie,
 *  falls back to the operating system preference, and stamps the result on
 *  <html> so the correct theme is painted rather than corrected afterwards. */
export const THEME_SCRIPT = `try{
var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=(dark|light)/);
document.documentElement.dataset.theme=m?m[1]:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
}catch(e){}`.replace(/\n/g, "");

/** What the script above settled on, which is the truth once the page is up. */
export function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function persistTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${YEAR}; SameSite=Lax`;
}
