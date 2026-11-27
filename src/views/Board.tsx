import { useEffect, useState, type FormEvent } from "react";
import { api, type Post, type Reply } from "../api";
import { Empty, PageHead, timeAgo } from "./shared";

const KINDS = [
  { id: "question", label: "Question" },
  { id: "resource", label: "Resource" },
  { id: "announcement", label: "Announcement" },
] as const;

export function BoardView({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [kind, setKind] = useState<string>("");
  const [composing, setComposing] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setPosts(null);
    api<Post[]>(`posts${kind ? `?kind=${kind}` : ""}`).then(setPosts, (e) => setErr(e.message));
  }, [kind]);

  return (
    <div className="page">
      <PageHead kicker="Class board" title="Ask, share, announce">
        <button className="btn primary" onClick={() => setComposing((c) => !c)}>
          {composing ? "Cancel" : "+ New post"}
        </button>
      </PageHead>
      <div className="chips">
        <button className={!kind ? "chip on" : "chip"} onClick={() => setKind("")}>
          Everything
        </button>
        {KINDS.map((k) => (
          <button key={k.id} className={kind === k.id ? "chip on" : "chip"} onClick={() => setKind(k.id)}>
            {k.label}s
          </button>
        ))}
      </div>
      {composing && (
        <Composer
          onPosted={(p) => {
            setPosts((xs) => [p, ...(xs ?? [])]);
            setComposing(false);
          }}
        />
      )}
      {err && <p className="alert error">{err}</p>}
      {posts && posts.length === 0 && <Empty title="No posts yet">Start the conversation — ask a question or share a resource.</Empty>}
      <ul className="posts">
        {posts?.map((p) => (
          <PostItem
            key={p.id}
            post={p}
            mine={p.userId === userId}
            open={openId === p.id}
            userId={userId}
            onToggle={() => setOpenId(openId === p.id ? null : p.id)}
            onDeleted={() => setPosts((xs) => xs!.filter((x) => x.id !== p.id))}
            onReplied={() => setPosts((xs) => xs!.map((x) => (x.id === p.id ? { ...x, replyCount: x.replyCount + 1 } : x)))}
          />
        ))}
      </ul>
    </div>
  );
}

function Composer({ onPosted }: { onPosted: (p: Post) => void }) {
  const [kind, setKind] = useState("question");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      onPosted(await api<Post>("posts", { method: "POST", body: { kind, title, body } }));
    } catch (x) {
      setErr((x as Error).message);
    }
  }
  return (
    <form className="panel stack composer" onSubmit={submit}>
      <div className="chips">
        {KINDS.map((k) => (
          <button type="button" key={k.id} className={kind === k.id ? `chip on ${k.id}` : "chip"} onClick={() => setKind(k.id)}>
            {k.label}
          </button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details, links, context…" rows={4} />
      {err && <p className="alert error">{err}</p>}
      <button className="btn primary">Post to board</button>
    </form>
  );
}

function PostItem({
  post,
  mine,
  open,
  userId,
  onToggle,
  onDeleted,
  onReplied,
}: {
  post: Post;
  mine: boolean;
  open: boolean;
  userId: string;
  onToggle: () => void;
  onDeleted: () => void;
  onReplied: () => void;
}) {
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) api<Reply[]>(`posts/${post.id}/replies`).then(setReplies);
  }, [open, post.id]);

  async function reply(e: FormEvent) {
    e.preventDefault();
    const r = await api<Reply>(`posts/${post.id}/replies`, { method: "POST", body: { body: text } });
    setReplies((xs) => [...(xs ?? []), r]);
    setText("");
    onReplied();
  }

  async function removePost() {
    if (!confirm("Delete this post?")) return;
    await api(`posts/${post.id}`, { method: "DELETE" });
    onDeleted();
  }

  async function removeReply(r: Reply) {
    await api(`replies/${r.id}`, { method: "DELETE" });
    setReplies((xs) => xs!.filter((x) => x.id !== r.id));
  }

  return (
    <li className={`post panel ${post.kind}`}>
      <div className="post-meta">
        <span className={`kind ${post.kind}`}>{post.kind}</span>
        <small className="muted">
          {post.authorName} · {timeAgo(post.createdAt)}
        </small>
        {mine && (
          <button className="link danger" onClick={removePost}>
            Delete
          </button>
        )}
      </div>
      <h3>{post.title}</h3>
      {post.body && <p className="post-body">{post.body}</p>}
      <button className="link" onClick={onToggle}>
        {open ? "Hide replies" : `${post.replyCount} ${post.replyCount === 1 ? "reply" : "replies"} · Reply`}
      </button>
      {open && (
        <div className="replies">
          {replies?.map((r) => (
            <div key={r.id} className="reply">
              <small className="muted">
                <b>{r.authorName}</b> · {timeAgo(r.createdAt)}
                {r.userId === userId && (
                  <button className="link danger" onClick={() => removeReply(r)}>
                    delete
                  </button>
                )}
              </small>
              <p>{r.body}</p>
            </div>
          ))}
          <form className="inline-form" onSubmit={reply}>
            <input className="grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply…" required />
            <button className="btn">Reply</button>
          </form>
        </div>
      )}
    </li>
  );
}
