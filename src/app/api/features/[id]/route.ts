import { db, features, projects, notes, activity, members } from "@/db";
import { eq, asc } from "drizzle-orm";
import { requireMember, fail, HttpError } from "@/lib/guard";

async function load(id: string) {
  const [row] = await db.select({ f: features, teamId: projects.teamId, projectName: projects.name })
    .from(features).innerJoin(projects, eq(features.projectId, projects.id))
    .where(eq(features.id, id)).limit(1);
  if (!row) throw new HttpError(404, "Feature not found");
  return row;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const row = await load(id);
    await requireMember(row.teamId);
    const [ns, act, current] = await Promise.all([
      db.select().from(notes).where(eq(notes.featureId, id)).orderBy(asc(notes.createdAt)),
      db.select().from(activity).where(eq(activity.featureId, id)).orderBy(asc(activity.createdAt)),
      db.select({ userId: members.userId }).from(members).where(eq(members.teamId, row.teamId)),
    ]);

    // Only claim somebody has left when we actually know. Notes written before
    // author_id existed have none, and absence of evidence is not evidence.
    const inTeam = new Set(current.map((m) => m.userId));
    const withAuthors = ns.map((n) => ({
      ...n,
      authorLeft: n.authorId !== null && !inTeam.has(n.authorId),
    }));

    return Response.json({
      feature: row.f, projectName: row.projectName, notes: withAuthors, activity: act,
    });
  } catch (e) { return fail(e); }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const row = await load(id);
    await requireMember(row.teamId);
    const body = await req.json();

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();
    if ("ownerName" in body) patch.ownerName = body.ownerName || null;
    if ("branchUrl" in body) patch.branchUrl = body.branchUrl || null;
    if ("blocked" in body) patch.blocked = !!body.blocked;
    if ("blockedReason" in body) patch.blockedReason = body.blockedReason || null;
    if (body.answers && typeof body.answers === "object") {
      patch.answers = { ...row.f.answers, ...body.answers };
    }

    const [updated] = await db.update(features).set(patch).where(eq(features.id, id)).returning();
    return Response.json({ feature: updated });
  } catch (e) { return fail(e); }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const row = await load(id);
    await requireMember(row.teamId);
    await db.delete(features).where(eq(features.id, id));
    return Response.json({ ok: true });
  } catch (e) { return fail(e); }
}
