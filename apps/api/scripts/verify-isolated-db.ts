import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";

const connectionPath = join(tmpdir(), "leadpilot-deploy", "leadpilot-app-connection.tmp");
const metadataPath = join(tmpdir(), "leadpilot-deploy", "supabase-existing-project.txt");
const connectionString = (await readFile(connectionPath, "utf8")).trim();
const metadata = Object.fromEntries(
  (await readFile(metadataPath, "utf8"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    })
);
const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 8000
});

try {
  const identity = await pool.query("select current_database(), current_user");
  const counts = await pool.query("select (select count(*) from leadpilot.leads)::int as leads, (select count(*) from leadpilot.replies)::int as replies, (select count(*) from leadpilot.ai_runs)::int as ai_runs");
  if (identity.rows[0]?.current_user !== "leadpilot_app") throw new Error("Connected role is not leadpilot_app");
  let isolation = "No non-LeadPilot business table is visible to leadpilot_app";
  if (metadata.OTHER_TABLE) {
    if (!/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/i.test(metadata.OTHER_TABLE)) throw new Error("OTHER_TABLE must be a schema-qualified identifier");
    try {
      await pool.query(`select 1 from ${metadata.OTHER_TABLE} limit 0`);
      throw new Error(`Isolation failed: leadpilot_app can read ${metadata.OTHER_TABLE}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Isolation failed:")) throw error;
      isolation = `${metadata.OTHER_TABLE}: access denied as expected`;
    }
  } else {
    const visibleOtherTables = await pool.query(
      "select table_schema, table_name from information_schema.tables where table_schema not in ('leadpilot', 'pg_catalog', 'information_schema') and table_type = 'BASE TABLE' limit 1"
    );
    if (visibleOtherTables.rowCount) {
      const { table_schema: schema, table_name: table } = visibleOtherTables.rows[0];
      throw new Error(`Isolation failed: leadpilot_app can see ${schema}.${table}`);
    }
  }
  console.log(JSON.stringify({ identity: identity.rows[0], counts: counts.rows[0], isolation }, null, 2));
} finally {
  await pool.end();
}
