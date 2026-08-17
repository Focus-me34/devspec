"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { currentTheme, persistTheme, type Theme } from "@/lib/theme";
import Avatar from "./Avatar";

/** One bar for every signed in page, in one fixed order:
 *
 *    DevSpec | team picker  New team  Features  People  ...  You  Sign out  ☾
 *
 *  Left of the gap is where you are and where you can go. Right of it is your
 *  own account. Nothing page specific lives here any more, which is what made
 *  the old bar inconsistent from screen to screen. */

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

export type Me = { name: string; avatar: string | null };

export default function AppBar({
  teams = [], teamId, onTeamChange, onNewTeam,
}: {
  teams?: { id: string; name: string }[];
  teamId?: string;
  onTeamChange?: (id: string) => void;
  onNewTeam?: () => void;
}) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  // Its own fetch, so every page gets the avatar and name without each one
  // having to remember to pass them in.
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me");
      if (res.ok) setMe((await res.json()).me);
    })();
  }, [path]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="bar">
      <div className="bar-in">
        <div className="bar-left">
          <Link href="/app" className="logo" aria-label="DevSpec home">
            <span className="dot" />DevSpec
          </Link>

          {teams.length > 0 && (
            <select className="field bar-teams" value={teamId} aria-label="Team"
              onChange={(e) => onTeamChange?.(e.target.value)}>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {onNewTeam && (
            <button className="btn ghost" onClick={onNewTeam}>New team</button>
          )}

          <nav className="bar-nav">
            <Link href="/app" className="navlink"
              aria-current={path === "/app" ? "page" : undefined}>Features</Link>
            <Link href={teamId ? `/app/team?team=${teamId}` : "/app/team"} className="navlink"
              aria-current={path.startsWith("/app/team") ? "page" : undefined}>People</Link>
          </nav>
        </div>

        <div className="bar-right">
          <Link href="/app/profile" className="profile-btn" title="Your profile">
            <Avatar name={me?.name ?? "?"} src={me?.avatar} size={24} />
            <span>{me?.name ?? " "}</span>
          </Link>
          <button className="btn ghost danger" onClick={signOut}>Sign out</button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
