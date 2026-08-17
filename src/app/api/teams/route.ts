import { db, teams, members, projects } from "@/db";
import { asc, eq, sql } from "drizzle-orm";
import { requireUser, currentUser, fail } from "@/lib/guard";

export async function GET() {
  try {
    const session = await requireUser();
    // From the database, not the cookie: the cookie's name can be stale.
    const user = { ...session, ...(await currentUser(session.userId)) };
    const superAdmin = user.superAdmin;

    // A platform operator gets every team, which is what makes every team's
    // features and people reachable: the routes below all gate on
    // requireMember, and that already lets an operator through.
    const rows = superAdmin
      ? await db.select({ id: teams.id, name: teams.name, role: sql<string>`'admin'` })
        .from(teams).orderBy(asc(teams.createdAt))
      : await db.select({ id: teams.id, name: teams.name, role: members.role })
        .from(members).innerJoin(teams, eq(members.teamId, teams.id))
        .where(eq(members.userId, user.userId));

    return Response.json({
      teams: rows,
      me: { name: user.name, email: user.email, superAdmin },
    });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { name } = await req.json();
    if (!name?.trim()) return Response.json({ error: "Name is required" }, { status: 400 });
    const [team] = await db.insert(teams).values({ name: name.trim() }).returning();
    await db.insert(members).values({ teamId: team.id, userId: user.userId, role: "admin" });
    await db.insert(projects).values({ teamId: team.id, name: "General" });
    return Response.json({ team });
  } catch (e) { return fail(e); }
}
