import pg from "pg";
import { mockLeads, mockReplies } from "@leadpilot/shared";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]+/g, ""),
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 8000
});

try {
  const identity = await pool.query("select current_user");
  if (identity.rows[0]?.current_user !== "leadpilot_app") throw new Error("Only leadpilot_app may sync demo data");
  for (const lead of mockLeads) {
    await pool.query("update leadpilot.leads set payload = $2::jsonb where id = $1", [lead.id, JSON.stringify(lead)]);
  }
  for (const reply of mockReplies) {
    await pool.query("update leadpilot.replies set lead_id = $2, payload = $3::jsonb where id = $1", [reply.id, reply.leadId, JSON.stringify(reply)]);
  }
  const result = await pool.query("select (select count(*) from leadpilot.leads)::int as leads, (select count(*) from leadpilot.replies)::int as replies");
  console.log(JSON.stringify({ current_user: identity.rows[0].current_user, ...result.rows[0] }));
} finally {
  await pool.end();
}
