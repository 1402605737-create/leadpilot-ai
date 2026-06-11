import type { ICP, Lead, Reply, ReplyType } from "./types";

export const defaultICP: ICP = {
  targetIndustries: ["SaaS", "Cybersecurity", "Data Analytics", "AI Productivity Tools"],
  companySizeRange: [80, 1200],
  regions: ["North America", "Europe", "APAC"],
  targetTitles: ["CEO", "VP Sales", "Head of Marketing", "IT Director", "RevOps"],
  intentSignals: ["hiring", "funding", "expansion", "tool evaluation", "new leadership"],
  exclusionRules: ["student project", "personal email", "fewer than 20 employees"]
};

const companies: Array<[string, string, string, number, string, string, string, string[], string[]]> = [
  ["Arcflow", "SaaS", "North America", 420, "Maya Chen", "VP Sales", "Researching", ["hiring SDRs", "new leadership"], ["inconsistent qualification", "slow account research"]],
  ["SentinelGrid", "Cybersecurity", "Europe", 780, "Oliver Grant", "Chief Revenue Officer", "Contacted", ["funding", "expansion"], ["long sales cycles", "complex buying committee"]],
  ["PeopleSpring", "HR Tech", "APAC", 260, "Aisha Raman", "Head of Marketing", "New", ["tool evaluation"], ["low outbound response", "limited personalization"]],
  ["LedgerLeap", "FinTech", "North America", 1100, "Noah Williams", "VP Sales", "Meeting Booked", ["new leadership", "hiring SDRs"], ["fragmented CRM data", "rep ramp time"]],
  ["SignalCraft", "Marketing Tech", "Europe", 340, "Sofia Rossi", "RevOps Director", "Replied", ["expansion"], ["lead prioritization", "pipeline visibility"]],
  ["MetricLake", "Data Analytics", "North America", 640, "Ethan Brooks", "CEO", "Researching", ["funding", "hiring AEs"], ["account research", "meeting conversion"]],
  ["NimbusOps", "Cloud Infrastructure", "APAC", 1450, "Liam Tan", "IT Director", "Nurture", ["tool evaluation"], ["vendor sprawl", "security review"]],
  ["CartBridge", "E-commerce Enablement", "Europe", 190, "Emma Dubois", "VP Sales", "New", ["expansion", "hiring SDRs"], ["territory planning", "reply handling"]],
  ["SkillForge", "Enterprise Training", "North America", 95, "Daniel Kim", "CEO", "Contacted", ["new leadership"], ["small sales team", "manual follow-up"]],
  ["FocusAI", "AI Productivity Tools", "APAC", 530, "Priya Shah", "Head of Marketing", "Researching", ["funding", "expansion"], ["crowded category", "message differentiation"]],
  ["CloudHarbor", "SaaS", "Europe", 880, "Lucas Meyer", "VP Sales", "Replied", ["hiring SDRs"], ["reply triage", "CRM completeness"]],
  ["RiskAtlas", "Cybersecurity", "North America", 310, "Grace Lee", "IT Director", "New", ["tool evaluation", "compliance deadline"], ["trust building", "technical objections"]],
  ["TalentLoop", "HR Tech", "Europe", 65, "Hannah Clark", "CEO", "Nurture", ["expansion"], ["limited sales capacity", "market segmentation"]],
  ["PayCircuit", "FinTech", "APAC", 980, "Arjun Mehta", "RevOps Director", "Contacted", ["new leadership", "funding"], ["forecast quality", "handoff friction"]],
  ["CampaignOS", "Marketing Tech", "North America", 225, "Ava Martinez", "Head of Marketing", "Researching", ["tool evaluation"], ["personalized outreach", "attribution gaps"]],
  ["QueryNest", "Data Analytics", "Europe", 470, "Theo Martin", "VP Sales", "Meeting Booked", ["expansion", "hiring AEs"], ["enterprise discovery", "meeting prep"]],
  ["StackPilot", "Cloud Infrastructure", "North America", 1320, "Mia Johnson", "IT Director", "Disqualified", ["vendor consolidation"], ["procurement complexity", "long security review"]],
  ["MarketPort", "E-commerce Enablement", "APAC", 155, "Wei Lin", "CEO", "New", ["funding"], ["new market entry", "repeatable outbound"]],
  ["AcademyPro", "Enterprise Training", "Europe", 720, "Amelia Smith", "VP Sales", "Replied", ["hiring SDRs", "new leadership"], ["rep productivity", "pipeline consistency"]],
  ["BrieflyAI", "AI Productivity Tools", "North America", 285, "James Wilson", "RevOps Director", "Researching", ["funding", "tool evaluation"], ["lead routing", "sales content quality"]],
  ["Northstar Labs", "Consulting Services", "Europe", 48, "Ella Brown", "CEO", "Nurture", ["expansion"], ["founder-led sales", "follow-up consistency"]],
  ["BorderlessIQ", "Cross-border B2B", "APAC", 365, "Ravi Kapoor", "VP Sales", "Contacted", ["new market entry", "hiring SDRs"], ["regional messaging", "meeting conversion"]]
];

export const mockLeads: Lead[] = companies.map((company, index) => ({
  id: `lead-${String(index + 1).padStart(2, "0")}`,
  companyName: company[0],
  website: `https://${company[0].toLowerCase().replace(/[^a-z]/g, "")}.example.com`,
  industry: company[1],
  region: company[2],
  employeeCount: company[3],
  annualRevenueRange: company[3] > 800 ? "$100M-$500M" : company[3] > 300 ? "$25M-$100M" : "$5M-$25M",
  recentSignals: company[7],
  contactName: company[4],
  contactTitle: company[5],
  contactEmail: `${company[4].split(" ")[0].toLowerCase()}@${company[0].toLowerCase().replace(/[^a-z]/g, "")}.example.com`,
  crmStage: company[6] as Lead["crmStage"],
  source: index % 2 ? "Event research" : "Product-led signal",
  notes: `The team is evaluating ways to improve qualified meeting creation in ${company[2]}.`,
  painPoints: company[8]
}));

const replySeeds: Array<[number, string, ReplyType]> = [
  [0, "This is timely. Can you send a calendar link for next week?", "Interested"],
  [1, "How does this work with a complex security buying committee?", "Product Question"],
  [2, "Can you share pricing for a team of twelve SDRs?", "Pricing Question"],
  [3, "Not a priority this quarter. Please check back in September.", "Not Now"],
  [4, "Thanks, but we are not interested. Please remove me.", "Rejection"],
  [5, "I am not the right owner. Please speak with our RevOps director.", "Referral"],
  [6, "I am out of office until Monday and will respond on return.", "Auto Reply"],
  [7, "The 15-minute workflow review sounds useful. Thursday works.", "Interested"],
  [8, "Does the product generate CRM updates after meetings?", "Product Question"],
  [9, "We already have a workflow in place, so please stop outreach.", "Rejection"]
];

export const mockReplies: Reply[] = replySeeds.map(([leadIndex, content, classifiedType], index) => ({
  id: `reply-${index + 1}`,
  leadId: mockLeads[leadIndex].id,
  content,
  classifiedType,
  sentiment: classifiedType === "Interested" ? "positive" : classifiedType === "Rejection" ? "negative" : "neutral",
  recommendedAction: ""
}));

