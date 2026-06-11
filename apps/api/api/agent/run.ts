import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { query } from "../../lib/db";
import { fallbackFor, runDeepSeek, validateAgentInput } from "../../lib/agent";
import { applyCors, methodNotAllowed } from "../../lib/http";

const recent = new Map<string, number>();
let lastGlobalRun = 0;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return methodNotAllowed(res, ["POST", "OPTIONS"]);
  if (Number(req.headers["content-length"] || 0) > 8000) return res.status(413).json({ error: "payload_too_large" });
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0];
  const last = recent.get(ip) || 0;
  if (Date.now() - last < 5000 || Date.now() - lastGlobalRun < 1500) return res.status(429).json({ error: "rate_limited" });
  recent.set(ip, Date.now());
  lastGlobalRun = Date.now();
  try {
    const { task, lead, channel, targetRole } = validateAgentInput(req.body);
    let fallback = false;
    let result: unknown;
    try {
      result = await runDeepSeek(task, lead, channel, targetRole);
    } catch {
      fallback = true;
      result = fallbackFor(task, lead, channel, targetRole);
    }
    const run = {
      id: randomUUID(),
      task,
      leadId: lead.id,
      model: fallback ? "deterministic-rules" : (process.env.DEEPSEEK_MODEL || "deepseek-chat"),
      fallback,
      status: "completed",
      evidence: [lead.industry, lead.region, ...lead.recentSignals, ...lead.painPoints],
      steps: ["Validate fixed task and account", "Collect account evidence", fallback ? "Run deterministic fallback" : "Call DeepSeek", "Apply human-review guardrail"],
      result,
      createdAt: new Date().toISOString()
    };
    await query("insert into leadpilot.ai_runs(id, task, lead_id, model, fallback, status, evidence, steps, result, created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [run.id, run.task, run.leadId, run.model, run.fallback, run.status, run.evidence, run.steps, run.result, run.createdAt]);
    return res.status(200).json(run);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "invalid_request" });
  }
}
