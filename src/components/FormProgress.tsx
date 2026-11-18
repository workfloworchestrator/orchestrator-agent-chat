import { useState, type ReactNode } from "react";
import { ChevronRight, ClipboardList } from "lucide-react";

import type { FormActivity } from "../api/types";
import { GHOST } from "./classes";

/** A value as the form shows it: a list joined, anything else as text. */
function shown(value: unknown): string {
  if (Array.isArray(value)) return value.map(shown).join(", ");
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * A workflow form the agent fills with the person: which form, where it stands, what it holds so far, and,
 * folded away, the steps the agent took for it. The agent sends the form as one activity message and
 * replaces it as the form moves on; which steps are the form's own is the agent's to say.
 *
 * The values are listed while the form is filled. Once it waits for approval they are in the agent's own
 * words above the approval, as they will be sent, so the card leaves them out.
 */
export function FormProgress({
  form,
  steps,
  working,
  children,
}: {
  form: FormActivity;
  steps: number;
  /** The agent is at work on this form right now. */
  working: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const filling = form.phase === "gathering";
  const values = filling ? Object.entries(form.values ?? {}) : [];
  const stands =
    form.phase === "done"
      ? "Closed"
      : form.phase === "confirming"
        ? "Complete, waiting for your approval"
        : `Filling in${form.title ? ` ${form.title}` : form.page != null ? ` page ${form.page + 1}` : ""}`;
  return (
    <div className="self-stretch rounded-xl border border-solid border-wfo-line bg-wfo-bg px-3.5 py-2.5">
      <div className="flex items-start gap-2">
        <ClipboardList size={16} className="mt-0.5 shrink-0 text-wfo-muted" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm leading-5 font-medium text-wfo-ink">Workflow form {form.workflow_key}</div>
          <div
            aria-live="polite"
            className={`truncate text-xs leading-4 ${form.phase === "confirming" ? "text-wfo-wait" : "text-wfo-muted"}`}
          >
            {stands}
          </div>
        </div>
        {working && (
          <span
            aria-label="Working"
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-wfo-muted motion-safe:animate-wfo-blink"
          />
        )}
      </div>
      {values.length > 0 && (
        <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs leading-5">
          {values.map(([name, value]) => (
            <div key={name} className="contents">
              <dt className="text-wfo-muted">{name}</dt>
              <dd className="m-0 min-w-0 truncate text-wfo-ink" title={shown(value)}>
                {shown(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {steps > 0 && (
        <>
          <button
            type="button"
            aria-expanded={open}
            className={`${GHOST} mt-1 -ml-3`}
            onClick={() => setOpen((was) => !was)}
          >
            <ChevronRight size={14} className={`transition-transform ${open ? "rotate-90" : ""}`} />
            {steps} {steps === 1 ? "step" : "steps"}
          </button>
          {open && <div className="mt-1">{children}</div>}
        </>
      )}
    </div>
  );
}
