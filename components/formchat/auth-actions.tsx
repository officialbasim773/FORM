"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignInAction({ returnTo }: { returnTo: string }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <form
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          setNotice("");
          try {
            if (mode === "forgot") {
              const result = await authClient.requestPasswordReset({
                email,
                redirectTo: "/reset-password",
              });
              if (result.error) throw new Error(result.error.message);
              setNotice("If this address has an account, a reset link is on its way.");
            } else if (mode === "sign-up") {
              const result = await authClient.signUp.email({
                name,
                email,
                password,
                callbackURL: "/sign-in?verified=1",
              });
              if (result.error) throw new Error(result.error.message);
              setNotice("Check your email for a verification link, then sign in.");
            } else {
              const result = await authClient.signIn.email({
                email,
                password,
                callbackURL: returnTo,
              });
              if (result.error) throw new Error(result.error.message);
              window.location.assign(returnTo);
            }
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Authentication failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode === "sign-up" && (
          <label>
            Name
            <input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
        )}
        <label>
          Email
          <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        {mode !== "forgot" && (
          <label>
            Password
            <input required type="password" minLength={8} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
        )}
        <button className="btn primary" disabled={busy} type="submit">
          {busy ? "Please wait…" : mode === "sign-up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
        </button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div>
        {mode !== "sign-in" && <button className="text-btn" type="button" onClick={() => { setMode("sign-in"); setError(""); setNotice(""); }}>Sign in</button>}
        {mode !== "sign-up" && <button className="text-btn" type="button" onClick={() => { setMode("sign-up"); setError(""); setNotice(""); }}>Create account</button>}
        {mode !== "forgot" && <button className="text-btn" type="button" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>Forgot password?</button>}
      </div>
    </>
  );
}

export function ResetPasswordAction({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!token) return <p className="error">This reset link is invalid. Request a new one from the sign-in page.</p>;
  if (done) return <p>Password updated. <a href="/sign-in">Sign in</a>.</p>;
  return (
    <form className="auth-form" onSubmit={async (event) => {
      event.preventDefault();
      setBusy(true);
      setError("");
      const result = await authClient.resetPassword({ token, newPassword: password });
      if (result.error) setError(result.error.message || "Could not reset password.");
      else setDone(true);
      setBusy(false);
    }}>
      <label>New password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button className="btn primary" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}

export function SignOutAction({ returnTo }: { returnTo: string }) {
  const [error, setError] = useState("");
  useEffect(() => {
    authClient.signOut().then((result) => {
      if (result.error) setError(result.error.message || "Could not sign out.");
      else window.location.replace(returnTo);
    });
  }, [returnTo]);
  return <p role={error ? "alert" : undefined}>{error || "Signing out…"}</p>;
}
