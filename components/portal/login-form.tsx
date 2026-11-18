"use client";

import { useActionState, useState } from "react";
import { passwordLoginAction, requestCodeAction, verifyCodeAction, type LoginState } from "@/app/portal/actions";

/** Client login: email → 6-digit code (default), or email + password if they set one. */
export function LoginForm({ expired }: { expired?: boolean }) {
  const [mode, setMode] = useState<"code" | "password">("code");
  const [codeState, askCode, asking] = useActionState<LoginState, FormData>(requestCodeAction, null);
  const [verifyState, verify, verifying] = useActionState<LoginState, FormData>(verifyCodeAction, null);
  const [pwState, pwLogin, pwBusy] = useActionState<LoginState, FormData>(passwordLoginAction, null);
  const onCode = codeState?.step === "code";
  const email = verifyState?.email ?? codeState?.email ?? pwState?.email ?? "";

  return (
    <div className="pt-login-box">
      <span className="pt-micro">Client login</span>
      <h1>Welcome back</h1>
      {expired && <p className="pt-alert">That login link has expired or was already used. Log in below, or ask the studio for a new link.</p>}

      {mode === "code" ? (
        !onCode ? (
          <form action={askCode} className="pt-form">
            <p className="pt-lead">Enter the email we invited you with. We&apos;ll send you a 6-digit code. No password needed.</p>
            <label className="pt-lbl" htmlFor="pt-email">Email</label>
            <input className="pt-in" id="pt-email" name="email" type="email" autoComplete="email" required defaultValue={email} autoFocus />
            {codeState?.error && <p className="pt-err" role="alert">{codeState.error}</p>}
            <button className="pt-btn" type="submit" disabled={asking}>{asking ? "Sending…" : "Send me a code"}</button>
          </form>
        ) : (
          <form action={verify} className="pt-form">
            <p className="pt-lead" role="status">{codeState?.note}</p>
            <input type="hidden" name="email" value={codeState?.email ?? ""} />
            <label className="pt-lbl" htmlFor="pt-code">6-digit code</label>
            <input className="pt-in pt-code" id="pt-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus placeholder="••••••" />
            {verifyState?.error && <p className="pt-err" role="alert">{verifyState.error}</p>}
            <button className="pt-btn" type="submit" disabled={verifying}>{verifying ? "Checking…" : "Log in"}</button>
            <p className="pt-small">Didn&apos;t get it? Check spam, or <button type="button" className="pt-linkbtn" onClick={() => location.reload()}>send a new code</button>.</p>
          </form>
        )
      ) : (
        <form action={pwLogin} className="pt-form">
          <label className="pt-lbl" htmlFor="pt-email2">Email</label>
          <input className="pt-in" id="pt-email2" name="email" type="email" autoComplete="email" required defaultValue={email} />
          <label className="pt-lbl" htmlFor="pt-pw">Password</label>
          <input className="pt-in" id="pt-pw" name="password" type="password" autoComplete="current-password" required />
          {pwState?.error && <p className="pt-err" role="alert">{pwState.error}</p>}
          <button className="pt-btn" type="submit" disabled={pwBusy}>{pwBusy ? "Logging in…" : "Log in"}</button>
        </form>
      )}

      <div className="pt-or">
        {mode === "code"
          ? <button type="button" className="pt-linkbtn" onClick={() => setMode("password")}>I have a password</button>
          : <button type="button" className="pt-linkbtn" onClick={() => setMode("code")}>Email me a code instead</button>}
        <span>Email not arriving? Message the studio on WhatsApp for a login link: <a href="https://wa.me/919883608843?text=Hi%2C%20I%20need%20a%20portal%20login%20link" target="_blank" rel="noreferrer">+91 98836 08843</a></span>
      </div>
      <p className="pt-small">Not a client yet? <a href="/contact">Start a project</a></p>
    </div>
  );
}
