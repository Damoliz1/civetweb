import { useEffect, useState } from "react";
import { api, type Course, type Dashboard } from "../api";
import type { Tab } from "../App";
import { CourseTag, dueLabel, Empty, timeAgo } from "./shared";

export function DashboardView({ name, courses, go }: { name: string; courses: Course[]; go: (t: Tab) => void }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<Dashboard>("dashboard").then(setData, (e) => setErr(e.message));
  }, []);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="kicker">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1>
            {greet}, <span className="hl">{name}</span>.
          </h1>
        </div>
      </header>
      {err && <p className="alert error">{err}</p>}

      <div className="stats">
        <button className="stat" onClick={() => go("courses")}>
          <b>{data?.courses ?? "–"}</b> courses
        </button>
        <button className="stat" onClick={() => go("planner")}>
          <b>{data?.upcoming.length ?? "–"}</b> on deck
        </button>
        <button className="stat" onClick={() => go("notes")}>
          <b>{data?.notes ?? "–"}</b> notes
        </button>
        <button className="stat" onClick={() => go("cards")}>
          <b>{data?.cards ?? "–"}</b> flashcards
        </button>
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Coming up</h2>
            <button className="link" onClick={() => go("planner")}>
              Open planner →
            </button>
          </div>
          {data && data.upcoming.length === 0 && (
            <Empty title="Nothing due. Enjoy it.">Add assignments in the planner to see them here.</Empty>
          )}
          <ul className="list">
            {data?.upcoming.map((a) => {
              const d = dueLabel(a.dueDate);
              return (
                <li key={a.id} className="row">
                  <span className="row-main">
                    {a.title} <CourseTag courses={courses} id={a.courseId} />
                  </span>
                  <span className={`due ${d.tone}`}>{d.text}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>From the class board</h2>
            <button className="link" onClick={() => go("board")}>
              See all →
            </button>
          </div>
          {data && data.recentPosts.length === 0 && <Empty title="Quiet in here.">Be the first to post.</Empty>}
          <ul className="list">
            {data?.recentPosts.map((p) => (
              <li key={p.id} className="row">
                <span className="row-main">
                  <span className={`kind ${p.kind}`}>{p.kind}</span> {p.title}
                </span>
                <small className="muted">
                  {p.authorName} · {timeAgo(p.createdAt)}
                </small>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {courses.length === 0 && (
        <section className="panel callout">
          <h2>Start by adding your courses</h2>
          <p>Courses color-code your assignments, notes and flashcard decks.</p>
          <button className="btn primary" onClick={() => go("courses")}>
            Add a course
          </button>
        </section>
      )}
    </div>
  );
}
