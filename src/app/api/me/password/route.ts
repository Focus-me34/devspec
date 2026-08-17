import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireUser, fail, HttpError } from "@/lib/guard";

/** Changing a password requires proving you know the current one, so a
 *  borrowed session cannot lock the real owner out of their account. */
export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const { current, next, confirm } = await req.json();

    if (!current || !next || !confirm) {
      return Response.json({ error: "All three fields are required" }, { status: 400 });
    }
    if (next !== confirm) {
      return Response.json({ error: "The new passwords do not match" }, { status: 400 });
    }
    if (String(next).length < 8) {
      return Response.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }
    if (next === current) {
      return Response.json({ error: "That is already your password" }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (!user) throw new HttpError(404, "Account not found");

    if (!(await bcrypt.compare(String(current), user.passwordHash))) {
      return Response.json({ error: "Your current password is not right" }, { status: 403 });
    }

    await db.update(users)
      .set({ passwordHash: await bcrypt.hash(String(next), 10) })
      .where(eq(users.id, session.userId));

    return Response.json({ ok: true });
  } catch (e) { return fail(e); }
}
