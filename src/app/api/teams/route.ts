import { db, teams, members, projects } from "@/db";
import { eq } from "drizzle-orm";
import { requireUser, fail } from "@/lib/guard";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db.select({ id: teams.id, name: teams.name, role: members.role })
      .from(members).innerJoin(teams, eq(members.teamId, teams.id))
      .where(eq(members.userId, user.userId));
    return Response.json({ teams: rows, me: { name: user.name, email: user.email } });
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
