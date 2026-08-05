"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STAGES, missingCount } from "@/lib/spec";
import { useModal } from "@/components/Modal";
import type { Answers } from "@/db/schema";

type Team = { id: string; name: string; role: string };
type Project = { id: string; name: string };
type Feature = {
  id: string; ref: number; title: string; status: string; projectId: string;
  blocked: boolean; answers: Answers; ownerName: string | null; updatedAt: string;
};

const HUE: Record<string, string> = {
  discussion: "var(--s-discussion)", specified: "var(--s-specified)",
  building: "var(--s-building)", review: "var(--s-review)",
  deployed: "var(--s-deployed)", dropped: "var(--s-dropped)",
};

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AppPage() {
  const router = useRouter();
  const { ask, confirm, notify, modal } = useModal();
  const [me, setMe] = useState<{ name: string } | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState("all");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/teams");
      if (res.status === 401) return router.push("/login");
      const data = await res.json();
      setTeams(data.teams);
      setMe(data.me);
      if (data.teams[0]) setTeamId(data.teams[0].id);
      setLoading(false);
    })();
  }, [router]);

  const reload = useCallback(async () => {
    if (!teamId) return;
    const [p, f] = await Promise.all([
      fetch(`/api/projects?team=${teamId}`).then((r) => r.json()),
      fetch(`/api/features?team=${teamId}&project=${project}&q=${encodeURIComponent(q)}`).then((r) => r.json()),
    ]);
    setProjects(p.projects ?? []);
    setFeatures(f.features ?? []);
  }, [teamId, project, q]);

  useEffect(() => { reload(); }, [reload]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }

  async function newFeature() {
    const list = projects;
    if (!list.length) {
      return notify({ title: "No project yet", message: "Create a project first, then add features to it." });
    }
    const title = await ask({
      title: "New feature",
      message: "What is it? A sentence is enough, you fill in the specification next.",
      placeholder: "Let people export their invoices",
      confirmLabel: "Create",
    });
    if (!title) return;
    const projectId = project !== "all" ? project : list[0].id;
    const res = await fetch("/api/features", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title }),
    });
    const data = await res.json();
    if (!res.ok) return notify({ title: "Could not create the feature", message: data.error });
    router.push(`/app/features/${data.feature.id}`);
  }

  async function newProject() {
    const name = await ask({
      title: "New project",
      message: "One per codebase, usually.",
      placeholder: "Project name",
      confirmLabel: "Create",
    });
    if (!name) return;
    const res = await fetch("/api/projects", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, name }),
    });
    if (!res.ok) return notify({ title: "Could not create the project", message: (await res.json()).error });
    reload();
  }

  async function renameProject() {
    const current = projects.find((p) => p.id === project);
    if (!current) return;
    const name = await ask({
      title: "Rename project", initial: current.name,
      placeholder: "Project name", confirmLabel: "Rename",
    });
    if (!name || name === current.name) return;
    const res = await fetch(`/api/projects/${current.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return notify({ title: "Could not rename", message: (await res.json()).error });
    reload();
  }

  async function deleteProject() {
    const current = projects.find((p) => p.id === project);
    if (!current) return;
    // Ask the API what a delete would take with it, the cascade is not obvious.
    const info = await fetch(`/api/projects/${current.id}`).then((r) => r.json());
    const n = info.featureCount ?? 0;
    const ok = await confirm({
      title: `Delete ${current.name}?`,
      message: n === 0
        ? "The project is empty. This cannot be undone."
        : `Its ${n} feature${n === 1 ? "" : "s"} go with it, specifications, notes and history included. This cannot be undone.`,
      confirmLabel: "Delete", danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/projects/${current.id}`, { method: "DELETE" });
    if (!res.ok) return notify({ title: "Could not delete", message: (await res.json()).error });
    setProject("all");
  }

  async function newTeam() {
    const name = await ask({ title: "New team", placeholder: "Team name", confirmLabel: "Create" });
    if (!name) return;
    const res = await fetch("/api/teams", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) return notify({ title: "Could not create the team", message: data.error });
    setTeams([...teams, { ...data.team, role: "admin" }]);
    setTeamId(data.team.id);
    setProject("all");
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) return <div className="wrap" style={{ paddingTop: 40 }}><p className="hint">Loading</p></div>;

  const shown = filter === "all" ? features : features.filter((f) => f.status === filter);

  return (
    <>
      <div className="bar">
        <div className="bar-in">
          <Link href="/app" className="logo">
            <span className="dot" />
            devSpec <small>/ {teams.find((t) => t.id === teamId)?.name ?? ""}</small>
          </Link>
          <div className="bar-right">
            <button className="btn icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? "\u2600" : "\u263E"}
            </button>
            <span className="hint">{me?.name}</span>
            <select className="field" value={teamId}
              onChange={(e) => { setTeamId(e.target.value); setProject("all"); }}>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button className="btn ghost" onClick={newTeam}>New team</button>
            <button className="btn" onClick={newFeature}>New feature</button>
            <button className="btn plain" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="tabs">
          <button className="tab" aria-selected={project === "all"} onClick={() => setProject("all")}>
            All<span className="n">{features.length}</span>
          </button>
          {projects.map((p) => (
            <button key={p.id} className="tab" aria-selected={project === p.id} onClick={() => setProject(p.id)}>
              {p.name}
            </button>
          ))}
          <button className="tab" onClick={newProject} title="New project">+</button>
          {project !== "all" && (
            <span style={{ marginLeft: "auto", display: "flex", gap: 12, paddingBottom: 9 }}>
              <button className="btn plain" onClick={renameProject}>Rename</button>
              <button className="btn plain danger" onClick={deleteProject}>Delete</button>
            </span>
          )}
        </div>

        <div className="filters">
          <button className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            All<b>{features.length}</b>
          </button>
          {STAGES.map((s) => (
            <button key={s.id} className="chip" aria-pressed={filter === s.id} onClick={() => setFilter(s.id)}>
              {s.label}<b>{features.filter((f) => f.status === s.id).length}</b>
            </button>
          ))}
          <input className="field" placeholder="Search titles, specs and notes" value={q}
            onChange={(e) => setQ(e.target.value)} style={{ marginLeft: "auto", minWidth: 220 }} />
        </div>

        {shown.length === 0 ? (
          <div className="empty">
            Nothing here yet. Hit <b>New feature</b> and write one sentence.
          </div>
        ) : (
          shown.map((f) => {
            const gaps = missingCount(f.answers);
            const proj = projects.find((p) => p.id === f.projectId)?.name;
            return (
              <Link key={f.id} href={`/app/features/${f.id}`} className="row"
                style={{ ["--c" as string]: HUE[f.status] }}>
                <div className="row-top">
                  <span className="ref">F-{String(f.ref).padStart(2, "0")}</span>
                  <span className="row-title">{f.title}</span>
                  {f.blocked && <span className="pill" style={{ ["--c" as string]: "var(--lock)" }}>Blocked</span>}
                  <span className="pill" style={{ ["--c" as string]: HUE[f.status] }}>{f.status}</span>
                </div>
                <div className="row-meta">
                  {project === "all" && proj && <span className="proj">{proj} &middot; </span>}
                  {f.ownerName && <>{f.ownerName} &middot; </>}
                  {f.status === "discussion" && gaps > 0 && <em>{gaps} unanswered &middot; </em>}
                  {ago(f.updatedAt)}
                </div>
              </Link>
            );
          })
        )}
      </div>
      {modal}
    </>
  );
}
