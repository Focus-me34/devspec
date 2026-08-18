"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { currentTheme, persistTheme, ME_CHANGED, type Theme } from "@/lib/theme";
import Avatar from "./Avatar";

/** One bar for every signed in page, in one fixed order:
 *
 *    DevSpec | team picker  New team  Features  People  ...  You  Sign out  ☾
 *
 *  Left of the gap is where you are and where you can go. Right of it is your
 *  own account. Nothing page specific lives here any more, which is what made
 *  the old bar inconsistent from screen to screen. */

/* Stroke icons on a 24 grid, sized by the bar. Inline rather than an icon
   dependency, since the whole app needs five of them. */
const stroke = {
  fill: "none", stroke: "currentColor", strokeWidth: 2,
  strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
} as const;

function FeaturesIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

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

type BarTeam = { id: string; name: string };

export default function AppBar({
  teams, teamId, onTeamChange, onNewTeam,
}: {
  /** Only passed by pages that already hold the list and need to stay in sync
   *  with it. Every other page lets the bar fetch its own, so the bar looks
   *  the same on all of them instead of losing controls page by page. */
  teams?: BarTeam[];
  teamId?: string;
  onTeamChange?: (id: string) => void;
  onNewTeam?: () => void;
}) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [ownTeams, setOwnTeams] = useState<BarTeam[]>([]);

  // Its own fetches, so every page gets the avatar, the name and the team list
  // without each one having to remember to pass them in. Reloads on navigation
  // and on ME_CHANGED, which is what saving your profile on this very page
  // fires, since that changes the name without changing the route.
  useEffect(() => {
    let live = true;
    async function load() {
      const [meRes, teamRes] = await Promise.all([fetch("/api/me"), fetch("/api/teams")]);
      if (!live) return;
      if (meRes.ok) setMe((await meRes.json()).me);
      if (teamRes.ok) setOwnTeams((await teamRes.json()).teams);
    }
    load();
    window.addEventListener(ME_CHANGED, load);
    return () => { live = false; window.removeEventListener(ME_CHANGED, load); };
  }, [path]);

  const list = teams ?? ownTeams;
  // Without a handler from the page, switching team means going to look at that
  // team's features.
  const change = onTeamChange ?? ((id: string) => router.push(`/app?team=${id}`));

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="bar app-bar">
      <div className="bar-in">
        <div className="bar-left">
          <Link href="/app" className="logo" aria-label="DevSpec home">
            <span className="dot" />DevSpec
          </Link>

          {list.length > 0 && (
            <select className="field bar-teams" value={teamId ?? list[0].id} aria-label="Team"
              onChange={(e) => change(e.target.value)}>
              {list.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <button className="btn ghost"
            onClick={onNewTeam ?? (() => router.push("/app?new=team"))}>New team</button>

          <nav className="bar-nav">
            <Link href="/app" className="navlink"
              aria-current={path === "/app" ? "page" : undefined}>
              <FeaturesIcon />Features
            </Link>
            <Link href={teamId ? `/app/team?team=${teamId}` : "/app/team"} className="navlink"
              aria-current={path.startsWith("/app/team") ? "page" : undefined}>
              <PeopleIcon />People
            </Link>
          </nav>
        </div>

        <div className="bar-right">
          <Link href="/app/profile" className="profile-btn" title="Your profile">
            <Avatar name={me?.name ?? "?"} src={me?.avatar} size={24} />
            <span>{me?.name ?? " "}</span>
          </Link>
          <button className="btn ghost danger" onClick={signOut}>
            <SignOutIcon />Sign out
          </button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
