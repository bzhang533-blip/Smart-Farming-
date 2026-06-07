# 领域成本模型(竞品参考)

> 来源:Compeer **Grain Margin Manager**(`docs/reference/grain-margin-manager-2026-1.xlsx`)
> 解析对象:`Farm Margin Manager`(sheet11)+ `Input Tab`(sheet1)
> 性质:**竞品领域参考**,用于校准我们自己的保本/成本建模。**非交付物,亦非权威实现**(我们的财务计算权威在后端 Dart)。

---

## 1. 概述

`Farm Margin Manager` 是一张**纯静态、手工填写的每英亩现金流投影表**。它把单块作物的「收入估算 / 直接费用 / 资本费用 / 净家庭生活支出」逐项列出,算出**每英亩总成本、每英亩净利润、每蒲式耳保本价**,再乘以英亩数得到整场合计。表的右侧(列 P–W)挂着一个**价格 × 单产二维敏感性矩阵**,展示净利润如何随价格与单产偏移而变化。所有输入值由用户手填,默认值是「玉米带平均水平」的占位数;没有任何实时行情、本地化(ZIP/region)、basis 或预警逻辑。玉米在 E 列、大豆在 **H 列**、第三种作物(Other)在 K 列。

---

## 2. 成本科目分类

三大类:**Direct Expense(直接费用)** / **Capital Expense(资本费用:Land + Machinery)** / **Net Family Living(净家庭生活支出)**。
默认值取自 sheet11 玉米列(E)与大豆列(H)。

### 2.1 Direct Expense(直接费用 · sheet11 行19–35,`E36 = SUM(E19:E35)`)

| key | English label(原样) | corn (E) | soybean (H) |
|---|---|---:|---:|
| `chemicals-herbicide` | Chemicals (Herbicide) | 55 | 66 |
| `fungicide-insecticide` | Fungicide/Insecticide | 0 | 0 |
| `crop-insurance` | Crop Insurance | 22 | 19 |
| `custom-hire` | Custom Hire | 15 | 10 |
| `labor-hired-benefits` | Labor Hired & Employee Benefits | 21 | 15 |
| `fertilizer-lime` | Fertilizer and Lime | 200 | 72 |
| `gas-fuel-oil` | Gas/Fuel/Oil | 30 | 20 |
| `insurance` | Insurance | 20 | 16 |
| `operating-interest` | Operating Interest | 20 | 15 |
| `repairs-maintenance` | Repairs/Maintenance | 46 | 33 |
| `seed-plants-treated` | Seed/Plants (Treated) | 135 | 65 |
| `storage-drying-warehouse` | Storage/Drying/Warehouse | 30 | 2 |
| `supplies` | Supplies | 0 | 0 |
| `trucking-freight` | Trucking/Freight | 4 | 3 |
| `utilities` | Utilities | 10 | 8 |
| `other-expense-1` | Other Expense | 14 | 10 |
| `other-expense-2` | Other Expense | 0 | 0 |
| **合计** | **Total Direct Expense per Acre** | **622** | **354** |

> 共 17 个行项(含两个并列的 Other Expense)。Crop Insurance(行21)在该表里属于直接费用,与下方 Insurance(行26,通用保险)是两个独立科目,不要合并。

### 2.2 Capital Expense(资本费用 · 行37–38,`E39 = SUM(E37:E38)`)

| key | English label(原样) | corn (E) | soybean (H) |
|---|---|---:|---:|
| `land-cost` | Land Cost (P&I + Rent + RE Taxes) | 265 | 265 |
| `machinery-cost` | Machinery Cost (P&I + Lease) | 65 | 65 |
| **合计** | **Total Capital Expense per Acre** | **330** | **330** |

> 注:农机在此模型里是**成本变量**(每英亩 P&I + Lease),不是独立估值模块——与我们 CLAUDE.md 的定位一致。

### 2.3 Net Family Living(净家庭生活支出 · 行40–42)

| key | English label(原样) | 符号 | corn (E) | soybean (H) |
|---|---|---|---:|---:|
| `family-living-expense` | Family Living Expense | + | 0 | 0 |
| `non-farm-income-wages` | Non-Farm Income & Wages | **−(扣减)** | 0 | 0 |
| **结果** | **Net Family Living Expense** | = | **0** | **0** |

公式:`Net Family Living = max(0, Family Living − Non-Farm Income)`(行42:`IF(SUM(E40-E41)<0, 0, E40-E41)`)。
即:**只有当非农收入不足以覆盖家庭生活支出时**,缺口才被摊进农场成本、计入保本价;否则为 0。两个分量在 Input Tab 是整场金额(`E26`/`E25`),在本表按 `/总英亩 × 本作物英亩` 摊到每英亩(默认全为 0)。

---

## 3. 收入侧字段

| key | English label | corn (E) | soybean (H) | 公式 |
|---|---|---:|---:|---|
| `yield-bu-acre` | YIELD Bushel/Acre | 210 | 60 | 来自 Input Tab(APH 或 Expected,见下) |
| `cash-price` | Cash Price $/Bushel | 4.2 | 10.2 | `Input Tab!E18/E19` 手填 |
| `crop-revenue-acre` | Crop Revenue/Acre | 882 | 612 | `= yield × cash price` |
| `govt-payment` | Govt Payment (avg over acres) | 0 | 0 | 手填 |
| `total-revenue-acre` | Total Revenue per Acre | 882 | 612 | `= Crop Revenue + Govt Payment` |

**单产来源(下拉切换)**:E12 = `IF(E11=Z10, Input!C18, 0) + IF(E11=Z11, Input!D18, 0)`。
其中 `Z10="APH"`、`Z11="Expected Yield"` 是下拉两个选项;E11 是用户选择。即单产可在 **APH(`Input!C18`)** 与 **Expected Yield(`Input!D18`)** 之间切换,默认两者都是 210。

---

## 4. 保本与盈亏公式

| 指标 | 公式 | corn 验证 |
|---|---|---|
| Total Direct Expense | `SUM(行19:35)` | 622 |
| Total Capital Expense | `Land + Machinery` | 330 |
| Net Family Living | `max(0, FamilyLiving − NonFarmIncome)` | 0 |
| **Total Expense/Acre** | `Direct + Capital + NetFamilyLiving`(E44 = E36+E39+E42) | **622+330+0 = 952** |
| **Break-Even/bu** | `Total Expense/Acre ÷ Yield`(E48 = `IF(E12=0,0,AA40)`,`AA40 = E44/E12`) | **952 ÷ 210 = 4.5333** ✓ |
| **Net Margin/Acre** | `Total Revenue − Total Expense`(E46 = E16−E44) | 882 − 952 = **−70** |
| Total Revenue(整场) | `Revenue/Acre × Acres` | 882 × 100 = 88,200 |
| Total Expenses(整场) | `Expense/Acre × Acres` | 952 × 100 = 95,200 |
| Net Margin(整场) | `TotalRev − TotalExp` | **−7,000** |

> 已验证:`AA40 = $E$44/$E$12 = 952/210 = 4.5333…`,E48 直接引用它(并加 `IF(E12=0,0,…)` 防零)。
> **关键领域规则**:保本价用「每英亩总成本 ÷ 单产」,且盈亏用**农户手填现金价**(cash price)比对,而非期货价——与我们 CLAUDE.md 第 5 节一致。

---

## 5. 敏感性矩阵逻辑

右侧两张网格:**玉米在 Q7:W19**,**大豆在 Q28:W40**。结构相同,以玉米为例。

**轴定义**
- **横轴 = 单产(Bu./Acre)**,在第 10 行 Q10:W10。中心 `T10 = $E$12 = 210`;步长 `$U$21 = 10` 蒲式耳/格;左右各 3 格(extent ±3) → `180 / 190 / 200 / [210] / 220 / 230 / 240`(共 7 列)。
- **纵轴 = 现金价($/Bu)**,在 P 列 P11:P19。中心 `P15 = $E$13 = 4.2`;步长 `$Q$21 = 0.25` 美元/格;上下各 4 格(extent ±4) → `3.2 / 3.45 / 3.7 / 3.95 / [4.2] / 4.45 / 4.7 / 4.95 / 5.2`(共 9 行)。
- 轴中心与步长由命名占位:`$U$21=10` 标注 "Bushel Differential"、`$Q$21=0.25` 标注 "Price Differential"。大豆侧分别是 `$U$42=4`、`$Q$42=0.5`,中心 `T31=$H$12=60`、`P36=$H$13=10.2`。

**单元格计算(玉米)**
`Qij = (yield_j × price_i) − (E36 + E39 + E42) + E15`
即 `= 单产 × 价格 − Total Direct − Total Capital − Net Family Living + Govt Payment` = **每英亩净利润(Net Margin/Acre)**(注意:与 E46 一致,因为 Total Revenue = yield×price + govt)。

**附加保本行**:矩阵上方第 7–8 行另给一条「按单产变化的保本价」:`Q8 = $W$5/Q7`,其中 `$W$5 = E44 = 952`(整场玉米成本/英亩)→ 即 `保本价 = 总成本 ÷ 该列单产`(180→5.29,210→4.53,240→3.97)。

**重现样本(玉米净利润/英亩,行=价格,列=单产)**

| 价格＼单产 | 180 | 200 | **210** | 220 | 240 |
|---|---:|---:|---:|---:|---:|
| 3.70 | −286 | −212 | −175 | −138 | −64 |
| 3.95 | −241 | −162 | −122.5 | −83 | −4 |
| **4.20** | −196 | −112 | **−70** | −28 | 56 |
| 4.45 | −151 | −62 | −17.5 | 27 | 116 |
| 4.70 | −106 | −12 | 35 | 82 | 176 |

> 中心格(4.20 × 210)= **−70**,与 E46 完全吻合,确认矩阵中心就是基准情形。

---

## 6. 默认值兜底表(前端表单 fallback 种子)

> 来源优先级:`Input Tab` 为用户输入源头,`Farm Margin Manager` 为派生。下表合并两者。

### 收入与产量

| 字段 | corn | soybean | 来源单元格 |
|---|---:|---:|---|
| Acres(英亩) | 100 | 100 | `Input!C11 / C12` |
| APH Yield | 210 | 60 | `Input!C18 / C19` |
| Expected Yield | 210 | 60 | `Input!D18 / D19` |
| Cash Price $/bu | 4.2 | 10.2 | `Input!E18 / E19` |
| Crop Insurance Coverage | 0.8 | 0.8 | `Input!E11 / E12` |
| Govt Payment/acre | 0 | 0 | `sheet11 E15 / H15` |

### 整场参数(Input Tab)

| 字段 | 值 | 单元格 |
|---|---:|---|
| Total Acres | 200 | `C14`(= C11+C12+C13) |
| Rented/Shared Acres | 100 | `C25` |
| Owned Acres | 100 | `C26` |
| Non-Farm Wages/Income | 0 | `E25` |
| Family Living Costs | 0 | `E26` |
| Year | 2026 | `C3` |

### 成本行项(每英亩)

| key | corn | soybean |
|---|---:|---:|
| chemicals-herbicide | 55 | 66 |
| fungicide-insecticide | 0 | 0 |
| crop-insurance | 22 | 19 |
| custom-hire | 15 | 10 |
| labor-hired-benefits | 21 | 15 |
| fertilizer-lime | 200 | 72 |
| gas-fuel-oil | 30 | 20 |
| insurance | 20 | 16 |
| operating-interest | 20 | 15 |
| repairs-maintenance | 46 | 33 |
| seed-plants-treated | 135 | 65 |
| storage-drying-warehouse | 30 | 2 |
| supplies | 0 | 0 |
| trucking-freight | 4 | 3 |
| utilities | 10 | 8 |
| other-expense-1 | 14 | 10 |
| other-expense-2 | 0 | 0 |
| land-cost | 265 | 265 |
| machinery-cost | 65 | 65 |
| family-living-expense | 0 | 0 |
| non-farm-income-wages(扣减) | 0 | 0 |
| **Total Expense/Acre** | **952** | **684** |

---

## 7. 已知缺陷

- **全静态手填**:所有输入(单产、现金价、每项成本)都是用户在单元格里手敲;无任何外部数据源,玉米带「平均值」占位。我们的差异化恰恰在于把这些缝合成实时本地数据。
- **无本地化**:没有 ZIP / region 概念,没有本地粮库挂牌价或 basis;现金价(`Input!E18`)纯手打。底部仅给 MN FINBIN / ISU / IL FarmDoc 三个外链让用户「自己去查」,没有数据接入。
- **无预警 / 无信号**:没有卖出时机、basis 预警、轮作建议;敏感性矩阵只是静态展示,不会主动触发任何决策提示。也没有时间序列(只有单期 2026 快照)。
- **#DIV/0! 脆弱**(具体易崩单元格与触发条件):
  - `AC40 = $K$44/$K$12`:第三作物(Other)单产 `K12=0` 时即为 **#DIV/0!**(当前文件里已真实呈现为 `#DIV/0!`),只是被 `K48 = IF(K12=0,0,AC40)` 在展示层吞掉。`AA40`/`AB40` 同理,在玉米/大豆单产为 0 时也会崩,仅靠 E48/H48 的 `IF(...=0,0,...)` 兜住。
  - `Input!D21 / N21`(Total Revenue/Acre)、`F21`:除以 `Total Acres (C14)`。`N21` 无保护,`Total Acres=0`(三种作物英亩全 0)时 **#DIV/0!**;`F21` 有 `IF(C14=0,0,…)` 兜底,`N21` 没有。
  - `sheet11 E40/E41` 摊销式 `…*E9/E9`:当某作物英亩 `E9=0` 时出现 `0/0` → **#DIV/0!**,虽外层有 `IF(Input!C11>0,…,"0")` 半保护,但保护条件用的是 Input 的 C11 而非本表 E9,口径不一致,存在边缘失配风险。
  - **教训**:我们的保本/盈亏计算必须在「单产=0、英亩=0、总英亩=0」时显式返回安全值(0 或 N/A),不能依赖展示层的 IF 兜底;除法前先做 guard。

---

> 解析方式:Python stdlib `zipfile` + `xml.etree`(未安装 openpyxl)。sheet11=`xl/worksheets/sheet11.xml`,Input Tab=`sheet1.xml`,sharedStrings=`xl/sharedStrings.xml`。
