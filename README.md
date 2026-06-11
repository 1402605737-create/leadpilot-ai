# LeadPilot AI

**把冷线索转化为合格销售会议的、受控且可解释的 AI SDR Agent。**

**[GitHub](https://github.com/1402605737-create/leadpilot-ai) · [Live Demo](https://leadpilot-ai-web.vercel.app) · [API Health](https://leadpilot-ai-api.vercel.app/health)**

LeadPilot AI 面向中小型 B2B 销售团队，将线索评分、客户研究、个性化触达、回复分类、会议准备和 CRM 更新串成一个可审计工作流。产品不会自动发送外部消息；每个高风险动作都需要人工确认。

## 北极星指标

**Qualified Meetings Booked per Week / 每周新增合格销售会议数**

## 核心能力

- 8 个可操作模块：收入看板、线索池、客户情报、商机评分、触达工作台、回复处理、会议准备、ICP 设置。
- 22 条 B2B demo leads 与 10 条覆盖全部分类的 demo replies。
- 确定性评分与回复分类，可解释、可测试，不依赖随机数。
- DeepSeek 真实模型调用与规则 fallback；展示 Agent 轨迹、证据、结果和模型来源。
- 所有触达仅生成草稿，拒绝或退订意向会停止后续触达。
- React 状态保存到 localStorage；基础数据与 AI 调用记录保存到 Supabase Postgres。
- 数据库使用独立 `leadpilot` Schema 与最小权限 `leadpilot_app` 登录角色；生产 API 不执行 DDL。

## 本地运行

```bash
npm install
npm run dev
```

API 需要配置环境变量后从 monorepo 根目录运行：

```bash
vercel dev
```

完整验证：

```bash
npm run lint
npm test
npm run build
```

## 项目结构

```text
apps/web       React + TypeScript + Vite 前端
apps/api       Vercel Serverless API 与 Postgres 初始化脚本
api            Vercel 根级 Serverless 入口
packages/shared 数据类型、规则引擎和 demo 数据
docs           产品与指标文档
```

## 产品原则

- Human-in-the-loop：AI 只生成建议与草稿。
- Evidence before automation：Agent 结果显示其证据和执行轨迹。
- Outcome over activity：优化合格会议，而不是生成内容数量。
- Compliance by design：退订、拒绝和高风险动作有明确保护。

## 路线图

CRM 双向同步、邮箱与日历连接器、团队权限、实验与归因、企业级审计策略。
