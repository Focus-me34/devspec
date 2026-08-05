import { db, users, teams, members, projects } from "@/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/session";
import { fail } from "@/lib/guard";

export async function POST(req: Request) {
  try {
    const { email, name, password, teamName } = await req.json();
    if (!email || !name || !password) {
      return Response.json({ error: "Email, name and password are required" }, { status: 400 });
    }
    if (String(password).length < 8) {
      return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const clean = String(email).trim().toLowerCase();
    const [existing] = await db.select().from(users).where(eq(users.email, clean)).limit(1);
    if (existing) return Response.json({ error: "That email is already registered" }, { status: 409 });

    const [user] = await db.insert(users).values({
      email: clean, name: String(name).trim(),
      passwordHash: await bcrypt.hash(String(password), 10),
    }).returning();

    const [team] = await db.insert(teams).values({ name: teamName?.trim() || `${user.name}'s team` }).returning();
    await db.insert(members).values({ teamId: team.id, userId: user.id, role: "admin" });
    await db.insert(projects).values({ teamId: team.id, name: "General" });

    await createSession({ userId: user.id, email: user.email, name: user.name });
    return Response.json({ ok: true });
  } catch (e) { return fail(e); }
}
