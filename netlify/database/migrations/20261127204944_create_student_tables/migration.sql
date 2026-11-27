CREATE TABLE "assignments" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"course_id" integer,
	"title" text NOT NULL,
	"due_date" date,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"deck_id" integer NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"known" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#ff6b4a' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decks" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"course_id" integer,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"course_id" integer,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"author_name" text NOT NULL,
	"kind" text DEFAULT 'question' NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replies" (
	"id" serial PRIMARY KEY,
	"post_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"author_name" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "assignments_user_idx" ON "assignments" ("user_id");--> statement-breakpoint
CREATE INDEX "cards_deck_idx" ON "cards" ("deck_id");--> statement-breakpoint
CREATE INDEX "courses_user_idx" ON "courses" ("user_id");--> statement-breakpoint
CREATE INDEX "decks_user_idx" ON "decks" ("user_id");--> statement-breakpoint
CREATE INDEX "notes_user_idx" ON "notes" ("user_id");--> statement-breakpoint
CREATE INDEX "replies_post_idx" ON "replies" ("post_id");--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_id_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_deck_id_decks_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "decks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_course_id_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_course_id_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;