export type Course = { id: number; name: string; color: string };
export type Assignment = { id: number; title: string; courseId: number | null; dueDate: string | null; done: boolean };
export type Note = { id: number; title: string; body: string; courseId: number | null; updatedAt: string };
export type Deck = { id: number; name: string; courseId: number | null; total: number; known: number };
export type Card = { id: number; deckId: number; front: string; back: string; known: boolean };
export type Post = {
  id: number;
  userId: string;
  authorName: string;
  kind: "question" | "resource" | "announcement";
  title: string;
  body: string;
  createdAt: string;
  replyCount: number;
};
export type Reply = { id: number; postId: number; userId: string; authorName: string; body: string; createdAt: string };
export type Dashboard = { courses: number; notes: number; cards: number; upcoming: Assignment[]; recentPosts: Post[] };

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method: init.method ?? "GET",
    credentials: "same-origin",
    headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}
