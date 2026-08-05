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
  name: text("name").notNull(),
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
