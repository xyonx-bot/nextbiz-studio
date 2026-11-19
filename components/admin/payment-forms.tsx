"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  paymentOpAction, projectValueAction, recordPaymentAction, requestPaymentAction, savePaymentSettingsAction, type FormState,
} from "@/app/admin/clients/actions";
import type { PaymentSettings } from "@/lib/payments";

const Msg = ({ s }: { s: FormState }) => (s?.error ? <p className="ca-err" role="alert">{s.error}</p> : s?.ok ? <p className="ca-ok" role="status">{s.ok}</p> : null);
function useReset(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state?.at, state?.ok]);
  return ref;
}
const STAGES = [["design", "Design"], ["build", "Build"], ["launch", "Launch"], ["care", "Care"]] as const;
const VIA = [["bank", "Bank transfer"], ["upi", "UPI (direct)"], ["razorpay", "Razorpay"], ["cash", "Cash"], ["other", "Other"]] as const;

/** Ask the client for money: label, amount, currency, due date, optional stage hold. */
export function RequestPaymentForm({ projectId, currency, projects }: {
  projectId?: string; currency: string; projects?: { id: string; label: string }[];
}) {
  const [state, act, busy] = useActionState<FormState, FormData>(requestPaymentAction, null);
  const ref = useReset(state);
  return (
    <form ref={ref} action={act} className="ca-form">
      {projects ? (
        <label className="ca-f"><span>Client · project</span>
          <select name="project" className="ca-in" required defaultValue="">
            <option value="" disabled>Choose who to ask…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select></label>
      ) : <input type="hidden" name="project" value={projectId} />}
      <div className="ca-two">
        <label className="ca-f"><span>For</span><input name="label" placeholder="Advance, Full payment, Extra pages…" required maxLength={120} /></label>
        <div className="ca-f"><span>Amount</span>
          <div className="pay-amt"><select name="currency" defaultValue={currency} aria-label="Currency"><option>INR</option><option>USD</option></select>
            <input name="amount" inputMode="decimal" placeholder="15000" required /></div></div>
      </div>
      <div className="ca-two">
        <label className="ca-f"><span>Due by <small>optional</small></span><input name="due" type="date" /></label>
        <label className="ca-f"><span>Hold the project <small>optional</small></span>
          <select name="blocks" defaultValue="" className="ca-in"><option value="">Don&apos;t hold anything</option>{STAGES.map(([v, l]) => <option key={v} value={v}>Can&apos;t move to {l} until paid</option>)}</select></label>
      </div>
      <label className="ca-f"><span>Note to the client <small>optional</small></span><textarea name="note" rows={2} maxLength={600} placeholder="e.g. 50% to start design. The rest before launch." /></label>
      <label className="ca-check"><input type="checkbox" name="notify" defaultChecked /> Email the client</label>
      <Msg s={state} />
      <div className="ca-row"><button className="ca-btn pri" type="submit" disabled={busy}>{busy ? "Requesting…" : "Request payment"}</button></div>
    </form>
  );
}

/** Money that came in some other way. */
export function RecordPaymentForm({ projectId, currency }: { projectId: string; currency: string }) {
  const [state, act, busy] = useActionState<FormState, FormData>(recordPaymentAction, null);
  const ref = useReset(state);
  return (
    <form ref={ref} action={act} className="ca-form">
      <input type="hidden" name="project" value={projectId} />
      <div className="ca-two">
        <label className="ca-f"><span>For</span><input name="label" placeholder="Payment" maxLength={120} /></label>
        <div className="ca-f"><span>Amount received</span>
          <div className="pay-amt"><select name="currency" defaultValue={currency} aria-label="Currency"><option>INR</option><option>USD</option></select>
            <input name="amount" inputMode="decimal" placeholder="5000" required /></div></div>
      </div>
      <div className="ca-two">
        <label className="ca-f"><span>How</span><select name="via" className="ca-in" defaultValue="bank">{VIA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="ca-f"><span>Received on</span><input name="on" type="date" /></label>
      </div>
      <label className="ca-f"><span>Reference <small>UTR, Xflow ID…</small></span><input name="ref" maxLength={120} /></label>
      <Msg s={state} />
      <div className="ca-row"><button className="ca-btn" type="submit" disabled={busy}>{busy ? "Saving…" : "Log payment"}</button></div>
    </form>
  );
}

/** Row action: open a small form to mark a request paid (bank transfer, direct UPI…). */
export function MarkPaidButton({ projectId, id }: { projectId: string; id: string }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className="ca-btn" onClick={() => setOpen(true)}>Mark paid</button>;
  return (
    <form action={paymentOpAction} className="pay-markpaid">
      <input type="hidden" name="project" value={projectId} /><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value="paid" />
      <select name="via" className="ca-in" defaultValue="bank" aria-label="How it was paid">{VIA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <input name="ref" className="ca-in" placeholder="Reference (UTR…)" maxLength={120} />
      <input name="on" type="date" className="ca-in" aria-label="Paid on" />
      <label className="ca-check"><input type="checkbox" name="receipt" defaultChecked /> Email a receipt</label>
      <div className="ca-row"><button className="ca-btn pri" type="submit">Confirm paid</button><button type="button" className="ca-x" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}

export function ProjectValueForm({ projectId, value, currency }: { projectId: string; value: string; currency: string }) {
  const [state, act, busy] = useActionState<FormState, FormData>(projectValueAction, null);
  return (
    <form action={act} className="ca-form">
      <input type="hidden" name="project" value={projectId} />
      <div className="ca-f"><span>Project value <small>optional · the agreed total, shown to the client</small></span>
        <div className="pay-amt"><select name="currency" defaultValue={currency} aria-label="Currency"><option>INR</option><option>USD</option></select>
          <input name="value" inputMode="decimal" defaultValue={value} placeholder="40000" /><button className="ca-btn" type="submit" disabled={busy}>{busy ? "…" : "Save"}</button></div></div>
      <Msg s={state} />
    </form>
  );
}

const BANK_FIELDS: [keyof PaymentSettings["usdBank"], string, string?][] = [
  ["beneficiary", "Beneficiary"], ["accountNumber", "Account number"], ["achRouting", "ACH routing number"], ["wireRouting", "Fedwire / ABA routing number"],
  ["swift", "SWIFT / BIC"], ["accountType", "Account type"], ["bank", "Bank"], ["bankAddress", "Bank address"],
];
export function PaymentSettingsForm({ s }: { s: PaymentSettings }) {
  const [state, act, busy] = useActionState<FormState, FormData>(savePaymentSettingsAction, null);
  return (
    <form action={act} className="ca-form">
      <div className="ca-two">
        {BANK_FIELDS.map(([k, l]) => <label key={k} className="ca-f"><span>{l}</span><input name={`usd_${k}`} defaultValue={s.usdBank[k]} /></label>)}
      </div>
      <label className="ca-f"><span>Instructions shown under the USD details</span><textarea name="usd_note" rows={2} defaultValue={s.usdBank.note} /></label>
      <label className="ca-f"><span>Note under rupee payments <small>optional</small></span><input name="inrNote" defaultValue={s.inrNote} placeholder="e.g. Receipts are issued by NextBiz Studio." /></label>
      <Msg s={state} />
      <div className="ca-row"><button className="ca-btn pri" type="submit" disabled={busy}>{busy ? "Saving…" : "Save payment details"}</button></div>
    </form>
  );
}
