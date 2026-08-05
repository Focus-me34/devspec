import { requireMember, fail } from "@/lib/guard";
import { signInvite, INVITE_DAYS } from "@/lib/invite";

/** Mint an invite link for a team. Admins only: a plain member should not be
 *  able to widen the team. Returns the token rather than a full URL so the
 *  client can build it from its own origin, which is right in both local
 *  development and production without another environment variable. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await requireMember(id, "admin");
    return Response.json({ token: await signInvite(id), expiresInDays: INVITE_DAYS });
  } catch (e) { return fail(e); }
}
