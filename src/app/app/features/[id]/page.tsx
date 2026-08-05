"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QUESTIONS, STAGES, missingCount, checksOf } from "@/lib/spec";
import { useModal } from "@/components/Modal";
import type { Answers } from "@/db/schema";

type Feature = {
  id: string; ref: number; title: string; status: string; answers: Answers;
  ownerName: string | null; branchUrl: string | null;
  blocked: boolean; blockedReason: string | null; updatedAt: string;
};
type Note = { id: string; authorName: string; body: string; createdAt: string };
type Act = { id: string; actorName: string; fromStatus: string | null; toStatus: string; createdAt: string };

const HUE: Record<string, string> = {
  discussion: "--s-discussion", specified: "--s-specified", building: "--s-building",
  review: "--s-review", deployed: "--s-deployed", dropped: "--s-dropped",
};

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}
function initials(n: string) {
  return n.replace(/[^a-zA-Z ]/g, " ").split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join("") || "?";
}
function tint(n: string) {
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${(h % 100) + 185} 62% 42%)`;
}

export default function FeaturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { confirm, modal } = useModal();
  const [f, setF] = useState<Feature | null>(null);
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [activity, setActivity] = useState<Act[]>([]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const res = await fetch(`/api/features/${id}`);
    if (res.status === 401) return router.push("/login");
    if (!res.ok) return router.push("/app");
    const d = await res.json();
    setF(d.feature); setProjectName(d.projectName); setNotes(d.notes); setActivity(d.activity);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/features/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json();
    if (res.ok) setF(d.feature);
    else setErr(d.error);
  }

  async function setStatus(status: string) {
    setErr("");
    const res = await fetch(`/api/features/${id}/status`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    const d = await res.json();
    if (!res.ok) return setErr(d.error);
    load();
  }

  async function addNote() {
    if (!note.trim()) return;
    const res = await fetch(`/api/features/${id}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: note }),
    });
    if (res.ok) { setNote(""); load(); }
  }

  async function remove() {
    const ok = await confirm({
      title: "Delete this feature?",
      message: "The specification, the notes and the history go with it. This cannot be undone.",
      confirmLabel: "Delete", danger: true,
    });
    if (!ok) return;
    await fetch(`/api/features/${id}`, { method: "DELETE" });
    router.push("/app");
  }

  if (!f) return <div className="wrap" style={{ paddingTop: 40 }}><p className="hint">Loading</p></div>;

  const answers = f.answers ?? {};
  const checks = answers.check ?? [];
  const gaps = missingCount(answers);
  const locked = gaps > 0;
  const at = STAGES.findIndex((s) => s.id === f.status);

  const setAnswer = (key: string, value: string) => {
    const next = { ...answers, [key]: value };
    setF({ ...f, answers: next });
    patch({ answers: { [key]: value } });
  };
  const setChecks = (list: string[]) => {
    setF({ ...f, answers: { ...answers, check: list } });
    patch({ answers: { check: list } });
  };

  return (
    <>
      <div className="bar">
        <div className="bar-in">
          <Link href="/app" className="logo"><span className="dot" />DevSpec</Link>
          <Link href="/app" className="btn plain">&larr; All features</Link>
        </div>
      </div>

      <div className="wrap">
        <input className="field" value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
          onBlur={(e) => patch({ title: e.target.value })}
          style={{ fontSize: 24, fontWeight: 600, width: "100%", border: "none", background: "none", padding: 0, marginBottom: 6, letterSpacing: "-0.03em" }} />
        <div className="sub">
          F-{String(f.ref).padStart(2, "0")}<span>/</span>{projectName}<span>/</span>updated {ago(f.updatedAt)}
        </div>

        <div className="rail">
          {STAGES.map((s, i) => (
            <button key={s.id} className={`seg ${i <= at ? "on" : ""} ${i === at ? "now" : ""}`}
              disabled={i > 0 && locked} onClick={() => setStatus(s.id)}
              style={{ ["--c" as string]: `var(${HUE[s.id]})` }}>
              <span className="tick" />
              <span className="idx">0{i + 1}</span>
              <span className="lbl">{s.label}</span>
              <span className="lock">locked</span>
            </button>
          ))}
        </div>

        {locked ? (
          <div className="gatebar">
            {gaps} specification question{gaps > 1 ? "s" : ""} left before this can leave Discussion.
          </div>
        ) : at === 0 ? (
          <div className="gatebar clear">
            Specification complete, with {checksOf(answers).length} check
            {checksOf(answers).length === 1 ? "" : "s"} to verify. Ready to move forward.
          </div>
        ) : <div style={{ height: 34 }} />}

        {err && <p className="err" style={{ marginBottom: 20 }}>{err}</p>}

        <div className="block">
          <div className="block-head">
            <span className="mono">Working details</span>
          </div>
          <div className="stack" style={{ marginTop: 0 }}>
            <input className="field" placeholder="Owner" defaultValue={f.ownerName ?? ""}
              onBlur={(e) => patch({ ownerName: e.target.value })} />
            <input className="field" placeholder="Branch or PR URL" defaultValue={f.branchUrl ?? ""}
              onBlur={(e) => patch({ branchUrl: e.target.value })} style={{ flex: 1, minWidth: 240 }} />
            <label className="hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={f.blocked}
                onChange={(e) => patch({ blocked: e.target.checked })} />
              Blocked
            </label>
          </div>
          {f.blocked && (
            <input className="field" placeholder="Why is it blocked?" defaultValue={f.blockedReason ?? ""}
              onBlur={(e) => patch({ blockedReason: e.target.value })}
              style={{ width: "100%", marginTop: 10 }} />
          )}
          {f.branchUrl && (
            <p className="hint" style={{ marginTop: 10 }}>
              <a href={f.branchUrl} target="_blank" rel="noopener noreferrer">Open the branch</a>
            </p>
          )}
        </div>

        <div className="block">
          <div className="block-head">
            <span className="mono">Specification</span>
            <span className="count">{QUESTIONS.length - gaps} / {QUESTIONS.length}</span>
          </div>

          {QUESTIONS.map((q) => {
            const isChecks = q.id === "check";
            const value = isChecks ? "" : ((answers as Record<string, string>)[q.id] ?? "");
            const done = isChecks ? checksOf(answers).length > 0 : !!value.trim();
            return (
              <div className="q" key={q.id}>
                <label className="q-label">
                  {q.label}
                  {!done && <span className="req">required</span>}
                </label>
                {"hint" in q && q.hint && <div className="q-hint">{q.hint}</div>}

                {isChecks ? (
                  <>
                    {checks.map((c, i) => (
                      <div className="check" key={i}>
                        <span className="num">{String(i + 1).padStart(2, "0")}</span>
                        <input className="field" defaultValue={c}
                          placeholder="Something that can pass or fail on its own"
                          onBlur={(e) => {
                            const next = [...checks]; next[i] = e.target.value; setChecks(next);
                          }} />
                        <button className="x" onClick={() => setChecks(checks.filter((_, j) => j !== i))}>&times;</button>
                      </div>
                    ))}
                    <button className="btn ghost" onClick={() => setChecks([...checks, ""])}>Add check</button>
                  </>
                ) : (
                  <textarea className="field" rows={2} defaultValue={value}
                    placeholder="Answer in your own words"
                    onBlur={(e) => setAnswer(q.id, e.target.value)} />
                )}
              </div>
            );
          })}
        </div>

        <div className="block">
          <div className="block-head">
            <span className="mono">Notes</span>
            <span className="count">{notes.length}</span>
          </div>
          {notes.length === 0 ? (
            <p className="hint">
              Nothing captured yet. Anything decided elsewhere goes here, in the words it was said in.
            </p>
          ) : notes.map((n) => (
            <div className="note" key={n.id}>
              <span className="av" style={{ background: tint(n.authorName) }}>{initials(n.authorName)}</span>
              <div>
                <div className="note-head"><b>{n.authorName}</b> &middot; {ago(n.createdAt)}</div>
                <div className="note-body">{n.body}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 18 }}>
            <textarea className="field" rows={2} placeholder="Add a note" value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") addNote(); }} />
            <div className="stack">
              <button className="btn" onClick={addNote}>Add note</button>
              <span className="hint">Notes cannot be edited. They are the record.</span>
            </div>
          </div>
        </div>

        {activity.length > 0 && (
          <div className="block">
            <div className="block-head"><span className="mono">Activity</span></div>
            {activity.map((a) => (
              <p className="hint" key={a.id} style={{ margin: "5px 0" }}>
                {a.actorName} moved this {a.fromStatus ? `from ${a.fromStatus} ` : ""}to {a.toStatus}, {ago(a.createdAt)}
              </p>
            ))}
          </div>
        )}

        <button className="btn plain danger" onClick={remove}>Delete this feature</button>
      </div>
      {modal}
    </>
  );
}
