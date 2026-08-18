"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Replaces window.alert, window.confirm and window.prompt.
 *
 *  Built on the native <dialog> element, which gives correct focus trapping,
 *  Escape to dismiss and top layer rendering for free, so none of that has to
 *  be reimplemented badly. The hook hands back promises, so call sites read
 *  almost exactly like the browser functions they replace:
 *
 *    const { ask, confirm, notify, modal } = useModal();
 *    const name = await ask({ title: "Project name" });   // string | null
 *    if (await confirm({ title: "Delete?" })) { ... }     // boolean
 *
 *  Render {modal} once anywhere in the component's tree. */

type Kind = "notify" | "confirm" | "ask";

export type Spec = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for anything that destroys data. */
  danger?: boolean;
  /** Shown under the message in a selectable block with a Copy button, for
   *  links and the like. Never copied automatically: taking somebody's
   *  clipboard without asking destroys whatever they had in it. */
  detail?: string;
  /** A quieter third action, left of Cancel. Dismisses this dialog and runs
   *  onPick, which is free to open another one. */
  secondary?: { label: string; onPick: () => void };
  /** ask() only. */
  placeholder?: string;
  initial?: string;
};

type Pending = Spec & { kind: Kind; settle: (value: unknown) => void };

/** The async clipboard API needs a secure context, a granted permission and a
 *  real user gesture, and simply rejects when it does not have all three. The
 *  textarea fallback still works in those cases, and if even that fails the
 *  caller selects the text so the keyboard shortcut is one keystroke away. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function Dialog({ pending, onClosed }: { pending: Pending | null; onClosed: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [copied, setCopied] = useState(false);
  /** Held until the dialog has actually closed, so the secondary action can
   *  open the next dialog without the two fighting over the same element. */
  const afterClose = useRef<(() => void) | null>(null);
  const resetCopy = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => () => { if (resetCopy.current) clearTimeout(resetCopy.current); }, []);
  /** What this dialog will resolve with. A native close, meaning Escape or a
   *  backdrop click, leaves it at the cancel value. */
  const outcome = useRef<unknown>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !pending || el.open) return;
    setValue(pending.initial ?? "");
    setCopied(false);
    outcome.current = pending.kind === "confirm" ? false : pending.kind === "ask" ? null : undefined;
    el.showModal();
    if (pending.kind === "ask") {
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [pending]);

  if (!pending) return null;

  const { kind, title, message, danger } = pending;

  function accept() {
    if (kind === "ask") {
      const trimmed = value.trim();
      if (!trimmed) return inputRef.current?.focus();
      outcome.current = trimmed;
    } else if (kind === "confirm") {
      outcome.current = true;
    }
    ref.current?.close();
  }

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onClose={() => {
        pending.settle(outcome.current);
        onClosed();
        const next = afterClose.current;
        afterClose.current = null;
        next?.();
      }}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
    >
      <form method="dialog" onSubmit={(e) => { e.preventDefault(); accept(); }}>
        <h2 id="modal-title">{title}</h2>
        {message && <p>{message}</p>}
        {pending.detail && (
          <div className="modal-detail-row">
            <p className="modal-detail" ref={detailRef}>{pending.detail}</p>
            <button
              type="button"
              className={`copy-btn${copied ? " done" : ""}`}
              title={copied ? "Copied" : "Copy to clipboard"}
              aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
              onClick={async () => {
                if (await copyText(pending.detail!)) {
                  setCopied(true);
                  // Falls back to the copy icon so it can obviously be pressed
                  // again, rather than sitting on a permanent tick.
                  if (resetCopy.current) clearTimeout(resetCopy.current);
                  resetCopy.current = setTimeout(() => setCopied(false), 1800);
                  return;
                }
                // Both routes refused. Select the link so the shortcut works,
                // rather than leaving a button that visibly does nothing.
                const el = detailRef.current;
                if (el) {
                  const r = document.createRange();
                  r.selectNodeContents(el);
                  const sel = window.getSelection();
                  sel?.removeAllRanges();
                  sel?.addRange(r);
                }
              }}
            >
              {/* Both icons occupy the same grid cell, so one can grow into
                  place as the other shrinks away without the button resizing. */}
              <svg className="copy-i" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <svg className="check-i" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 13 4 4L19 7" />
              </svg>
            </button>
          </div>
        )}

        {kind === "ask" && (
          <input
            ref={inputRef}
            className="field"
            value={value}
            placeholder={pending.placeholder}
            onChange={(e) => setValue(e.target.value)}
          />
        )}

        <div className="modal-actions">
          {pending.secondary && (
            <button type="button" className="btn plain modal-alt" onClick={() => {
              afterClose.current = pending.secondary!.onPick;
              ref.current?.close();
            }}>
              {pending.secondary.label}
            </button>
          )}
          {kind !== "notify" && (
            <button type="button" className="btn ghost" onClick={() => ref.current?.close()}>
              {pending.cancelLabel ?? "Cancel"}
            </button>
          )}
          <button type="submit" className={danger ? "btn danger" : "btn"}>
            {pending.confirmLabel ?? (kind === "notify" ? "OK" : kind === "ask" ? "Save" : "Confirm")}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function useModal() {
  const [pending, setPending] = useState<Pending | null>(null);

  const open = useCallback(
    <T,>(kind: Kind, spec: Spec) =>
      new Promise<T>((resolve) => {
        setPending({ ...spec, kind, settle: resolve as (v: unknown) => void });
      }),
    [],
  );

  return {
    /** Replaces alert(). Resolves when dismissed. */
    notify: useCallback((spec: Spec) => open<void>("notify", spec), [open]),
    /** Replaces confirm(). Resolves true only if the user confirmed. */
    confirm: useCallback((spec: Spec) => open<boolean>("confirm", spec), [open]),
    /** Replaces prompt(). Resolves the trimmed text, or null if cancelled. */
    ask: useCallback((spec: Spec) => open<string | null>("ask", spec), [open]),
    modal: <Dialog pending={pending} onClosed={() => setPending(null)} />,
  };
}
