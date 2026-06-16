# Goal:实现 v1 计算引擎(scenario.ts + calc.ts + tests)

## 目标(一句话)
在 `src/lib/calc/` 实现 v1 的财务计算引擎:Scenario 类型 + 纯计算函数 + 单元测试。**跑通验证(全绿)即完成。** 这是 CLAUDE.md §2 说的「唯一一份计算实现」。

## 开工前先读
- `CLAUDE.md` —— 尤其 §0(v1 范围)、§2(计算归属)、§6(技术约定)、§7(命令)。
- `docs/v1-alignment.md` §6(Scenario schema)与 §7(函数签名)。
- 按 CLAUDE.md 工作流来:先进 plan 模式把计划写进 `tasks/todo.md`,实现完跑验证,绿了再标完成,有修正写进 `tasks/lessons.md`。

## 范围与约束
- **纯 TypeScript,框架无关**:不 `import next/*`、不依赖 React、不引用 app 里其他模块。`strict: true`,不用 `any`。
- 只做 v1:不碰行情 / basis / 预警 / A3-29 / PDF。土地、农机成本就是 `CropEntry` 上的两个 `$/acre` 数字字段。
- 类型与 `docs/v1-alignment.md` / `tasks/api-contracts.md` 同源。

## 交付物
1. **`scenario.ts`** —— 类型:`CropKey`、`CostSource`、`CostLine`、`CropEntry`、`FamilyLiving`、`Scenario`(照 alignment §6)。
2. **`calc.ts`** —— 纯函数,签名照 alignment §7:
   - `revenuePerAcre(c)` = yield × cashPrice + govtPayment
   - `totalDirectExpense(c)` = Σ directCosts[].value
   - `totalCapitalExpense(c)` = land + machinery
   - `totalExpensePerAcre(c, netFamilyLivingPerAcre = 0)`
   - `netMarginPerAcre(...)` = revenue − totalExpense
   - `breakevenPrice(...)` = totalExpense ÷ yield(**yield ≤ 0 返回 NaN**)
   - `breakevenYield(...)` = totalExpense ÷ cashPrice(price ≤ 0 返回 NaN)
   - `sensitivityGrid(c, priceRange, yieldRange, nfl = 0)` → `number[][]`,**rows = price、cols = yield**,cell = yield × price − 固定成本 + govtPayment
   - `familyLivingPerAcre(s)` = max(0, living − nonFarm) ÷ 总英亩
   - `wholeFarm(s)` → `{ revenue, expense, netMargin }`,每作物 per-acre × acres 求和
3. **`calc.test.ts`**(vitest) —— 用下面的真实预算当 fixture,断言 sanity 数字。

## 验证目标(Definition of Done —— 必须全绿才算完成)
跑 typecheck + lint + test 全过(命令见 CLAUDE.md §7;若 §7 还没填,先用 `npx tsc --noEmit` 和 `npx vitest run`),且 `calc.test.ts` 断言以下数字(来自参考预算表)。

**Fixture(corn / soybean,各 100 acres,land = 265、machinery = 65,govtPayment = 0):**

| 成本行 (key) | corn | soybean |
|---|---|---|
| chemicals_herbicide | 55 | 66 |
| fungicide_insecticide | 0 | 0 |
| crop_insurance | 22 | 19 |
| custom_hire | 15 | 10 |
| labor_hired | 21 | 15 |
| fertilizer_lime | 200 | 72 |
| fuel_oil | 30 | 20 |
| insurance | 20 | 16 |
| operating_interest | 20 | 15 |
| repairs_maintenance | 46 | 33 |
| seed | 135 | 65 |
| storage_drying | 30 | 2 |
| supplies | 0 | 0 |
| trucking_freight | 4 | 3 |
| utilities | 10 | 8 |
| other_1 | 14 | 10 |
| other_2 | 0 | 0 |

**断言目标:**
- **corn**(yield 210, price 4.20):directExpense = 622、capital = 330、totalExpense = 952、revenue = 882、margin = −70、breakeven ≈ 4.533
- **soybean**(yield 60, price 10.20):directExpense = 354、capital = 330、totalExpense = 684、revenue = 612、margin = −72、breakeven = 11.40
- **whole-farm**(corn + soybean 各 100 ac):revenue = 149400、expense = 163600、net = −14200
- **sensitivity**(corn):(price 4.20, yield 210) = −70、(price 4.70, yield 210) = +35
- **guard**:yield = 0 时 `breakevenPrice` 返回 NaN

(浮点数用 `toBeCloseTo`,纯整数和用 `toBe`。)

## 完成前自检
- typecheck / lint / test 全绿,把测试输出贴出来。
- 没有 `import` 任何 `next/*` 或 React。
- 没碰后端 / Dart 代码。
- 标完成前问自己:「资深工程师会批准这个吗?」
