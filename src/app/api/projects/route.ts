import { db, projects } from "@/db";
import { and, eq, isNull, asc } from "drizzle-orm";
import { requireMember, fail } from "@/lib/guard";

export async function GET(req: Request) {
  try {
    const teamId = new URL(req.url).searchParams.get("team");
    if (!teamId) return Response.json({ error: "team is required" }, { status: 400 });
    await requireMember(teamId);
    const rows = await db.select().from(projects)
      .where(and(eq(projects.teamId, teamId), isNull(projects.archivedAt)))
      .orderBy(asc(projects.createdAt));
    return Response.json({ projects: rows });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const { teamId, name } = await req.json();
    if (!teamId || !name?.trim()) return Response.json({ error: "teamId and name are required" }, { status: 400 });
    await requireMember(teamId);
    const [project] = await db.insert(projects).values({ teamId, name: name.trim() }).returning();
    return Response.json({ project });
  } catch (e) { return fail(e); }
}
