import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Activity, BarChart3, Bot, Building2, Check, ChevronRight, CircleDollarSign, ClipboardCheck,
  Copy, Database, FileText, Gauge, Globe2, Inbox, Languages, LayoutDashboard, ListFilter,
  MessageSquareText, Plus, RefreshCw, Search, Send, Settings2, ShieldCheck, Sparkles, Target, Users
} from "lucide-react";
import {
  calculateDashboardMetrics, calculateLeadScore, classifyReply, defaultICP, generateAccountIntelligence,
  generateCRMUpdate, generateMeetingBrief, generateNextStep, generateOutreachDraft, mockLeads, mockReplies,
  type AgentRun, type AuditEvent, type Channel, type ICP, type Lead, type OutreachDraft, type Reply
} from "@leadpilot/shared";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Page = "dashboard" | "leads" | "intelligence" | "scoring" | "outreach" | "replies" | "meeting" | "icp";
type Lang = "en" | "zh";
const API = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://leadpilot-ai-api.vercel.app" : "http://localhost:3000");
const channels: Channel[] = ["Cold Email", "LinkedIn", "Call Opener", "Follow-up Email"];
const roles = ["CEO", "VP Sales", "Head of Marketing", "IT Director", "HR Director", "RevOps"];
const weekly = [{ w: "W1", v: 3 }, { w: "W2", v: 4 }, { w: "W3", v: 4 }, { w: "W4", v: 6 }, { w: "W5", v: 8 }, { w: "W6", v: 11 }];
const funnel = [{ n: "New", v: 22 }, { n: "Qualified", v: 14 }, { n: "Replied", v: 8 }, { n: "Meetings", v: 4 }];
const colors = ["#2563eb", "#38bdf8", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#64748b"];

const copy = {
  en: { dashboard: "Revenue Dashboard", leads: "Lead List", intelligence: "Account Intelligence", scoring: "Opportunity Scoring", outreach: "Outreach Studio", replies: "Reply Inbox", meeting: "Meeting Prep", icp: "ICP Settings", workspace: "WORKSPACE", workflow: "AGENT WORKFLOW", northstar: "Qualified Meetings Booked per Week", human: "Human review required" },
  zh: { dashboard: "收入看板", leads: "线索池", intelligence: "客户情报", scoring: "商机评分", outreach: "触达工作台", replies: "回复处理", meeting: "会议准备", icp: "ICP 设置", workspace: "工作空间", workflow: "AGENT 工作流", northstar: "每周新增合格销售会议数", human: "必须人工审核" }
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

export default function App() {
  const [lang, setLang] = useStored<Lang>("leadpilot-lang", "en");
  const [page, setPage] = useState<Page>("dashboard");
  const [icp, setIcp] = useStored<ICP>("leadpilot-icp", defaultICP);
  const [selectedId, setSelectedId] = useStored("leadpilot-selected", mockLeads[0].id);
  const [drafts, setDrafts] = useStored<OutreachDraft[]>("leadpilot-drafts", []);
  const [audits, setAudits] = useStored<AuditEvent[]>("leadpilot-audits", []);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [channel, setChannel] = useState<Channel>("Cold Email");
  const [role, setRole] = useState("VP Sales");
  const [industry, setIndustry] = useState("All");
  const [grade, setGrade] = useState("All");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeReply, setActiveReply] = useState(mockReplies[0].id);

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
  const filtered = leads.filter((lead) => (industry === "All" || lead.industry === industry) && (grade === "All" || lead.grade === grade) && `${lead.companyName} ${lead.contactName}`.toLowerCase().includes(search.toLowerCase()));
  const t = copy[lang];

  useEffect(() => {
    fetch(`${API}/api/agent/runs`).then((r) => r.ok ? r.json() : { runs: [] }).then((d) => setRuns(d.runs || [])).catch(() => undefined);
  }, []);

  function audit(action: string, detail: string) {
    setAudits([{ id: crypto.randomUUID(), action, detail, createdAt: new Date().toISOString() }, ...audits].slice(0, 20));
  }
  function makeDraft() {
    const next = generateOutreachDraft(selected, role, channel);
    setDrafts([...drafts, next]);
    audit("Draft generated", `${channel} draft for ${selected.companyName}; pending human review.`);
  }
  async function runAgent(task: AgentRun["task"]) {
    setBusy(true);
    try {
      const response = await fetch(`${API}/api/agent/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task, leadId: selected.id, channel, targetRole: role }) });
      const next = await response.json() as AgentRun;
      if (!response.ok) throw new Error("Agent request failed");
      setRuns([next, ...runs]);
      audit("Agent run completed", `${task} for ${selected.companyName}; fallback=${next.fallback}.`);
    } catch {
      const local: AgentRun = { id: crypto.randomUUID(), task, leadId: selected.id, model: "deterministic-rules", fallback: true, status: "completed", evidence: selected.recentSignals, steps: ["Validate task", "Collect local evidence", "Run deterministic fallback", "Require human review"], result: task === "outreach" ? generateOutreachDraft(selected, role, channel) : generateAccountIntelligence(selected), createdAt: new Date().toISOString() };
      setRuns([local, ...runs]);
      audit("Agent fallback completed", `${task} for ${selected.companyName}.`);
    } finally { setBusy(false); }
  }
  function chooseLead(id: string) { setSelectedId(id); setPage("intelligence"); }

  const nav: Array<[Page, ReactNode]> = [["dashboard", <LayoutDashboard size={15} />], ["leads", <Users size={15} />], ["intelligence", <Building2 size={15} />], ["scoring", <Gauge size={15} />], ["outreach", <Send size={15} />], ["replies", <Inbox size={15} />], ["meeting", <ClipboardCheck size={15} />], ["icp", <Settings2 size={15} />]];
  return <div className="shell">
    <aside className="sidebar">
      <div className="logo"><div className="logo-mark"><Target size={18} /></div>LeadPilot <span style={{ color: "#60a5fa" }}>AI</span></div>
      <div className="nav-group">{t.workspace}</div>
      {nav.slice(0, 2).map(([key, icon]) => <button className={`nav-item ${page === key ? "active" : ""}`} onClick={() => setPage(key)} key={key}>{icon}{t[key]}</button>)}
      <div className="nav-group">{t.workflow}</div>
      {nav.slice(2, 7).map(([key, icon]) => <button className={`nav-item ${page === key ? "active" : ""}`} onClick={() => setPage(key)} key={key}>{icon}{t[key]}</button>)}
      <div className="nav-group">CONFIGURATION</div>
      <button className={`nav-item ${page === "icp" ? "active" : ""}`} onClick={() => setPage("icp")}><Settings2 size={15} />{t.icp}</button>
      <div className="sidebar-bottom"><div><span className="status-dot" />Guardrails active</div><div style={{ color: "#607287", marginTop: 4 }}>No autonomous sending · Audit trail on</div></div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><div className="eyebrow">LeadPilot / {t[page]}</div><div style={{ fontWeight: 760, color: "#172033", marginTop: 2 }}>{selected.companyName}<span className="pill blue" style={{ marginLeft: 8 }}>{selected.grade} · {selected.score}</span></div></div>
        <div className="toolbar">
          <div className="switch"><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button><button className={lang === "zh" ? "active" : ""} onClick={() => setLang("zh")}>中文</button></div>
          <button className="btn" onClick={() => setPage("leads")}><Search size={13} />Switch account</button>
          <button className="btn primary" onClick={() => runAgent("account_intelligence")} disabled={busy}><Sparkles size={13} />{busy ? "Running..." : "Run AI Agent"}</button>
        </div>
      </header>
      <div className="content">
        {page === "dashboard" && <Dashboard metrics={metrics} t={t} runs={runs} audits={audits} />}
        {page === "leads" && <LeadList leads={filtered} industries={[...new Set(leads.map((x) => x.industry))]} filters={{ industry, grade, search }} setFilters={{ setIndustry, setGrade, setSearch }} chooseLead={chooseLead} />}
        {page === "intelligence" && <Intelligence lead={selected} intelligence={intelligence} score={score} runAgent={runAgent} busy={busy} />}
        {page === "scoring" && <Scoring lead={selected} score={score} />}
        {page === "outreach" && <Outreach lead={selected} draft={draft} role={role} channel={channel} setRole={setRole} setChannel={setChannel} makeDraft={makeDraft} runAgent={runAgent} busy={busy} />}
        {page === "replies" && <Replies replies={mockReplies} leads={leads} active={activeReplyData} setActive={setActiveReply} audit={audit} />}
        {page === "meeting" && <Meeting lead={selected} meeting={meeting} audit={audit} />}
        {page === "icp" && <IcpSettings icp={icp} setIcp={setIcp} leads={leads} audit={audit} />}
        {page !== "dashboard" && <AgentActivity runs={runs.filter((r) => r.leadId === selected.id)} />}
        <div className="footer-note">LeadPilot AI · Governed AI SDR workflow · Every external action requires human review</div>
      </div>
    </main>
  </div>;
}

function Dashboard({ metrics, t, runs, audits }: { metrics: ReturnType<typeof calculateDashboardMetrics>; t: typeof copy.en; runs: AgentRun[]; audits: AuditEvent[] }) {
  const cards = [["Total Leads", metrics.totalLeads, "+12% coverage"], ["A-grade Leads", metrics.aGradeLeads, "Ready to engage"], ["Positive Replies", metrics.positiveReplies, "20% reply rate"], ["Pipeline Generated", `$${(metrics.pipelineGenerated / 1000).toFixed(0)}K`, "Qualified estimate"]];
  return <>
    <div className="hero"><div><div className="hero-label">North star metric</div><div className="title">{t.northstar}</div><div className="subtitle">Measure outcomes, not AI output volume.</div></div><div><div className="hero-number">11</div><div className="hero-label">+37.5% vs last week</div></div></div>
    <div className="grid cols-4">{cards.map(([a, b, c]) => <Card className="metric-card" key={a}><div className="metric-label">{a}</div><div className="metric-value">{b}</div><div className="delta">{c}</div></Card>)}</div>
    <div className="grid cols-2" style={{ marginTop: 16 }}>
      <Card className="card-pad chart-card"><div className="section-title">Qualified meetings trend <span className="pill green">On track</span></div><ResponsiveContainer width="100%" height={220}><AreaChart data={weekly}><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#eef2f7" vertical={false}/><XAxis dataKey="w" tickLine={false} axisLine={false} fontSize={10}/><YAxis tickLine={false} axisLine={false} fontSize={10}/><Tooltip/><Area dataKey="v" stroke="#2563eb" strokeWidth={2.5} fill="url(#area)"/></AreaChart></ResponsiveContainer></Card>
      <Card className="card-pad chart-card"><div className="section-title">Lead stage funnel <span className="pill blue">{metrics.sqlConversionRate}% SQL rate</span></div><ResponsiveContainer width="100%" height={220}><BarChart data={funnel}><CartesianGrid stroke="#eef2f7" vertical={false}/><XAxis dataKey="n" tickLine={false} axisLine={false} fontSize={10}/><YAxis tickLine={false} axisLine={false} fontSize={10}/><Tooltip/><Bar dataKey="v" radius={[5,5,0,0]} fill="#38bdf8"/></BarChart></ResponsiveContainer></Card>
    </div>
    <div className="grid cols-2" style={{ marginTop: 16 }}>
      <Card className="card-pad"><div className="section-title">Agent operations <span className="pill">{runs.length} recorded</span></div>{runs.slice(0,4).map((run) => <div className="insight" key={run.id}><strong>{run.task.replaceAll("_"," ")} · {run.model}</strong><p>{run.fallback ? "Fallback rules used" : "Real model call"} · {new Date(run.createdAt).toLocaleString()}</p></div>)}{!runs.length && <div className="empty">Run an AI task to see the governed trace.</div>}</Card>
      <Card className="card-pad"><div className="section-title">Audit log <span className="pill green"><ShieldCheck size={10}/>Active</span></div>{audits.slice(0,4).map((a) => <div className="insight" key={a.id}><strong>{a.action}</strong><p>{a.detail}</p></div>)}{!audits.length && <div className="empty">Product actions will be recorded here.</div>}</Card>
    </div>
  </>;
}

function LeadList({ leads, industries, filters, setFilters, chooseLead }: { leads: Lead[]; industries: string[]; filters: { industry:string;grade:string;search:string}; setFilters: { setIndustry:(v:string)=>void;setGrade:(v:string)=>void;setSearch:(v:string)=>void}; chooseLead:(id:string)=>void }) {
  return <><div className="title">Prioritized account universe</div><div className="subtitle">Evidence-backed scoring keeps reps focused on accounts most likely to convert.</div>
    <div className="filters" style={{ marginTop: 18 }}><input placeholder="Search company or contact" value={filters.search} onChange={(e)=>setFilters.setSearch(e.target.value)} style={{ width: 240 }}/><select value={filters.industry} onChange={(e)=>setFilters.setIndustry(e.target.value)}><option>All</option>{industries.map(i=><option key={i}>{i}</option>)}</select><select value={filters.grade} onChange={(e)=>setFilters.setGrade(e.target.value)}><option>All</option>{["A","B","C","D"].map(i=><option key={i}>{i}</option>)}</select><button className="btn"><ListFilter size={13}/>Advanced filters</button></div>
    <Card className="table-wrap"><table><thead><tr><th>Account</th><th>Contact</th><th>Buying signals</th><th>Stage</th><th>AI score</th><th>Recommended action</th></tr></thead><tbody>{leads.map(lead=><tr key={lead.id} onClick={()=>chooseLead(lead.id)}><td><div className="company">{lead.companyName}</div><div className="company-sub">{lead.industry} · {lead.region} · {lead.employeeCount} employees</div></td><td>{lead.contactName}<div className="company-sub">{lead.contactTitle}</div></td><td><div className="tag-list">{lead.recentSignals.slice(0,2).map(s=><span className="pill blue" key={s}>{s}</span>)}</div></td><td><span className="pill">{lead.crmStage}</span></td><td><span className={`pill ${lead.grade}`}>{lead.grade} · {lead.score}</span></td><td>{lead.grade === "A" ? "Engage now" : lead.grade === "B" ? "Research & personalize" : "Nurture"} <ChevronRight size={12} style={{display:"inline"}}/></td></tr>)}</tbody></table></Card></>;
}

function Intelligence({ lead, intelligence, score, runAgent, busy }: { lead:Lead; intelligence:ReturnType<typeof generateAccountIntelligence>;score:ReturnType<typeof calculateLeadScore>;runAgent:(t:AgentRun["task"])=>void;busy:boolean }) {
  return <><div className="account-header"><div className="account-logo">{lead.companyName.slice(0,2).toUpperCase()}</div><div><div className="title">{lead.companyName}</div><div className="subtitle">{lead.industry} · {lead.region} · {lead.employeeCount} employees · {lead.annualRevenueRange}</div></div><div style={{marginLeft:"auto"}}><button className="btn primary" onClick={()=>runAgent("account_intelligence")} disabled={busy}><Sparkles size={13}/>Refresh with AI</button></div></div>
  <div className="grid cols-3"><Card className="card-pad" style={{gridColumn:"span 2"}}><div className="section-title">Why this account is worth pursuing <span className={`pill ${score.grade}`}>{score.grade}-grade · {score.totalScore}</span></div><div className="insight"><strong>Account overview</strong><p>{intelligence.summary}</p></div><div className="insight"><strong>Why now</strong><p>{intelligence.whyNow}</p></div><div className="grid cols-2">{intelligence.painPoints.map(x=><div className="insight" key={x}><strong>Observed pain</strong><p>{x}</p></div>)}</div><div className="insight"><strong>Recommended angle</strong><p>{intelligence.recommendedAngle}</p></div></Card>
  <Card className="card-pad"><div className="section-title">Evidence map</div><div className="field-label">Buying signals</div><div className="tag-list">{lead.recentSignals.map(s=><span className="tag" key={s}>{s}</span>)}</div><div className="field-label" style={{marginTop:18}}>Decision roles</div><div className="tag-list">{intelligence.decisionMakers.map(s=><span className="tag" key={s}>{s}</span>)}</div><div className="field-label" style={{marginTop:18}}>Likely objections</div>{intelligence.objections.map(x=><div className="insight" key={x}><p>{x}</p></div>)}</Card></div></>;
}

function Scoring({ lead, score }: {lead:Lead;score:ReturnType<typeof calculateLeadScore>}) {
  const rows = [["ICP fit",score.fitScore,45],["Intent",score.intentScore,20],["Urgency",score.urgencyScore,15],["Budget",score.budgetScore,10],["Contactability",score.contactabilityScore,10],["Deal potential",score.dealPotentialScore,10]] as const;
  return <><div className="title">Explainable opportunity score</div><div className="subtitle">No random numbers. Every point maps to account evidence and your active ICP.</div><div className="grid cols-3" style={{marginTop:18}}><Card className="card-pad"><div className="section-title">Overall priority</div><div style={{display:"grid",placeItems:"center",padding:20}}><div className="score-ring" style={{"--score":`${score.totalScore}%`} as CSSProperties}><strong>{score.totalScore}</strong><span>Grade {score.grade}</span></div></div><div className="notice"><ShieldCheck size={15}/>Recommended: {score.grade === "A" ? "Engage now with a human-reviewed draft." : "Gather more evidence before outreach."}</div></Card><Card className="card-pad" style={{gridColumn:"span 2"}}><div className="section-title">Score dimensions <span className="pill blue">Recomputed for {lead.companyName}</span></div>{rows.map(([n,v,max])=><div className="score-row" key={n}><span>{n}</span><div className="bar"><i style={{width:`${v/max*100}%`}}/></div><strong>{v}</strong></div>)}</Card></div><Card className="card-pad" style={{marginTop:16}}><div className="section-title">Scoring rationale</div><div className="grid cols-2">{score.explanation.map((x,i)=><div className="insight" key={x}><strong>Evidence {i+1}</strong><p>{x}</p></div>)}</div></Card></>;
}

function Outreach({ lead, draft, role, channel, setRole, setChannel, makeDraft, runAgent, busy }: {lead:Lead;draft?:OutreachDraft;role:string;channel:Channel;setRole:(v:string)=>void;setChannel:(v:Channel)=>void;makeDraft:()=>void;runAgent:(t:AgentRun["task"])=>void;busy:boolean}) {
  return <><div className="title">Human-reviewed outreach studio</div><div className="subtitle">Turn account evidence into relevant messaging without autonomous sending.</div><div className="notice" style={{marginTop:16}}><ShieldCheck size={16}/>AI only generates outreach drafts. A sales representative must review every message and comply with privacy, opt-out and anti-spam rules.</div><div className="grid cols-3" style={{marginTop:16}}><Card className="card-pad"><div className="section-title">Draft controls</div><label className="field-label">Account</label><div className="field" style={{marginBottom:12}}>{lead.companyName}</div><label className="field-label">Target role</label><select value={role} onChange={e=>setRole(e.target.value)} style={{width:"100%",marginBottom:12}}>{roles.map(x=><option key={x}>{x}</option>)}</select><label className="field-label">Channel</label><select value={channel} onChange={e=>setChannel(e.target.value as Channel)} style={{width:"100%",marginBottom:12}}>{channels.map(x=><option key={x}>{x}</option>)}</select><button className="btn dark" style={{width:"100%",justifyContent:"center"}} onClick={makeDraft}><FileText size={13}/>Generate rules-based draft</button><button className="btn primary" style={{width:"100%",justifyContent:"center",marginTop:8}} onClick={()=>runAgent("outreach")} disabled={busy}><Sparkles size={13}/>Generate with DeepSeek</button></Card><Card className="card-pad" style={{gridColumn:"span 2"}}><div className="section-title">Editable draft <span className="pill amber">{draft?.status || "Not generated"}</span></div>{draft ? <><input value={draft.subject} readOnly style={{width:"100%",marginBottom:9}}/><textarea className="draft" defaultValue={draft.body}/><div className="toolbar" style={{marginTop:10}}><button className="btn" onClick={()=>navigator.clipboard.writeText(draft.body)}><Copy size={13}/>Copy</button><button className="btn primary"><Check size={13}/>Mark reviewed</button></div></> : <div className="empty">Choose a channel and generate a draft. Nothing will be sent.</div>}</Card></div></>;
}

function Replies({replies,leads,active,setActive,audit}:{replies:Reply[];leads:Lead[];active:Reply;setActive:(id:string)=>void;audit:(a:string,d:string)=>void}) {
  const lead=leads.find(x=>x.id===active.leadId) || leads[0]; const type=classifyReply(active.content); const next=generateNextStep(type,lead);
  return <><div className="title">Reply intelligence inbox</div><div className="subtitle">Classify intent, protect opt-outs, and prepare the next human-reviewed step.</div><div className="grid cols-3" style={{marginTop:18}}><Card style={{overflow:"hidden"}}>{replies.map(r=><div className={`reply-card ${active.id===r.id?"active":""}`} onClick={()=>setActive(r.id)} key={r.id}><div className="company">{leads.find(x=>x.id===r.leadId)?.companyName}<span className={`pill ${r.classifiedType==="Rejection"?"red":r.classifiedType==="Interested"?"green":""}`} style={{float:"right"}}>{r.classifiedType}</span></div><div className="reply-content">{r.content}</div></div>)}</Card><Card className="card-pad" style={{gridColumn:"span 2"}}><div className="section-title">{lead.contactName} · {lead.companyName}<span className="pill blue">{type}</span></div><div className="insight"><strong>Inbound reply</strong><p>{active.content}</p></div><div className="insight"><strong>Recommended governed action</strong><p>{next}</p></div>{type==="Rejection"&&<div className="notice"><ShieldCheck size={15}/>High-risk action blocked: this account must not receive additional outreach.</div>}<textarea className="draft" style={{minHeight:140,marginTop:12}} defaultValue={`Hi ${lead.contactName.split(" ")[0]},\n\nThanks for the context. ${next}\n\nBest,\nYour account team`}/><button className="btn primary" style={{marginTop:10}} onClick={()=>audit("Reply action reviewed",`${type}: ${next}`)}><Check size={13}/>Save next step for review</button></Card></div></>;
}

function Meeting({lead,meeting,audit}:{lead:Lead;meeting:ReturnType<typeof generateMeetingBrief>;audit:(a:string,d:string)=>void}) {
  const crm=generateCRMUpdate(lead,"Customer expressed interest in a workflow review meeting.");
  return <><div className="title">Meeting preparation brief</div><div className="subtitle">Give the account team a point of view, a discovery plan, and a measurable next step.</div><div className="grid cols-3" style={{marginTop:18}}><Card className="card-pad" style={{gridColumn:"span 2"}}><div className="section-title">Discovery brief · {lead.companyName}<span className="pill green">Ready for review</span></div><div className="insight"><strong>Background</strong><p>{meeting.background}</p></div><div className="grid cols-2"><div><div className="field-label">Recommended questions</div><ul className="list">{meeting.questions.map(x=><li key={x}>{x}</li>)}</ul></div><div><div className="field-label">Likely objections</div><ul className="list">{meeting.objections.map(x=><li key={x}>{x}</li>)}</ul></div></div><div className="insight"><strong>Meeting goal</strong><p>{meeting.meetingGoal}</p></div><div className="insight"><strong>Next-step strategy</strong><p>{meeting.nextStep}</p></div></Card><Card className="card-pad"><div className="section-title">CRM update template</div><label className="field-label">Suggested stage</label><div className="field">{crm.stageSuggestion}</div><label className="field-label" style={{marginTop:12}}>Summary</label><textarea className="draft" style={{minHeight:180}} defaultValue={crm.summary}/><button className="btn primary" style={{marginTop:10,width:"100%",justifyContent:"center"}} onClick={()=>audit("CRM update reviewed",`${lead.companyName} → ${crm.stageSuggestion}`)}><Database size={13}/>Mark ready for CRM</button></Card></div></>;
}

function IcpSettings({icp,setIcp,leads,audit}:{icp:ICP;setIcp:(i:ICP)=>void;leads:Lead[];audit:(a:string,d:string)=>void}) {
  const [draft,setDraft]=useState(icp); const matches=leads.filter(x=>calculateLeadScore(x,draft).grade==="A").length;
  function save(){setIcp(draft);audit("ICP updated",`${matches} accounts now grade A.`)}
  return <><div className="title">Ideal customer profile</div><div className="subtitle">Adjust the evidence model that powers account prioritization across LeadPilot.</div><div className="grid cols-3" style={{marginTop:18}}><Card className="card-pad" style={{gridColumn:"span 2"}}><div className="section-title">ICP criteria <span className="pill blue">Deterministic model</span></div><div className="form-grid"><div><label className="field-label">Target industries</label><textarea className="draft" style={{minHeight:90}} value={draft.targetIndustries.join(", ")} onChange={e=>setDraft({...draft,targetIndustries:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></div><div><label className="field-label">Target regions</label><textarea className="draft" style={{minHeight:90}} value={draft.regions.join(", ")} onChange={e=>setDraft({...draft,regions:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></div><div><label className="field-label">Min employees</label><input type="number" value={draft.companySizeRange[0]} onChange={e=>setDraft({...draft,companySizeRange:[Number(e.target.value),draft.companySizeRange[1]]})} style={{width:"100%"}}/></div><div><label className="field-label">Max employees</label><input type="number" value={draft.companySizeRange[1]} onChange={e=>setDraft({...draft,companySizeRange:[draft.companySizeRange[0],Number(e.target.value)]})} style={{width:"100%"}}/></div><div><label className="field-label">Target titles</label><textarea className="draft" style={{minHeight:90}} value={draft.targetTitles.join(", ")} onChange={e=>setDraft({...draft,targetTitles:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></div><div><label className="field-label">Intent signals</label><textarea className="draft" style={{minHeight:90}} value={draft.intentSignals.join(", ")} onChange={e=>setDraft({...draft,intentSignals:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></div></div><button className="btn primary" style={{marginTop:14}} onClick={save}><RefreshCw size={13}/>Save & recalculate scores</button></Card><Card className="card-pad"><div className="section-title">Current ICP summary</div><div className="metric-value">{matches}</div><div className="delta muted">A-grade accounts after changes</div><div className="field-label" style={{marginTop:20}}>Focus</div><div className="tag-list">{draft.targetIndustries.map(x=><span className="tag" key={x}>{x}</span>)}</div><div className="field-label" style={{marginTop:20}}>Guardrail exclusions</div>{draft.exclusionRules.map(x=><div className="insight" key={x}><p>{x}</p></div>)}</Card></div></>;
}

function AgentActivity({runs}:{runs:AgentRun[]}) {
  const run=runs[0]; return <Card className="card-pad" style={{marginTop:16}}><div className="section-title">Agent Activity <span className={`pill ${run?.fallback?"amber":"green"}`}><Activity size={10}/>{run ? `${run.model} · fallback=${run.fallback}` : "No run yet"}</span></div>{run ? <div className="grid cols-2"><div><div className="field-label">Execution trace</div>{run.steps.map((x,i)=><div className="activity-step" key={x}><div className="step-dot">{i+1}</div><div>{x}</div></div>)}<div className="field-label" style={{marginTop:15}}>Evidence used</div><div className="tag-list">{run.evidence.slice(0,8).map(x=><span className="tag" key={x}>{x}</span>)}</div></div><div><div className="field-label">Structured result</div><div className="json-result">{JSON.stringify(run.result,null,2)}</div></div></div>:<div className="empty"><Bot size={24} style={{margin:"0 auto 8px"}}/>Run an AI task to inspect its trace, evidence, result and fallback status.</div>}</Card>;
}
