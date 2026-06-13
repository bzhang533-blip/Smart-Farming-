import type { Crop, Season } from "./common";
import type { CostItem } from "./farm";

export interface BreakevenRequest {
  farmId: string;
  fieldId: string;
  crop: Crop;
  season: Season;
  // —— 显式计算输入（TODO: 待后端确认是否由后端从档案读取，或由前端随请求提交）——
  costItems: CostItem[];        // 成本明细（分类项）
  aph: number;                  // 单产 bu/acre
  zip: string;                  // 用于后端解析本地现金价
  govtPaymentPerAcre?: number;  // 政府补贴 $/acre（可选）
  cashPrice?: number;           // 可选：前端已知的本地现金价；缺省时后端按 zip 解析
}

/** 成本科目小计（每英亩）。 */
export interface CostSubtotals {
  directTotal: number;
  capitalTotal: number;
  netFamilyLiving: number; // 已经过 max(0, 家庭生活 − 非农收入) 处理
}

/**
 * price × yield 敏感性矩阵。
 * - yieldAxis: 单产轴（列），bu/acre，升序
 * - priceAxis: 现金价轴（行），$/bu，升序
 * - cells[priceIndex][yieldIndex] = 每英亩净利润（Net Margin/Acre）
 */
export interface SensitivityMatrix {
  yieldAxis: number[];
  priceAxis: number[];
  cells: number[][];
}

export interface BreakevenResult {
  fieldId: string;
  crop: Crop;
  season: Season;
  breakevenPrice: number;      // $/bu — 前端 TS 引擎计算(唯一权威实现)；= 总成本/acre ÷ 单产
  totalCostPerAcre: number;    // $
  aph: number;                 // bu/acre
  currentCashPrice: number;    // $/bu — local cash price, NOT futures
  totalRevenuePerAcre: number; // $ — 单产 × 现金价 + 政府补贴
  profitPerBushel: number;     // $/bu
  profitPerAcre: number;       // $ — 同 netMarginPerAcre
  netMarginPerAcre: number;    // $ — Total Revenue − Total Expense
  profitMarginPct: number;     // %
  subtotals: CostSubtotals;
  sensitivityMatrix: SensitivityMatrix;
}
