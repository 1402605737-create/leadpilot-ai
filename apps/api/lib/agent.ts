import {
  generateAccountIntelligence,
  generateCRMUpdate,
  generateMeetingBrief,
  generateOutreachDraft,
  mockLeads,
  type AgentTask,
  type Channel,
  type Lead
} from "@leadpilot/shared";

const allowedTasks: AgentTask[] = ["account_intelligence", "outreach", "reply_classification", "meeting_brief", "crm_update"];
const allowedChannels: Channel[] = ["Cold Email", "LinkedIn", "Call Opener", "Follow-up Email"];
const allowedRoles = ["CEO", "VP Sales", "Head of Marketing", "IT Director", "HR Director", "RevOps"];

export function validateAgentInput(value: unknown) {
  const input = (value ?? {}) as Record<string, unknown>;
  if (!allowedTasks.includes(input.task as AgentTask)) throw new Error("Unsupported task");
  const lead = mockLeads.find((item) => item.id === input.leadId);
  if (!lead) throw new Error("Unknown lead");
  if (input.channel && !allowedChannels.includes(input.channel as Channel)) throw new Error("Unsupported channel");
  if (input.targetRole && !allowedRoles.includes(input.targetRole as string)) throw new Error("Unsupported target role");
  return { task: input.task as AgentTask, lead, channel: (input.channel as Channel) || "Cold Email", targetRole: (input.targetRole as string) || lead.contactTitle };
}

export function fallbackFor(task: AgentTask, lead: Lead, channel: Channel, targetRole: string) {
  if (task === "account_intelligence") return generateAccountIntelligence(lead);
  if (task === "outreach") return generateOutreachDraft(lead, targetRole, channel);
  if (task === "meeting_brief") return generateMeetingBrief(lead);
  if (task === "crm_update") return generateCRMUpdate(lead, "Meeting interest and qualification discussed.");
  return { classification: "Interested", nextAction: "Prepare a human-reviewed reply draft." };
}

export async function runDeepSeek(task: AgentTask, lead: Lead, channel: Channel, targetRole: string) {
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!process.env.DEEPSEEK_API_KEY) throw new Error("DeepSeek is not configured");
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are LeadPilot, a governed B2B SDR copilot. Return concise valid JSON. Never claim to send messages. Every outreach action requires human review." },
        { role: "user", content: JSON.stringify({ task, lead, channel, targetRole, required: "Use only supplied account evidence and return a useful structured result." }) }
      ]
    }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`DeepSeek returned ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned no content");
  return JSON.parse(content);
}

