"use client";

import { useEffect, useState } from "react";
import { currentTheme, persistTheme, type Theme } from "@/lib/theme";

/** Its own component because it is needed signed out as well: the marketing
 *  header, the sign in page and the invite page all carry one. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  // The inline script in the layout has already decided; read that rather than
  // assume, otherwise the icon disagrees with the page on the first render.
  useEffect(() => setTheme(currentTheme()), []);

  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Dark theme" : "Light theme";

  return (
    <button
      className={`btn icon theme-btn ${className}`.trim()}
      onClick={() => { setTheme(next); persistTheme(next); }}
      aria-label={`Switch to ${next} theme`}
      title={label}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
