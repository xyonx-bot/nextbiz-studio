"use client";

import { useActionState, useState } from "react";
import { passwordLoginAction, requestCodeAction, verifyCodeAction, type LoginState } from "@/app/portal/actions";

const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 5l7 7-7 7" /></svg>;

/**
 * Client login, on the Studio Desk login card (admin.css .logincard / .lrow / .lc-foot):
 * email → 6-digit code (default), or email + password if they set one.
 */
export function LoginForm({ expired }: { expired?: boolean }) {
  const [mode, setMode] = useState<"code" | "password">("code");
  const [codeState, askCode, asking] = useActionState<LoginState, FormData>(requestCodeAction, null);
  const [verifyState, verify, verifying] = useActionState<LoginState, FormData>(verifyCodeAction, null);
  const [pwState, pwLogin, pwBusy] = useActionState<LoginState, FormData>(passwordLoginAction, null);
  const onCode = mode === "code" && codeState?.step === "code";
  const email = verifyState?.email ?? codeState?.email ?? pwState?.email ?? "";
  const step = mode === "password" ? "Email + password" : onCode ? "Step 2 of 2 · Code" : "Step 1 of 2 · Email";

  const head = (
    <div className="lc-head">
      <span className="micro"><span className="dot" /> Client portal · {step}</span>
      <h1>{onCode ? <>Check your<br />email.</> : <>Sign in to<br />your project.</>}</h1>
      <p className="lc-sub">
        {onCode ? codeState?.note : mode === "password" ? "Use the password you set in your portal's Account page." : "Enter the email we invited you with. We'll send a 6-digit code, no password needed."}
      </p>
    </div>
  );
  const err = (m?: string) => m ? <div className="errmsg" role="alert"><span>{m}</span></div> : null;

  return (
    <div className="logincard pui-logincard">
      {head}
      {expired && <p className="pui-loginwarn">That login link has expired or was already used. Sign in below, or ask us for a new one.</p>}

      {mode === "code" && !onCode && (
        <form action={askCode}>
          <div className={`lrow${codeState?.error ? " err" : ""}`}>
            <label htmlFor="pl-email">Email</label>
            <div className="field"><input id="pl-email" name="email" type="email" autoComplete="email" required defaultValue={email} autoFocus placeholder="you@business.com" /></div>
            {err(codeState?.error)}
          </div>
          <div className="lc-foot"><button className="action" type="submit" disabled={asking}>{asking ? "Sending…" : <>Send me a code <Arrow /></>}</button></div>
        </form>
      )}

      {onCode && (
        <form action={verify}>
          <input type="hidden" name="email" value={codeState?.email ?? ""} />
          <div className={`lrow${verifyState?.error ? " err" : ""}`}>
            <label htmlFor="pl-code">6-digit code</label>
            <div className="field"><input id="pl-code" className="pui-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus placeholder="000000" /></div>
            {err(verifyState?.error)}
          </div>
          <div className="lc-foot">
            <button className="action" type="submit" disabled={verifying}>{verifying ? "Checking…" : <>Sign in <Arrow /></>}</button>
            <p className="lc-note">No email? Check spam, or <button type="button" className="pui-lnk" onClick={() => location.reload()}>send a new code</button>.</p>
          </div>
        </form>
      )}

      {mode === "password" && (
        <form action={pwLogin}>
          <div className="lrow">
            <label htmlFor="pl-pemail">Email</label>
            <div className="field"><input id="pl-pemail" name="email" type="email" autoComplete="email" required defaultValue={email} autoFocus placeholder="you@business.com" /></div>
          </div>
          <div className={`lrow${pwState?.error ? " err" : ""}`}>
            <label htmlFor="pl-pass">Password</label>
            <div className="field"><input id="pl-pass" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" /></div>
            {err(pwState?.error)}
          </div>
          <div className="lc-foot"><button className="action" type="submit" disabled={pwBusy}>{pwBusy ? "Signing in…" : <>Sign in <Arrow /></>}</button></div>
        </form>
      )}

      <ul className="pui-loginalt">
        <li><span>Other way in</span>
          {mode === "code"
            ? <button type="button" className="pui-lnk" onClick={() => setMode("password")}>Use my password</button>
            : <button type="button" className="pui-lnk" onClick={() => setMode("code")}>Email me a code</button>}</li>
        <li><span>Email not arriving?</span><a className="pui-lnk" href="https://wa.me/919883608843?text=Hi%2C%20I%20need%20a%20portal%20login%20link" target="_blank" rel="noreferrer">Get a link on WhatsApp</a></li>
        <li><span>Not a client yet?</span><a className="pui-lnk" href="/contact">Start a project</a></li>
      </ul>
    </div>
  );
}
