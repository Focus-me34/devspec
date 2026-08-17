import {
  pgTable, uuid, text, integer, boolean, jsonb, timestamp, uniqueIndex, index,
} from "drizzle-orm/pg-core";

export const STATUSES = [
  "discussion", "specified", "building", "review", "deployed", "dropped",
] as const;
export type Status = (typeof STATUSES)[number];

export type Answers = {
  who?: string;
  flow?: string;
  fail?: string;
  out?: string;
  breaks?: string;
  check?: string[];
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  /** Display name, kept because notes, activity and the member list all read
   *  it. Recomputed from first and last name whenever the profile is saved,
   *  so there is still exactly one name to render anywhere. */
  name: text("name").notNull(),
  title: text("title"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  /** A small square image as a data URL, resized in the browser before it is
   *  sent. Stored inline rather than in blob storage: it avoids a dependency,
   *  an env var and a second service for a few tens of kilobytes per person.
   *  Swap to Vercel Blob if this ever holds more than avatars. */
  avatar: text("avatar"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ emailIdx: uniqueIndex("users_email_idx").on(t.email) }));

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniq: uniqueIndex("members_team_user_idx").on(t.teamId, t.userId) }));

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ teamIdx: index("projects_team_idx").on(t.teamId) }));

export const features = pgTable("features", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  ref: integer("ref").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("discussion"),
  ownerName: text("owner_name"),
  branchUrl: text("branch_url"),
  blocked: boolean("blocked").notNull().default(false),
  blockedReason: text("blocked_reason"),
  answers: jsonb("answers").$type<Answers>().notNull().default({}),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  projIdx: index("features_project_idx").on(t.projectId, t.updatedAt),
  refIdx: uniqueIndex("features_ref_idx").on(t.projectId, t.ref),
}));

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  /** Who wrote it, so the UI can tell that they have since left the team.
   *  Nullable: notes written before this column existed have no author, and a
   *  deleted account nulls it rather than taking the note with it. The name
   *  below stays either way, because the note is the record of what was said. */
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ featIdx: index("notes_feature_idx").on(t.featureId, t.createdAt) }));

export const activity = pgTable("activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  actorName: text("actor_name").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ featIdx: index("activity_feature_idx").on(t.featureId, t.createdAt) }));

/** One row per registration attempt, successful or not, used only to rate
 *  limit signups per IP. Rows older than a day are swept on write. */
export const signupAttempts = pgTable("signup_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ip: text("ip").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ ipIdx: index("signup_attempts_ip_idx").on(t.ip, t.createdAt) }));
