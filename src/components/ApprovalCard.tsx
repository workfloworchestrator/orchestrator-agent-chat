import type { Interrupt } from "@ag-ui/core";
import { FileText } from "lucide-react";

import type { ApprovalAnswer, ApprovalStop } from "../api/types";
import { Markdown } from "./Markdown";
import { GHOST, PRIMARY } from "./classes";

/**
 * The start of a workflow, for the person to approve: the one structured stop of a form, which the agent
 * fills in the conversation itself. It is the agent's AG-UI interrupt, and the decision made here goes back
 * as the run's resume entry; no model reads it. To change a value instead, the person says so in the message
 * box: that rejects the start with their words, and the agent acts on them.
 */
export function ApprovalCard({
  interrupt,
  busy,
  onResolve,
}: {
  interrupt: Interrupt;
  busy: boolean;
  onResolve: (answer: ApprovalAnswer) => void;
}) {
  const stop = interrupt.metadata as Partial<ApprovalStop> | undefined;
  const workflow = stop?.workflow_key;
  return (
    <div className="self-stretch overflow-hidden rounded-xl border border-wfo-line bg-wfo-bg">
      <div className="flex items-start gap-2 border-b border-wfo-line bg-wfo-accent-soft px-3.5 py-2.5">
        <FileText size={16} className="mt-0.5 shrink-0 text-wfo-accent-text" />
        <div className="min-w-0">
          <div className="truncate text-sm leading-5 font-semibold text-wfo-accent-text">Start the workflow?</div>
          {workflow && <div className="truncate text-xs leading-4 text-wfo-muted">Workflow {workflow}</div>}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-3.5 py-3">
        {interrupt.message && <Markdown text={interrupt.message} />}
        <div className="flex items-center gap-1">
          <button type="button" className={PRIMARY} disabled={busy} onClick={() => onResolve({ approved: true })}>
            Approve and start
          </button>
          <button type="button" className={GHOST} disabled={busy} onClick={() => onResolve({ approved: false })}>
            Reject
          </button>
        </div>
        <div className="text-xs leading-4 text-wfo-muted">
          Nothing starts until you approve. To change something, say so below.
        </div>
      </div>
    </div>
  );
}
