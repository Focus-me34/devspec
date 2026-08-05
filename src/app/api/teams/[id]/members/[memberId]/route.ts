import { db, members } from "@/db";
import { and, count, eq, ne } from "drizzle-orm";
import { requireMember, requireUser, fail, HttpError } from "@/lib/guard";

/** Load the membership and prove it belongs to the team in the URL, so a
 *  member id from one team cannot be operated on through another. */
async function load(teamId: string, memberId: string) {
  const [row] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!row || row.teamId !== teamId) throw new HttpError(404, "Member not found");
  return row;
}

/** A team with no admin can never be administered again, so the last one is
 *  not allowed to leave or be demoted. */
async function refuseIfLastAdmin(teamId: string, memberId: string, what: string) {
  const [others] = await db.select({ n: count() }).from(members)
    .where(and(eq(members.teamId, teamId), eq(members.role, "admin"), ne(members.id, memberId)));
  if (others.n === 0) {
    throw new HttpError(409, `A team needs at least one admin, so this one cannot be ${what}.`);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const { id, memberId } = await ctx.params;
    await requireMember(id, "admin");
    const target = await load(id, memberId);

    const { role } = await req.json();
    if (role !== "admin" && role !== "member") {
      return Response.json({ error: "Role must be admin or member" }, { status: 400 });
    }
    if (target.role === "admin" && role === "member") {
      await refuseIfLastAdmin(id, memberId, "demoted");
    }

    const [updated] = await db.update(members).set({ role })
      .where(eq(members.id, memberId)).returning();
    return Response.json({ member: updated });
  } catch (e) { return fail(e); }
}

/** Removes the membership, never the user account: they keep their login and
 *  any other team they belong to. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const { id, memberId } = await ctx.params;
    const user = await requireUser();
    const { member: me } = await requireMember(id);
    const target = await load(id, memberId);

    // Admins can remove anyone. Everyone else can only show themselves out.
    if (me.role !== "admin" && target.userId !== user.userId) {
      throw new HttpError(403, "Admins only");
    }
    if (target.role === "admin") await refuseIfLastAdmin(id, memberId, "removed");

    await db.delete(members).where(eq(members.id, memberId));
    return Response.json({ ok: true, wasSelf: target.userId === user.userId });
  } catch (e) { return fail(e); }
}
