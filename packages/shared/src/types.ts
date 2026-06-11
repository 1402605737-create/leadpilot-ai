export type Grade = "A" | "B" | "C" | "D";
export type CrmStage = "New" | "Researching" | "Contacted" | "Replied" | "Meeting Booked" | "Nurture" | "Disqualified";
export type Channel = "Cold Email" | "LinkedIn" | "Call Opener" | "Follow-up Email";
export type ReplyType = "Interested" | "Product Question" | "Pricing Question" | "Not Now" | "Rejection" | "Referral" | "Auto Reply";
export type AgentTask = "account_intelligence" | "outreach" | "reply_classification" | "meeting_brief" | "crm_update";

export interface Lead {
  id: string;
  companyName: string;
  website: string;
  industry: string;
  region: string;
  employeeCount: number;
  annualRevenueRange: string;
  recentSignals: string[];
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  crmStage: CrmStage;
  source: string;
  notes: string;
  painPoints: string[];
  score?: number;
  grade?: Grade;
}

export interface ICP {
  targetIndustries: string[];
  companySizeRange: [number, number];
  regions: string[];
  targetTitles: string[];
  intentSignals: string[];
  exclusionRules: string[];
}

export interface ScoreBreakdown {
  fitScore: number;
  intentScore: number;
  urgencyScore: number;
  budgetScore: number;
  contactabilityScore: number;
  dealPotentialScore: number;
  totalScore: number;
  grade: Grade;
  explanation: string[];
}

export interface OutreachDraft {
  id: string;
  leadId: string;
  channel: Channel;
  targetRole: string;
  subject: string;
  body: string;
  status: "Draft" | "Pending Human Review";
  createdAt: string;
}

export interface Reply {
  id: string;
  leadId: string;
  content: string;
  classifiedType: ReplyType;
  sentiment: "positive" | "neutral" | "negative";
  recommendedAction: string;
  nextDraft?: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  task: AgentTask;
  leadId: string;
  model: string;
  fallback: boolean;
  status: "completed" | "failed";
  evidence: string[];
  steps: string[];
  result: unknown;
  createdAt: string;
}

