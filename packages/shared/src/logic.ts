import type { Channel, ICP, Lead, OutreachDraft, ReplyType, ScoreBreakdown } from "./types";

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/** Scores a lead deterministically from ICP fit, intent evidence, scale and contact quality. */
export function calculateLeadScore(lead: Lead, icp: ICP): ScoreBreakdown {
  const industry = icp.targetIndustries.includes(lead.industry) ? 20 : 7;
  const size = lead.employeeCount >= icp.companySizeRange[0] && lead.employeeCount <= icp.companySizeRange[1] ? 15 : 5;
  const region = icp.regions.includes(lead.region) ? 10 : 3;
  const title = icp.targetTitles.some((role) => lead.contactTitle.toLowerCase().includes(role.toLowerCase())) ? 10 : 4;
  const matchedSignals = lead.recentSignals.filter((signal) => icp.intentSignals.some((target) => signal.toLowerCase().includes(target.toLowerCase())));
  const fitScore = clamp(industry + size + region, 45);
  const intentScore = clamp(6 + matchedSignals.length * 7, 20);
  const urgencyScore = clamp(lead.recentSignals.some((signal) => /funding|hiring|deadline|leadership/i.test(signal)) ? 12 : 6, 15);
  const budgetScore = clamp(lead.employeeCount > 750 ? 10 : lead.employeeCount > 200 ? 7 : 4, 10);
  const contactabilityScore = clamp(title, 10);
  const dealPotentialScore = clamp(Math.round((fitScore + intentScore + budgetScore) / 7.5), 10);
  const totalScore = Math.round(fitScore + intentScore + urgencyScore + budgetScore + contactabilityScore);
  const grade = totalScore >= 80 ? "A" : totalScore >= 65 ? "B" : totalScore >= 45 ? "C" : "D";
  return {
    fitScore,
    intentScore,
    urgencyScore,
    budgetScore,
    contactabilityScore,
    dealPotentialScore,
    totalScore,
    grade,
    explanation: [
      `${lead.industry} ${industry === 20 ? "matches" : "sits outside"} the current ICP focus.`,
      `${matchedSignals.length} intent signal(s) align with the active buying-signal model.`,
      `${lead.contactTitle} provides ${title >= 10 ? "direct" : "indirect"} access to a buying stakeholder.`,
      `${lead.employeeCount} employees indicates ${budgetScore >= 7 ? "credible" : "limited"} budget potential.`
    ]
  };
}

/** Produces a concise, evidence-backed account brief from known lead facts. */
export function generateAccountIntelligence(lead: Lead) {
  return {
    summary: `${lead.companyName} is a ${lead.employeeCount}-employee ${lead.industry} company in ${lead.region}.`,
    whyNow: `${lead.recentSignals.join(" and ")} create a timely reason to engage.`,
    painPoints: lead.painPoints,
    decisionMakers: [lead.contactTitle, "RevOps", "Sales leadership"],
    likelyBudget: lead.annualRevenueRange,
    recommendedAngle: `Show how a governed AI SDR workflow can reduce ${lead.painPoints[0]} while improving qualified meetings.`,
    objections: ["Existing sales tooling", "Data quality", "Human review and compliance"]
  };
}

/** Generates an editable outreach draft. It never sends or schedules delivery. */
export function generateOutreachDraft(lead: Lead, targetRole: string, channel: Channel): OutreachDraft {
  const opening = `I noticed ${lead.companyName} is seeing ${lead.recentSignals[0]}.`;
  const body = `${opening}\n\nTeams in that moment often tell us ${lead.painPoints[0]} becomes a drag on pipeline. LeadPilot helps ${targetRole} teams prioritize accounts, prepare evidence-backed outreach, and keep every send under human review.\n\nA similar workflow can give reps back research time while improving qualified meeting conversion.\n\nWould a focused 15-minute workflow review next week be useful?`;
  return {
    id: `draft-${lead.id}-${Date.now()}`,
    leadId: lead.id,
    channel,
    targetRole,
    subject: channel.includes("Email") ? `${lead.companyName}'s next qualified-meeting workflow` : "",
    body,
    status: "Pending Human Review",
    createdAt: new Date().toISOString()
  };
}

/** Classifies common B2B replies with deterministic, auditable rules. */
export function classifyReply(content: string): ReplyType {
  const value = content.toLowerCase();
  if (/out of office|on return|away until/.test(value)) return "Auto Reply";
  if (/remove me|stop|not interested|unsubscribe/.test(value)) return "Rejection";
  if (/not the right|speak with|refer|colleague/.test(value)) return "Referral";
  if (/price|pricing|cost|quote/.test(value)) return "Pricing Question";
  if (/how does|does the product|feature|integrat/.test(value)) return "Product Question";
  if (/not a priority|check back|next quarter|later/.test(value)) return "Not Now";
  return "Interested";
}

/** Returns the governed next action for a classified reply. */
export function generateNextStep(type: ReplyType, lead: Lead) {
  const actions: Record<ReplyType, string> = {
    Interested: `Prepare a meeting link and a short agenda for ${lead.contactName}.`,
    "Product Question": "Generate an answer draft with evidence, then route it for human review.",
    "Pricing Question": "Ask the account owner to confirm packaging and pricing before replying.",
    "Not Now": "Move the account to nurture and schedule a context-aware follow-up.",
    Rejection: "Stop outreach immediately and record the rejection reason.",
    Referral: "Create the referred contact and validate consent before outreach.",
    "Auto Reply": "Delay follow-up until the stated return date."
  };
  return actions[type];
}

/** Creates a meeting brief focused on discovery and a measurable next step. */
export function generateMeetingBrief(lead: Lead) {
  return {
    background: `${lead.companyName} operates in ${lead.industry} with ${lead.employeeCount} employees.`,
    likelyNeeds: lead.painPoints,
    questions: ["How is account prioritization handled today?", "Where do reps lose the most research time?", "How is human approval documented?"],
    objections: ["We already have sales engagement software.", "AI-generated outreach may create compliance risk."],
    handling: ["Position LeadPilot as an orchestration layer, not a CRM replacement.", "Demonstrate mandatory human review and audit logs."],
    meetingGoal: "Validate the outbound workflow bottleneck and agree on a measurable pilot.",
    nextStep: "Define a two-week pilot using one segment and track qualified meetings booked."
  };
}

export function generateCRMUpdate(lead: Lead, notes: string) {
  return {
    leadId: lead.id,
    stageSuggestion: /meeting|calendar|thursday|next week/i.test(notes) ? "Meeting Booked" : "Replied",
    painPoints: lead.painPoints,
    decisionMakers: [lead.contactName, lead.contactTitle],
    objections: ["Existing tooling", "Compliance review"],
    nextStep: "Confirm owner, date and success metric.",
    followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    summary: `${lead.companyName}: ${notes}`
  };
}

export function calculateDashboardMetrics(leads: Lead[], draftCount: number, replies: Array<{ classifiedType: ReplyType }>) {
  const meetings = leads.filter((lead) => lead.crmStage === "Meeting Booked").length;
  const positive = replies.filter((reply) => reply.classifiedType === "Interested").length;
  return {
    totalLeads: leads.length,
    aGradeLeads: leads.filter((lead) => lead.grade === "A").length,
    outreachDrafts: draftCount,
    repliesClassified: replies.length,
    positiveReplies: positive,
    meetingsBooked: meetings,
    sqlConversionRate: Math.round((meetings / Math.max(leads.length, 1)) * 100),
    pipelineGenerated: meetings * 42000,
    researchHoursSaved: Math.round(leads.length * 0.7),
    crmCompleteness: 92
  };
}

