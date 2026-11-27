import type { Config, Context } from "@netlify/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { assignments, cards, courses, decks, notes, posts, replies } from "../../db/schema.js";

type AuthUser = { id: string; email: string; name: string };

// ---------- auth ----------
// The browser signs in with Netlify Identity, which sets the `nf_jwt` cookie.
// We validate that token against the Identity API and cache the result briefly.
const authCache = new Map<string, { user: AuthUser; exp: number }>();

function readToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)nf_jwt=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function authenticate(req: Request, origin: string): Promise<AuthUser | null> {
  const token = readToken(req);
  if (!token) return null;
  const cached = authCache.get(token);
  if (cached && cached.exp > Date.now()) return cached.user;
  try {
    const res = await fetch(new URL("/.netlify/identity/user", origin), {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id: string; email: string; user_metadata?: { full_name?: string } };
    const user: AuthUser = {
      id: u.id,
      email: u.email,
      name: u.user_metadata?.full_name?.trim() || u.email.split("@")[0],
    };
    if (authCache.size > 5000) authCache.clear();
    authCache.set(token, { user, exp: Date.now() + 60_000 });
    return user;
  } catch {
    return null;
  }
}

// ---------- helpers ----------
const json = (data: unknown, status = 200) => Response.json(data, { status });
const bad = (message: string, status = 400) => json({ error: message }, status);

function str(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}
function optStr(v: unknown, max = 20000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}
function optId(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}
function optDate(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}
function optColor(v: unknown): string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#ff6b4a";
}

async function ownsCourse(userId: string, courseId: number | null) {
  if (courseId === null) return true;
  const rows = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, userId)));
  return rows.length > 0;
}

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// ---------- routes ----------
async function route(req: Request, user: AuthUser, parts: string[]): Promise<Response> {
  const m = req.method;
  const [resource, rawId, sub] = parts;
  const id = rawId ? optId(rawId) : null;
  if (rawId && id === null) return bad("Invalid id");
  const uid = user.id;

  switch (resource) {
    case "me":
      return json(user);

    case "dashboard": {
      const [c, a, n, d, p] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(courses).where(eq(courses.userId, uid)),
        db
          .select()
          .from(assignments)
          .where(and(eq(assignments.userId, uid), eq(assignments.done, false)))
          .orderBy(sql`${assignments.dueDate} asc nulls last`)
          .limit(5),
        db.select({ count: sql<number>`count(*)::int` }).from(notes).where(eq(notes.userId, uid)),
        db.select({ count: sql<number>`count(*)::int` }).from(cards).where(eq(cards.userId, uid)),
        db.select().from(posts).orderBy(desc(posts.createdAt)).limit(3),
      ]);
      return json({
        courses: c[0].count,
        notes: n[0].count,
        cards: d[0].count,
        upcoming: a,
        recentPosts: p,
      });
    }

    // ----- courses -----
    case "courses": {
      if (m === "GET" && !id)
        return json(await db.select().from(courses).where(eq(courses.userId, uid)).orderBy(asc(courses.name)));
      if (m === "POST" && !id) {
        const b = await body(req);
        const name = str(b.name, 80);
        if (!name) return bad("Course name is required");
        const [row] = await db.insert(courses).values({ userId: uid, name, color: optColor(b.color) }).returning();
        return json(row, 201);
      }
      if (m === "PATCH" && id) {
        const b = await body(req);
        const name = str(b.name, 80);
        if (!name) return bad("Course name is required");
        const [row] = await db
          .update(courses)
          .set({ name, color: optColor(b.color) })
          .where(and(eq(courses.id, id), eq(courses.userId, uid)))
          .returning();
        return row ? json(row) : bad("Not found", 404);
      }
      if (m === "DELETE" && id) {
        await db.delete(courses).where(and(eq(courses.id, id), eq(courses.userId, uid)));
        return json({ ok: true });
      }
      break;
    }

    // ----- assignments (planner) -----
    case "assignments": {
      if (m === "GET" && !id)
        return json(
          await db
            .select()
            .from(assignments)
            .where(eq(assignments.userId, uid))
            .orderBy(asc(assignments.done), sql`${assignments.dueDate} asc nulls last`, desc(assignments.createdAt)),
        );
      if (m === "POST" && !id) {
        const b = await body(req);
        const title = str(b.title, 200);
        if (!title) return bad("Title is required");
        const courseId = optId(b.courseId);
        if (!(await ownsCourse(uid, courseId))) return bad("Unknown course");
        const [row] = await db
          .insert(assignments)
          .values({ userId: uid, title, courseId, dueDate: optDate(b.dueDate) })
          .returning();
        return json(row, 201);
      }
      if (m === "PATCH" && id) {
        const b = await body(req);
        const patch: Partial<typeof assignments.$inferInsert> = {};
        if ("done" in b) patch.done = Boolean(b.done);
        if ("title" in b) {
          const title = str(b.title, 200);
          if (!title) return bad("Title is required");
          patch.title = title;
        }
        if ("dueDate" in b) patch.dueDate = optDate(b.dueDate);
        if ("courseId" in b) {
          const courseId = optId(b.courseId);
          if (!(await ownsCourse(uid, courseId))) return bad("Unknown course");
          patch.courseId = courseId;
        }
        if (!Object.keys(patch).length) return bad("Nothing to update");
        const [row] = await db
          .update(assignments)
          .set(patch)
          .where(and(eq(assignments.id, id), eq(assignments.userId, uid)))
          .returning();
        return row ? json(row) : bad("Not found", 404);
      }
      if (m === "DELETE" && id) {
        await db.delete(assignments).where(and(eq(assignments.id, id), eq(assignments.userId, uid)));
        return json({ ok: true });
      }
      break;
    }

    // ----- notes -----
    case "notes": {
      if (m === "GET" && !id)
        return json(await db.select().from(notes).where(eq(notes.userId, uid)).orderBy(desc(notes.updatedAt)));
      if (m === "POST" && !id) {
        const b = await body(req);
        const courseId = optId(b.courseId);
        if (!(await ownsCourse(uid, courseId))) return bad("Unknown course");
        const [row] = await db
          .insert(notes)
          .values({ userId: uid, title: str(b.title, 200) ?? "Untitled note", body: optStr(b.body), courseId })
          .returning();
        return json(row, 201);
      }
      if (m === "PATCH" && id) {
        const b = await body(req);
        const courseId = optId(b.courseId);
        if (!(await ownsCourse(uid, courseId))) return bad("Unknown course");
        const [row] = await db
          .update(notes)
          .set({ title: str(b.title, 200) ?? "Untitled note", body: optStr(b.body), courseId, updatedAt: new Date() })
          .where(and(eq(notes.id, id), eq(notes.userId, uid)))
          .returning();
        return row ? json(row) : bad("Not found", 404);
      }
      if (m === "DELETE" && id) {
        await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, uid)));
        return json({ ok: true });
      }
      break;
    }

    // ----- flashcard decks & cards -----
    case "decks": {
      if (m === "GET" && !id) {
        const rows = await db
          .select({
            id: decks.id,
            name: decks.name,
            courseId: decks.courseId,
            createdAt: decks.createdAt,
            total: sql<number>`count(${cards.id})::int`,
            known: sql<number>`count(${cards.id}) filter (where ${cards.known})::int`,
          })
          .from(decks)
          .leftJoin(cards, eq(cards.deckId, decks.id))
          .where(eq(decks.userId, uid))
          .groupBy(decks.id)
          .orderBy(desc(decks.createdAt));
        return json(rows);
      }
      if (m === "POST" && !id) {
        const b = await body(req);
        const name = str(b.name, 100);
        if (!name) return bad("Deck name is required");
        const courseId = optId(b.courseId);
        if (!(await ownsCourse(uid, courseId))) return bad("Unknown course");
        const [row] = await db.insert(decks).values({ userId: uid, name, courseId }).returning();
        return json({ ...row, total: 0, known: 0 }, 201);
      }
      if (id) {
        const [deck] = await db.select().from(decks).where(and(eq(decks.id, id), eq(decks.userId, uid)));
        if (!deck) return bad("Not found", 404);
        if (m === "DELETE" && !sub) {
          await db.delete(decks).where(eq(decks.id, id));
          return json({ ok: true });
        }
        if (sub === "cards" && m === "GET")
          return json(await db.select().from(cards).where(eq(cards.deckId, id)).orderBy(asc(cards.createdAt)));
        if (sub === "cards" && m === "POST") {
          const b = await body(req);
          const front = str(b.front, 1000);
          const back = str(b.back, 2000);
          if (!front || !back) return bad("Both sides of the card are required");
          const [row] = await db.insert(cards).values({ userId: uid, deckId: id, front, back }).returning();
          return json(row, 201);
        }
        if (sub === "reset" && m === "POST") {
          await db.update(cards).set({ known: false }).where(eq(cards.deckId, id));
          return json({ ok: true });
        }
      }
      break;
    }

    case "cards": {
      if (!id) break;
      if (m === "PATCH") {
        const b = await body(req);
        const patch: Partial<typeof cards.$inferInsert> = {};
        if ("known" in b) patch.known = Boolean(b.known);
        if ("front" in b) {
          const front = str(b.front, 1000);
          if (!front) return bad("Front is required");
          patch.front = front;
        }
        if ("back" in b) {
          const back = str(b.back, 2000);
          if (!back) return bad("Back is required");
          patch.back = back;
        }
        if (!Object.keys(patch).length) return bad("Nothing to update");
        const [row] = await db
          .update(cards)
          .set(patch)
          .where(and(eq(cards.id, id), eq(cards.userId, uid)))
          .returning();
        return row ? json(row) : bad("Not found", 404);
      }
      if (m === "DELETE") {
        await db.delete(cards).where(and(eq(cards.id, id), eq(cards.userId, uid)));
        return json({ ok: true });
      }
      break;
    }

    // ----- community board -----
    case "posts": {
      if (m === "GET" && !id) {
        const kind = new URL(req.url).searchParams.get("kind");
        const base = db
          .select({
            id: posts.id,
            userId: posts.userId,
            authorName: posts.authorName,
            kind: posts.kind,
            title: posts.title,
            body: posts.body,
            createdAt: posts.createdAt,
            replyCount: sql<number>`(select count(*)::int from ${replies} where ${replies.postId} = ${posts.id})`,
          })
          .from(posts);
        const rows = await (kind && ["question", "resource", "announcement"].includes(kind)
          ? base.where(eq(posts.kind, kind))
          : base
        )
          .orderBy(desc(posts.createdAt))
          .limit(100);
        return json(rows);
      }
      if (m === "POST" && !id) {
        const b = await body(req);
        const title = str(b.title, 200);
        if (!title) return bad("Title is required");
        const kind = ["question", "resource", "announcement"].includes(String(b.kind)) ? String(b.kind) : "question";
        const [row] = await db
          .insert(posts)
          .values({ userId: uid, authorName: user.name, kind, title, body: optStr(b.body, 10000) })
          .returning();
        return json({ ...row, replyCount: 0 }, 201);
      }
      if (id && m === "GET" && sub === "replies")
        return json(await db.select().from(replies).where(eq(replies.postId, id)).orderBy(asc(replies.createdAt)));
      if (id && m === "POST" && sub === "replies") {
        const b = await body(req);
        const text = str(b.body, 5000);
        if (!text) return bad("Reply cannot be empty");
        const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, id));
        if (!post) return bad("Not found", 404);
        const [row] = await db
          .insert(replies)
          .values({ postId: id, userId: uid, authorName: user.name, body: text })
          .returning();
        return json(row, 201);
      }
      if (id && m === "DELETE" && !sub) {
        await db.delete(posts).where(and(eq(posts.id, id), eq(posts.userId, uid)));
        return json({ ok: true });
      }
      break;
    }

    case "replies": {
      if (id && m === "DELETE") {
        await db.delete(replies).where(and(eq(replies.id, id), eq(replies.userId, uid)));
        return json({ ok: true });
      }
      break;
    }
  }
  return bad("Not found", 404);
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);

  if (parts[0] === "health") return json({ ok: true });

  const user = await authenticate(req, url.origin);
  if (!user) return bad("Please sign in", 401);

  try {
    return await route(req, user, parts);
  } catch (err) {
    console.error("API error", err);
    return bad("Something went wrong", 500);
  }
};

export const config: Config = { path: "/api/*" };
