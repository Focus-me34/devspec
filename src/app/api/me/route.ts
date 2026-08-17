import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { requireUser, fail, HttpError } from "@/lib/guard";
import { createSession } from "@/lib/session";

/** An avatar is a data URL held in the row, so it has to stay small. Roughly
 *  256px of JPEG once the browser has resized it; this is the ceiling, not the
 *  target, and exists so a hand written request cannot park a megabyte here. */
const MAX_AVATAR_CHARS = 300_000;

function displayName(first: string | null, last: string | null, fallback: string) {
  const joined = [first, last].map((s) => s?.trim()).filter(Boolean).join(" ");
  return joined || fallback;
}

export async function GET() {
  try {
    const session = await requireUser();
    const [me] = await db.select({
      id: users.id, email: users.email, name: users.name,
      title: users.title, firstName: users.firstName, lastName: users.lastName,
      phone: users.phone, avatar: users.avatar, superAdmin: users.superAdmin,
    }).from(users).where(eq(users.id, session.userId)).limit(1);
    if (!me) throw new HttpError(404, "Account not found");
    return Response.json({ me });
  } catch (e) { return fail(e); }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireUser();
    const body = await req.json();

    const [existing] = await db.select().from(users)
      .where(eq(users.id, session.userId)).limit(1);
    if (!existing) throw new HttpError(404, "Account not found");

    const patch: Record<string, unknown> = {};
    if ("title" in body) patch.title = body.title?.trim() || null;
    if ("firstName" in body) patch.firstName = body.firstName?.trim() || null;
    if ("lastName" in body) patch.lastName = body.lastName?.trim() || null;
    if ("phone" in body) patch.phone = body.phone?.trim() || null;

    if ("avatar" in body) {
      const a = body.avatar;
      if (a === null || a === "") {
        patch.avatar = null;
      } else if (typeof a !== "string" || !a.startsWith("data:image/")) {
        return Response.json({ error: "That does not look like an image" }, { status: 400 });
      } else if (a.length > MAX_AVATAR_CHARS) {
        return Response.json({ error: "That image is too large" }, { status: 413 });
      } else {
        patch.avatar = a;
      }
    }

    // The email is the account identifier and the login, so it is not editable
    // here. Changing it needs a verification flow that does not exist yet.
    if ("email" in body && body.email !== existing.email) {
      return Response.json({ error: "Email cannot be changed" }, { status: 400 });
    }

    // A platform operator is shown under a fixed name everywhere, so saving
    // first and last must not quietly rename them back.
    if (!existing.superAdmin) {
      const first = (patch.firstName ?? existing.firstName) as string | null;
      const last = (patch.lastName ?? existing.lastName) as string | null;
      patch.name = displayName(first, last, existing.name);
    }

    const [updated] = await db.update(users).set(patch)
      .where(eq(users.id, session.userId)).returning();

    // The session carries the display name, so reissue it or the bar and any
    // note written next would keep showing the old one.
    if (updated.name !== existing.name) {
      await createSession({ userId: updated.id, email: updated.email, name: updated.name });
    }

    return Response.json({
      me: {
        id: updated.id, email: updated.email, name: updated.name,
        title: updated.title, firstName: updated.firstName, lastName: updated.lastName,
        phone: updated.phone, avatar: updated.avatar, superAdmin: updated.superAdmin,
      },
    });
  } catch (e) { return fail(e); }
}
