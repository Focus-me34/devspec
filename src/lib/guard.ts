import { db, members, users } from "@/db";
import { and, eq } from "drizzle-orm";
import { getSession, type Session } from "./session";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Every API handler starts here. Never trust a teamId from the request body:
 *  look the resource up first, then check membership against what the
 *  database says it belongs to. */
export async function requireUser(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Not signed in");
  return s;
}

/** The account as the database has it now, not as the cookie remembers it.
 *  The session is signed for 30 days and carries a name, so anything written
 *  from that name can be a month out of date, and a flag granted by SQL would
 *  not be seen at all until the next sign in. */
export async function currentUser(userId: string) {
  const [u] = await db.select({ name: users.name, superAdmin: users.superAdmin })
    .from(users).where(eq(users.id, userId)).limit(1);
  if (!u) throw new HttpError(401, "Account not found");
  return u;
}

export async function isSuperAdmin(userId: string) {
  return (await currentUser(userId)).superAdmin;
}

export async function requireMember(teamId: string, role?: "admin") {
  const session = await requireUser();

  const [row] = await db.select({ member: members, name: users.name, superAdmin: users.superAdmin })
    .from(members).innerJoin(users, eq(users.id, members.userId))
    .where(and(eq(members.teamId, teamId), eq(members.userId, session.userId)))
    .limit(1);

  if (row) {
    if (role === "admin" && row.member.role !== "admin") throw new HttpError(403, "Admins only");
    // Name from the row, so notes and activity record what this person is
    // called today rather than what they were called when they signed in.
    return { user: { ...session, name: row.name }, member: row.member, viaSuperAdmin: false };
  }

  // A platform operator passes for every team, including ones they do not
  // belong to. This is the only bypass in the app, and it lives here rather
  // than sprinkled through the routes so there is one place to audit it.
  const me = await currentUser(session.userId);
  if (me.superAdmin) {
    return {
      user: { ...session, name: me.name },
      member: { id: "", teamId, userId: session.userId, role: "admin" as const, createdAt: new Date() },
      viaSuperAdmin: true,
    };
  }

  throw new HttpError(403, "Not a member of this team");
}

export function fail(e: unknown) {
  if (e instanceof HttpError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  const msg = e instanceof Error ? e.message : "Something went wrong";
  // Postgres trigger refusing an incomplete specification
  if (/specification|SPEC_GATE/i.test(msg)) {
    return Response.json({ error: msg.replace(/^.*?ERROR:\s*/i, "") }, { status: 409 });
  }
  console.error(e);
  return Response.json({ error: msg }, { status: 500 });
}
