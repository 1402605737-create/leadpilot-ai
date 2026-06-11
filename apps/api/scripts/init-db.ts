import { ensureSchemaAndSeed, query } from "../lib/db";

await ensureSchemaAndSeed();
const identity = await query("select current_database(), current_user");
const counts = await query("select (select count(*) from leads)::int as leads, (select count(*) from replies)::int as replies");
console.log(JSON.stringify({ identity: identity.rows[0], counts: counts.rows[0] }, null, 2));

