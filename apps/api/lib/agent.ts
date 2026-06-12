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
const allowedRoles = ["创始人", "销售副总裁", "市场负责人", "信息技术总监", "人力资源总监", "营收运营负责人"];

export function validateAgentInput(value: unknown) {
  const input = (value ?? {}) as Record<string, unknown>;
  if (!allowedTasks.includes(input.task as AgentTask)) throw new Error("Unsupported task");
  const lead = mockLeads.find((item) => item.id === input.leadId);
  if (!lead) throw new Error("Unknown lead");
  if (input.channel && !allowedChannels.includes(input.channel as Channel)) throw new Error("Unsupported channel");
  if (input.targetRole && !allowedRoles.includes(input.targetRole as string) && input.targetRole !== lead.contactTitle) {
    throw new Error("Unsupported target role");
  }
  return { task: input.task as AgentTask, lead, channel: (input.channel as Channel) || "Cold Email", targetRole: (input.targetRole as string) || lead.contactTitle };
}

export function fallbackFor(task: AgentTask, lead: Lead, channel: Channel, targetRole: string) {
  if (task === "account_intelligence") return generateAccountIntelligence(lead);
  if (task === "outreach") return generateOutreachDraft(lead, targetRole, channel);
  if (task === "meeting_brief") return generateMeetingBrief(lead);
  if (task === "crm_update") return generateCRMUpdate(lead, "客户已表达会议意向，并完成初步资格确认。");
  return { classification: "Interested", nextAction: "准备一份需要人工审核的回复草稿。" };
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
        { role: "system", content: "你是 LeadPilot，一名受控的 B2B SDR 智能助手。必须使用简体中文返回简洁有效的 JSON。不得声称已经发送消息，每个触达动作都必须经过人工审核。" },
        { role: "user", content: JSON.stringify({ task, lead, channel, targetRole, required: "仅使用提供的客户证据，返回有用的中文结构化结果。" }) }
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
