import { timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { mockLeads, mockReplies } from "@leadpilot/shared";
import { query } from "../../lib/db.js";
import { applyCors, methodNotAllowed } from "../../lib/http.js";

function tokenMatches(provided: string | undefined, expected: string | undefined) {
  if (!provided || !expected) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return methodNotAllowed(res, ["POST", "OPTIONS"]);
  if (!tokenMatches(req.headers["x-demo-admin-token"] as string | undefined, process.env.DEMO_ADMIN_TOKEN)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  for (const lead of mockLeads) {
    await query("update leadpilot.leads set payload = $2::jsonb where id = $1", [lead.id, JSON.stringify(lead)]);
  }
  for (const reply of mockReplies) {
    await query("update leadpilot.replies set lead_id = $2, payload = $3::jsonb where id = $1", [reply.id, reply.leadId, JSON.stringify(reply)]);
  }
  await query("delete from leadpilot.ai_runs");
  return res.status(200).json({ status: "ok", leads: mockLeads.length, replies: mockReplies.length, ai_runs: 0 });
}
