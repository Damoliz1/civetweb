import { useState, type FormEvent } from "react";
import {
  AuthError,
  MissingIdentityError,
  login,
  requestPasswordRecovery,
  signup,
  type User,
} from "@netlify/identity";

type Mode = "login" | "signup" | "forgot";

export function AuthScreen({ onAuthed, notice }: { onAuthed: (u: User) => void; notice?: string }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(notice ?? "");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (mode === "login") {
        onAuthed(await login(email, password));
      } else if (mode === "signup") {
        const u = await signup(email, password, { full_name: name });
        if (u.confirmedAt) onAuthed(u);
        else {
          setInfo("Almost there — check your inbox for a confirmation link, then sign in.");
          setMode("login");
        }
      } else {
        await requestPasswordRecovery(email);
        setInfo("If that email has an account, a reset link is on its way.");
        setMode("login");
      }
    } catch (err) {
      if (err instanceof MissingIdentityError) setError("Sign-in isn't available in this environment yet.");
      else if (err instanceof AuthError) {
        if (err.status === 401) setError("That email and password don't match.");
        else if (err.status === 403) setError("New sign-ups are closed right now.");
        else if (err.status === 429) setError("Too many attempts — check your inbox or try again in a few minutes.");
        else setError(err.message);
      } else setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth-hero">
        <div className="brand brand-lg">
          <span className="brand-mark">S</span> StudyHub
        </div>
        <h1>
          Your whole semester, <span className="hl">on one page.</span>
        </h1>
        <p className="lede">
          Plan assignments, keep tidy notes, drill flashcards, and swap help with classmates — all in one place that
          syncs wherever you sign in.
        </p>
        <ul className="feature-list">
          <li>
            <b>Planner</b> Due dates by course, checked off as you go.
          </li>
          <li>
            <b>Notes</b> Write per subject, find them instantly.
          </li>
          <li>
            <b>Flashcards</b> Flip, mark what you know, repeat the rest.
          </li>
          <li>
            <b>Class board</b> Ask questions, share resources, post news.
          </li>
        </ul>
        <p className="scribble">you've got this ✦</p>
      </section>

      <section className="auth-card">
        <div className="tabs">
          <button className={mode === "login" ? "on" : ""} onClick={() => setMode("login")} type="button">
            Sign in
          </button>
          <button className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")} type="button">
            Create account
          </button>
        </div>
        <form onSubmit={submit} className="stack">
          {mode === "forgot" && <p className="muted">Enter your email and we'll send a reset link.</p>}
          {mode === "signup" && (
            <label>
              Your name
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Alex Rivera" />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@school.edu"
            />
          </label>
          {mode !== "forgot" && (
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </label>
          )}
          {error && <p className="alert error">{error}</p>}
          {info && <p className="alert">{info}</p>}
          <button className="btn primary" disabled={busy}>
            {busy ? "One sec…" : mode === "login" ? "Sign in" : mode === "signup" ? "Create my account" : "Send reset link"}
          </button>
          {mode === "login" && (
            <button type="button" className="link" onClick={() => setMode("forgot")}>
              Forgot your password?
            </button>
          )}
          {mode === "forgot" && (
            <button type="button" className="link" onClick={() => setMode("login")}>
              Back to sign in
            </button>
          )}
        </form>
      </section>
    </div>
  );
}
