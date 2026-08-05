import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/** Connect lazily.
 *
 *  Reading DATABASE_URL at module scope breaks Next's "collecting page data"
 *  step, which imports every route module in an environment where the variable
 *  is not necessarily resolvable. That is what failed the first Vercel build.
 *  Both proxies below defer the env read and the connection to the first real
 *  query, so importing this file costs nothing. */

type Db = ReturnType<typeof drizzle<typeof schema>>;
type Sql = NeonQueryFunction<false, false>;

let _sql: Sql | null = null;
let _db: Db | null = null;

function client(): Sql {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = neon(url);
  }
  return _sql;
}

function database(): Db {
  if (!_db) _db = drizzle(client(), { schema });
  return _db;
}

/** Tagged template for raw SQL. The apply trap is what makes
 *  sql`select ...` work, the get trap covers the driver's own properties. */
export const sql = new Proxy(function () {} as unknown as Sql, {
  apply: (_t, _thisArg, args: Parameters<Sql>) => client()(...args),
  get: (_t, prop: keyof Sql) => client()[prop],
}) as Sql;

export const db = new Proxy({} as Db, {
  get: (_t, prop: keyof Db) => database()[prop],
}) as Db;

export * from "./schema";
