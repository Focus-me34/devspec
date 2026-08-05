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
  /** ask() only. */
  placeholder?: string;
  initial?: string;
};

type Pending = Spec & { kind: Kind; settle: (value: unknown) => void };

function Dialog({ pending, onClosed }: { pending: Pending | null; onClosed: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  /** What this dialog will resolve with. A native close, meaning Escape or a
   *  backdrop click, leaves it at the cancel value. */
  const outcome = useRef<unknown>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !pending || el.open) return;
    setValue(pending.initial ?? "");
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
      onClose={() => { pending.settle(outcome.current); onClosed(); }}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
    >
      <form method="dialog" onSubmit={(e) => { e.preventDefault(); accept(); }}>
        <h2 id="modal-title">{title}</h2>
        {message && <p>{message}</p>}

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
