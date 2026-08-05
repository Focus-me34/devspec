import { SignJWT, jwtVerify } from "jose";

/** Invite links are a signed token and nothing else, so there is no invites
 *  table to keep in sync. The trade is that a link cannot be revoked before it
 *  expires, which is why the window is short. If revocation is ever needed,
 *  that is the moment to add the table, not before. */

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET!);

/** Distinguishes an invite from a session cookie. Both are signed with
 *  AUTH_SECRET, so without this one could be presented as the other. */
const SUBJECT = "invite";

export const INVITE_DAYS = 7;

export async function signInvite(teamId: string) {
  return new SignJWT({ teamId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(SUBJECT)
    .setIssuedAt()
    .setExpirationTime(`${INVITE_DAYS}d`)
    .sign(secret());
}

export async function readInvite(token: string): Promise<{ teamId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { subject: SUBJECT });
    const teamId = payload.teamId;
    return typeof teamId === "string" ? { teamId } : null;
  } catch {
    return null;
  }
}
