"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@/components/AppBar";
import Avatar from "@/components/Avatar";
import { ME_CHANGED } from "@/lib/theme";

type Me = {
  id: string; email: string; name: string;
  title: string | null; firstName: string | null; lastName: string | null;
  phone: string | null; avatar: string | null;
};

/** Resized in the browser before it ever leaves it. The row holds a data URL,
 *  so shipping a 4MB phone photo would put 4MB in Postgres and 4MB back down
 *  the wire on every read. A square 256px JPEG lands around 20KB. */
const AVATAR_PX = 256;

function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not an image"));
      img.onload = () => {
        // Centre crop to a square first, so portraits are not squashed.
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = AVATAR_PX;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process that image"));
        ctx.drawImage(
          img,
          (img.width - side) / 2, (img.height - side) / 2, side, side,
          0, 0, AVATAR_PX, AVATAR_PX,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me");
      if (res.status === 401) return router.push("/login");
      const { me } = await res.json();
      setMe(me);
      setTitle(me.title ?? "");
      setFirstName(me.firstName ?? "");
      setLastName(me.lastName ?? "");
      setPhone(me.phone ?? "");
      setAvatar(me.avatar);
    })();
  }, [router]);

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setErr("");
    try {
      setAvatar(await shrink(file));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read that image");
    }
  }

  async function save() {
    setErr(""); setSaved(false); setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, firstName, lastName, phone, avatar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMe(data.me);
      setSaved(true);
      // The bar shows this name and this face; tell it to catch up.
      window.dispatchEvent(new Event(ME_CHANGED));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPwErr(""); setPwMsg(""); setPwBusy(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next, confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrent(""); setNext(""); setConfirm("");
      setPwMsg("Password changed.");
    } catch (e) {
      setPwErr(e instanceof Error ? e.message : "Could not change it");
    } finally {
      setPwBusy(false);
    }
  }

  if (!me) {
    return (
      <>
        <AppBar />
        <div className="wrap" role="status" aria-busy="true" aria-label="Loading your profile">
          <div className="skel">
            <div className="skel-bar" style={{ width: 150, height: 20, borderRadius: 6 }} />
            <div className="skel-bar" style={{ width: "100%", height: 220, borderRadius: 12, marginTop: 24 }} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar />
      <div className="wrap prose">
        <h1>Your profile</h1>
        <p className="hint">How you appear to everyone else in your teams.</p>

        <div className="block">
          <div className="block-head"><span className="mono">Details</span></div>

          <div className="field-row">
            <label className="lbl-f">
              <span>Title</span>
              <input className="field" value={title} placeholder="Optional"
                onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="lbl-f">
              <span>First name</span>
              <input className="field" value={firstName} autoComplete="given-name"
                onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label className="lbl-f">
              <span>Last name</span>
              <input className="field" value={lastName} autoComplete="family-name"
                onChange={(e) => setLastName(e.target.value)} />
            </label>
          </div>

          <div className="avatar-row">
            <Avatar name={me.name} src={avatar} size={64} />
            <div className="avatar-actions">
              <span className="lbl-f"><span>Profile image</span></span>
              <div className="stack" style={{ marginTop: 0 }}>
                <button className="btn ghost" onClick={() => fileRef.current?.click()}>
                  {avatar ? "Replace image" : "Upload image"}
                </button>
                {avatar && (
                  <button className="btn plain danger" onClick={() => setAvatar(null)}>Remove</button>
                )}
              </div>
              <p className="q-hint" style={{ margin: "8px 0 0" }}>
                Square works best. It is resized to {AVATAR_PX}px before it is saved.
              </p>
              <input ref={fileRef} type="file" accept="image/*" className="hp"
                onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
          </div>

          <label className="lbl-f" style={{ maxWidth: 320 }}>
            <span>Phone number</span>
            <input className="field" value={phone} type="tel" autoComplete="tel"
              placeholder="Optional" onChange={(e) => setPhone(e.target.value)} />
          </label>

          <label className="lbl-f" style={{ maxWidth: 320, marginTop: 16 }}>
            <span>Email address</span>
            <input className="field" value={me.email} disabled readOnly />
            <span className="q-hint">
              This is your sign in and cannot be changed here.
            </span>
          </label>

          <div className="stack">
            <button className="btn" onClick={save} disabled={saving}>
              {saving ? "Saving" : "Save changes"}
            </button>
            {saved && <span className="hint">Saved.</span>}
            {err && <span className="err" style={{ margin: 0 }}>{err}</span>}
          </div>
        </div>

        <div className="block">
          <div className="block-head"><span className="mono">Password</span></div>
          <label className="lbl-f" style={{ maxWidth: 320 }}>
            <span>Current password</span>
            <input className="field" type="password" value={current} autoComplete="current-password"
              onChange={(e) => setCurrent(e.target.value)} />
          </label>
          <label className="lbl-f" style={{ maxWidth: 320, marginTop: 12 }}>
            <span>New password</span>
            <input className="field" type="password" value={next} autoComplete="new-password"
              onChange={(e) => setNext(e.target.value)} />
          </label>
          <label className="lbl-f" style={{ maxWidth: 320, marginTop: 12 }}>
            <span>Confirm new password</span>
            <input className="field" type="password" value={confirm} autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && changePassword()} />
          </label>
          <div className="stack">
            <button className="btn ghost" onClick={changePassword} disabled={pwBusy}>
              {pwBusy ? "Changing" : "Change password"}
            </button>
            {pwMsg && <span className="hint">{pwMsg}</span>}
            {pwErr && <span className="err" style={{ margin: 0 }}>{pwErr}</span>}
          </div>
        </div>
      </div>
    </>
  );
}
