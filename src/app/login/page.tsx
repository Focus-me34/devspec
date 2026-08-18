"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // Honeypot. Hidden from people, so anything in it came from a bot.
  const [company, setCompany] = useState("");

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, teamName, company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      router.push("/app");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <ThemeToggle className="corner-theme" />
      <Link href="/" className="logo" style={{ marginBottom: 26 }}>
        <span className="dot" />
        DevSpec
      </Link>
      <h1>{mode === "login" ? "Sign in" : "Create your team"}</h1>
      <p>
        {mode === "login"
          ? "Welcome back."
          : "You get a team and a first project. Invite people by creating them an account."}
      </p>

      {mode === "register" && (
        <>
          <input className="field" placeholder="Your name" value={name}
            onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <input className="field" placeholder="Team name" value={teamName}
            onChange={(e) => setTeamName(e.target.value)} />
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
        {busy ? "One moment" : mode === "login" ? "Sign in" : "Create team"}
      </button>
      {err && <p className="err">{err}</p>}

      <p className="hint" style={{ marginTop: 18 }}>
        {mode === "login" ? "No account yet? " : "Already have one? "}
        <button className="btn plain" onClick={() => { setErr(""); setMode(mode === "login" ? "register" : "login"); }}>
          {mode === "login" ? "Create a team" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth"><p className="hint">Loading</p></div>}>
      <Form />
    </Suspense>
  );
}
