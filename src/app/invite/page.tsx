"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Info = { teamName: string; signedIn: boolean; alreadyIn: boolean };

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
      <div className="auth">
        <Link href="/" className="logo" style={{ marginBottom: 26 }}><span className="dot" />DevSpec</Link>
        <h1>This link does not work</h1>
        <p>{err}</p>
        <Link href="/login" className="btn">Go to sign in</Link>
      </div>
    );
  }
  if (!info) return <div className="auth"><p className="hint">Loading</p></div>;

  if (info.alreadyIn) {
    return (
      <div className="auth">
        <Link href="/" className="logo" style={{ marginBottom: 26 }}><span className="dot" />DevSpec</Link>
        <h1>You are already in {info.teamName}</h1>
        <p>Nothing to do here.</p>
        <Link href="/app" className="btn">Open DevSpec</Link>
      </div>
    );
  }

  if (info.signedIn) {
    return (
      <div className="auth">
        <Link href="/" className="logo" style={{ marginBottom: 26 }}><span className="dot" />DevSpec</Link>
        <h1>Join {info.teamName}</h1>
        <p>You are signed in already, so this is one click.</p>
        <button className="btn" onClick={joinAsCurrentUser} disabled={busy}>
          {busy ? "One moment" : `Join ${info.teamName}`}
        </button>
        {err && <p className="err">{err}</p>}
      </div>
    );
  }

  return (
    <div className="auth">
      <Link href="/" className="logo" style={{ marginBottom: 26 }}><span className="dot" />DevSpec</Link>
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
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="auth"><p className="hint">Loading</p></div>}>
      <Invite />
    </Suspense>
  );
}
