import type { VercelRequest, VercelResponse } from "@vercel/node";
import { query } from "../lib/db.js";
import { applyCors, methodNotAllowed } from "../lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") return methodNotAllowed(res, ["GET", "OPTIONS"]);
  try {
    const result = await query<{ current_user: string; count: string }>(
      `select current_user,
        ((select count(*) from leadpilot.leads) + (select count(*) from leadpilot.ai_runs))::text as count`
    );
    return res.status(200).json({
      status: "ok",
      database: "postgres",
      database_connected: true,
      current_user: result.rows[0]?.current_user || "unknown",
      deepseek_configured: Boolean(process.env.DEEPSEEK_API_KEY),
      case_count: Number(result.rows[0]?.count || 0)
    });
  } catch (error) {
    return res.status(503).json({
      status: "degraded",
      database: "postgres",
      database_connected: false,
      current_user: "unavailable",
      deepseek_configured: Boolean(process.env.DEEPSEEK_API_KEY),
      case_count: 0,
      error: error instanceof Error ? error.message : "database_error"
    });
  }
}
