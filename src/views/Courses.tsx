import { useState, type FormEvent } from "react";
import { api, type Course } from "../api";
import { Empty, PageHead } from "./shared";

const COLORS = ["#ff6b4a", "#2f7d6d", "#3d5afe", "#e0a100", "#a23b72", "#5b6b7a"];

export function CoursesView({ courses, reload }: { courses: Course[]; reload: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [err, setErr] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api("courses", { method: "POST", body: { name, color } });
      setName("");
      setColor(COLORS[(courses.length + 1) % COLORS.length]);
      await reload();
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  async function remove(c: Course) {
    if (!confirm(`Remove ${c.name}? Its assignments, notes and decks stay, just without a course.`)) return;
    await api(`courses/${c.id}`, { method: "DELETE" });
    await reload();
  }

  return (
    <div className="page">
      <PageHead kicker="Setup" title="Your courses" />
      <form className="panel inline-form" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Biology 101" required />
        <div className="swatches" role="radiogroup" aria-label="Course color">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              className={c === color ? "swatch on" : "swatch"}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
        </div>
        <button className="btn primary">Add course</button>
      </form>
      {err && <p className="alert error">{err}</p>}
      {courses.length === 0 ? (
        <Empty title="No courses yet">Add the classes you're taking this term.</Empty>
      ) : (
        <div className="course-grid">
          {courses.map((c) => (
            <div key={c.id} className="course" style={{ ["--c" as string]: c.color }}>
              <b>{c.name}</b>
              <button className="link danger" onClick={() => remove(c)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
