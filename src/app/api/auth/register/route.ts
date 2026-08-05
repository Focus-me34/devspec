import { db, users, teams, members, projects, signupAttempts } from "@/db";
import { eq, and, gt, count, lt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/session";
import { readInvite } from "@/lib/invite";
import { fail } from "@/lib/guard";

/** Registration is open by default. Set ALLOWED_EMAILS (comma separated) to
 *  close it to a fixed list. Read at request time, never at module scope:
 *  module level env access is what broke the first Vercel build. */
function emailAllowed(email: string) {
  const list = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.length === 0 || list.includes(email);
}

/** Signups allowed from one IP per hour, before the honeypot is even
 *  considered. Low enough to make bulk registration pointless, high enough
 *  that a team behind one office NAT can still all sign up. */
const PER_IP_PER_HOUR = 5;

function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  // Vercel appends, so the client is the first entry.
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** A browser always sends Origin on a same origin POST. A script usually does
 *  not bother, so this costs nothing and removes the laziest bots. */
function originOk(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, password, teamName, company, inviteToken } = body;

    // Honeypot. The field is hidden from people and left empty by them, so
    // anything in it means a bot filled the form in blind. Answer exactly like
    // a success so it has nothing to tune against.
    if (typeof company === "string" && company.trim() !== "") {
      return Response.json({ ok: true });
    }

    if (!originOk(req)) {
      return Response.json({ error: "Registration must come from the site" }, { status: 403 });
    }

    if (!email || !name || !password) {
      return Response.json({ error: "Email, name and password are required" }, { status: 400 });
    }
    if (String(password).length < 8) {
      return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const clean = String(email).trim().toLowerCase();

    // Resolved before the account is created, so a broken link fails cleanly
    // rather than leaving a user with no team.
    const invite = inviteToken ? await readInvite(inviteToken) : null;
    if (inviteToken && !invite) {
      return Response.json(
        { error: "This invite link is invalid or has expired" },
        { status: 400 },
      );
    }
    let invitedTeam: { id: string } | null = null;
    if (invite) {
      const [team] = await db.select({ id: teams.id }).from(teams)
        .where(eq(teams.id, invite.teamId)).limit(1);
      if (!team) return Response.json({ error: "That team no longer exists" }, { status: 404 });
      invitedTeam = team;
    }

    // Being invited is itself the permission, so the allowlist does not apply.
    if (!invitedTeam && !emailAllowed(clean)) {
      return Response.json(
        { error: "Registration is invite only. Ask an admin to add your address." },
        { status: 403 },
      );
    }

    // Rate limit per IP. Recorded before the account is created so failed
    // attempts count too, which is what stops an address enumeration loop.
    const ip = clientIp(req);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [recent] = await db.select({ n: count() }).from(signupAttempts)
      .where(and(eq(signupAttempts.ip, ip), gt(signupAttempts.createdAt, hourAgo)));
    if (recent.n >= PER_IP_PER_HOUR) {
      return Response.json(
        { error: "Too many accounts created from here. Try again in an hour." },
        { status: 429 },
      );
    }
    await db.insert(signupAttempts).values({ ip });
    // Opportunistic sweep, the table is a rate limit window and nothing else.
    await db.delete(signupAttempts)
      .where(lt(signupAttempts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

    const [existing] = await db.select().from(users).where(eq(users.email, clean)).limit(1);
    if (existing) return Response.json({ error: "That email is already registered" }, { status: 409 });

    const [user] = await db.insert(users).values({
      email: clean, name: String(name).trim(),
      passwordHash: await bcrypt.hash(String(password), 10),
    }).returning();

    if (invitedTeam) {
      // They were invited, so they join that team rather than starting one.
      await db.insert(members).values({ teamId: invitedTeam.id, userId: user.id, role: "member" });
    } else {
      const [team] = await db.insert(teams).values({ name: teamName?.trim() || `${user.name}'s team` }).returning();
      await db.insert(members).values({ teamId: team.id, userId: user.id, role: "admin" });
      await db.insert(projects).values({ teamId: team.id, name: "General" });
    }

    await createSession({ userId: user.id, email: user.email, name: user.name });
    return Response.json({ ok: true });
  } catch (e) { return fail(e); }
}
