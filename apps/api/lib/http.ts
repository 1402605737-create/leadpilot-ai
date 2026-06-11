import type { VercelRequest, VercelResponse } from "@vercel/node";

export function applyCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  const configured = process.env.FRONTEND_ORIGIN;
  const localAllowed = process.env.NODE_ENV !== "production" && origin && /^http:\/\/localhost:\d+$/.test(origin);
  if (origin && (origin === configured || localAllowed)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader("Allow", allowed.join(", "));
  return res.status(405).json({ error: "method_not_allowed" });
}

