import { useEffect, useState, type FormEvent } from "react";
import { api, type Assignment, type Course } from "../api";
import { CourseSelect, CourseTag, dueLabel, Empty, PageHead } from "./shared";

export function PlannerView({ courses }: { courses: Course[] }) {
  const [items, setItems] = useState<Assignment[] | null>(null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [courseId, setCourseId] = useState<number | null>(null);
  const [filter, setFilter] = useState<number | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<Assignment[]>("assignments").then(setItems, (e) => setErr(e.message));
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const row = await api<Assignment>("assignments", {
        method: "POST",
        body: { title, dueDate: due || null, courseId },
      });
      setItems((xs) => [row, ...(xs ?? [])].sort(sortFn));
      setTitle("");
      setDue("");
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  async function toggle(a: Assignment) {
    setItems((xs) => xs!.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)).sort(sortFn));
    await api(`assignments/${a.id}`, { method: "PATCH", body: { done: !a.done } }).catch((e) => setErr(e.message));
  }

  async function remove(a: Assignment) {
    setItems((xs) => xs!.filter((x) => x.id !== a.id));
    await api(`assignments/${a.id}`, { method: "DELETE" }).catch((e) => setErr(e.message));
  }

  const visible = (items ?? []).filter((a) => (filter ? a.courseId === filter : true) && (showDone || !a.done));
  const doneCount = (items ?? []).filter((a) => a.done).length;

  return (
    <div className="page">
      <PageHead kicker="Planner" title="Assignments & deadlines">
        <div className="filters">
          <CourseSelect courses={courses} value={filter} onChange={setFilter} allLabel="All courses" />
          <label className="check">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show done (
            {doneCount})
          </label>
        </div>
      </PageHead>

      <form className="panel inline-form" onSubmit={add}>
        <input
          className="grow"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's due? e.g. Lab report #3"
          required
        />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
        <CourseSelect courses={courses} value={courseId} onChange={setCourseId} />
        <button className="btn primary">Add</button>
      </form>
      {err && <p className="alert error">{err}</p>}

      {items && visible.length === 0 && (
        <Empty title={items.length ? "All caught up ✦" : "Your planner is empty"}>
          {items.length ? "Nothing left to do here." : "Add your first assignment above."}
        </Empty>
      )}
      <ul className="list checklist">
        {visible.map((a) => {
          const d = dueLabel(a.dueDate);
          return (
            <li key={a.id} className={a.done ? "row done" : "row"}>
              <label className="row-main">
                <input type="checkbox" checked={a.done} onChange={() => toggle(a)} />
                <span className="title">{a.title}</span>
                <CourseTag courses={courses} id={a.courseId} />
              </label>
              {!a.done && <span className={`due ${d.tone}`}>{d.text}</span>}
              <button className="icon-btn" onClick={() => remove(a)} aria-label="Delete">
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function sortFn(a: Assignment, b: Assignment) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  return a.dueDate ? -1 : b.dueDate ? 1 : 0;
}
