import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getUser, handleAuthCallback, logout, onAuthChange, updateUser, type User } from "@netlify/identity";
import { AuthScreen } from "./AuthScreen";
import { api, type Course } from "./api";
import { DashboardView } from "./views/Dashboard";
import { PlannerView } from "./views/Planner";
import { NotesView } from "./views/Notes";
import { FlashcardsView } from "./views/Flashcards";
import { BoardView } from "./views/Board";
import { CoursesView } from "./views/Courses";

export type Tab = "home" | "planner" | "notes" | "cards" | "board" | "courses";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "Today", icon: "☀" },
  { id: "planner", label: "Planner", icon: "✓" },
  { id: "notes", label: "Notes", icon: "✎" },
  { id: "cards", label: "Flashcards", icon: "❏" },
  { id: "board", label: "Class board", icon: "✉" },
  { id: "courses", label: "Courses", icon: "◐" },
];

function tabFromHash(): Tab {
  const h = window.location.hash.replace("#/", "") as Tab;
  return TABS.some((t) => t.id === h) ? h : "home";
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const result = await handleAuthCallback();
        if (result?.type === "recovery") setRecovering(true);
        if (result?.type === "confirmation") setNotice("Email confirmed — welcome aboard!");
        if (result) history.replaceState(null, "", window.location.pathname + "#/home");
      } catch {
        setNotice("That link has expired or was already used.");
      }
      setUser(await getUser());
      setReady(true);
    })();
    return onAuthChange((_e, u) => setUser(u));
  }, []);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      setCourses(await api<Course[]>("courses"));
    } catch {
      /* shown in views */
    }
  }, []);

  useEffect(() => {
    if (user) loadCourses();
  }, [user, loadCourses]);

  const go = (t: Tab) => {
    window.location.hash = `/${t}`;
  };

  if (!ready) return <div className="splash">Opening your notebook…</div>;
  if (!user) return <AuthScreen onAuthed={setUser} notice={notice} />;
  if (recovering) return <SetPassword onDone={() => setRecovering(false)} />;

  const first = (user.name ?? user.email ?? "").split(/[ @]/)[0];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">S</span> StudyHub
        </div>
        <nav>
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? "nav on" : "nav"} onClick={() => go(t.id)}>
              <span className="nav-ico" aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="me">
          <div className="avatar">{first.slice(0, 1).toUpperCase()}</div>
          <div className="me-text">
            <b>{user.name ?? first}</b>
            <small>{user.email}</small>
          </div>
          <button className="link" onClick={() => logout().then(() => setUser(null))}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        {notice && (
          <p className="alert" onClick={() => setNotice("")}>
            {notice}
          </p>
        )}
        {tab === "home" && <DashboardView name={first} courses={courses} go={go} />}
        {tab === "planner" && <PlannerView courses={courses} />}
        {tab === "notes" && <NotesView courses={courses} />}
        {tab === "cards" && <FlashcardsView courses={courses} />}
        {tab === "board" && <BoardView userId={user.id} />}
        {tab === "courses" && <CoursesView courses={courses} reload={loadCourses} />}
      </main>
    </div>
  );
}

function SetPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await updateUser({ password: pw });
      onDone();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Could not update password");
    }
  }
  return (
    <div className="splash">
      <form className="auth-card stack" onSubmit={submit}>
        <h2>Choose a new password</h2>
        <input type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
        {err && <p className="alert error">{err}</p>}
        <button className="btn primary">Save password</button>
      </form>
    </div>
  );
}
