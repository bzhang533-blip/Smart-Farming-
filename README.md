# Smart Farm — 农场盈亏决策驾驶舱

> A profit-planning cockpit for U.S. small and mid-sized farms.
> 为美国中小型农场打造的盈亏规划与决策工具。

---

## English

### What is Smart Farm?

Smart Farm is a decision-support tool that helps corn and soybean farmers in the U.S. Corn Belt answer one question every season:

**"Should I sell now — and is this machine worth buying?"**

It pulls together futures prices, local elevator cash prices, and your farm's actual cost structure to give you a real breakeven number in your local currency, compared against what your nearest grain elevator is paying today.

### The Problem We Solve

Most small farms still track costs in spreadsheets and check prices by calling their elevator. Knowing whether today's cash price covers your true cost-per-bushel requires juggling:

- Local cash price (which includes basis, not just the CME futures quote)
- Your real cost per acre — seed, fertilizer, land rent, equipment, operating loans
- Your historical yield (APH) for your specific fields

Smart Farm connects these dots automatically and surfaces a clear **sell / hold / watch** signal.

### MVP Scope

| Dimension | Coverage |
|-----------|----------|
| States | Iowa (IA) · Illinois (IL) · Indiana (IN) |
| Crops | Corn · Soybean |
| Data freshness | Cash prices updated daily / hourly |
| Futures source | CME ZC (corn) · ZS (soybean) |

The architecture is data-driven — adding a new state or crop requires only a config change, not code changes.

### Core Features

**Market Data**
- Local elevator cash prices by ZIP code
- Live CME futures (ZC / ZS)
- Basis tracking (cash − futures) as a time series per region

**Farm Profile**
- Field-by-field cost entry: seed, fertilizer, land rent, equipment, operating interest
- APH (Actual Production History) per field
- Machinery cost modeling (cost-per-acre impact, payback period)

**Breakeven Engine**
- True breakeven price = total cost per acre ÷ yield
- Always compared against your local cash price, never the futures quote alone
- Profit/loss visualization per field and per crop

**Decision Dashboard**
- Sell signal cards with basis alerts
- Crop rotation guidance
- Season-over-season comparison

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS |
| Backend | Dart (REST/JSON API) |
| Mocking | MSW (Mock Service Worker) |

### Getting Started

**Frontend**

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

> The frontend ships with MSW mock data so it runs standalone without the backend.

**Backend**

```bash
dart run backend/backend.dart
```

### Project Structure

```
smart-farm/
├── frontend/          # Next.js app (TypeScript)
│   ├── src/
│   │   ├── app/       # Route pages (dashboard, farm, market)
│   │   ├── components/  # UI components by domain
│   │   ├── config/    # Crop & state configuration (data-driven)
│   │   ├── lib/api/   # API client layer
│   │   ├── lib/mocks/ # MSW handlers & seed data
│   │   └── types/     # Shared TypeScript types
│   └── ...
├── backend/           # Dart backend
├── tasks/             # API contracts & planning docs
└── README.md
```

### Design Principles

1. **Local cash price is king** — breakeven is always compared against the elevator price in your ZIP, not CME futures.
2. **Basis matters** — we store `basis = cash − futures` as a time series. It's the difference between a profitable sale and a missed opportunity.
3. **Low-friction cost entry** — pre-fill from last season, edit only what changed. Fewer fields = more farmers complete the form.
4. **No scraping** — machinery reference prices come from user input + backend ranges. No legal/ToS risk from scraping auction sites.

---

## 中文版

### Smart Farm 是什么？

Smart Farm 是一款面向美国中小型农场主的**盈亏规划与决策工具**，专注于玉米带的玉米和大豆种植。

它回答的核心问题只有一个：

**"现在该不该卖粮？这台农机值不值得买？"**

通过整合 CME 期货行情、本地粮库现金价以及你农场的真实成本结构，Smart Farm 为你计算出本地化的**真实保本价**，并与最近粮库当天的挂牌价直接比对。

### 我们解决的问题

大多数小型农场仍然用电子表格管理成本，打电话问粮库报价。要判断今天的现金价是否能覆盖你的每蒲式耳真实成本，需要同时考虑：

- 本地现金价（包含 basis，不只是 CME 期货报价）
- 每英亩真实成本——种子、化肥、地租、农机、运营贷款
- 你具体地块的历史单产（APH）

Smart Farm 自动将这些数据串联，给出清晰的**卖出 / 持仓 / 观望**信号。

### MVP 覆盖范围

| 维度 | 范围 |
|------|------|
| 州 | 爱荷华（IA）· 伊利诺伊（IL）· 印第安纳（IN） |
| 作物 | 玉米 · 大豆 |
| 数据更新频率 | 现金价按天/小时更新 |
| 期货数据源 | CME ZC（玉米）· ZS（大豆） |

架构完全由数据驱动——新增州或作物只需修改配置，不需要改动核心代码。

### 核心功能

**市场数据层**
- 按 ZIP 精确匹配的粮库本地现金价
- CME 期货实时行情（ZC / ZS）
- Basis（现金价 − 期货）按地区存储为时间序列

**农场档案层**
- 逐地块成本录入：种子、化肥、地租、农机、运营利息
- 每块地的历史单产（APH）
- 农机成本建模（每英亩影响 + 回本年限）

**保本引擎**
- 真实保本价 = 每英亩总成本 ÷ 单产
- 始终与本地现金价比对，**不使用期货价**
- 逐地块、逐作物的盈亏可视化

**决策驾驶舱**
- 带 basis 预警的卖出信号卡片
- 轮作建议
- 跨季对比

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 · React 19 · TypeScript · Tailwind CSS |
| 后端 | Dart（REST/JSON API） |
| 接口 Mock | MSW（Mock Service Worker） |

### 快速开始

**前端**

```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:3000
```

> 前端内置 MSW mock 数据，无需后端即可独立运行。

**后端**

```bash
dart run backend/backend.dart
```

### 项目结构

```
smart-farm/
├── frontend/          # Next.js 前端（TypeScript）
│   ├── src/
│   │   ├── app/       # 路由页面（仪表盘、农场档案、市场）
│   │   ├── components/  # 按业务域划分的 UI 组件
│   │   ├── config/    # 作物 & 州配置（数据驱动）
│   │   ├── lib/api/   # API 客户端封装层
│   │   ├── lib/mocks/ # MSW handlers & 种子数据
│   │   └── types/     # 共享 TypeScript 类型定义
│   └── ...
├── backend/           # Dart 后端
├── tasks/             # API 契约 & 规划文档
└── README.md
```

### 设计原则

1. **本地现金价才是基准** — 保本价永远与你所在 ZIP 的粮库挂牌价比对，不与 CME 期货比对。
2. **Basis 是命门** — 我们将 `basis = 现金价 − 期货` 存为时间序列，它是决定卖出是否合算的关键变量。
3. **低摩擦录入是护城河** — 预填上季数据，只改变化的字段，字段越少越好。
4. **不爬取第三方数据** — 农机参考价由用户手动输入 + 后端给出区间，规避法律与反爬风险。

---

*Built for the Corn Belt. Designed to grow.*
