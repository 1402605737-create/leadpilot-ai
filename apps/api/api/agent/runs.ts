import type { VercelRequest, VercelResponse } from "@vercel/node";
import { query } from "../../lib/db";
import { applyCors, methodNotAllowed } from "../../lib/http";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") return methodNotAllowed(res, ["GET", "OPTIONS"]);
  try {
    const result = await query("select id, task, lead_id as \"leadId\", model, fallback, status, evidence, steps, result, created_at as \"createdAt\" from ai_runs order by created_at desc limit 20");
    return res.status(200).json({ runs: result.rows });
  } catch {
    return res.status(200).json({ runs: [] });
  }
}

