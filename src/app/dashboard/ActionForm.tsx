"use client";
// Formulario que llama a una Server Action y muestra su resultado: un error, o un secreto que
// solo se puede ver esta vez (API key o secreto de firma de webhooks).
import { useActionState, type ReactNode } from "react";
import type { FormState } from "./actions.ts";

export function ActionForm({
  action,
  children,
  submitLabel,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  children?: ReactNode;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3">
      {children}
      <button disabled={pending} className="px-4 py-2 rounded-full bg-primary text-white font-medium disabled:opacity-60">
        {pending ? "…" : submitLabel}
      </button>
      {state?.error && <p className="text-sm text-error">{state.error}</p>}
      {state?.done && <p className="text-sm text-success">Saved.</p>}
      {state?.secret && (
        <div className="p-3 rounded-xl bg-surface-container border border-outline-variant">
          <p className="text-xs text-on-surface-variant mb-1">Copy it now — it will not be shown again:</p>
          <code className="text-sm break-all select-all">{state.secret}</code>
        </div>
      )}
    </form>
  );
}
