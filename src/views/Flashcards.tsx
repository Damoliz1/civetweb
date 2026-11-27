import { useEffect, useState, type FormEvent } from "react";
import { api, type Card, type Course, type Deck } from "../api";
import { CourseSelect, CourseTag, Empty, PageHead } from "./shared";

export function FlashcardsView({ courses }: { courses: Course[] }) {
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [open, setOpen] = useState<Deck | null>(null);
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState<number | null>(null);
  const [err, setErr] = useState("");

  const load = () => api<Deck[]>("decks").then(setDecks, (e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    try {
      const d = await api<Deck>("decks", { method: "POST", body: { name, courseId } });
      setDecks((xs) => [d, ...(xs ?? [])]);
      setName("");
      setOpen(d);
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  if (open)
    return (
      <DeckView
        deck={open}
        courses={courses}
        onBack={() => {
          setOpen(null);
          load();
        }}
      />
    );

  return (
    <div className="page">
      <PageHead kicker="Flashcards" title="Review decks" />
      <form className="panel inline-form" onSubmit={add}>
        <input className="grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="New deck, e.g. Cell biology terms" required />
        <CourseSelect courses={courses} value={courseId} onChange={setCourseId} />
        <button className="btn primary">Create deck</button>
      </form>
      {err && <p className="alert error">{err}</p>}
      {decks && decks.length === 0 && <Empty title="No decks yet">Create a deck, add a few cards, then start studying.</Empty>}
      <div className="deck-grid">
        {decks?.map((d) => {
          const pct = d.total ? Math.round((d.known / d.total) * 100) : 0;
          return (
            <button key={d.id} className="deck" onClick={() => setOpen(d)}>
              <span className="deck-stack" aria-hidden />
              <b>{d.name}</b>
              <CourseTag courses={courses} id={d.courseId} />
              <span className="muted">
                {d.total} cards · {pct}% known
              </span>
              <span className="bar">
                <span style={{ width: `${pct}%` }} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DeckView({ deck, courses, onBack }: { deck: Deck; courses: Course[]; onBack: () => void }) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [studying, setStudying] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<Card[]>(`decks/${deck.id}/cards`).then(setCards, (e) => setErr(e.message));
  }, [deck.id]);

  async function add(e: FormEvent) {
    e.preventDefault();
    try {
      const c = await api<Card>(`decks/${deck.id}/cards`, { method: "POST", body: { front, back } });
      setCards((xs) => [...(xs ?? []), c]);
      setFront("");
      setBack("");
      (document.getElementById("card-front") as HTMLTextAreaElement | null)?.focus();
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  async function remove(c: Card) {
    setCards((xs) => xs!.filter((x) => x.id !== c.id));
    await api(`cards/${c.id}`, { method: "DELETE" });
  }

  async function deleteDeck() {
    if (!confirm(`Delete the deck “${deck.name}” and all its cards?`)) return;
    await api(`decks/${deck.id}`, { method: "DELETE" });
    onBack();
  }

  if (studying && cards)
    return (
      <Study
        deck={deck}
        cards={cards}
        onUpdate={(c) => setCards((xs) => xs!.map((x) => (x.id === c.id ? c : x)))}
        onExit={() => setStudying(false)}
      />
    );

  const known = cards?.filter((c) => c.known).length ?? 0;

  return (
    <div className="page">
      <button className="link back" onClick={onBack}>
        ← All decks
      </button>
      <PageHead kicker="Deck" title={deck.name}>
        <div className="filters">
          <CourseTag courses={courses} id={deck.courseId} />
          <button className="btn primary" disabled={!cards?.length} onClick={() => setStudying(true)}>
            Study {cards?.length ? `(${cards.length - known} to go)` : ""}
          </button>
        </div>
      </PageHead>
      <form className="panel card-form" onSubmit={add}>
        <textarea id="card-front" value={front} onChange={(e) => setFront(e.target.value)} placeholder="Front — question or term" required />
        <textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Back — answer or definition" required />
        <button className="btn">Add card</button>
      </form>
      {err && <p className="alert error">{err}</p>}
      {cards && cards.length === 0 && <Empty title="This deck is empty">Add your first card above.</Empty>}
      <ul className="list cards-list">
        {cards?.map((c) => (
          <li key={c.id} className="row">
            <span className="row-main card-pair">
              <b>{c.front}</b>
              <span className="muted">{c.back}</span>
            </span>
            {c.known && <span className="due later">known</span>}
            <button className="icon-btn" onClick={() => remove(c)} aria-label="Delete card">
              ×
            </button>
          </li>
        ))}
      </ul>
      <button className="link danger" onClick={deleteDeck}>
        Delete deck
      </button>
    </div>
  );
}

function Study({
  deck,
  cards,
  onUpdate,
  onExit,
}: {
  deck: Deck;
  cards: Card[];
  onUpdate: (c: Card) => void;
  onExit: () => void;
}) {
  const [queue, setQueue] = useState(() => shuffle(cards.filter((c) => !c.known).map((c) => c.id)));
  const [flipped, setFlipped] = useState(false);
  const current = cards.find((c) => c.id === queue[0]);

  async function mark(knownIt: boolean) {
    if (!current) return;
    setFlipped(false);
    setQueue((q) => (knownIt ? q.slice(1) : [...q.slice(1), q[0]]));
    if (knownIt) {
      onUpdate({ ...current, known: true });
      await api(`cards/${current.id}`, { method: "PATCH", body: { known: true } });
    }
  }

  async function restart() {
    await api(`decks/${deck.id}/reset`, { method: "POST" });
    cards.forEach((c) => onUpdate({ ...c, known: false }));
    setQueue(shuffle(cards.map((c) => c.id)));
  }

  return (
    <div className="page study">
      <button className="link back" onClick={onExit}>
        ← Back to deck
      </button>
      <p className="kicker center">
        {deck.name} · {queue.length} left
      </p>
      {current ? (
        <>
          <button className={flipped ? "flash flipped" : "flash"} onClick={() => setFlipped((f) => !f)}>
            <span className="flash-inner">
              <span className="face front">{current.front}</span>
              <span className="face back">{current.back}</span>
            </span>
          </button>
          <p className="muted center">Tap the card to flip</p>
          <div className="study-actions">
            <button className="btn" onClick={() => mark(false)}>
              Still learning
            </button>
            <button className="btn primary" onClick={() => mark(true)}>
              Got it ✓
            </button>
          </div>
        </>
      ) : (
        <div className="panel callout center">
          <h2>Deck complete ✦</h2>
          <p>You marked every card as known.</p>
          <div className="study-actions">
            <button className="btn" onClick={restart}>
              Study again from scratch
            </button>
            <button className="btn primary" onClick={onExit}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function shuffle<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
