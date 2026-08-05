import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/session";
import { fail } from "@/lib/guard";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const clean = String(email ?? "").trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, clean)).limit(1);
    if (!user || !(await bcrypt.compare(String(password ?? ""), user.passwordHash))) {
      return Response.json({ error: "Wrong email or password" }, { status: 401 });
    }
    await createSession({ userId: user.id, email: user.email, name: user.name });
    return Response.json({ ok: true });
  } catch (e) { return fail(e); }
}
