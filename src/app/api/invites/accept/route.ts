import { db, teams, members } from "@/db";
import { and, eq } from "drizzle-orm";
import { readInvite } from "@/lib/invite";
import { requireUser, fail } from "@/lib/guard";

/** Join the team an invite points at. The team comes from inside the signed
 *  token, never from the request body, so a member cannot aim this at a team
 *  nobody invited them to. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { token } = await req.json();
    const invite = token ? await readInvite(token) : null;
    if (!invite) {
      return Response.json({ error: "This invite link is invalid or has expired" }, { status: 400 });
    }

    const [team] = await db.select().from(teams).where(eq(teams.id, invite.teamId)).limit(1);
    if (!team) return Response.json({ error: "That team no longer exists" }, { status: 404 });

    const [existing] = await db.select().from(members)
      .where(and(eq(members.teamId, team.id), eq(members.userId, user.userId))).limit(1);
    if (!existing) {
      await db.insert(members).values({ teamId: team.id, userId: user.userId, role: "member" });
    }
    return Response.json({ team: { id: team.id, name: team.name } });
  } catch (e) { return fail(e); }
}
