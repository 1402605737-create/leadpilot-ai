import type { Channel, ICP, Lead, OutreachDraft, ReplyType, ScoreBreakdown } from "./types.js";

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/** 根据 ICP 匹配、购买意向、企业规模和联系人质量进行确定性评分。 */
export function calculateLeadScore(lead: Lead, icp: ICP): ScoreBreakdown {
  const industry = icp.targetIndustries.includes(lead.industry) ? 20 : 7;
  const size = lead.employeeCount >= icp.companySizeRange[0] && lead.employeeCount <= icp.companySizeRange[1] ? 15 : 5;
  const region = icp.regions.includes(lead.region) ? 10 : 3;
  const title = icp.targetTitles.some((role) => lead.contactTitle.includes(role)) ? 10 : 4;
  const matchedSignals = lead.recentSignals.filter((signal) => icp.intentSignals.some((target) => signal.includes(target)));
  const fitScore = clamp(industry + size + region, 45);
  const intentScore = clamp(6 + matchedSignals.length * 7, 20);
  const urgencyScore = clamp(lead.recentSignals.some((signal) => /融资|扩招|合规|管理层|新市场/.test(signal)) ? 12 : 6, 15);
  const budgetScore = clamp(lead.employeeCount > 750 ? 10 : lead.employeeCount > 200 ? 7 : 4, 10);
  const contactabilityScore = clamp(title, 10);
  const dealPotentialScore = clamp(Math.round((fitScore + intentScore + budgetScore) / 7.5), 10);
  const totalScore = Math.round(fitScore + intentScore + urgencyScore + budgetScore + contactabilityScore);
  const grade = totalScore >= 80 ? "A" : totalScore >= 65 ? "B" : totalScore >= 45 ? "C" : "D";
  return {
    fitScore, intentScore, urgencyScore, budgetScore, contactabilityScore, dealPotentialScore, totalScore, grade,
    explanation: [
      `${lead.industry}${industry === 20 ? "符合" : "暂不属于"}当前 ICP 重点行业。`,
      `发现 ${matchedSignals.length} 个与当前模型匹配的购买意向信号。`,
      `${lead.contactTitle}${title >= 10 ? "可直接影响采购决策" : "需要进一步确认决策影响力"}。`,
      `${lead.employeeCount} 人的企业规模表明其预算潜力${budgetScore >= 7 ? "较高" : "有限"}。`
    ]
  };
}

/** 基于已知线索事实生成有证据支撑的客户情报。 */
export function generateAccountIntelligence(lead: Lead) {
  return {
    summary: `${lead.companyName}是一家位于${lead.region}的${lead.industry}企业，员工约 ${lead.employeeCount} 人。`,
    whyNow: `${lead.recentSignals.join("、")}构成了当前值得触达的明确时机。`,
    painPoints: lead.painPoints,
    decisionMakers: [lead.contactTitle, "营收运营负责人", "销售管理层"],
    likelyBudget: lead.annualRevenueRange,
    recommendedAngle: `展示受控 AI SDR 工作流如何缓解“${lead.painPoints[0]}”，并提升合格销售会议数量。`,
    objections: ["已有销售工具", "数据质量顾虑", "人工审核与合规要求"]
  };
}

/** 生成可编辑的触达草稿，不会发送或安排发送。 */
export function generateOutreachDraft(lead: Lead, targetRole: string, channel: Channel): OutreachDraft {
  const opening = `您好，我注意到${lead.companyName}近期正在${lead.recentSignals[0]}。`;
  const body = `${opening}\n\n处于这一阶段的团队经常反馈，“${lead.painPoints[0]}”会拖慢销售管道增长。LeadPilot 可以帮助${targetRole}团队识别高优先级客户、生成有证据支撑的触达草稿，并确保每次外部沟通都经过人工审核。\n\n类似的工作流能够减少销售研究时间，同时提升合格会议转化率。\n\n您下周是否方便用 15 分钟一起评估当前流程？`;
  return {
    id: `draft-${lead.id}-${Date.now()}`,
    leadId: lead.id,
    channel,
    targetRole,
    subject: channel.includes("Email") ? `${lead.companyName}的合格会议增长流程建议` : "",
    body,
    status: "Pending Human Review",
    createdAt: new Date().toISOString()
  };
}

/** 使用可审计的确定性规则分类常见 B2B 回复。 */
export function classifyReply(content: string): ReplyType {
  const value = content.toLowerCase();
  if (/out of office|on return|away until|休假|不在办公室|回来后/.test(value)) return "Auto Reply";
  if (/remove me|stop|not interested|unsubscribe|不感兴趣|不要再联系|停止|退订/.test(value)) return "Rejection";
  if (/not the right|speak with|refer|colleague|不是负责人|请联系|转给/.test(value)) return "Referral";
  if (/price|pricing|cost|quote|价格|报价|费用/.test(value)) return "Pricing Question";
  if (/how does|does the product|feature|integrat|如何|产品能|功能|集成/.test(value)) return "Product Question";
  if (/not a priority|check back|next quarter|later|暂时不|下季度|以后|九月份/.test(value)) return "Not Now";
  return "Interested";
}

/** 根据回复分类给出受控的下一步动作。 */
export function generateNextStep(type: ReplyType, lead: Lead) {
  const actions: Record<ReplyType, string> = {
    Interested: `为${lead.contactName}准备会议链接和简短议程。`,
    "Product Question": "基于证据生成回答草稿，并提交人工审核。",
    "Pricing Question": "请客户负责人确认产品组合与报价策略后再回复。",
    "Not Now": "将客户转入培育阶段，并设置结合上下文的后续跟进。",
    Rejection: "立即停止触达，并记录拒绝原因。",
    Referral: "创建被转介绍的联系人，并在触达前确认授权。",
    "Auto Reply": "根据对方返回日期延后跟进。"
  };
  return actions[type];
}

/** 生成聚焦需求发现与可衡量下一步的会议准备简报。 */
export function generateMeetingBrief(lead: Lead) {
  return {
    background: `${lead.companyName}是一家拥有约 ${lead.employeeCount} 名员工的${lead.industry}企业。`,
    likelyNeeds: lead.painPoints,
    questions: ["目前如何判断客户优先级？", "销售在哪个研究环节花费时间最多？", "团队如何记录人工审核过程？"],
    objections: ["我们已经在使用销售触达软件。", "AI 生成内容可能带来合规风险。"],
    handling: ["将 LeadPilot 定位为编排层，而不是 CRM 替代品。", "演示强制人工审核和审计日志。"],
    meetingGoal: "确认外呼工作流瓶颈，并就可衡量的试点达成一致。",
    nextStep: "选择一个客户分群开展两周试点，跟踪新增合格会议数量。"
  };
}

export function generateCRMUpdate(lead: Lead, notes: string) {
  return {
    leadId: lead.id,
    stageSuggestion: /meeting|calendar|thursday|next week|会议|日程|周四|下周/.test(notes) ? "Meeting Booked" : "Replied",
    painPoints: lead.painPoints,
    decisionMakers: [lead.contactName, lead.contactTitle],
    objections: ["已有工具", "合规审查"],
    nextStep: "确认负责人、时间与成功指标。",
    followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    summary: `${lead.companyName}：${notes}`
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
    pipelineGenerated: meetings * 300000,
    researchHoursSaved: Math.round(leads.length * 0.7),
    crmCompleteness: 92
  };
}
