# API Contracts

> 本文件记录前后端约定的 REST/JSON 接口契约。
> 前端类型定义（`lib/api/`）与此文件同源，改一处必须对齐另一处。
> 标注 `TODO: 待后端确认` 的条目尚未与后端对齐，前端使用 mock 数据推进。

---

## 约定

- Base URL: `TBD`
- 所有请求/响应使用 `Content-Type: application/json`
- 金额单位：USD（美元），保留 2 位小数
- 产量单位：bu/acre（蒲式耳/英亩）
- 面积单位：acres（英亩）
- 作物类型：`"corn"` | `"soybean"`
- 州：`"IA"` | `"IL"` | `"IN"`（MVP 范围）

---

## 1. 市场数据层

### GET /api/market/cash-prices

获取指定州/作物的本地现金价（按天/小时更新）。

**Query Parameters**

| 参数 | 类型 | 说明 |
|------|------|------|
| `state` | `string` | 州代码（IA / IL / IN） |
| `crop` | `string` | 作物类型（corn / soybean） |
| `zip` | `string?` | 可选，按 ZIP 精确匹配粮库 |

**Response 200**

```json
{
  "state": "IA",
  "crop": "corn",
  "updatedAt": "2026-06-04T10:00:00Z",
  "prices": [
    {
      "elevatorId": "string",
      "elevatorName": "string",
      "zip": "string",
      "cashPrice": 4.52,
      "futuresMonth": "ZCZ26",
      "basis": -0.18
    }
  ]
}
```

> TODO: 待后端确认 — `futuresMonth` 格式、`basis` 是后端算好还是前端算？

---

### GET /api/market/futures

获取玉米(ZC)/ 大豆(ZS)期货价格（展示用，不用于盈亏权威计算）。

**Query Parameters**

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | `ZC` 或 `ZS` |
| `contract` | `string?` | 合约月份，如 `ZCZ26` |

**Response 200**

```json
{
  "symbol": "ZC",
  "contract": "ZCZ26",
  "price": 4.70,
  "updatedAt": "2026-06-04T10:00:00Z"
}
```

> TODO: 待后端确认 — 数据源（CME / 第三方）、更新频率。

---

### GET /api/market/basis-history

获取 basis 时间序列（`cash − futures`），用于 basis 预警。

**Query Parameters**

| 参数 | 类型 | 说明 |
|------|------|------|
| `state` | `string` | 州代码 |
| `crop` | `string` | 作物类型 |
| `zip` | `string?` | 可选 |
| `from` | `string` | ISO 日期，如 `2025-01-01` |
| `to` | `string` | ISO 日期 |

**Response 200**

```json
{
  "state": "IA",
  "crop": "corn",
  "zip": "50001",
  "series": [
    { "date": "2026-01-01", "basis": -0.20 },
    { "date": "2026-01-02", "basis": -0.18 }
  ]
}
```

> TODO: 待后端确认 — 历史数据覆盖范围、granularity（日 / 周）。

---

## 2. 农场档案层

### GET /api/farm/profile/:farmId

获取农场基本信息与成本结构。

**Response 200**

```json
{
  "farmId": "string",
  "name": "string",
  "state": "IA",
  "fields": [
    {
      "fieldId": "string",
      "name": "string",
      "acres": 320,
      "zip": "50001",
      "crop": "corn",
      "aph": 185
    }
  ],
  "costStructure": [
    { "key": "seed-plants-treated", "category": "direct", "valuePerAcre": 135 },
    { "key": "fertilizer-lime", "category": "direct", "valuePerAcre": 200 },
    { "key": "land-cost", "category": "capital", "valuePerAcre": 265 },
    { "key": "machinery-cost", "category": "capital", "valuePerAcre": 65 },
    { "key": "family-living-expense", "category": "netFamilyLiving", "valuePerAcre": 0 },
    { "key": "non-farm-income-wages", "category": "netFamilyLiving", "valuePerAcre": 0 }
  ]
}
```

> `costStructure` 由扁平字段改为**分类成本项数组**（吸收自 Compeer Grain Margin Manager，
> 全量科目见 `tasks/domain-cost-model.md` 与前端 `config/costModel.ts` 的 `COST_ITEM_CATALOG`）。
> - `category`: `"direct"` | `"capital"` | `"netFamilyLiving"`
> - `key`: 与 `COST_ITEM_CATALOG` 同源；`non-farm-income-wages` 在 netFamilyLiving 内为抵减项（sign = -1）
> - `valuePerAcre`: 每英亩金额（USD）
>
> TODO: 待后端确认 —
> 1. 成本字段确认为"每英亩"。
> 2. 是否需要按**作物**分别维护成本结构（玉米/大豆默认值不同）？当前 MVP 为农场级单套，前端按首块地作物兜底。
> 3. 科目 `key` 枚举集是否由后端下发（便于加项时不改前端）？

---

### POST /api/farm/profile

创建农场档案。

**Request Body**: 同上 Response 结构（不含 `farmId`）

**Response 201**

```json
{ "farmId": "string" }
```

---

### PUT /api/farm/profile/:farmId

更新农场档案（支持部分更新）。

**Request Body**: 同 GET Response 结构（所有字段可选）

**Response 200**

```json
{ "ok": true }
```

---

### GET /api/farm/machinery

获取农机列表（作为成本变量）。

**Query Parameters**: `farmId`

**Response 200**

```json
{
  "farmId": "string",
  "machinery": [
    {
      "machineryId": "string",
      "type": "tractor",
      "model": "John Deere 8R 370",
      "purchaseYear": 2022,
      "purchasePrice": 420000,
      "estimatedUsefulLifeYears": 15,
      "annualAcresCovered": 1200,
      "referenceValueRange": { "low": 310000, "high": 360000 }
    }
  ]
}
```

> TODO: 待后端确认 — `referenceValueRange` 由后端查参考数据返回，MVP 阶段来源为人工录入区间。

---

## 3. 保本引擎

### POST /api/breakeven/calculate

计算指定字段的保本价、每英亩盈亏与 price×yield 敏感性矩阵（权威计算在后端）。

**Request Body**

```json
{
  "farmId": "string",
  "fieldId": "string",
  "crop": "corn",
  "season": "2026",
  "costItems": [
    { "key": "fertilizer-lime", "category": "direct", "valuePerAcre": 200 }
  ],
  "aph": 210,
  "zip": "50126",
  "govtPaymentPerAcre": 0,
  "cashPrice": 4.85
}
```

> TODO: 待后端确认 — 输入新增 `costItems`(成本明细)+ `aph`(单产)+ `zip`(用于解析本地现金价)+ 可选 `govtPaymentPerAcre` / `cashPrice`。
> 待确认:这些输入是随请求提交,还是后端从农场档案按 `farmId/fieldId` 读取？`cashPrice` 缺省时后端按 `zip` 解析当日本地现金价(非期货价)。

**Response 200**

```json
{
  "fieldId": "string",
  "crop": "corn",
  "season": "2026",
  "breakevenPrice": 4.53,
  "totalCostPerAcre": 952,
  "aph": 210,
  "currentCashPrice": 4.85,
  "totalRevenuePerAcre": 1018.5,
  "profitPerBushel": 0.32,
  "profitPerAcre": 66.5,
  "netMarginPerAcre": 66.5,
  "profitMarginPct": 7.0,
  "subtotals": {
    "directTotal": 622,
    "capitalTotal": 330,
    "netFamilyLiving": 0
  },
  "sensitivityMatrix": {
    "yieldAxis": [180, 190, 200, 210, 220, 230, 240],
    "priceAxis": [3.85, 4.1, 4.35, 4.6, 4.85, 5.1, 5.35, 5.6, 5.85],
    "cells": [[-259, -240.5, -222, "…"]]
  }
}
```

> 保本公式:`breakevenPrice = totalCostPerAcre / aph`(已用竞品 952/210=4.533 验证);
> 净利/acre = `totalRevenuePerAcre − totalCostPerAcre`;Net Family Living = `max(0, 家庭生活 − 非农收入)`。
> 前端 `lib/breakeven/preview.ts` 用同一公式做录入即时预览(**非权威**),展示的最终数字以本接口为准。
>
> TODO: 待后端确认 —
> 1. `subtotals`(direct / capital / netFamilyLiving 每英亩小计)。
> 2. `sensitivityMatrix`:`cells[priceIndex][yieldIndex]` = 每英亩净利润;轴步长/延展由作物配置决定
>    (corn 单产步长 10 ±3、价格步长 0.25 ±4;soybean 单产步长 4、价格步长 0.5),是否由后端下发轴定义？
> 3. 单产=0 / 英亩=0 时必须返回安全值(0 或 null),不得出现 `#DIV/0!` / NaN(竞品已知缺陷)。

---

## 4. 决策驾驶舱

### GET /api/dashboard/signals/:farmId

获取卖出信号与 basis 预警。

**Response 200**

```json
{
  "farmId": "string",
  "updatedAt": "2026-06-04T10:00:00Z",
  "signals": [
    {
      "fieldId": "string",
      "crop": "corn",
      "signalType": "sell" | "hold" | "watch",
      "reason": "string",
      "currentCashPrice": 4.52,
      "breakevenPrice": 4.21,
      "basisAlert": true,
      "basisVs5YearAvg": 0.05
    }
  ]
}
```

> TODO: 待后端确认 — `signalType` 判定逻辑与阈值由后端定义。

---

## 变更日志

| 日期 | 变更内容 | 状态 |
|------|----------|------|
| 2026-06-04 | 初始草稿，全部待后端确认 | TODO |
| 2026-06-07 | 吸收 Compeer Grain Margin Manager：`costStructure` 改分类成本项数组；breakeven 接口输入加 `costItems/aph/zip`、输出加 `subtotals/sensitivityMatrix/netMarginPerAcre/totalRevenuePerAcre` | TODO |
