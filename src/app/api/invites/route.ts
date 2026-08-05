import { db, teams, members } from "@/db";
import { and, eq } from "drizzle-orm";
import { readInvite } from "@/lib/invite";
import { getSession } from "@/lib/session";
import { fail } from "@/lib/guard";

/** What team is this link for? Deliberately unauthenticated, because the
 *  person following the link has no account yet. Holding a valid signed token
 *  is the only thing it reveals a team name to. */
export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("t");
    const invite = token ? await readInvite(token) : null;
    if (!invite) {
      return Response.json({ error: "This invite link is invalid or has expired" }, { status: 400 });
    }
    const [team] = await db.select().from(teams).where(eq(teams.id, invite.teamId)).limit(1);
    if (!team) return Response.json({ error: "That team no longer exists" }, { status: 404 });

    // If they are already signed in and already in, say so rather than
    // showing them a join screen that would do nothing.
    const session = await getSession();
    let alreadyIn = false;
    if (session) {
      const [m] = await db.select().from(members)
        .where(and(eq(members.teamId, team.id), eq(members.userId, session.userId))).limit(1);
      alreadyIn = !!m;
    }
    return Response.json({ teamName: team.name, signedIn: !!session, alreadyIn });
  } catch (e) { return fail(e); }
}
