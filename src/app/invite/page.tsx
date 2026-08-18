"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { initials, tint } from "@/lib/avatar";

type Info = { teamName: string; signedIn: boolean; alreadyIn: boolean };

/** One shell for every state of this page, so the card does not change size or
 *  position as it moves between loading, joining and refusing. */
function Shell({ team, children }: { team?: string; children: React.ReactNode }) {
  return (
    <div className="invite">
      <ThemeToggle className="corner-theme" />
      <Link href="/" className="logo" style={{ marginBottom: 22 }}>
        <span className="dot" />DevSpec
      </Link>
      <div className="invite-card">
        {team && (
          <span className="invite-badge" style={{ background: tint(team) }} aria-hidden="true">
            {initials(team)}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

function Invite() {
  const router = useRouter();
  const token = useSearchParams().get("t") ?? "";

  const [info, setInfo] = useState<Info | null>(null);
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/invites?t=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) return setErr(data.error);
      setInfo(data);
    })();
  }, [token]);

  /** Adds the signed in user to the team, then hands over to the app. */
  const accept = useCallback(async () => {
    const res = await fetch("/api/invites/accept", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    router.push("/app");
    router.refresh();
  }, [token, router]);

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      if (mode === "register") {
        // The token goes with the registration, so the account is created
        // straight into the team rather than getting one of its own.
        const res = await fetch("/api/auth/register", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, password, company, inviteToken: token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        router.push("/app");
        router.refresh();
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        await accept();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function joinAsCurrentUser() {
    setErr("");
    setBusy(true);
    try { await accept(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  if (err && !info) {
    return (
      <Shell>
        <h1>This link does not work</h1>
        <p>{err}</p>
        <Link href="/login" className="btn" style={{ marginTop: 18 }}>Go to sign in</Link>
      </Shell>
    );
  }
  if (!info) {
    return (
      <Shell>
        <div className="skel" role="status" aria-busy="true" aria-label="Checking the invite">
          <div className="skel-bar" style={{ width: 170, height: 18, borderRadius: 6 }} />
          <div className="skel-bar" style={{ width: 250, height: 10, marginTop: 14 }} />
          <div className="skel-bar" style={{ width: "100%", height: 38, borderRadius: 8, marginTop: 26 }} />
        </div>
      </Shell>
    );
  }

  if (info.alreadyIn) {
    return (
      <Shell team={info.teamName}>
        <h1>You are already in {info.teamName}</h1>
        <p>Nothing to do here.</p>
        <Link href="/app" className="btn" style={{ marginTop: 18 }}>Open DevSpec</Link>
      </Shell>
    );
  }

  if (info.signedIn) {
    return (
      <Shell team={info.teamName}>
        <h1>Join {info.teamName}</h1>
        <p>You are signed in already, so this is one click.</p>
        <button className="btn" onClick={joinAsCurrentUser} disabled={busy} style={{ marginTop: 18 }}>
          {busy ? "One moment" : `Join ${info.teamName}`}
        </button>
        {err && <p className="err">{err}</p>}
      </Shell>
    );
  }

  return (
    <Shell team={info.teamName}>
      <h1>Join {info.teamName}</h1>
      <p>
        {mode === "register"
          ? "Create your account and you land straight in the team."
          : "Sign in and you will be added to the team."}
      </p>

      {mode === "register" && (
        <>
          <input className="field" placeholder="Your name" value={name}
            onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <input className="hp" type="text" name="company" tabIndex={-1}
            autoComplete="off" aria-hidden="true"
            value={company} onChange={(e) => setCompany(e.target.value)} />
        </>
      )}
      <input className="field" type="email" placeholder="you@company.com" value={email}
        onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <input className="field" type="password" placeholder="Password, 8 characters minimum"
        value={password} onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        autoComplete={mode === "login" ? "current-password" : "new-password"} />

      <button className="btn" onClick={submit} disabled={busy}>
        {busy ? "One moment" : `Join ${info.teamName}`}
      </button>
      {err && <p className="err">{err}</p>}

      <p className="hint" style={{ marginTop: 18 }}>
        {mode === "register" ? "Already have an account? " : "Need an account? "}
        <button className="btn plain" onClick={() => { setErr(""); setMode(mode === "register" ? "login" : "register"); }}>
          {mode === "register" ? "Sign in instead" : "Create one"}
        </button>
      </p>
    </Shell>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<Shell><div className="skel"><div className="skel-bar" style={{ width: 170, height: 18, borderRadius: 6 }} /></div></Shell>}>
      <Invite />
    </Suspense>
  );
}
