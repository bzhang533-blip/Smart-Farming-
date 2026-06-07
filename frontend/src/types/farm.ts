import type { Crop, State } from "./common";

/**
 * 成本科目分类（源自 Compeer Grain Margin Manager，见 tasks/domain-cost-model.md）。
 * - direct:          直接费用（种子、化肥、农药、人工、燃油…）
 * - capital:         资本费用（土地 P&I+租金+地税、农机 P&I+租赁）
 * - netFamilyLiving: 净家庭生活支出 = max(0, 家庭生活支出 − 非农收入)
 */
export type CostCategory = "direct" | "capital" | "netFamilyLiving";

/**
 * 单条成本项（每英亩）。`key` 对应 config/costModel.ts 的 COST_ITEM_CATALOG，
 * 不在此硬编码标签/分类逻辑——分类与默认值由配置驱动（data-driven）。
 */
export interface CostItem {
  key: string;
  category: CostCategory;
  valuePerAcre: number;
}

/** 农场成本结构 = 分类化的成本项数组（取代旧的扁平字段）。 */
export type CostStructure = CostItem[];

/** 收入侧输入（每英亩）。盈亏比对必须用本地现金价，禁止用期货价。 */
export interface RevenueInputs {
  aph: number;                // 单产 bu/acre（APH 或 Expected Yield）
  cashPrice: number;          // 本地现金价 $/bu —— 非期货价
  govtPaymentPerAcre: number; // 政府补贴 $/acre
}

export interface Field {
  fieldId: string;
  name: string;
  acres: number;
  zip: string;
  crop: Crop;
  aph: number; // average production history (bu/acre)
}

export interface ValueRange {
  low: number;
  high: number;
}

export interface Machinery {
  machineryId: string;
  type: string;
  model: string;
  purchaseYear: number;
  purchasePrice: number;
  estimatedUsefulLifeYears: number;
  annualAcresCovered: number;
  referenceValueRange: ValueRange;
}

export interface FarmProfile {
  farmId: string;
  name: string;
  state: State;
  fields: Field[];
  costStructure: CostStructure;
}

export interface MachineryListResponse {
  farmId: string;
  machinery: Machinery[];
}
