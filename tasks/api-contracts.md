# API Contracts (v1)

> 本文件记录前后端约定的 REST/JSON 接口契约。
> 前端类型定义(`lib/api/`)与本文件、`docs/v1-alignment.md` **同源**,改一处必须对齐另外两处。
> 标注 `TODO: 待后端确认` 的条目尚未与后端对齐,前端使用 mock(MSW)推进。

---

## 0. v1 范围(先读 CLAUDE.md §0)

v1 = 一个最简单的**单作物盈亏计算器**。后端在 v1 里只做两件事:

1. **`GET /defaults`** —— 下发各项成本 / 收入的**默认值**(带地区/作物维度,可被农户覆盖)。
2. **场景持久化** —— 存 / 读 / 列出农户保存的 Scenario。

**后端不算账。** margin、保本价、price×yield 敏感性网格**全部在前端 TS 计算引擎里实现,是唯一实现**(`frontend/src/lib/breakeven/`,纯函数,签名见 `docs/v1-alignment.md` §7)。前端不会调用、后端也不应提供任何「算好的 margin」端点 —— 因为敏感性拖动要实时重算、不走后端往返,且只保留一份公式实现,避免 TS / Dart 双份公式飘掉。

**v1 不存在的端点(不要建)**:行情 / 期货 / basis、breakeven 计算、卖买信号 / 决策驾驶舱。现金价是农户手填输入,v1 不接任何实时数据源。

---

## 约定

- Base URL: `TBD`
- 所有请求 / 响应使用 `Content-Type: application/json`
- 金额单位:USD(美元),保留 2 位小数
- 产量单位:bu/acre(蒲式耳 / 英亩)
- 面积单位:acres(英亩)
- 作物类型:`"corn"` | `"soybean"`(预留 `"other"` 槽)
- 成本科目分类:`"direct"` | `"capital"` | `"netFamilyLiving"`;科目 `key` 与前端 `config/costModel.ts` 的 `COST_ITEM_CATALOG` 同源

---

## 1. 默认值

### GET /defaults

下发录入表单的兜底默认值(成本科目 + 收入侧),农户可逐项覆盖。这是后端在 v1 里**唯一的「读」职责**。

**Query Parameters**

| 参数 | 类型 | 说明 |
|------|------|------|
| `crop` | `string?` | 作物类型(corn / soybean);缺省返回全部作物 |
| `region` | `string?` | 地区代码,用于地区化默认值;缺省返回通用「玉米带平均」占位值 |

**Response 200**

```json
{
  "region": "corn-belt",
  "crops": {
    "corn": {
      "revenueDefaults": { "aph": 210, "cashPrice": 4.2, "govtPaymentPerAcre": 0 },
      "costItems": [
        { "key": "seed-plants-treated", "category": "direct", "valuePerAcre": 135 },
        { "key": "fertilizer-lime", "category": "direct", "valuePerAcre": 200 },
        { "key": "land-cost", "category": "capital", "valuePerAcre": 265 },
        { "key": "machinery-cost", "category": "capital", "valuePerAcre": 65 },
        { "key": "family-living-expense", "category": "netFamilyLiving", "valuePerAcre": 0 },
        { "key": "non-farm-income-wages", "category": "netFamilyLiving", "valuePerAcre": 0 }
      ]
    }
  }
}
```

> - `costItems` 为**分类成本项数组**(吸收自 Compeer Grain Margin Manager;全量科目 17 direct + 2 capital + 2 netFamilyLiving 见 `tasks/domain-cost-model.md` 与 `config/costModel.ts`)。
> - `non-farm-income-wages` 在 netFamilyLiving 内为抵减项(sign = -1)。
> - 土地 / 农机各是**一个可填的 `$/acre` 数字**(`land-cost` / `machinery-cost`),不是计算模块。
>
> TODO: 待后端确认 —
> 1. `region` 维度的粒度(州 / ZIP / 通用),以及缺省时返回什么。
> 2. 科目 `key` 枚举集是否由后端下发(便于加项时不改前端),还是前端 `COST_ITEM_CATALOG` 为准、后端只覆盖数值。
> 3. 默认值是否按**作物**分别维护(corn / soybean 不同)。

---

## 2. 场景持久化(Scenario)

> Scenario 是「一次完整的录入 + 其结果快照」的可存可读单元。
> **Scenario schema 的权威定义在 `docs/v1-alignment.md`**(与计算口径同源);下面只给端点形状,请求 / 响应 body 以 v1-alignment.md 的 `Scenario` 为准。
> 计算结果(margin、保本价、敏感性网格)由前端引擎算出;是否随 Scenario 一并落库,还是只存输入、读取后前端重算,见下方 TODO。

### GET /scenarios

列出当前用户保存的场景(摘要)。

**Response 200**

```json
{
  "scenarios": [
    {
      "id": "string",
      "name": "2026 Corn — North 80",
      "crop": "corn",
      "season": "2026",
      "updatedAt": "2026-06-13T10:00:00Z"
    }
  ]
}
```

### GET /scenarios/:id

读取单个场景的完整内容(用于「读场景」回填表单)。

**Response 200**: `Scenario`(完整 schema 见 `docs/v1-alignment.md`)。

### POST /scenarios

保存一个新场景。

**Request Body**: `Scenario`(不含 `id` / `updatedAt`)。

**Response 201**

```json
{ "id": "string", "updatedAt": "2026-06-13T10:00:00Z" }
```

### PUT /scenarios/:id

更新已存场景。

**Request Body**: `Scenario`(部分字段可选)。

**Response 200**

```json
{ "ok": true, "updatedAt": "2026-06-13T10:05:00Z" }
```

### DELETE /scenarios/:id

删除场景。

**Response 204**: 无 body。

> TODO: 待后端确认 —
> 1. 用户 / 农场归属:Scenario 如何关联到某个用户(鉴权方式)?v1 是否需要多用户?
> 2. Scenario body 是**只存输入**(成本项 + 收入 + 作物 / 季 / 面积),读取后前端重算;还是连**算好的结果快照**(margin / breakeven / 敏感性)一并落库?推荐只存输入 —— 计算只有前端一份实现,落库结果会和公式飘掉。
> 3. `Scenario` 完整字段 / 类型以 `docs/v1-alignment.md` 为准,改动需同步本文件与 `frontend/src/types/`。

---

## 变更日志

| 日期 | 变更内容 | 状态 |
|------|----------|------|
| 2026-06-04 | 初始草稿(决策驾驶舱模型:市场数据 / 后端 breakeven 计算 / 决策信号),全部待后端确认 | 已废弃 |
| 2026-06-07 | 吸收 Compeer:costStructure 改分类成本项数组;breakeven 接口加 costItems/aph/zip + subtotals/sensitivityMatrix | 已废弃 |
| 2026-06-13 | **重写为 v1 surface**:删市场数据层 / 后端 breakeven 计算端点 / 决策驾驶舱信号(均移出 v1 范围);改为 `GET /defaults` + Scenario 持久化(CRUD);明确计算引擎在前端 TS 唯一实现、后端不算账;Scenario schema 以 `docs/v1-alignment.md` 为准 | TODO |
