# Smart Farm — 农场盈亏计算器

> A simple, low-friction profit & breakeven calculator for U.S. Corn Belt farms.
> 为美国玉米带农场打造的、好上手的单作物盈亏 / 保本计算器。

---

## English

### What is Smart Farm?

Smart Farm (v1) is a **single-crop profit & breakeven calculator** for corn and soybean growers in the U.S. Corn Belt. A farmer enters a few numbers — yield, the cash price they can get locally, and their costs — and instantly sees **what price they need to break even, and whether they're in the black**.

The goal is simple: be **easier to use than the clunky spreadsheets farmers use today**, while getting the breakeven math right.

### How it works

```
Farmer input  →  Calc engine (pure TS functions)  →  Output (P&L · breakeven · sensitivity heatmap)
      ↑                                                            ↓
Backend GET /defaults (default values)              Backend save / load scenarios
```

- **The calculation engine is the frontend's job** (TypeScript, single source of truth). The backend does **not** compute margins — it only serves default values and stores scenarios. This keeps the sensitivity sliders instant and avoids two copies of the formula drifting apart.
- **Cash price is entered by hand.** v1 connects to no live market feed.

### What's in v1

| Area | v1 |
|------|----|
| Crops | Corn · Soybean (an `other` slot is reserved) |
| Input | Yield (APH or expected), **hand-entered cash price**, itemized costs (with editable regional defaults), land & machinery as a single `$/acre` number each |
| Output | Per-acre P&L card · breakeven price / yield · net margin · whole-farm dollar totals · **interactive price × yield sensitivity heatmap** · save / load scenarios |

### Explicitly NOT in v1

Live quotes / futures / basis, buy-sell signals, alerts, a decision cockpit, rotation advice, marketing logs, insurance, machinery depreciation engines, PDF reports. Machinery and land are **cost variables (one number)**, not appraisal modules — we never scrape TractorHouse / Sandhills.

The architecture stays extensible (more crops / regions / features later), but v1 doesn't pre-build for the future.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 · React 19 · TypeScript (`strict`) · Tailwind CSS 4 |
| Backend | Python (REST/JSON — `GET /defaults` + scenario persistence only) |
| Mocking | MSW (Mock Service Worker) |

### Getting Started

```bash
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

> The frontend ships with MSW mock data, so it runs standalone without the backend.

### Project Structure

```
smart-farm/
├── frontend/             # Next.js app (TypeScript) — owns input → calc → output
│   └── src/
│       ├── app/          # Route pages
│       ├── components/   # UI components by domain
│       ├── config/       # Crop & cost-model configuration (data-driven)
│       ├── lib/breakeven # Calc engine (pure TS — the authoritative implementation)
│       ├── lib/api/      # API client layer
│       ├── lib/mocks/    # MSW handlers & seed data
│       └── types/        # Shared TypeScript types
├── backend/              # Python backend (defaults + scenario store)
├── docs/v1-alignment.md  # v1 contract + calc conventions (source of truth)
└── tasks/                # API contracts & planning docs
```

### Design Principles

1. **Local cash price is king** — breakeven is always compared against the farmer's hand-entered local cash price, **never** a futures quote.
2. **Low-friction cost entry is the moat** — pre-fill defaults, reuse last season, edit only what changed. Fewer fields = more farmers finish.
3. **The calc engine lives in the frontend** — one implementation, instant recompute, no backend round-trip for the sensitivity grid.
4. **Data-driven** — adding a crop, region, or cost item is a config change, not a code branch.
5. **No scraping** — machinery is a `$/acre` cost the farmer types in (or a backend reference range), not an appraisal.

---

## 中文版

### Smart Farm 是什么?

Smart Farm(v1)是一个面向美国玉米带玉米 / 大豆种植户的**单作物盈亏 / 保本计算器**。农户填几个数 —— 单产、本地能拿到的现金价、各项成本 —— 就立刻知道**作物得卖到多少钱才保本、现在是盈是亏**。

目标很直接:做一个**比农户现在用的笨重表格更好上手**的工具,同时把保本这笔账算对。

### 怎么运作

```
农户录入  →  计算引擎(纯 TS 函数)  →  输出(损益 · 保本价 · 敏感性热力图)
   ↑                                                ↓
后端 GET /defaults(默认值)                    后端 存 / 读场景
```

- **计算引擎是前端的活**(TypeScript,唯一真理源)。后端**不算 margin**,只下发默认值 + 存读场景。这样敏感性拖动条能实时重算,也避免 TS / Python 两份公式飘掉。
- **现金价是农户手填的。** v1 不接任何实时行情。

### v1 做什么

| 方面 | v1 |
|------|----|
| 作物 | 玉米 · 大豆(预留一个 `other` 槽) |
| 录入 | 单产(APH 或预期)、**手填现金价**、各项成本(带可改的地区默认值)、土地 / 农机各一个可填的 `$/acre` 数字 |
| 输出 | 每英亩损益卡 · 保本价 / 保本单产 · 净 margin · 整场美元汇总 · **交互式价格 × 单产敏感性热力图** · 存 / 读场景 |

### v1 明确不做

行情 / 期货 / basis、卖买信号、预警、决策驾驶舱、轮作建议、营销 log、保险、农机折旧引擎、PDF 报告。农机与土地是**成本变量(一个数字)**,不是估值模块 —— 绝不爬 TractorHouse / Sandhills。

架构保持可扩展(以后会加作物 / 地区 / 功能),但 v1 不提前为未来铺摊子。

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 · React 19 · TypeScript(`strict`)· Tailwind CSS 4 |
| 后端 | Python(REST/JSON —— 仅 `GET /defaults` + 场景持久化) |
| 接口 Mock | MSW(Mock Service Worker) |

### 快速开始

```bash
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

> 前端内置 MSW mock 数据,无需后端即可独立运行。

### 项目结构

```
smart-farm/
├── frontend/             # Next.js 前端 —— 拥有 录入 → 计算 → 输出 全链路
│   └── src/
│       ├── app/          # 路由页面
│       ├── components/   # 按业务域划分的 UI 组件
│       ├── config/       # 作物 & 成本模型配置(数据驱动)
│       ├── lib/breakeven # 计算引擎(纯 TS —— 唯一权威实现)
│       ├── lib/api/      # API 客户端封装层
│       ├── lib/mocks/    # MSW handlers & 种子数据
│       └── types/        # 共享 TypeScript 类型
├── backend/              # Python 后端(默认值 + 场景存储)
├── docs/v1-alignment.md  # v1 契约 + 计算口径(真理源)
└── tasks/                # API 契约 & 规划文档
```

### 设计原则

1. **本地现金价才是基准** —— 保本价永远与农户手填的本地现金价比对,**绝不**用期货价。
2. **低摩擦录入是护城河** —— 预填默认值、复用上季、只改变化的字段。字段越少,农户越愿意填完。
3. **计算引擎在前端** —— 一份实现、实时重算,敏感性网格不走后端往返。
4. **数据驱动** —— 加作物 / 地区 / 成本项是改配置,不是写分支。
5. **不爬取数据** —— 农机是农户手填的 `$/acre` 成本(或后端参考区间),不做估值。

---

*Built for the Corn Belt. Designed to grow.*
