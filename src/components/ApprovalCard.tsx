import { useState } from "react";
import type { Interrupt } from "@ag-ui/core";
import { FileText } from "lucide-react";

import type { ApprovalAnswer, ApprovalStop } from "../api/types";
import { FIELD, GHOST, PRIMARY } from "./classes";

/** A value as the form shows it: a list joined, nothing as "none", anything else as text. */
function shown(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.map(shown).join(", ") : "none";
  if (value === null || value === undefined || value === "") return "none";
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * The start of a workflow, for the person to approve: the one decision of a form, which the agent fills in
 * the conversation itself. It is the agent's AG-UI interrupt for the start, carrying the values as they
 * will be sent, and the decision made here goes back as the run's resume entry. Nothing else can be sent
 * while it waits. "Talk about this" declines the start for now with what the person writes, a question or a
 * change, and the agent acts on it; the form stays open.
 */
export function ApprovalCard({
  interrupt,
  busy,
  onResolve,
  onTalk,
}: {
  interrupt: Interrupt;
  busy: boolean;
  onResolve: (answer: ApprovalAnswer) => void;
  /** The person wants to say something before deciding: their words, sent as not approving for now. */
  onTalk: (text: string) => void;
}) {
  const [talking, setTalking] = useState(false);
  const [draft, setDraft] = useState("");
  const talk = () => {
    if (draft.trim()) onTalk(draft.trim());
  };
  const stop = interrupt.metadata as Partial<ApprovalStop> | undefined;
  const workflow = stop?.workflow_key;
  const rows = [
    ...Object.entries(stop?.values ?? {}).map(([name, value]) => ({ name, value, filled: false })),
    ...Object.entries(stop?.defaults ?? {}).map(([name, value]) => ({ name, value, filled: true })),
  ];
  return (
    <div className="self-stretch overflow-hidden rounded-xl border border-solid border-wfo-line bg-wfo-bg">
      <div className="flex items-start gap-2 border-0 border-b border-solid border-wfo-line bg-wfo-accent-soft px-3.5 py-2.5">
        <FileText size={16} className="mt-0.5 shrink-0 text-wfo-accent-text" />
        <div className="min-w-0">
          <div className="truncate text-sm leading-5 font-semibold text-wfo-accent-text">Start the workflow?</div>
          {workflow && <div className="truncate text-xs leading-4 text-wfo-muted">Workflow {workflow}</div>}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-3.5 py-3">
        {rows.length > 0 && (
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs leading-5">
            {rows.map(({ name, value, filled }) => (
              <div key={name} className="contents">
                <dt className="text-wfo-muted">{name}</dt>
                <dd className="m-0 min-w-0 truncate text-wfo-ink" title={shown(value)}>
                  {shown(value)}
                  {filled && <span className="text-wfo-muted"> (default)</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <div className="flex items-center gap-1">
          <button type="button" className={PRIMARY} disabled={busy} onClick={() => onResolve({ approved: true })}>
            Approve and start
          </button>
          <button type="button" className={GHOST} disabled={busy} onClick={() => onResolve({ approved: false })}>
            Reject
          </button>
          <button type="button" className={GHOST} disabled={busy} onClick={() => setTalking((was) => !was)}>
            Talk about this
          </button>
        </div>
        {talking && (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={draft}
              disabled={busy}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") talk();
              }}
              placeholder="Ask about it, or say what to change"
              className={FIELD}
            />
            <button type="button" className={PRIMARY} disabled={busy || !draft.trim()} onClick={talk}>
              Send
            </button>
          </div>
        )}
        <div className="text-xs leading-4 text-wfo-muted">Nothing starts until you approve.</div>
      </div>
    </div>
  );
}
