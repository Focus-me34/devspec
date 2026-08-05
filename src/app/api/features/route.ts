import { db, features, projects, notes, sql as neonSql } from "@/db";
import { and, eq, desc, or, ilike, inArray, sql } from "drizzle-orm";
import { requireMember, fail } from "@/lib/guard";

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const teamId = p.get("team");
    const projectId = p.get("project");
    const q = p.get("q")?.trim();
    if (!teamId) return Response.json({ error: "team is required" }, { status: 400 });
    await requireMember(teamId);

    const teamProjects = await db.select({ id: projects.id }).from(projects)
      .where(eq(projects.teamId, teamId));
    const ids = teamProjects.map((x) => x.id);
    if (ids.length === 0) return Response.json({ features: [] });

    const scope =
      projectId && projectId !== "all" && ids.includes(projectId)
        ? eq(features.projectId, projectId)
        : inArray(features.projectId, ids);

    const where = [scope];

    if (q) {
      const like = `%${q}%`;
      const noteHits = await db.select({ id: notes.featureId }).from(notes)
        .where(ilike(notes.body, like));
      const hitIds = [...new Set(noteHits.map((n) => n.id))];

      const parts = [
        ilike(features.title, like),
        sql`${features.answers}::text ilike ${like}`,
      ];
      if (hitIds.length) parts.push(inArray(features.id, hitIds));
      where.push(or(...parts)!);
    }

    const rows = await db.select({
      id: features.id, ref: features.ref, title: features.title, status: features.status,
      projectId: features.projectId, blocked: features.blocked, answers: features.answers,
      ownerName: features.ownerName, updatedAt: features.updatedAt,
    }).from(features).where(and(...where)).orderBy(desc(features.updatedAt));

    return Response.json({ features: rows });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const { projectId, title } = await req.json();
    if (!projectId || !title?.trim()) {
      return Response.json({ error: "projectId and title are required" }, { status: 400 });
    }
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
    const { user } = await requireMember(project.teamId);

    // Single atomic statement: per-project ref counter without a transaction,
    // which the Neon HTTP driver does not support interactively.
    const rows = (await neonSql`
      insert into features (project_id, ref, title, created_by, answers)
      select ${projectId}, coalesce(max(ref), 0) + 1, ${title.trim()}, ${user.name}, '{"check":[]}'::jsonb
      from features where project_id = ${projectId}
      returning id, ref
    `) as { id: string; ref: number }[];

    return Response.json({ feature: rows[0] });
  } catch (e) { return fail(e); }
}
