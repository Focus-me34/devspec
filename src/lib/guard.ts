import { db, members } from "@/db";
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

export async function requireMember(teamId: string, role?: "admin") {
  const user = await requireUser();
  const [m] = await db.select().from(members)
    .where(and(eq(members.teamId, teamId), eq(members.userId, user.userId)))
    .limit(1);
  if (!m) throw new HttpError(403, "Not a member of this team");
  if (role === "admin" && m.role !== "admin") throw new HttpError(403, "Admins only");
  return { user, member: m };
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
