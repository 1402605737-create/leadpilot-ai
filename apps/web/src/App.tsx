import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Activity, ArrowRight, BarChart3, Bot, Building2, Check, CheckCircle2, ChevronRight, CircleDollarSign,
  ClipboardCheck, Copy, Database, FileText, Gauge, Globe2, HelpCircle, Inbox, Languages, LayoutDashboard,
  ListFilter, MessageSquareText, Plus, RefreshCw, Search, Send, Settings2, ShieldCheck, Sparkles, Target, Users, X
} from "lucide-react";
import {
  calculateDashboardMetrics, calculateLeadScore, classifyReply, defaultICP, generateAccountIntelligence,
  generateCRMUpdate, generateMeetingBrief, generateNextStep, generateOutreachDraft, mockLeads, mockReplies,
  type AgentRun, type AuditEvent, type Channel, type ICP, type Lead, type OutreachDraft, type Reply
} from "@leadpilot/shared";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Page = "dashboard" | "leads" | "intelligence" | "scoring" | "outreach" | "replies" | "meeting" | "icp";
const API = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://leadpilot-ai-api.vercel.app" : "http://localhost:3000");
const channels: Channel[] = ["Cold Email", "LinkedIn", "Call Opener", "Follow-up Email"];
const roles = ["创始人", "销售副总裁", "市场负责人", "信息技术总监", "人力资源总监", "营收运营负责人"];
const weekly = [{ w: "第1周", v: 3 }, { w: "第2周", v: 4 }, { w: "第3周", v: 4 }, { w: "第4周", v: 6 }, { w: "第5周", v: 8 }, { w: "第6周", v: 11 }];
const funnel = [{ n: "新增线索", v: 22 }, { n: "已验证", v: 14 }, { n: "已回复", v: 8 }, { n: "已预约会议", v: 4 }];
const colors = ["#2563eb", "#38bdf8", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#64748b"];

const copy = {
  en: { dashboard: "Revenue Dashboard", leads: "Lead List", intelligence: "Account Intelligence", scoring: "Opportunity Scoring", outreach: "Outreach Studio", replies: "Reply Inbox", meeting: "Meeting Prep", icp: "ICP Settings", workspace: "WORKSPACE", workflow: "AGENT WORKFLOW", northstar: "Qualified Meetings Booked per Week", human: "Human review required" },
  zh: { dashboard: "收入看板", leads: "线索池", intelligence: "客户情报", scoring: "商机评分", outreach: "触达工作台", replies: "回复处理", meeting: "会议准备", icp: "ICP 设置", workspace: "工作空间", workflow: "AGENT 工作流", northstar: "每周新增合格销售会议数", human: "必须人工审核" }
};
const stageZh: Record<string, string> = { New: "新增", Researching: "调研中", Contacted: "已触达", Replied: "已回复", "Meeting Booked": "已预约会议", Nurture: "培育中", Disqualified: "已淘汰" };
const replyZh: Record<string, string> = { Interested: "感兴趣", "Product Question": "产品咨询", "Pricing Question": "价格咨询", "Not Now": "暂不考虑", Rejection: "拒绝", Referral: "转介绍", "Auto Reply": "自动回复" };
const channelZh: Record<Channel, string> = { "Cold Email": "冷启动邮件", LinkedIn: "领英私信", "Call Opener": "电话开场白", "Follow-up Email": "跟进邮件" };
const taskZh: Record<AgentRun["task"], string> = { account_intelligence:"客户研究", outreach:"触达草稿", reply_classification:"回复分类", meeting_brief:"会议准备", crm_update:"CRM 更新" };
const workflowPages: Page[] = ["leads", "intelligence", "scoring", "outreach", "replies", "meeting"];
const pageGuide: Record<Page, { purpose: string; input: string; output: string; next: string; nextPage?: Page }> = {
  dashboard: { purpose: "回答销售管道是否健康，以及本周应该优先处理什么。", input: "线索、回复、会议和 Agent 运行记录", output: "趋势、漏斗、核心指标与审计记录", next: "从高优先级线索开始", nextPage: "leads" },
  leads: { purpose: "从全部潜在客户中筛出最值得销售投入时间的客户。", input: "公司画像、购买信号、当前 ICP", output: "排序后的客户池与推荐动作", next: "打开客户并查看证据", nextPage: "intelligence" },
  intelligence: { purpose: "将零散客户信息整理成销售可直接使用的客户观点。", input: "企业画像、购买信号、痛点", output: "为什么现在、切入点、决策角色与异议", next: "检查评分依据", nextPage: "scoring" },
  scoring: { purpose: "解释为什么该客户值得优先跟进，而不是给出黑盒分数。", input: "ICP 匹配、意向、紧迫度和预算证据", output: "可解释优先级与逐项得分", next: "生成触达草稿", nextPage: "outreach" },
  outreach: { purpose: "根据客户证据生成个性化草稿，并强制人工审核。", input: "目标角色、渠道、客户证据", output: "可编辑且可审核的触达草稿", next: "处理客户回复", nextPage: "replies" },
  replies: { purpose: "识别客户回复意图，阻止违规跟进，并建议下一步。", input: "客户原始回复", output: "意图分类、风险判断与受控动作", next: "准备销售会议", nextPage: "meeting" },
  meeting: { purpose: "让销售带着客户观点、问题清单和下一步目标进入会议。", input: "客户情报、痛点与互动历史", output: "会议简报与 CRM 更新建议", next: "回到收入看板", nextPage: "dashboard" },
  icp: { purpose: "调整什么样的客户最值得投入，并立即观察评分变化。", input: "行业、地区、规模、角色和意向信号", output: "新的 ICP 与重新计算后的 A 级客户数", next: "查看重新排序的线索", nextPage: "leads" }
};

function useStored<T>(key: string, initial: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return initial; }
  });
  const update = (next: T) => { setValue(next); localStorage.setItem(key, JSON.stringify(next)); };
  return [value, update];
}

function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}

function PageGuide({ page, goTo }: { page: Page; goTo: (page: Page) => void }) {
  const guide = pageGuide[page];
  return <Card className="page-guide">
    <div className="guide-purpose"><HelpCircle size={16}/><div><strong>这个看板在做什么？</strong><p>{guide.purpose}</p></div></div>
    <div className="guide-io"><span>输入</span><strong>{guide.input}</strong></div>
    <ArrowRight size={15} className="guide-arrow"/>
    <div className="guide-io"><span>输出</span><strong>{guide.output}</strong></div>
    {guide.nextPage && <button className="btn primary" onClick={() => goTo(guide.nextPage!)}>{guide.next}<ArrowRight size={13}/></button>}
  </Card>;
}

function WorkflowRail({ page, goTo }: { page: Page; goTo: (page: Page) => void }) {
  return <div className="workflow-rail">
    <div className="workflow-label">可点击演示流程</div>
    {workflowPages.map((item, index) => <button key={item} className={`workflow-step ${page === item ? "active" : ""}`} onClick={() => goTo(item)}>
      <span>{index + 1}</span><strong>{copy.zh[item]}</strong>
    </button>)}
  </div>;
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [icp, setIcp] = useStored<ICP>("leadpilot-icp-v2", defaultICP);
  const [selectedId, setSelectedId] = useStored("leadpilot-selected-v2", mockLeads[0].id);
  const [drafts, setDrafts] = useStored<OutreachDraft[]>("leadpilot-drafts-v2", []);
  const [audits, setAudits] = useStored<AuditEvent[]>("leadpilot-audits-v2", []);
  const [reviewedDraftIds, setReviewedDraftIds] = useStored<string[]>("leadpilot-reviewed-v1", []);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [channel, setChannel] = useState<Channel>("Cold Email");
  const [role, setRole] = useState("销售副总裁");
  const [industry, setIndustry] = useState("全部");
  const [grade, setGrade] = useState("全部");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeReply, setActiveReply] = useState(mockReplies[0].id);
  const [advancedFilters, setAdvancedFilters] = useState(false);
  const [toast, setToast] = useState("");

  const leads = useMemo(() => mockLeads.map((lead) => {
    const score = calculateLeadScore(lead, icp);
    return { ...lead, score: score.totalScore, grade: score.grade };
  }), [icp]);
  const selected = leads.find((lead) => lead.id === selectedId) || leads[0];
  const score = calculateLeadScore(selected, icp);
  const intelligence = generateAccountIntelligence(selected);
  const meeting = generateMeetingBrief(selected);
  const metrics = calculateDashboardMetrics(leads, drafts.length, mockReplies);
  const draft = drafts.filter((item) => item.leadId === selected.id).at(-1);
  const activeReplyData = mockReplies.find((reply) => reply.id === activeReply) || mockReplies[0];
  const filtered = leads.filter((lead) => (industry === "全部" || lead.industry === industry) && (grade === "全部" || lead.grade === grade) && `${lead.companyName} ${lead.contactName}`.toLowerCase().includes(search.toLowerCase()));
  const t = copy.zh;

  useEffect(() => {
    fetch(`${API}/api/agent/runs`).then((r) => r.ok ? r.json() : { runs: [] }).then((d) => setRuns(d.runs || [])).catch(() => undefined);
  }, []);

  function audit(action: string, detail: string) {
    setAudits([{ id: crypto.randomUUID(), action, detail, createdAt: new Date().toISOString() }, ...audits].slice(0, 20));
    setToast(`${action}：${detail}`);
  }
  function makeDraft() {
    const next = generateOutreachDraft(selected, role, channel);
    setDrafts([...drafts, next]);
    audit("已生成触达草稿", `已为${selected.companyName}生成${channelZh[channel]}草稿，等待人工审核。`);
  }
  async function runAgent(task: AgentRun["task"]) {
    setBusy(true);
    try {
      const response = await fetch(`${API}/api/agent/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task, leadId: selected.id, channel, targetRole: role }) });
      const next = await response.json() as AgentRun;
      if (!response.ok) throw new Error("Agent request failed");
      setRuns([next, ...runs]);
      if (task === "outreach") {
        const result = next.result as Partial<OutreachDraft>;
        const generated = generateOutreachDraft(selected, role, channel);
        setDrafts([...drafts, { ...generated, subject: result.subject || generated.subject, body: result.body || generated.body }]);
      }
      audit("Agent 已运行", `已完成${selected.companyName}的智能任务；规则兜底=${next.fallback}。`);
    } catch {
      const local: AgentRun = { id: crypto.randomUUID(), task, leadId: selected.id, model: "确定性规则", fallback: true, status: "completed", evidence: selected.recentSignals, steps: ["验证任务", "收集本地证据", "运行确定性规则兜底", "要求人工审核"], result: task === "outreach" ? generateOutreachDraft(selected, role, channel) : generateAccountIntelligence(selected), createdAt: new Date().toISOString() };
      setRuns([local, ...runs]);
      audit("已完成规则兜底", `已完成${selected.companyName}的智能任务。`);
    } finally { setBusy(false); }
  }
  function chooseLead(id: string) { setSelectedId(id); setPage("intelligence"); }
  function resetFilters() { setIndustry("全部"); setGrade("全部"); setSearch(""); audit("筛选条件已重置", "正在显示全部客户。"); }
  async function copyDraftText() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft.body);
    audit("草稿已复制", `${selected.companyName}的草稿已复制到剪贴板。`);
  }
  function reviewDraft() {
    if (!draft || reviewedDraftIds.includes(draft.id)) return;
    setReviewedDraftIds([...reviewedDraftIds, draft.id]);
    audit("草稿已人工审核", `${selected.companyName}的${channelZh[draft.channel]}草稿已通过审核。`);
  }

  const nav: Array<[Page, ReactNode]> = [["dashboard", <LayoutDashboard size={15} />], ["leads", <Users size={15} />], ["intelligence", <Building2 size={15} />], ["scoring", <Gauge size={15} />], ["outreach", <Send size={15} />], ["replies", <Inbox size={15} />], ["meeting", <ClipboardCheck size={15} />], ["icp", <Settings2 size={15} />]];
  return <div className="shell">
    <aside className="sidebar">
      <div className="logo"><div className="logo-mark"><Target size={18} /></div>LeadPilot <span style={{ color: "#60a5fa" }}>AI</span></div>
      <div className="nav-group">{t.workspace}</div>
      {nav.slice(0, 2).map(([key, icon]) => <button className={`nav-item ${page === key ? "active" : ""}`} onClick={() => setPage(key)} key={key}>{icon}{t[key]}</button>)}
      <div className="nav-group">{t.workflow}</div>
      {nav.slice(2, 7).map(([key, icon]) => <button className={`nav-item ${page === key ? "active" : ""}`} onClick={() => setPage(key)} key={key}>{icon}{t[key]}</button>)}
      <div className="nav-group">配置</div>
      <button className={`nav-item ${page === "icp" ? "active" : ""}`} onClick={() => setPage("icp")}><Settings2 size={15} />{t.icp}</button>
      <div className="sidebar-bottom"><div><span className="status-dot" />安全护栏已启用</div><div style={{ color: "#607287", marginTop: 4 }}>禁止自动发送 · 审计日志已开启</div></div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><div className="eyebrow">LeadPilot / {t[page]}</div><div style={{ fontWeight: 760, color: "#172033", marginTop: 2 }}>{selected.companyName}<span className="pill blue" style={{ marginLeft: 8 }}>{selected.grade} · {selected.score}</span></div></div>
        <div className="toolbar">
          <span className="pill blue">中文交互演示版</span>
          <button className="btn" onClick={() => setPage("leads")}><Search size={13} />切换客户</button>
          <button className="btn primary" onClick={() => { setPage("intelligence"); void runAgent("account_intelligence"); }} disabled={busy}><Sparkles size={13} />{busy ? "运行中..." : "运行 AI Agent"}</button>
        </div>
      </header>
      <div className="content">
        <WorkflowRail page={page} goTo={setPage}/>
        <PageGuide page={page} goTo={setPage}/>
        {page === "dashboard" && <Dashboard metrics={metrics} t={t} runs={runs} audits={audits} goTo={setPage} runAgent={runAgent} busy={busy} selectedName={selected.companyName} />}
        {page === "leads" && <LeadList leads={filtered} industries={[...new Set(leads.map((x) => x.industry))]} filters={{ industry, grade, search }} setFilters={{ setIndustry, setGrade, setSearch }} chooseLead={chooseLead} advanced={advancedFilters} toggleAdvanced={() => setAdvancedFilters(!advancedFilters)} resetFilters={resetFilters} />}
        {page === "intelligence" && <Intelligence lead={selected} intelligence={intelligence} score={score} runAgent={runAgent} busy={busy} />}
        {page === "scoring" && <Scoring lead={selected} score={score} />}
        {page === "outreach" && <Outreach lead={selected} draft={draft} reviewed={Boolean(draft && reviewedDraftIds.includes(draft.id))} role={role} channel={channel} setRole={setRole} setChannel={setChannel} makeDraft={makeDraft} runAgent={runAgent} busy={busy} copyDraft={copyDraftText} reviewDraft={reviewDraft} />}
        {page === "replies" && <Replies replies={mockReplies} leads={leads} active={activeReplyData} setActive={setActiveReply} audit={audit} />}
        {page === "meeting" && <Meeting lead={selected} meeting={meeting} audit={audit} />}
        {page === "icp" && <IcpSettings icp={icp} setIcp={setIcp} leads={leads} audit={audit} />}
        {page !== "dashboard" && <AgentActivity runs={runs.filter((r) => r.leadId === selected.id)} />}
        <div className="footer-note">LeadPilot AI · 受控 AI SDR 工作流 · 每个外部动作都必须经过人工审核</div>
      </div>
    </main>
    {toast && <div className="toast"><CheckCircle2 size={17}/><span>{toast}</span><button onClick={() => setToast("")}><X size={14}/></button></div>}
  </div>;
}

function Dashboard({ metrics, t, runs, audits, goTo, runAgent, busy, selectedName }: { metrics: ReturnType<typeof calculateDashboardMetrics>; t: typeof copy.en; runs: AgentRun[]; audits: AuditEvent[]; goTo:(page:Page)=>void; runAgent:(task:AgentRun["task"])=>Promise<void>; busy:boolean; selectedName:string }) {
  const [meetingLift, setMeetingLift] = useState(35);
  const [closeRate, setCloseRate] = useState(24);
  const [avgDeal, setAvgDeal] = useState(300000);
  const baselineMeetings = Math.max(metrics.meetingsBooked * 4, 8);
  const agentMeetings = Math.round(baselineMeetings * (1 + meetingLift / 100));
  const baselineRevenue = Math.round(baselineMeetings * avgDeal * closeRate / 100);
  const agentRevenue = Math.round(agentMeetings * avgDeal * closeRate / 100);
  const cards: Array<[string, string | number, string, Page]> = [["线索总数", metrics.totalLeads, "点击查看客户池", "leads"], ["A 级线索", metrics.aGradeLeads, "点击查看优先客户", "leads"], ["积极回复", metrics.positiveReplies, "点击处理客户回复", "replies"], ["预计销售管道", `¥${(metrics.pipelineGenerated / 10000).toFixed(0)}万`, "点击查看会议转化", "meeting"]];
  const missions: Array<{task:AgentRun["task"];title:string;does:string;impact:string;page:Page}> = [
    { task:"account_intelligence", title:"客户研究 Agent", does:"汇总信号、痛点、决策角色和切入点", impact:`预计节省 ${metrics.researchHoursSaved} 小时调研`, page:"intelligence" },
    { task:"outreach", title:"触达草稿 Agent", does:"根据客户证据生成个性化草稿", impact:"提升回复质量，仍需人工审核", page:"outreach" },
    { task:"reply_classification", title:"回复分类 Agent", does:"识别意向、拒绝、转介绍和风险", impact:`已覆盖 ${metrics.repliesClassified} 条回复`, page:"replies" },
    { task:"meeting_brief", title:"会议准备 Agent", does:"生成问题清单、异议处理和会议目标", impact:"缩短会前准备时间", page:"meeting" },
    { task:"crm_update", title:"CRM 建议 Agent", does:"整理阶段、摘要、下一步和跟进日期", impact:`CRM 完整度目标 ${metrics.crmCompleteness}%`, page:"meeting" }
  ];
  const revenueData = [{ name:"当前基线", meetings:baselineMeetings, revenue:baselineRevenue }, { name:"启用 Agent", meetings:agentMeetings, revenue:agentRevenue }];
  return <>
    <div className="hero"><div><div className="hero-label">北极星指标</div><div className="title">{t.northstar}</div><div className="subtitle">衡量业务结果，而不是 AI 内容生成量。</div></div><div><div className="hero-number">11</div><div className="hero-label">较上周增长 37.5%</div></div></div>
    <div className="grid cols-4">{cards.map(([a, b, c, target]) => <button className="card metric-card metric-button" onClick={() => goTo(target)} key={a}><div className="metric-label">{a}</div><div className="metric-value">{b}</div><div className="delta">{c} <ChevronRight size={11}/></div></button>)}</div>
    <div className="grid cols-2" style={{ marginTop: 16 }}>
      <Card className="card-pad chart-card"><div className="section-title">合格会议趋势 <span className="pill green">进度正常</span></div><ResponsiveContainer width="100%" height={220}><AreaChart data={weekly}><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#eef2f7" vertical={false}/><XAxis dataKey="w" tickLine={false} axisLine={false} fontSize={10}/><YAxis tickLine={false} axisLine={false} fontSize={10}/><Tooltip/><Area dataKey="v" stroke="#2563eb" strokeWidth={2.5} fill="url(#area)"/></AreaChart></ResponsiveContainer></Card>
      <Card className="card-pad chart-card"><div className="section-title">线索阶段漏斗 <span className="pill blue">{metrics.sqlConversionRate}% SQL 转化率</span></div><ResponsiveContainer width="100%" height={220}><BarChart data={funnel}><CartesianGrid stroke="#eef2f7" vertical={false}/><XAxis dataKey="n" tickLine={false} axisLine={false} fontSize={10}/><YAxis tickLine={false} axisLine={false} fontSize={10}/><Tooltip/><Bar dataKey="v" radius={[5,5,0,0]} fill="#38bdf8"/></BarChart></ResponsiveContainer></Card>
    </div>
    <div className="grid cols-3" style={{marginTop:16}}>
      <Card className="card-pad revenue-controls">
        <div className="section-title">Agent 收益模拟器 <span className="pill blue">实时推演</span></div>
        <p className="section-copy">调整业务假设，观察 Agent 对月度会议、管道和收入的潜在增量。所有数值均为可解释估算。</p>
        <div className="range-row"><span>合格会议提升<strong>{meetingLift}%</strong></span><div className="range-control"><button aria-label="降低会议提升" onClick={()=>setMeetingLift(Math.max(0,meetingLift-5))}>−</button><input aria-label="合格会议提升" type="range" min="0" max="100" value={meetingLift} onInput={e=>setMeetingLift(Number(e.currentTarget.value))}/><button aria-label="提高会议提升" onClick={()=>setMeetingLift(Math.min(100,meetingLift+5))}>+</button></div></div>
        <div className="range-row"><span>成交率<strong>{closeRate}%</strong></span><div className="range-control"><button aria-label="降低成交率" onClick={()=>setCloseRate(Math.max(5,closeRate-1))}>−</button><input aria-label="成交率" type="range" min="5" max="60" value={closeRate} onInput={e=>setCloseRate(Number(e.currentTarget.value))}/><button aria-label="提高成交率" onClick={()=>setCloseRate(Math.min(60,closeRate+1))}>+</button></div></div>
        <div className="range-row"><span>平均客单价<strong>¥{(avgDeal/10000).toFixed(0)}万</strong></span><div className="range-control"><button aria-label="降低平均客单价" onClick={()=>setAvgDeal(Math.max(100000,avgDeal-50000))}>−</button><input aria-label="平均客单价" type="range" min="100000" max="1000000" step="50000" value={avgDeal} onInput={e=>setAvgDeal(Number(e.currentTarget.value))}/><button aria-label="提高平均客单价" onClick={()=>setAvgDeal(Math.min(1000000,avgDeal+50000))}>+</button></div></div>
        <div className="formula">计算公式：月度合格会议 × 平均客单价 × 成交率</div>
      </Card>
      <Card className="card-pad" style={{gridColumn:"span 2"}}>
        <div className="section-title">基线 vs Agent 方案 <span className="pill green">月增量收入 ¥{((agentRevenue-baselineRevenue)/10000).toFixed(1)}万</span></div>
        <div className="impact-strip"><div><span>月度合格会议</span><strong>{baselineMeetings} → {agentMeetings}</strong></div><div><span>预计月收入</span><strong>¥{(baselineRevenue/10000).toFixed(1)}万 → ¥{(agentRevenue/10000).toFixed(1)}万</strong></div><div><span>预计新增管道</span><strong>¥{((agentMeetings-baselineMeetings)*avgDeal/10000).toFixed(0)}万</strong></div></div>
        <ResponsiveContainer width="100%" height={190}><BarChart data={revenueData}><CartesianGrid stroke="#eef2f7" vertical={false}/><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10}/><YAxis tickLine={false} axisLine={false} fontSize={10}/><Tooltip formatter={(value:number, name:string)=>name==="revenue"?`¥${(value/10000).toFixed(1)}万`:value}/><Bar dataKey="revenue" name="预计收入" radius={[6,6,0,0]} fill="#2563eb"/></BarChart></ResponsiveContainer>
      </Card>
    </div>
    <Card className="card-pad" style={{marginTop:16}}>
      <div className="section-title">Agent 任务中枢 <span className="pill green"><Bot size={11}/>当前客户：{selectedName}</span></div>
      <p className="section-copy">Agent 不只是生成文字：它在每个销售阶段读取证据、完成固定任务、输出结构化结果，并将高风险动作交给人工审核。</p>
      <div className="agent-mission-grid">{missions.map(mission=>{const last=runs.find(run=>run.task===mission.task);return <div className="agent-mission" key={mission.task}><div className="mission-head"><div className="mission-icon"><Bot size={16}/></div><span className={`pill ${last?.fallback?"amber":last?"green":""}`}>{last?last.fallback?"规则兜底":"真实模型":"待运行"}</span></div><strong>{mission.title}</strong><p>{mission.does}</p><div className="mission-impact">{mission.impact}</div><div className="mission-actions"><button className="btn" onClick={()=>goTo(mission.page)}>查看工作台</button><button className="btn primary" disabled={busy} onClick={()=>void runAgent(mission.task)}>{busy?"运行中":"运行任务"}</button></div></div>})}</div>
    </Card>
    <div className="grid cols-2" style={{ marginTop: 16 }}>
      <Card className="card-pad"><div className="section-title">Agent 运行记录 <span className="pill">已记录 {runs.length} 次</span></div>{runs.slice(0,4).map((run) => <div className="insight" key={run.id}><strong>{run.task.replaceAll("_"," ")} · {run.model}</strong><p>{run.fallback ? "使用规则兜底" : "真实模型调用"} · {new Date(run.createdAt).toLocaleString()}</p></div>)}{!runs.length && <div className="empty">运行一次 AI 任务后，可在此查看受控执行轨迹。</div>}</Card>
      <Card className="card-pad"><div className="section-title">审计日志 <span className="pill green"><ShieldCheck size={10}/>已启用</span></div>{audits.slice(0,4).map((a) => <div className="insight" key={a.id}><strong>{a.action}</strong><p>{a.detail}</p></div>)}{!audits.length && <div className="empty">产品操作将记录在这里。</div>}</Card>
    </div>
  </>;
}

function LeadList({ leads, industries, filters, setFilters, chooseLead, advanced, toggleAdvanced, resetFilters }: { leads: Lead[]; industries: string[]; filters: { industry:string;grade:string;search:string}; setFilters: { setIndustry:(v:string)=>void;setGrade:(v:string)=>void;setSearch:(v:string)=>void}; chooseLead:(id:string)=>void; advanced:boolean; toggleAdvanced:()=>void; resetFilters:()=>void }) {
  return <><div className="title">高优先级客户池</div><div className="subtitle">基于证据的评分帮助销售聚焦最可能转化的客户。</div>
    <div className="filters" style={{ marginTop: 18 }}><input placeholder="搜索公司或联系人" value={filters.search} onChange={(e)=>setFilters.setSearch(e.target.value)} style={{ width: 240 }}/><select value={filters.industry} onChange={(e)=>setFilters.setIndustry(e.target.value)}><option>全部</option>{industries.map(i=><option key={i}>{i}</option>)}</select><select value={filters.grade} onChange={(e)=>setFilters.setGrade(e.target.value)}><option>全部</option>{["A","B","C","D"].map(i=><option key={i}>{i}</option>)}</select><button className={`btn ${advanced?"primary":""}`} onClick={toggleAdvanced}><ListFilter size={13}/>高级筛选</button><button className="btn ghost" onClick={resetFilters}><RefreshCw size={13}/>重置</button><span className="filter-count">找到 {leads.length} 家客户</span></div>
    {advanced&&<Card className="advanced-filter"><strong>快速业务筛选</strong><button onClick={()=>setFilters.setGrade("A")}>只看 A 级客户</button><button onClick={()=>setFilters.setGrade("B")}>只看 B 级客户</button><button onClick={()=>setFilters.setIndustry(industries[0])}>聚焦 {industries[0]}</button><span>筛选会即时更新客户池与后续工作流。</span></Card>}
    <Card className="table-wrap">{leads.length?<table><thead><tr><th>客户</th><th>联系人</th><th>购买信号</th><th>阶段</th><th>AI 评分</th><th>推荐动作</th></tr></thead><tbody>{leads.map(lead=><tr key={lead.id} onClick={()=>chooseLead(lead.id)}><td><div className="company">{lead.companyName}</div><div className="company-sub">{lead.industry} · {lead.region} · {lead.employeeCount} 人</div></td><td>{lead.contactName}<div className="company-sub">{lead.contactTitle}</div></td><td><div className="tag-list">{lead.recentSignals.slice(0,2).map(s=><span className="pill blue" key={s}>{s}</span>)}</div></td><td><span className="pill">{stageZh[lead.crmStage]}</span></td><td><span className={`pill ${lead.grade}`}>{lead.grade} · {lead.score}</span></td><td>{lead.grade === "A" ? "立即触达" : lead.grade === "B" ? "调研并个性化" : "进入培育"} <ChevronRight size={12} style={{display:"inline"}}/></td></tr>)}</tbody></table>:<div className="empty">没有符合当前条件的客户，请重置筛选条件。</div>}</Card></>;
}

function Intelligence({ lead, intelligence, score, runAgent, busy }: { lead:Lead; intelligence:ReturnType<typeof generateAccountIntelligence>;score:ReturnType<typeof calculateLeadScore>;runAgent:(t:AgentRun["task"])=>void;busy:boolean }) {
  return <><div className="account-header"><div className="account-logo">{lead.companyName.slice(0,2)}</div><div><div className="title">{lead.companyName}</div><div className="subtitle">{lead.industry} · {lead.region} · {lead.employeeCount} 人 · {lead.annualRevenueRange}</div></div><div style={{marginLeft:"auto"}}><button className="btn primary" onClick={()=>runAgent("account_intelligence")} disabled={busy}><Sparkles size={13}/>使用 AI 刷新</button></div></div>
  <div className="grid cols-3"><Card className="card-pad" style={{gridColumn:"span 2"}}><div className="section-title">为什么该客户值得跟进 <span className={`pill ${score.grade}`}>{score.grade} 级 · {score.totalScore}</span></div><div className="insight"><strong>客户概览</strong><p>{intelligence.summary}</p></div><div className="insight"><strong>为什么是现在</strong><p>{intelligence.whyNow}</p></div><div className="grid cols-2">{intelligence.painPoints.map(x=><div className="insight" key={x}><strong>已识别痛点</strong><p>{x}</p></div>)}</div><div className="insight"><strong>推荐切入点</strong><p>{intelligence.recommendedAngle}</p></div></Card>
  <Card className="card-pad"><div className="section-title">证据地图</div><div className="field-label">购买信号</div><div className="tag-list">{lead.recentSignals.map(s=><span className="tag" key={s}>{s}</span>)}</div><div className="field-label" style={{marginTop:18}}>决策角色</div><div className="tag-list">{intelligence.decisionMakers.map(s=><span className="tag" key={s}>{s}</span>)}</div><div className="field-label" style={{marginTop:18}}>可能异议</div>{intelligence.objections.map(x=><div className="insight" key={x}><p>{x}</p></div>)}</Card></div></>;
}

function Scoring({ lead, score }: {lead:Lead;score:ReturnType<typeof calculateLeadScore>}) {
  const rows = [["ICP 匹配",score.fitScore,45],["购买意向",score.intentScore,20],["紧迫度",score.urgencyScore,15],["预算潜力",score.budgetScore,10],["联系人质量",score.contactabilityScore,10],["商机潜力",score.dealPotentialScore,10]] as const;
  return <><div className="title">可解释商机评分</div><div className="subtitle">评分不使用随机数，每一分都对应客户证据和当前 ICP。</div><div className="grid cols-3" style={{marginTop:18}}><Card className="card-pad"><div className="section-title">总体优先级</div><div style={{display:"grid",placeItems:"center",padding:20}}><div className="score-ring" style={{"--score":`${score.totalScore}%`} as CSSProperties}><strong>{score.totalScore}</strong><span>{score.grade} 级</span></div></div><div className="notice"><ShieldCheck size={15}/>建议：{score.grade === "A" ? "立即生成需人工审核的触达草稿。" : "触达前继续收集更多证据。"}</div></Card><Card className="card-pad" style={{gridColumn:"span 2"}}><div className="section-title">评分维度 <span className="pill blue">已为{lead.companyName}重新计算</span></div>{rows.map(([n,v,max])=><div className="score-row" key={n}><span>{n}</span><div className="bar"><i style={{width:`${v/max*100}%`}}/></div><strong>{v}</strong></div>)}</Card></div><Card className="card-pad" style={{marginTop:16}}><div className="section-title">评分依据</div><div className="grid cols-2">{score.explanation.map((x,i)=><div className="insight" key={x}><strong>证据 {i+1}</strong><p>{x}</p></div>)}</div></Card></>;
}

function Outreach({ lead, draft, reviewed, role, channel, setRole, setChannel, makeDraft, runAgent, busy, copyDraft, reviewDraft }: {lead:Lead;draft?:OutreachDraft;reviewed:boolean;role:string;channel:Channel;setRole:(v:string)=>void;setChannel:(v:Channel)=>void;makeDraft:()=>void;runAgent:(t:AgentRun["task"])=>void;busy:boolean;copyDraft:()=>Promise<void>;reviewDraft:()=>void}) {
  return <><div className="title">人工审核触达工作台</div><div className="subtitle">将客户证据转化为相关话术，不进行自动发送。</div><div className="notice" style={{marginTop:16}}><ShieldCheck size={16}/>AI 仅生成触达草稿。每条消息发送前必须由销售人工审核，并遵守隐私、退订和反垃圾邮件规则。</div><div className="grid cols-3" style={{marginTop:16}}><Card className="card-pad"><div className="section-title">草稿设置</div><label className="field-label">客户</label><div className="field" style={{marginBottom:12}}>{lead.companyName}</div><label className="field-label">目标角色</label><select value={role} onChange={e=>setRole(e.target.value)} style={{width:"100%",marginBottom:12}}>{roles.map(x=><option key={x}>{x}</option>)}</select><label className="field-label">触达渠道</label><select value={channel} onChange={e=>setChannel(e.target.value as Channel)} style={{width:"100%",marginBottom:12}}>{channels.map(x=><option value={x} key={x}>{channelZh[x]}</option>)}</select><button className="btn dark" style={{width:"100%",justifyContent:"center"}} onClick={makeDraft}><FileText size={13}/>生成规则草稿</button><button className="btn primary" style={{width:"100%",justifyContent:"center",marginTop:8}} onClick={()=>runAgent("outreach")} disabled={busy}><Sparkles size={13}/>{busy?"Agent 运行中":"使用 DeepSeek 生成"}</button></Card><Card className="card-pad" style={{gridColumn:"span 2"}}><div className="section-title">可编辑草稿 <span className={`pill ${reviewed?"green":"amber"}`}>{draft ? reviewed?"已人工审核":"等待人工审核" : "尚未生成"}</span></div>{draft ? <><input value={draft.subject} readOnly style={{width:"100%",marginBottom:9}}/><textarea className="draft" defaultValue={draft.body}/><div className="toolbar" style={{marginTop:10}}><button className="btn" onClick={()=>void copyDraft()}><Copy size={13}/>复制</button><button className={`btn ${reviewed?"":"primary"}`} onClick={reviewDraft} disabled={reviewed}><Check size={13}/>{reviewed?"已审核":"标记为已审核"}</button></div></> : <div className="empty">请选择渠道并生成草稿，系统不会自动发送任何内容。</div>}</Card></div></>;
}

function Replies({replies,leads,active,setActive,audit}:{replies:Reply[];leads:Lead[];active:Reply;setActive:(id:string)=>void;audit:(a:string,d:string)=>void}) {
  const lead=leads.find(x=>x.id===active.leadId) || leads[0]; const type=classifyReply(active.content); const next=generateNextStep(type,lead);
  return <><div className="title">智能回复处理</div><div className="subtitle">识别客户意向、保护退订请求，并准备需要人工审核的下一步动作。</div><div className="grid cols-3" style={{marginTop:18}}><Card style={{overflow:"hidden"}}>{replies.map(r=><div className={`reply-card ${active.id===r.id?"active":""}`} onClick={()=>setActive(r.id)} key={r.id}><div className="company">{leads.find(x=>x.id===r.leadId)?.companyName}<span className={`pill ${r.classifiedType==="Rejection"?"red":r.classifiedType==="Interested"?"green":""}`} style={{float:"right"}}>{replyZh[r.classifiedType]}</span></div><div className="reply-content">{r.content}</div></div>)}</Card><Card className="card-pad" style={{gridColumn:"span 2"}}><div className="section-title">{lead.contactName} · {lead.companyName}<span className="pill blue">{replyZh[type]}</span></div><div className="insight"><strong>客户回复</strong><p>{active.content}</p></div><div className="insight"><strong>推荐受控动作</strong><p>{next}</p></div>{type==="Rejection"&&<div className="notice"><ShieldCheck size={15}/>高风险动作已阻止：该客户不得再收到后续触达。</div>}<textarea className="draft" style={{minHeight:140,marginTop:12}} defaultValue={`${lead.contactName}，您好：\n\n感谢您的回复。${next}\n\n祝好\n客户团队`}/><button className="btn primary" style={{marginTop:10}} onClick={()=>audit("回复动作已审核",`${replyZh[type]}：${next}`)}><Check size={13}/>保存下一步待审核动作</button></Card></div></>;
}

function Meeting({lead,meeting,audit}:{lead:Lead;meeting:ReturnType<typeof generateMeetingBrief>;audit:(a:string,d:string)=>void}) {
  const crm=generateCRMUpdate(lead,"客户表示愿意参加流程评估会议。");
  return <><div className="title">会议准备简报</div><div className="subtitle">为客户团队提供明确观点、需求发现计划和可衡量的下一步。</div><div className="grid cols-3" style={{marginTop:18}}><Card className="card-pad" style={{gridColumn:"span 2"}}><div className="section-title">需求发现简报 · {lead.companyName}<span className="pill green">可供审核</span></div><div className="insight"><strong>客户背景</strong><p>{meeting.background}</p></div><div className="grid cols-2"><div><div className="field-label">推荐提问</div><ul className="list">{meeting.questions.map(x=><li key={x}>{x}</li>)}</ul></div><div><div className="field-label">可能异议</div><ul className="list">{meeting.objections.map(x=><li key={x}>{x}</li>)}</ul></div></div><div className="insight"><strong>会议目标</strong><p>{meeting.meetingGoal}</p></div><div className="insight"><strong>下一步策略</strong><p>{meeting.nextStep}</p></div></Card><Card className="card-pad"><div className="section-title">CRM 更新模板</div><label className="field-label">建议阶段</label><div className="field">{stageZh[crm.stageSuggestion]}</div><label className="field-label" style={{marginTop:12}}>摘要</label><textarea className="draft" style={{minHeight:180}} defaultValue={crm.summary}/><button className="btn primary" style={{marginTop:10,width:"100%",justifyContent:"center"}} onClick={()=>audit("CRM 更新已审核",`${lead.companyName} → ${stageZh[crm.stageSuggestion]}`)}><Database size={13}/>标记为可写入 CRM</button></Card></div></>;
}

function IcpSettings({icp,setIcp,leads,audit}:{icp:ICP;setIcp:(i:ICP)=>void;leads:Lead[];audit:(a:string,d:string)=>void}) {
  const [draft,setDraft]=useState(icp); const matches=leads.filter(x=>calculateLeadScore(x,draft).grade==="A").length;
  function save(){setIcp(draft);audit("ICP 已更新",`当前共有 ${matches} 家 A 级客户。`)}
  return <><div className="title">理想客户画像</div><div className="subtitle">调整用于客户优先级判断的证据模型。</div><div className="grid cols-3" style={{marginTop:18}}><Card className="card-pad" style={{gridColumn:"span 2"}}><div className="section-title">ICP 条件 <span className="pill blue">确定性模型</span></div><div className="form-grid"><div><label className="field-label">目标行业</label><textarea className="draft" style={{minHeight:90}} value={draft.targetIndustries.join(", ")} onChange={e=>setDraft({...draft,targetIndustries:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></div><div><label className="field-label">目标地区</label><textarea className="draft" style={{minHeight:90}} value={draft.regions.join(", ")} onChange={e=>setDraft({...draft,regions:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></div><div><label className="field-label">最少员工数</label><input type="number" value={draft.companySizeRange[0]} onChange={e=>setDraft({...draft,companySizeRange:[Number(e.target.value),draft.companySizeRange[1]]})} style={{width:"100%"}}/></div><div><label className="field-label">最多员工数</label><input type="number" value={draft.companySizeRange[1]} onChange={e=>setDraft({...draft,companySizeRange:[draft.companySizeRange[0],Number(e.target.value)]})} style={{width:"100%"}}/></div><div><label className="field-label">目标职位</label><textarea className="draft" style={{minHeight:90}} value={draft.targetTitles.join(", ")} onChange={e=>setDraft({...draft,targetTitles:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></div><div><label className="field-label">意向信号</label><textarea className="draft" style={{minHeight:90}} value={draft.intentSignals.join(", ")} onChange={e=>setDraft({...draft,intentSignals:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></div></div><button className="btn primary" style={{marginTop:14}} onClick={save}><RefreshCw size={13}/>保存并重新评分</button></Card><Card className="card-pad"><div className="section-title">当前 ICP 摘要</div><div className="metric-value">{matches}</div><div className="delta muted">调整后的 A 级客户数</div><div className="field-label" style={{marginTop:20}}>重点行业</div><div className="tag-list">{draft.targetIndustries.map(x=><span className="tag" key={x}>{x}</span>)}</div><div className="field-label" style={{marginTop:20}}>护栏排除条件</div>{draft.exclusionRules.map(x=><div className="insight" key={x}><p>{x}</p></div>)}</Card></div></>;
}

function AgentActivity({runs}:{runs:AgentRun[]}) {
  const run=runs[0]; return <Card className="card-pad agent-activity" style={{marginTop:16}}><div className="section-title">Agent 执行详情 <span className={`pill ${run?.fallback?"amber":"green"}`}><Activity size={10}/>{run ? `${run.model} · ${run.fallback?"规则兜底":"真实模型"}` : "尚未运行"}</span></div>{run ? <><div className="agent-summary"><div><span>本次任务</span><strong>{taskZh[run.task]}</strong></div><div><span>Agent 的作用</span><strong>读取证据 → 完成固定任务 → 输出结构化建议</strong></div><div><span>人工边界</span><strong>外部触达与 CRM 写入仍需人工确认</strong></div></div><div className="grid cols-2"><div><div className="field-label">执行轨迹</div>{run.steps.map((x,i)=><div className="activity-step" key={x}><div className="step-dot">{i+1}</div><div>{x}</div></div>)}<div className="field-label" style={{marginTop:15}}>使用的证据</div><div className="tag-list">{run.evidence.slice(0,8).map(x=><span className="tag" key={x}>{x}</span>)}</div></div><div><div className="field-label">结构化结果</div><div className="json-result">{JSON.stringify(run.result,null,2)}</div></div></div></>:<div className="empty"><Bot size={24} style={{margin:"0 auto 8px"}}/>运行 AI 任务后，可查看执行轨迹、证据、结果、模型来源和人工边界。</div>}</Card>;
}
