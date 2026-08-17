"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { currentTheme, persistTheme, type Theme } from "@/lib/theme";

/** One bar for every signed in page. Sign out used to exist only on the
 *  feature list, and the only way back from a detail page was a small text
 *  link, so both now live here and cannot go missing from a screen again. */

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  // The inline script in the layout has already decided; read that rather than
  // assume, otherwise the icon disagrees with the page on the first render.
  useEffect(() => setTheme(currentTheme()), []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    persistTheme(next);
  }

  return (
    <button className="btn icon" onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light theme" : "Dark theme"}>
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}

export default function AppBar({
  teamName, teamId, userName, children,
}: {
  teamName?: string;
  teamId?: string;
  userName?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const path = usePathname();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const onFeatures = path === "/app";
  const onPeople = path.startsWith("/app/team");

  return (
    <div className="bar">
      <div className="bar-in">
        <Link href="/app" className="logo" aria-label="DevSpec home">
          <span className="dot" />
          DevSpec
          {teamName && <small>/ {teamName}</small>}
        </Link>

        <div className="bar-right">
          <nav className="bar-nav">
            <Link href="/app" className="navlink" aria-current={onFeatures ? "page" : undefined}>
              Features
            </Link>
            <Link href={teamId ? `/app/team?team=${teamId}` : "/app/team"}
              className="navlink" aria-current={onPeople ? "page" : undefined}>
              People
            </Link>
          </nav>

          {children}

          {userName && <span className="hint bar-who">{userName}</span>}
          <ThemeToggle />
          <button className="btn ghost danger" onClick={signOut}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
