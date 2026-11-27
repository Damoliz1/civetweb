import type { Course } from "../api";

export function CourseTag({ courses, id }: { courses: Course[]; id: number | null }) {
  const c = courses.find((x) => x.id === id);
  if (!c) return null;
  return (
    <span className="tag" style={{ ["--c" as string]: c.color }}>
      {c.name}
    </span>
  );
}

export function CourseSelect({
  courses,
  value,
  onChange,
  allLabel = "No course",
}: {
  courses: Course[];
  value: number | null;
  onChange: (v: number | null) => void;
  allLabel?: string;
}) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">{allLabel}</option>
      {courses.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export function dueLabel(d: string | null): { text: string; tone: "late" | "soon" | "later" | "none" } {
  if (!d) return { text: "No due date", tone: "none" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d + "T00:00:00");
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { text: `${-days}d overdue`, tone: "late" };
  if (days === 0) return { text: "Due today", tone: "soon" };
  if (days === 1) return { text: "Due tomorrow", tone: "soon" };
  if (days < 7) return { text: `Due ${due.toLocaleDateString(undefined, { weekday: "long" })}`, tone: "soon" };
  return { text: `Due ${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, tone: "later" };
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children && <p>{children}</p>}
    </div>
  );
}

export function PageHead({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
      </div>
      {children}
    </header>
  );
}
