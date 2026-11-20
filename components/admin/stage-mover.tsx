"use client";

import { useState } from "react";
import { setStageAction } from "@/app/admin/clients/actions";

type S = { id: string; label: string };

/**
 * Stage changes are deliberate: one step forward or back, and only after a confirm.
 * (The old bar let any stage be clicked — one stray click could jump a project to Care and email the client.)
 */
export function StageMover({ projectId, prev, next, heldBy }: {
  projectId: string; prev: S | null; next: S | null; heldBy: { label: string; amount: string } | null;
}) {
  const [ask, setAsk] = useState<S | null>(null);
  const [busy, setBusy] = useState(false);

  if (ask) {
    const back = prev?.id === ask.id;
    return (
      <form action={setStageAction} className="sm-confirm" onSubmit={() => setBusy(true)}>
        <input type="hidden" name="project" value={projectId} />
        <input type="hidden" name="stage" value={ask.id} />
        <input type="hidden" name="dir" value={back ? "back" : "next"} />
        <p><b>{back ? `Move this project back to ${ask.label}?` : `Move this project to ${ask.label}?`}</b> The client sees the new stage in their portal.</p>
        <label className="ca-check"><input type="checkbox" name="notify" value="on" defaultChecked={!back} /> Email the client about it</label>
        <div className="ca-row">
          <button className="ca-btn pri" type="submit" disabled={busy}>{busy ? "Moving…" : `Yes, move to ${ask.label}`}</button>
          <button className="ca-btn" type="button" onClick={() => setAsk(null)} disabled={busy}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className="sm-bar">
      {prev ? <button type="button" className="ca-x" onClick={() => setAsk(prev)}>← Back to {prev.label}</button> : <span />}
      {next ? (
        heldBy
          ? <span className="sm-held">🔒 {next.label} is held until “{heldBy.label}” ({heldBy.amount}) is paid</span>
          : <button type="button" className="ca-btn pri" onClick={() => setAsk(next)}>Move project to {next.label} →</button>
      ) : <span className="ca-sub">Final stage. Nothing after Care.</span>}
    </div>
  );
}
