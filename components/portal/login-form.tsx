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
  const step = mode === "password" ? "Email and password" : onCode ? "Step 2 of 2 · Enter the code" : "Step 1 of 2 · Your email";

  return (
    <div className="pt-loginbox">
      <div className="pt-loginhead">
        <span className="pt-micro">Log in</span>
        <span className="pt-step">{step}</span>
      </div>
      <h2>{mode === "password" ? "Welcome back." : onCode ? "Check your email." : "Welcome back."}</h2>
      {expired && <p className="pt-alert">That login link has expired or was already used. Log in below, or ask the studio for a new one.</p>}

      {mode === "code" ? (
        !onCode ? (
          <form action={askCode} className="pt-form">
            <p className="pt-lead">Enter the email we invited you with. We&apos;ll send a 6-digit code, no password needed.</p>
            <div className="pt-sheet">
              <label className="pt-cellf"><span className="pt-l">Email</span>
                <input name="email" type="email" autoComplete="email" required defaultValue={email} autoFocus placeholder="you@business.com" /></label>
            </div>
            {codeState?.error && <p className="pt-err" role="alert">{codeState.error}</p>}
            <button className="pt-btn wide" type="submit" disabled={asking}>{asking ? "Sending…" : "Send me a code"} <span aria-hidden>→</span></button>
          </form>
        ) : (
          <form action={verify} className="pt-form">
            <p className="pt-lead" role="status">{codeState?.note}</p>
            <input type="hidden" name="email" value={codeState?.email ?? ""} />
            <div className="pt-sheet">
              <label className="pt-cellf"><span className="pt-l">6-digit code</span>
                <input className="pt-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus placeholder="000000" /></label>
            </div>
            {verifyState?.error && <p className="pt-err" role="alert">{verifyState.error}</p>}
            <button className="pt-btn wide" type="submit" disabled={verifying}>{verifying ? "Checking…" : "Log in"} <span aria-hidden>→</span></button>
            <p className="pt-small">No email? Check spam, or <button type="button" className="pt-linkbtn" onClick={() => location.reload()}>send a new code</button>.</p>
          </form>
        )
      ) : (
        <form action={pwLogin} className="pt-form">
          <div className="pt-sheet">
            <label className="pt-cellf"><span className="pt-l">Email</span><input name="email" type="email" autoComplete="email" required defaultValue={email} autoFocus /></label>
            <label className="pt-cellf"><span className="pt-l">Password</span><input name="password" type="password" autoComplete="current-password" required /></label>
          </div>
          {pwState?.error && <p className="pt-err" role="alert">{pwState.error}</p>}
          <button className="pt-btn wide" type="submit" disabled={pwBusy}>{pwBusy ? "Logging in…" : "Log in"} <span aria-hidden>→</span></button>
        </form>
      )}

      <dl className="pt-facts pt-loginalt">
        <div><dt>Other way in</dt><dd>
          {mode === "code"
            ? <button type="button" className="pt-linkbtn" onClick={() => setMode("password")}>Use my password</button>
            : <button type="button" className="pt-linkbtn" onClick={() => setMode("code")}>Email me a code</button>}
        </dd></div>
        <div><dt>Email not arriving?</dt><dd><a href="https://wa.me/919883608843?text=Hi%2C%20I%20need%20a%20portal%20login%20link" target="_blank" rel="noreferrer">Get a link on WhatsApp</a></dd></div>
        <div><dt>Not a client yet?</dt><dd><a href="/contact">Start a project</a></dd></div>
      </dl>
    </div>
  );
}
