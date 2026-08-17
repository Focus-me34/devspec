import { db, members, users } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import { requireMember, fail } from "@/lib/guard";

/** Everyone in the team can see who else is in it. Managing them is admin
 *  only, which the sibling route enforces. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { user, member } = await requireMember(id);
    // Everything the person chose to fill in, so a colleague can call or write
    // to them from here rather than going hunting for it.
    const rows = await db.select({
      id: members.id,
      userId: members.userId,
      role: members.role,
      joinedAt: members.createdAt,
      name: users.name,
      email: users.email,
      title: users.title,
      phone: users.phone,
      avatar: users.avatar,
      superAdmin: users.superAdmin,
    })
      .from(members).innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.teamId, id))
      .orderBy(asc(members.createdAt));

    return Response.json({ members: rows, me: { userId: user.userId, role: member.role } });
  } catch (e) { return fail(e); }
}

/** Add someone who already has a DevSpec account. There is deliberately no way
 *  to create an account for them here: that needs a password only they should
 *  choose, which is what the invite link is for. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await requireMember(id, "admin");
    const { email } = await req.json();
    if (!email?.trim()) return Response.json({ error: "An email address is required" }, { status: 400 });

    const clean = String(email).trim().toLowerCase();
    const [u] = await db.select().from(users).where(eq(users.email, clean)).limit(1);
    if (!u) {
      return Response.json(
        { error: "Nobody with that address has an account yet. Send them an invite link instead." },
        { status: 404 },
      );
    }

    const [already] = await db.select().from(members)
      .where(and(eq(members.teamId, id), eq(members.userId, u.id))).limit(1);
    if (already) return Response.json({ error: "They are already in this team" }, { status: 409 });

    const [m] = await db.insert(members)
      .values({ teamId: id, userId: u.id, role: "member" }).returning();

    return Response.json({
      member: {
        id: m.id, userId: u.id, role: m.role, joinedAt: m.createdAt,
        name: u.name, email: u.email,
      },
    });
  } catch (e) { return fail(e); }
}
