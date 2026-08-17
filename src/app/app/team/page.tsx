"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useModal } from "@/components/Modal";
import AppBar from "@/components/AppBar";
import Avatar from "@/components/Avatar";

type Team = { id: string; name: string; role: string };
type Member = {
  id: string; userId: string; role: string; joinedAt: string;
  name: string; email: string;
  title: string | null; phone: string | null; avatar: string | null;
};
type Me = { userId: string; role: string };

/** Stands in for a member row during the first load, same height and shape so
 *  the list does not jump when the real ones arrive. */
function MemberSkeleton() {
  return (
    <div className="member skel">
      <span className="av" style={{ background: "var(--line-hi)", opacity: .5, width: 38, height: 38 }} />
      <div className="member-id">
        <div className="member-name"><span className="skel-bar" style={{ width: 132 }} /></div>
        <div className="member-mail"><span className="skel-bar" style={{ width: 186, height: 8 }} /></div>
      </div>
    </div>
  );
}

function joined(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
  });
}

function People() {
  const router = useRouter();
  const params = useSearchParams();
  const { ask, confirm, notify, modal } = useModal();

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  // Null until the first response lands, so the page never claims the team has
  // nobody in it while the request is still going.
  const [members, setMembers] = useState<Member[] | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/teams");
      if (res.status === 401) return router.push("/login");
      const data = await res.json();
      setTeams(data.teams);
      const wanted = params.get("team");
      const pick = data.teams.find((t: Team) => t.id === wanted) ?? data.teams[0];
      if (pick) setTeamId(pick.id);
      setLoading(false);
    })();
  }, [router, params]);

  const reload = useCallback(async () => {
    if (!teamId) return;
    const res = await fetch(`/api/teams/${teamId}/members`);
    if (!res.ok) return;
    const data = await res.json();
    setMembers(data.members);
    setMe(data.me);
  }, [teamId]);

  useEffect(() => { reload(); }, [reload]);

  const team = teams.find((t) => t.id === teamId);
  const isAdmin = me?.role === "admin";
  const loaded = members ?? [];
  const adminCount = loaded.filter((m) => m.role === "admin").length;

  async function addMember() {
    const email = await ask({
      title: "Add someone",
      message: "Type the email of someone who already has a DevSpec account, or share a link with someone who does not.",
      placeholder: "them@company.com",
      confirmLabel: "Add",
      secondary: { label: "Share a link instead", onPick: inviteLink },
    });
    if (!email) return;
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) return notify({ title: "Could not add them", message: data.error });
    reload();
  }

  async function inviteLink() {
    const res = await fetch(`/api/teams/${teamId}/invite`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return notify({ title: "Could not create an invite", message: data.error });

    // Deliberately not copied for you. Overwriting somebody's clipboard
    // uninvited can throw away whatever they were carrying in it.
    notify({
      title: "Invite link",
      message: `Anyone who opens this joins ${team?.name ?? "the team"}, `
        + `and it stops working after ${data.expiresInDays} days.`,
      detail: `${location.origin}/invite?t=${data.token}`,
      confirmLabel: "Done",
    });
  }

  async function setRole(m: Member, role: string) {
    const res = await fetch(`/api/teams/${teamId}/members/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) return notify({ title: "Could not change the role", message: data.error });
    reload();
  }

  async function remove(m: Member) {
    const self = m.userId === me?.userId;
    const ok = await confirm({
      title: self ? `Leave ${team?.name}?` : `Remove ${m.name}?`,
      message: self
        ? "You lose access to this team's features until somebody adds you back."
        : `${m.name} loses access to this team. Their account and anything they wrote stay put.`,
      confirmLabel: self ? "Leave" : "Remove",
      danger: true,
    });
    if (!ok) return;

    const res = await fetch(`/api/teams/${teamId}/members/${m.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return notify({ title: "Could not remove them", message: data.error });
    if (data.wasSelf) return router.push("/app");
    reload();
  }

  if (loading) return <div className="wrap" style={{ paddingTop: 40 }}><p className="hint">Loading</p></div>;
  if (!team) {
    return (
      <div className="wrap" style={{ paddingTop: 40 }}>
        <p className="hint">You are not in a team yet.</p>
        <Link href="/app" className="btn" style={{ marginTop: 12 }}>Back to features</Link>
      </div>
    );
  }

  return (
    <>
      <AppBar teams={teams} teamId={team.id}
        onTeamChange={(id) => router.push(`/app/team?team=${id}`)} />

      <div className="wrap">
        <div className="page-head">
          <h1>People</h1>
        </div>
        {members === null ? (
          <div role="status" aria-busy="true" aria-label="Loading the team">
            {/* Reserves the height of the sentence, so the real content drops
                in rather than shoving the list down. */}
            <div className="skel">
              <div className="skel-bar" style={{ width: 330, marginTop: 2 }} />
            </div>
            <div className="members">
              <MemberSkeleton />
              <MemberSkeleton />
              <MemberSkeleton />
            </div>
          </div>
        ) : (
          <>
        <p className="hint" style={{ margin: 0 }}>
          {loaded.length} {loaded.length === 1 ? "person" : "people"} in {team.name}.
          {isAdmin
            ? " Admins can add, promote and remove. A team always keeps at least one admin."
            : " Only admins can change this list."}
        </p>

        <div className="members">
          {/* Same shape as the feature list: the way to add sits at the top of
              the thing it adds to. Invite link stays a button in the heading,
              since it is the secondary path and does not produce a row here. */}
          {isAdmin && (
            <button className="add-card" onClick={addMember}>
              <span className="plus" aria-hidden="true">+</span>
              <span>
                <b>Add someone</b>
                <small>They need a DevSpec account already</small>
              </span>
            </button>
          )}
          {loaded.map((m) => {
            const self = m.userId === me?.userId;
            // The last admin cannot go, so do not offer it.
            const lastAdmin = m.role === "admin" && adminCount === 1;
            const canRemove = (isAdmin || self) && !lastAdmin;

            return (
              <div className="member" key={m.id}>
                <Avatar name={m.name} src={m.avatar} size={38} />

                <div className="member-id">
                  <div className="member-name">
                    {m.title && <span className="member-title">{m.title}</span>}
                    {m.name}
                    {self && <span className="chip-you">you</span>}
                  </div>
                  <div className="member-contact">
                    <a href={`mailto:${m.email}`} title={`Email ${m.name}`}>{m.email}</a>
                    {m.phone && (
                      <a href={`tel:${m.phone.replace(/\s+/g, "")}`} title={`Call ${m.name}`}>
                        {m.phone}
                      </a>
                    )}
                  </div>
                </div>

                <span className="member-when">joined {joined(m.joinedAt)}</span>

                {isAdmin ? (
                  <select className="field member-role" value={m.role}
                    disabled={lastAdmin}
                    title={lastAdmin ? "The last admin cannot be demoted" : undefined}
                    onChange={(e) => setRole(m, e.target.value)}>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                ) : (
                  <span className="member-when">{m.role}</span>
                )}

                <button className="icon-btn danger" onClick={() => remove(m)}
                  disabled={!canRemove}
                  title={
                    lastAdmin ? "The last admin cannot be removed"
                      : self ? `Leave ${team.name}`
                        : `Remove ${m.name}`
                  }
                  aria-label={self ? `Leave ${team.name}` : `Remove ${m.name}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
          </>
        )}
      </div>
      {modal}
    </>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ paddingTop: 40 }}><p className="hint">Loading</p></div>}>
      <People />
    </Suspense>
  );
}
