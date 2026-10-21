"use client";

import { useState } from "react";
import type { LeadWithNotes } from "@/lib/db";
import type { LeadStatus } from "@/lib/auth";
import { setStatusAction, addNoteAction } from "./actions";

/**
 * Inbox rows (S4, P1.6 + P1.7). One row per lead: key fields + timestamp,
 * status select (server action), expandable notes panel. Status/notes forms
 * are uncontrolled server-action forms — the server re-validates session and
 * inputs; the client only opens/closes panels.
 */

const STATUS_OPTIONS: LeadStatus[] = ["new", "replied", "quoted", "won", "lost"];

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function Inbox({ leads }: { leads: LeadWithNotes[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (leads.length === 0) {
    return <p className="admin-empty">No leads yet — the contact form feeds this inbox.</p>;
  }

  return (
    <div className="admin-inbox">
      {leads.map((lead) => (
        <article key={lead.id} className="lead-row" data-lead-id={lead.id} data-status={lead.status}>
          <button
            type="button"
            className="lead-head"
            aria-expanded={open === lead.id}
            onClick={() => setOpen(open === lead.id ? null : lead.id)}
          >
            <div className="lead-who">
              <strong className="lead-name">{lead.name}</strong>
              <span className="lead-contact">
                {[lead.phone, lead.email].filter(Boolean).join(" · ") || "no contact field"}
              </span>
            </div>
            <div className="lead-meta">
              <span className="lead-msg-preview">
                {lead.message.length > 90 ? `${lead.message.slice(0, 90)}…` : lead.message}
              </span>
              <span className="lead-time">{fmtDate(lead.created_at)}</span>
            </div>
            <span className={`lead-status s-${lead.status}`}>{lead.status}</span>
          </button>

          {open === lead.id ? (
            <div className="lead-detail">
              <p className="lead-msg-full">{lead.message}</p>
              {(lead.service || lead.budget) && (
                <p className="lead-tags">
                  {[lead.service, lead.budget].filter(Boolean).join(" · ")}
                </p>
              )}

              <form action={setStatusAction} className="lead-status-form">
                <input type="hidden" name="id" value={lead.id} />
                <label htmlFor={`status-${lead.id}`}>Status</label>
                <select
                  id={`status-${lead.id}`}
                  name="status"
                  defaultValue={lead.status}
                  data-testid={`status-select-${lead.id}`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button type="submit">Update</button>
              </form>

              <div className="lead-notes">
                <h3>Notes</h3>
                {lead.notes.length === 0 ? (
                  <p className="note-empty">No notes yet.</p>
                ) : (
                  <ul className="note-list">
                    {lead.notes.map((n) => (
                      <li key={n.id}>
                        <span className="note-time">{fmtDate(n.created_at)}</span>
                        <p>{n.note}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <form action={addNoteAction} className="note-form">
                  <input type="hidden" name="id" value={lead.id} />
                  <textarea
                    name="note"
                    rows={2}
                    maxLength={2000}
                    placeholder="Add a note — call outcome, quote sent, anything."
                    required
                  />
                  <button type="submit" data-testid={`note-submit-${lead.id}`}>
                    Add note
                  </button>
                </form>
              </div>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
