"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { addSite, collectAllSites, collectSite, deleteSite, type ActionState } from "@/app/actions";
import { cn } from "./ui";

const initialState: ActionState = { status: "idle" };

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton = cn(buttonBase, "bg-slate-900 text-white hover:bg-slate-700");
const secondaryButton = cn(buttonBase, "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50");
const dangerButton = cn(buttonBase, "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50");
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none";

function SubmitButton({ children, pendingLabel, className }: { children: string; pendingLabel: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {pending ? pendingLabel : children}
    </button>
  );
}

function FormMessage({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message || state.status === "error") return null;
  return <p role="status" className="text-sm text-emerald-700">{state.message}</p>;
}

function useActionErrorPopup(state: ActionState) {
  useEffect(() => {
    if (state.status === "error" && state.message) {
      window.alert(`App has encountered an error.\n\n${state.message}`);
    }
  }, [state]);
}

export function AddSiteForm() {
  const [state, action] = useActionState(addSite, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useActionErrorPopup(state);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <label className="block">
          <span className="sr-only">URL</span>
          <input name="url" type="text" inputMode="url" required placeholder="https://www.example.com/" className={inputClass} />
        </label>
        <label className="block">
          <span className="sr-only">Display name (optional)</span>
          <input name="name" type="text" maxLength={80} placeholder="Display name (optional)" className={inputClass} />
        </label>
        <SubmitButton pendingLabel="Adding…" className={primaryButton}>
          Add site
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function CollectAllButton() {
  const [state, action] = useActionState(collectAllSites, initialState);
  useActionErrorPopup(state);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <SubmitButton pendingLabel="Collecting all…" className={secondaryButton}>
        Collect all
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function CollectButton({
  siteId,
  label = "Run check now",
  compact = false,
}: {
  siteId: number;
  label?: string;
  compact?: boolean;
}) {
  const [state, action] = useActionState(collectSite.bind(null, siteId), initialState);
  useActionErrorPopup(state);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <SubmitButton
        pendingLabel={compact ? "Collecting…" : "Running PageSpeed…"}
        className={compact ? cn(primaryButton, "px-2.5 py-1.5 text-xs") : primaryButton}
      >
        {label}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function DeleteSiteButton({ siteId, siteName }: { siteId: number; siteName: string }) {
  return (
    <form
      action={deleteSite.bind(null, siteId)}
      onSubmit={(event) => {
        if (!window.confirm(`Stop tracking ${siteName}? All of its snapshots will be deleted.`)) event.preventDefault();
      }}
    >
      <SubmitButton pendingLabel="Removing…" className={dangerButton}>
        Remove
      </SubmitButton>
    </form>
  );
}
