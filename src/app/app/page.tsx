"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STAGES, missingCount } from "@/lib/spec";
import { useModal } from "@/components/Modal";
import AppBar from "@/components/AppBar";
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

/* Stroke icons on a 24 grid, sized by .icon-btn svg. Inline rather than a
   dependency, there are only two of them. */
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

/** Stands in for a feature row while the first load is in flight. Built from
 *  the same row-top and row-meta containers as a real row, so it inherits their
 *  line heights and lands on the same height rather than a guessed one. */
function RowSkeleton() {
  return (
    <div className="row skel" style={{ ["--c" as string]: "var(--line)" }}>
      <div className="row-top">
        <span className="ref">&nbsp;</span>
        <span className="row-title"><span className="skel-bar" style={{ width: "44%" }} /></span>
      </div>
      <div className="row-meta"><span className="skel-bar" style={{ width: "26%", height: 8 }} /></div>
    </div>
  );
}

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
  // Null until the first response lands. An empty array means the team really
  // has no features, which is a different thing and gets a different screen.
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
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

  if (loading) return <div className="wrap" style={{ paddingTop: 40 }}><p className="hint">Loading</p></div>;

  const loaded = features ?? [];
  const shown = filter === "all" ? loaded : loaded.filter((f) => f.status === filter);
  // Null on the All tab, which has nothing to rename or delete.
  const current = projects.find((p) => p.id === project) ?? null;

  return (
    <>
      <AppBar teamName={teams.find((t) => t.id === teamId)?.name} teamId={teamId} userName={me?.name}>
        <select className="field bar-teams" value={teamId} aria-label="Team"
          onChange={(e) => { setTeamId(e.target.value); setProject("all"); }}>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="btn ghost" onClick={newTeam}>New team</button>
        <button className="btn" onClick={newFeature}>New feature</button>
      </AppBar>

      <div className="wrap">
        <div className="tabs">
          <div className="tab-list">
            <button className="tab" aria-selected={project === "all"} onClick={() => setProject("all")}>
              All<span className="n">{loaded.length}</span>
            </button>
            {projects.map((p) => (
              <button key={p.id} className="tab" aria-selected={project === p.id} onClick={() => setProject(p.id)}>
                {p.name}
              </button>
            ))}
            <button className="tab" onClick={newProject} title="New project">+</button>
          </div>
          {current && (
            <div className="tab-actions">
              <button className="icon-btn" onClick={renameProject}
                title={`Rename ${current.name}`} aria-label={`Rename ${current.name}`}>
                <PencilIcon />
              </button>
              <button className="icon-btn danger" onClick={deleteProject}
                title={`Delete ${current.name}`} aria-label={`Delete ${current.name}`}>
                <TrashIcon />
              </button>
            </div>
          )}
        </div>

        <div className="filters">
          <button className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            All<b>{loaded.length}</b>
          </button>
          {STAGES.map((s) => (
            <button key={s.id} className="chip" aria-pressed={filter === s.id} onClick={() => setFilter(s.id)}>
              {s.label}<b>{loaded.filter((f) => f.status === s.id).length}</b>
            </button>
          ))}
          <input className="field search" placeholder="Search titles, specs and notes" value={q}
            onChange={(e) => setQ(e.target.value)} />
        </div>

        {features === null ? (
          <div role="status" aria-busy="true" aria-label="Loading features">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        ) : shown.length === 0 ? (
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
