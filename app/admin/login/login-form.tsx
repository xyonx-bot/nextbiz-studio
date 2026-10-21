"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "../actions";

/**
 * Login form (S4). useActionState carries the error back inline — never a
 * raw error page. `next` param returns the admin to the route they were
 * bounced from (middleware sets it).
 */
export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="login-card">
      <p className="login-micro">NextBiz Studio</p>
      <h1>Admin sign-in</h1>
      <input type="hidden" name="next" value={next} />
      {state?.error ? (
        <p className="login-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <label htmlFor="user">Username</label>
      <input id="user" name="user" autoComplete="username" required />
      <label htmlFor="pass">Password</label>
      <input id="pass" name="pass" type="password" autoComplete="current-password" required />
      <button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
