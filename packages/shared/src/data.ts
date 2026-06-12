import type { ICP, Lead, Reply, ReplyType } from "./types.js";

export const defaultICP: ICP = {
  targetIndustries: ["企业软件", "网络安全", "数据分析", "AI 效率工具"],
  companySizeRange: [80, 1200],
  regions: ["中国华东", "中国华北", "中国华南", "亚太地区"],
  targetTitles: ["创始人", "销售副总裁", "市场负责人", "信息技术总监", "营收运营负责人"],
  intentSignals: ["扩招销售团队", "完成新一轮融资", "拓展新市场", "正在评估工具", "管理层变动"],
  exclusionRules: ["学生项目", "个人邮箱", "员工少于 20 人"]
};

const companies: Array<[string, string, string, number, string, string, Lead["crmStage"], string[], string[]]> = [
  ["云帆科技", "企业软件", "中国华东", 420, "陈美雅", "销售副总裁", "Researching", ["扩招销售团队", "管理层变动"], ["线索资格判断不一致", "客户研究耗时过长"]],
  ["哨兵智安", "网络安全", "中国华北", 780, "郭文博", "首席营收官", "Contacted", ["完成新一轮融资", "拓展新市场"], ["销售周期较长", "决策链复杂"]],
  ["人才春风", "人力资源科技", "中国华南", 260, "任雅诗", "市场负责人", "New", ["正在评估工具"], ["外呼回复率偏低", "个性化触达不足"]],
  ["跃账金融", "金融科技", "中国华东", 1100, "吴诺言", "销售副总裁", "Meeting Booked", ["管理层变动", "扩招销售团队"], ["CRM 数据分散", "销售新人上手较慢"]],
  ["信号工场", "营销科技", "中国华北", 340, "罗思佳", "营收运营总监", "Replied", ["拓展新市场"], ["线索优先级不清晰", "销售管道可见性不足"]],
  ["数湖智能", "数据分析", "中国华东", 640, "卜一凡", "创始人", "Researching", ["完成新一轮融资", "扩招销售团队"], ["客户研究效率偏低", "会议转化率不稳定"]],
  ["云霄运维", "云基础设施", "亚太地区", 1450, "谭立明", "信息技术总监", "Nurture", ["正在评估工具"], ["供应商工具过多", "安全审查周期长"]],
  ["商桥出海", "跨境电商服务", "中国华南", 190, "杜晓雯", "销售副总裁", "New", ["拓展新市场", "扩招销售团队"], ["区域规划困难", "回复处理不及时"]],
  ["知行学苑", "企业培训", "中国华北", 95, "金大伟", "创始人", "Contacted", ["管理层变动"], ["销售团队规模较小", "跟进依赖人工提醒"]],
  ["专注智能", "AI 效率工具", "中国华东", 530, "沙博雅", "市场负责人", "Researching", ["完成新一轮融资", "拓展新市场"], ["赛道竞争激烈", "价值主张同质化"]],
  ["云港协同", "企业软件", "中国华南", 880, "梅文轩", "销售副总裁", "Replied", ["扩招销售团队"], ["回复分拣耗时", "CRM 信息完整度不足"]],
  ["风图安全", "网络安全", "中国华东", 310, "李欣悦", "信息技术总监", "New", ["正在评估工具", "合规审查临近"], ["客户信任建立较慢", "技术异议较多"]],
  ["才环科技", "人力资源科技", "中国华北", 65, "柯涵", "创始人", "Nurture", ["拓展新市场"], ["销售产能有限", "市场分层不清晰"]],
  ["支付回路", "金融科技", "亚太地区", 980, "马俊杰", "营收运营总监", "Contacted", ["管理层变动", "完成新一轮融资"], ["销售预测质量不高", "部门交接摩擦"]],
  ["增长引擎", "营销科技", "中国华东", 225, "马静怡", "市场负责人", "Researching", ["正在评估工具"], ["个性化触达不足", "营销归因不完整"]],
  ["问数科技", "数据分析", "中国华南", 470, "马天乐", "销售副总裁", "Meeting Booked", ["拓展新市场", "扩招销售团队"], ["企业客户需求发现困难", "会前准备不充分"]],
  ["栈行云科", "云基础设施", "中国华北", 1320, "蒋米娅", "信息技术总监", "Disqualified", ["整合供应商"], ["采购流程复杂", "安全审查周期长"]],
  ["海贸通", "跨境电商服务", "亚太地区", 155, "林伟", "创始人", "New", ["完成新一轮融资"], ["新市场进入困难", "外呼流程难复制"]],
  ["企培云", "企业培训", "中国华东", 720, "沈安然", "销售副总裁", "Replied", ["扩招销售团队", "管理层变动"], ["销售人效偏低", "管道增长不稳定"]],
  ["简报智能", "AI 效率工具", "中国华北", 285, "王泽宇", "营收运营总监", "Researching", ["完成新一轮融资", "正在评估工具"], ["线索路由效率低", "销售内容质量不稳定"]],
  ["北辰咨询", "咨询服务", "中国华南", 48, "布依", "创始人", "Nurture", ["拓展新市场"], ["销售高度依赖创始人", "跟进节奏不稳定"]],
  ["无界增长", "跨境 B2B 服务", "亚太地区", 365, "贾睿", "销售副总裁", "Contacted", ["进入新市场", "扩招销售团队"], ["区域话术差异大", "会议转化率不稳定"]]
];

export const mockLeads: Lead[] = companies.map((company, index) => ({
  id: `lead-${String(index + 1).padStart(2, "0")}`,
  companyName: company[0],
  website: `https://lead-${String(index + 1).padStart(2, "0")}.example.com`,
  industry: company[1],
  region: company[2],
  employeeCount: company[3],
  annualRevenueRange: company[3] > 800 ? "人民币 5亿-20亿元" : company[3] > 300 ? "人民币 1亿-5亿元" : "人民币 2000万-1亿元",
  recentSignals: company[7],
  contactName: company[4],
  contactTitle: company[5],
  contactEmail: `contact${index + 1}@lead-${String(index + 1).padStart(2, "0")}.example.com`,
  crmStage: company[6],
  source: index % 2 ? "行业活动调研" : "产品意向信号",
  notes: `该团队正在评估如何提升${company[2]}市场的合格销售会议数量。`,
  painPoints: company[8]
}));

const replySeeds: Array<[number, string, ReplyType]> = [
  [0, "这个时机正合适，可以发一个下周的会议链接吗？", "Interested"],
  [1, "你们如何处理网络安全行业复杂的采购决策链？", "Product Question"],
  [2, "可以提供 12 人 SDR 团队的价格方案吗？", "Pricing Question"],
  [3, "这个季度暂时不考虑，请九月份再联系。", "Not Now"],
  [4, "谢谢，我们不感兴趣，请不要再联系我。", "Rejection"],
  [5, "我不是负责人，请联系我们的营收运营总监。", "Referral"],
  [6, "我休假到周一，回来后会回复。", "Auto Reply"],
  [7, "15 分钟的流程评估听起来不错，周四可以。", "Interested"],
  [8, "产品能在会议结束后自动生成 CRM 更新建议吗？", "Product Question"],
  [9, "我们已有类似流程，请停止后续触达。", "Rejection"]
];

export const mockReplies: Reply[] = replySeeds.map(([leadIndex, content, classifiedType], index) => ({
  id: `reply-${index + 1}`,
  leadId: mockLeads[leadIndex].id,
  content,
  classifiedType,
  sentiment: classifiedType === "Interested" ? "positive" : classifiedType === "Rejection" ? "negative" : "neutral",
  recommendedAction: ""
}));
