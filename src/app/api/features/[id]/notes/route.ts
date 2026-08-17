import { db, features, projects, notes } from "@/db";
import { eq } from "drizzle-orm";
import { requireMember, fail, HttpError } from "@/lib/guard";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { body } = await req.json();
    if (!body?.trim()) return Response.json({ error: "Note is empty" }, { status: 400 });

    const [row] = await db.select({ teamId: projects.teamId })
      .from(features).innerJoin(projects, eq(features.projectId, projects.id))
      .where(eq(features.id, id)).limit(1);
    if (!row) throw new HttpError(404, "Feature not found");
    const { user } = await requireMember(row.teamId);

    const [note] = await db.insert(notes)
      .values({ featureId: id, authorId: user.userId, authorName: user.name, body: body.trim() })
      .returning();
    await db.update(features).set({ updatedAt: new Date() }).where(eq(features.id, id));

    return Response.json({ note });
  } catch (e) { return fail(e); }
}
