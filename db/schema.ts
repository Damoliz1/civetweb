import { pgTable, serial, text, timestamp, integer, boolean, date, index } from "drizzle-orm/pg-core";

// Each row is owned by a Netlify Identity user (user_id = Identity user id).
export const courses = pgTable(
  "courses",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    name: text().notNull(),
    color: text().notNull().default("#ff6b4a"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("courses_user_idx").on(t.userId)],
);

export const assignments = pgTable(
  "assignments",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    courseId: integer("course_id").references(() => courses.id, { onDelete: "set null" }),
    title: text().notNull(),
    dueDate: date("due_date"),
    done: boolean().notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("assignments_user_idx").on(t.userId)],
);

export const notes = pgTable(
  "notes",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    courseId: integer("course_id").references(() => courses.id, { onDelete: "set null" }),
    title: text().notNull(),
    body: text().notNull().default(""),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("notes_user_idx").on(t.userId)],
);

export const decks = pgTable(
  "decks",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    courseId: integer("course_id").references(() => courses.id, { onDelete: "set null" }),
    name: text().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("decks_user_idx").on(t.userId)],
);

export const cards = pgTable(
  "cards",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    deckId: integer("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    front: text().notNull(),
    back: text().notNull(),
    known: boolean().notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("cards_deck_idx").on(t.deckId)],
);

// Community board: visible to all signed-in students.
export const posts = pgTable("posts", {
  id: serial().primaryKey(),
  userId: text("user_id").notNull(),
  authorName: text("author_name").notNull(),
  kind: text().notNull().default("question"), // question | resource | announcement
  title: text().notNull(),
  body: text().notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const replies = pgTable(
  "replies",
  {
    id: serial().primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    authorName: text("author_name").notNull(),
    body: text().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("replies_post_idx").on(t.postId)],
);
