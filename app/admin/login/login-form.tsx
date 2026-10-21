"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "../actions";
import { AlertCircle, ArrowRight } from "@/components/admin/icons";

/**
 * Login form (S4 P1.5), ported from Mira's login wireframe: ledger rows
 * with dashed-underline inputs; wrong creds render the inline errmsg row
 * under the password field (label + underline go red) — never a raw
 * error page. `next` returns the admin to the route they were bounced
 * from (middleware sets it).
 */
export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";
  const [state, action, pending] = useActionState(loginAction, null);
  const err = !!state?.error;

  return (
    <form action={action} className="lc-form">
      <div className="logincard">
        <div className="lc-head">
          <span className="micro"><span className="dot" /> Studio admin · Private area</span>
          <h1>Sign in to<br />the studio desk.</h1>
          <p className="lc-sub">One account manages leads and page content. Credentials come from the studio owner — we&rsquo;ll never ask for them by email.</p>
        </div>
        <div className="lrow">
          <label htmlFor="user">Username</label>
          <div className="field"><input id="user" name="user" type="text" placeholder="e.g. joydip" autoComplete="username" required /></div>
        </div>
        <div className={`lrow${err ? " err" : ""}`}>
          <label htmlFor="pass">Password</label>
          <div className="field"><input id="pass" name="pass" type="password" placeholder="••••••••" autoComplete="current-password" required /></div>
          {err && (
            <div className="errmsg" role="alert">
              <AlertCircle size={11} />
              <span>{state?.error}</span>
            </div>
          )}
        </div>
        <div className="lc-foot">
          <button className="action" type="submit" disabled={pending}>
            {pending ? "Checking…" : <>Enter the desk <ArrowRight size={13} /></>}
          </button>
          <p className="lc-note">Wrong credentials are rejected with this message — never a raw error page. Sessions persist across refresh.</p>
        </div>
      </div>
      <input type="hidden" name="next" value={next} />
    </form>
  );
}
