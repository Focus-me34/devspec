import { db, projects, features } from "@/db";
import { eq, count } from "drizzle-orm";
import { requireMember, fail, HttpError } from "@/lib/guard";

/** Load first, then check membership against the team the row actually
 *  belongs to. Never trust a teamId from the request. */
async function load(id: string) {
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!row) throw new HttpError(404, "Project not found");
  return row;
}

/** Feature count, so the UI can say what a delete would take with it. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const project = await load(id);
    await requireMember(project.teamId);
    const [c] = await db.select({ n: count() }).from(features).where(eq(features.projectId, id));
    return Response.json({ project, featureCount: c.n });
  } catch (e) { return fail(e); }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const project = await load(id);
    await requireMember(project.teamId);
    const { name } = await req.json();
    if (!name?.trim()) return Response.json({ error: "name is required" }, { status: 400 });
    const [updated] = await db.update(projects).set({ name: name.trim() })
      .where(eq(projects.id, id)).returning();
    return Response.json({ project: updated });
  } catch (e) { return fail(e); }
}

/** Deleting a project cascades to its features, notes and activity. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const project = await load(id);
    await requireMember(project.teamId);
    await db.delete(projects).where(eq(projects.id, id));
    return Response.json({ ok: true });
  } catch (e) { return fail(e); }
}
