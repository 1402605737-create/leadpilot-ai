import type { VercelRequest, VercelResponse } from "@vercel/node";
import { defaultICP, mockLeads, mockReplies } from "@leadpilot/shared";
import { applyCors, methodNotAllowed } from "../lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") return methodNotAllowed(res, ["GET", "OPTIONS"]);
  return res.status(200).json({ leads: mockLeads, replies: mockReplies, defaultICP });
}
