# Todo

> 每个任务开始前，在此写下计划（含可检查项）。实施中标记完成状态，完成后添加审查小结。

---

## 进行中

*(暂无进行中的任务。)*

---

## 待办

*（暂无待办任务。）*

---

## 已完成

### [2026-06-13] 删除旧模型(market / dashboard),只留 v1 核心

**目标**：用户确认 `docs/v1-alignment.md` 已在 docs 目录(用户亲自写,§6 契约 + §7 计算签名)。删掉所有旧模型功能代码,只保留核心(农场录入 → 保本输出)。breakeven 数据流暂不动(later)。

**完成项**：
- [x] 确认 `docs/v1-alignment.md` 存在(9.3KB,Scenario schema + 计算口径 + sanity 值 corn −$70 / soybeans −$72)
- [x] 删除 market 旧模型:`app/market` `components/market/*` `types/market.ts` `lib/api/market.ts` `lib/mocks/data/market.ts`
- [x] 删除 dashboard 旧模型:`app/dashboard` `components/dashboard/*` `types/dashboard.ts` `lib/api/dashboard.ts` `lib/mocks/data/dashboard.ts`
- [x] 修复引用:`NavBar`(去 Dashboard/Market 链接)、`types/index.ts`(去 market/dashboard 再导出)、`handlers.ts`(去 market/dashboard handler,保留 breakeven + farm)、`app/page.tsx`(整页从「决策驾驶舱」重写为 v1 计算器概览)、`layout.tsx`(描述)
- [x] 保留核心:`app/farm` `app/breakeven` `components/farm/*` `components/breakeven/*` `lib/breakeven/*` `config/*` `types/{farm,breakeven,common}` 及其 mock
- [x] `AGENTS.md` Context Map 注解更新(market/dashboard 已删)

**验证**：`npx tsc --noEmit` 通过(清 `.next` 后 exit 0)、`npm run lint` 通过、`npm run build` 成功 —— 路由现仅剩 `/` `/farm` `/breakeven`(+ _not-found)。

**按用户要求 hold(later)**：
- breakeven 数据流仍走 `POST /api/breakeven/calculate`(`lib/api/breakeven.ts` + `mocks/handlers.ts`),未改为直调本地引擎 —— 用户说稍后再弄。

**发现的待办(schema 不一致,留待 breakeven 回合处理)**：`docs/v1-alignment.md` 与现有前端代码在命名上不一致 —— 作物 `"soybeans"`(doc)vs `"soybean"`(code);成本 key 下划线 `seed`/`fuel_oil`(doc)vs 短横 `seed-plants-treated`/`gas-fuel-oil`(code);`CostLine{value,source}`(doc)vs `CostItem{valuePerAcre}`(code);`Scenario`/`CropEntry` 结构(doc)vs 现有 `FarmProfile`(code)。需在「回到 breakeven」时统一对齐 schema + `tasks/api-contracts.md`。

---

### [2026-06-13] 把项目文件对齐到重写后的 v1 CLAUDE.md

**目标**：用户重新梳理项目思路与框架,把 CLAUDE.md 从「决策驾驶舱(实时行情 + basis + 卖买信号 + 后端权威计算)」收窄为「v1 单作物盈亏计算器(现金价手填、计算引擎在前端 TS 唯一实现、后端只给 `GET /defaults` + 存读场景)」。把其余项目文件对齐到新框架。`docs/v1-alignment.md` 由用户自己写,本任务不碰。

**完成项**：
- [x] `CLAUDE.md` §7:占位命令替换为 `package.json` 真实命令(npm;无 typecheck/test 脚本,如实标注)
- [x] `tasks/api-contracts.md`:**整文件重写**为 v1 surface —— 删市场数据层 / 后端 breakeven 计算端点 / 决策驾驶舱信号;改为 `GET /defaults` + Scenario 持久化(CRUD),Scenario schema 指向 v1-alignment.md;旧契约在变更日志标「已废弃」
- [x] `tasks/domain-cost-model.md`:修「财务计算权威在后端 Dart」「差异化在实时本地数据」两处定性,加 v1 注解
- [x] 前端代码注释(非破坏):`preview.ts` 头(改为「唯一权威实现」)、`costModel.ts`、`crops.ts`(futuresSymbol 标 v1 OUT)、`types/breakeven.ts`(breakevenPrice 注释)
- [x] `README.md`:重写为 v1 计算器定位
- [x] `AGENTS.md`:重写为 v1;Backend Agent 改为「不算账,只 GET /defaults + 存场景」;领域规则去 basis/real-time,加「计算在前端 TS」
- [x] `tasks/lessons.md`:新增 L-002(框架重写后全仓排查衍生定性)

**验证**：grep 关键定性词(权威/authoritative/backend single source/breakeven calculate)全仓复查,确认所有衍生**文档与代码注释**已与 v1 对齐;残留命中均为正确的新表述或带「已废弃」标记的历史记录。

**范围外 / 未做(留给用户决策或后续)**：
1. **未创建 `docs/v1-alignment.md`** —— 用户自己写(本任务前提)。它是 §7 计算签名 + Scenario schema 的真理源,其余文件已指向它。
2. **未删除前端 v1-OUT 功能代码**:`app/market` `app/dashboard` `components/market` `components/dashboard` `types/market.ts` `types/dashboard.ts` `lib/api/{market,dashboard}.ts` 及对应 mock。删除是破坏性操作 → ASK FIRST。
3. **未改前端 breakeven 数据流**:`lib/api/breakeven.ts` + `mocks/handlers.ts` 仍走 `POST /api/breakeven/calculate`(后端算账模型)。v1 应让 `/breakeven` 页直接调本地引擎(`lib/breakeven/`),不走后端往返。属运行时行为改动 → 需单独立项重构(建议下一步)。
4. **未重命名** `lib/breakeven/preview.ts` 及其 `…Preview` 导出(跨组件引用,纯重构,可选)。
5. **未碰任何 backend / Dart 代码**(角色边界)。

---

### [2026-06-07] 吸收 Compeer Grain Margin Manager,落地分类成本模型 + 保本/敏感性前端

**目标**：把竞品 Compeer Grain Margin Manager(`docs/reference/grain-margin-manager-2026-1.xlsx`)经过验证的**分类成本建模 + 保本公式 + price×yield 敏感性矩阵**吸收为前端能力;并为它缺失的「本地化 + 实时 + 决策」预留 API 契约。严格遵守角色边界:**只做前端,不写任何 Dart/后端代码**;权威财务数字以后端契约/mock 为准,前端只做录入时轻量预览。

**现状差距**:原前端 `src/types/farm.ts` 是扁平 7 字段 `CostStructure`,无法表达三大科目分类、缺收入侧字段、保本接口无敏感性矩阵。

#### Step 0 — 读取与提取(委托子代理,保持主上下文干净)✅
- [x] 子代理:用 stdlib `zipfile`+`xml.etree` 解析 xlsx(免装 openpyxl),重点 "Farm Margin Manager"(sheet11)+ Input Tab(sheet1)
- [x] 产出 `tasks/domain-cost-model.md`:成本科目分类(Direct 17 / Capital 2 / Net Family Living 2)+ 每个 line item(key + 标签 + corn/soybean 默认值)、收入侧字段、保本公式(952/210=4.533)、敏感性矩阵逻辑、默认值兜底表、#DIV/0! 缺陷清单

#### Step 1 — 类型与契约(与 api-contracts.md 同源)✅
- [x] 新建 `src/config/costModel.ts`:**data-driven** 成本科目目录 —— `CostCategory`、`COST_ITEM_CATALOG`(17+2+2 项,带 corn/soybean 默认值与 sign)、`buildDefaultCostItems`/`mergeCostItems`/`costItemSign`。无 `if (crop===...)` 硬编码。
- [x] `src/types/farm.ts`:扁平 `CostStructure` → `CostItem[]`(彻底迁移);新增 `CostCategory`、`RevenueInputs`。迁移点全部更新。
- [x] `src/types/breakeven.ts`:`BreakevenRequest` 加 `costItems/aph/zip/govtPaymentPerAcre?/cashPrice?`;`BreakevenResult` 加 `subtotals`、`sensitivityMatrix`、`netMarginPerAcre`、`totalRevenuePerAcre`。
- [x] `src/config/crops.ts`:corn/soybean 补 `revenueDefaults` + `sensitivity` 轴配置。
- [x] 更新 `tasks/api-contracts.md`:breakeven 输入/输出改契约、farm profile costStructure 改分类数组,新增字段标 `TODO: 待后端确认`,加变更日志。
- [x] 新建 `src/lib/breakeven/preview.ts`:**非权威**轻量预览引擎(镜像竞品公式 + 0 守卫),供录入即时预览 + 驱动 mock。

#### Step 2 — 前端 UI(mock 数据驱动)✅
- [x] 更新 mock:`data/farm.ts`(分类成本 + 对齐字段单产)、`data/breakeven.ts`(由 preview 生成、随请求变化)、`handlers.ts`(breakeven POST 读 body 动态返回)、`data/dashboard.ts`(数字与新成本模型对齐)。
- [x] **低摩擦成本录入表单**:`CostStructureSection.tsx` 按科目分组渲染、默认值兜底、逐项覆盖、科目小计 + Total + Reset to defaults。
- [x] **保本结果视图**:新建 `components/breakeven/{BreakevenClient,SensitivityGrid}.tsx` + `app/breakeven/page.tsx`——保本价、净利/acre、科目小计 + price×yield 敏感性矩阵(盈亏配色、中心格高亮、单产=0 不崩)。
- [x] **决策层**:BreakevenClient 决策面板 + dashboard SignalCard 并排【本地现金价 vs 保本价】+ 信号/预警卡片,全程用 cashPrice、禁用期货价。NavBar 加 Breakeven 入口。

#### 验证(完成定义,逐条证明)✅
- [x] `npx tsc --noEmit` 通过(strict、无新增 any)
- [x] `npm run lint` 通过(修了 React19 `set-state-in-effect`:用派生 `calcStale` 替代 effect 内同步 setState)
- [x] `npm run dev` 用 mock 跑起来:`/` `/farm` `/breakeven` `/dashboard` `/market` 均 HTTP 200、无运行时错误标记
- [x] preview 引擎与竞品已验证数字一致(corn direct 622 / capital 330 / total 952 / BE 4.53;soybean total 684;敏感矩阵 7×9 居中);单产=0 → BE 0、净利有限值,无 NaN/Infinity(竞品 #DIV/0! 已修);NFL 抵减语义正确
- [x] `domain-cost-model.md` 已生成;`api-contracts.md` 与 TS 类型同源

**审查**：
- **范围**:吸收 Compeer Grain Margin Manager 的三大成本科目(Direct 17 / Capital 2 / Net Family Living 2)、保本公式(总成本/acre ÷ 单产)、price×yield 敏感性矩阵,落地为前端能力,并为后端预留契约。严格只动前端,未碰 backend/Dart。
- **架构**:成本科目、作物默认值、敏感性轴全部走配置(`config/costModel.ts` + `config/crops.ts`),加州/加作物/加科目只改配置不动组件。权威财务计算仍归后端——前端 `preview.ts` 明确标注 NON-AUTHORITATIVE,仅供录入预览与 mock。
- **领域合规**:盈亏比对一律用本地现金价、禁用期货价;敏感性矩阵在单产/英亩=0 时返回安全值,修复了竞品多处 #DIV/0!。
- **验证手段**:tsc + lint 全绿;dev server 五条路由 200;用 Node 直接跑真实模块(node 类型剥离)断言核心数字与竞品 xlsx 吻合 + 边界守卫。
- **遗留/待后端确认**:成本是否按作物分别维护(当前农场级单套,按首块地作物兜底)、科目 key 枚举是否后端下发、敏感性轴定义是否后端给——均已在 `api-contracts.md` 标 TODO。
- **偏差**:无用户中途纠正;计划模式中途被重新激活一次,已写计划文件并经批准后继续,无返工。故 `tasks/lessons.md` 本次不新增。

---

### [2026-06-04] 初始化 GitHub 远程仓库并合并前后端

**目标**：将本地前端代码同步到团队共用的 GitHub 仓库，并与后端代码合并为统一仓库结构。

**计划**：
- [x] 检查本地 git 状态与远程配置
- [x] 添加 `origin` remote（`https://github.com/bzhang533-blip/Smart-Farming-.git`）
- [x] 拉取远程（已有后端 commits）
- [x] 解决 `.gitignore` 合并冲突（保留更完整的前端版本）
- [x] 推送合并结果至 `main`

**审查**：仓库现结构为 `frontend/`（Next.js）+ `backend/`（Dart），两套代码共存于同一 `main` 分支。合并冲突仅出现在 `.gitignore`，已取本地更完整版本。

---

### [2026-06-04] 创建项目 AGENTS.md（多 agent 协作规范）

**目标**：按照 AGENTS.md 开放标准，为项目撰写一份指导多 agent 协作的规范文件，置于仓库根目录。

**计划**：
- [x] 研读 agents.md / augmentcode / asdlc.io 等官方规范文档
- [x] 在仓库根目录创建 `AGENTS.md`，包含：Mission、Toolchain、Judgment Boundaries、Agent Roles、非显然领域规则、Context Map
- [x] 提交并推送至 GitHub

**审查**：AGENTS.md 已按开放标准撰写（141 行，人工维护）。涵盖 4 个 agent 角色定义（Frontend/Backend/Planning/Review）、三层权限边界（🚫/⚠️/✅）、5 条非显然领域规则（basis、保本价、real-time 定义、农机边界、data-driven 可扩展性）。已推送至 GitHub。

---

### [2026-06-04] 编写双语 README

**目标**：为 GitHub 仓库写一份面向用户的项目介绍，中英文双版本。

**计划**：
- [x] 梳理项目结构、功能模块、技术栈
- [x] 编写英文版（功能、技术栈、快速开始、设计原则）
- [x] 编写中文版（与英文内容对应，非直译）
- [x] 提交并推送至 GitHub

**审查**：README 覆盖项目定位、MVP 范围（IA/IL/IN × 玉米/大豆）、四大功能模块、技术栈、快速开始、设计原则。已推送至 `main`。

---

### [2026-06-04] 项目初始化

- [x] 创建 `CLAUDE.md`（项目规范与工作流编排）
- [x] 创建 `tasks/api-contracts.md`（前后端接口契约草稿）
- [x] 创建 `tasks/lessons.md`（经验教训记录）
- [x] 创建 `tasks/todo.md`（任务跟踪）

**审查**：项目骨架建立完毕。所有 API 契约均标注 `TODO: 待后端确认`，前端开发将以 mock 数据推进，直至后端对齐。

---

## 模板

```markdown
### [YYYY-MM-DD] 任务标题

**目标**：一句话说明要做什么。

**计划**：
- [ ] 步骤 1
- [ ] 步骤 2
- [ ] 步骤 3

**审查**：完成后填写——实际做了什么，有无偏差，后续跟进。
```
