import { useEffect, useMemo, useRef, useState } from "react";
import { api, type Course, type Note } from "../api";
import { CourseSelect, CourseTag, Empty, PageHead, timeAgo } from "./shared";

export function NotesView({ courses }: { courses: Course[] }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    api<Note[]>("notes").then((n) => {
      setNotes(n);
      if (n[0]) setActiveId(n[0].id);
    }, (e) => setErr(e.message));
  }, []);

  const active = notes?.find((n) => n.id === activeId) ?? null;
  const visible = useMemo(() => {
    const term = q.toLowerCase();
    return (notes ?? []).filter(
      (n) =>
        (filter ? n.courseId === filter : true) &&
        (!term || n.title.toLowerCase().includes(term) || n.body.toLowerCase().includes(term)),
    );
  }, [notes, q, filter]);

  async function create() {
    try {
      const n = await api<Note>("notes", { method: "POST", body: { title: "Untitled note", body: "", courseId: filter } });
      setNotes((xs) => [n, ...(xs ?? [])]);
      setActiveId(n.id);
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  function edit(patch: Partial<Note>) {
    if (!active) return;
    const next = { ...active, ...patch };
    setNotes((xs) => xs!.map((n) => (n.id === next.id ? next : n)));
    setStatus("Saving…");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const saved = await api<Note>(`notes/${next.id}`, {
          method: "PATCH",
          body: { title: next.title, body: next.body, courseId: next.courseId },
        });
        setNotes((xs) => xs!.map((n) => (n.id === saved.id ? { ...n, updatedAt: saved.updatedAt } : n)));
        setStatus("Saved");
      } catch (x) {
        setStatus("");
        setErr((x as Error).message);
      }
    }, 600);
  }

  async function remove() {
    if (!active || !confirm(`Delete “${active.title}”?`)) return;
    await api(`notes/${active.id}`, { method: "DELETE" });
    const rest = notes!.filter((n) => n.id !== active.id);
    setNotes(rest);
    setActiveId(rest[0]?.id ?? null);
  }

  return (
    <div className="page">
      <PageHead kicker="Notes" title="Your notebook">
        <button className="btn primary" onClick={create}>
          + New note
        </button>
      </PageHead>
      {err && <p className="alert error">{err}</p>}
      <div className="notes">
        <div className="notes-list panel">
          <input className="search" placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} />
          <CourseSelect courses={courses} value={filter} onChange={setFilter} allLabel="All courses" />
          {notes && visible.length === 0 && <Empty title="No notes found" />}
          <ul>
            {visible.map((n) => (
              <li key={n.id}>
                <button className={n.id === activeId ? "note-item on" : "note-item"} onClick={() => setActiveId(n.id)}>
                  <b>{n.title || "Untitled note"}</b>
                  <span className="muted">{n.body.slice(0, 70) || "Empty note"}</span>
                  <small>
                    <CourseTag courses={courses} id={n.courseId} /> {timeAgo(n.updatedAt)}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="editor panel paper">
          {active ? (
            <>
              <div className="editor-bar">
                <CourseSelect courses={courses} value={active.courseId} onChange={(v) => edit({ courseId: v })} />
                <span className="muted">{status}</span>
                <button className="link danger" onClick={remove}>
                  Delete
                </button>
              </div>
              <input
                className="note-title"
                value={active.title}
                onChange={(e) => edit({ title: e.target.value })}
                placeholder="Title"
              />
              <textarea
                className="note-body"
                value={active.body}
                onChange={(e) => edit({ body: e.target.value })}
                placeholder="Start writing… lecture highlights, formulas, questions for office hours."
              />
            </>
          ) : (
            <Empty title="Pick a note or start a new one" />
          )}
        </div>
      </div>
    </div>
  );
}
