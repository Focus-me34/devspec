import { db, features, projects, activity, STATUSES } from "@/db";
import { eq } from "drizzle-orm";
import { requireMember, fail, HttpError } from "@/lib/guard";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { status } = await req.json();
    if (!STATUSES.includes(status)) {
      return Response.json({ error: "Unknown status" }, { status: 400 });
    }

    const [row] = await db.select({ f: features, teamId: projects.teamId })
      .from(features).innerJoin(projects, eq(features.projectId, projects.id))
      .where(eq(features.id, id)).limit(1);
    if (!row) throw new HttpError(404, "Feature not found");
    const { user } = await requireMember(row.teamId);

    // The Postgres trigger is the real gate. If the spec is incomplete this
    // update throws, and fail() turns it into a 409.
    const [updated] = await db.update(features)
      .set({ status, updatedAt: new Date() }).where(eq(features.id, id)).returning();

    await db.insert(activity).values({
      featureId: id, actorName: user.name, fromStatus: row.f.status, toStatus: status,
    });

    return Response.json({ feature: updated });
  } catch (e) { return fail(e); }
}
