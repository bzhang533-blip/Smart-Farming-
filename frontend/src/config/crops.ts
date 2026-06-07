import type { Crop } from "@/types";

/** 敏感性矩阵的轴配置（price × yield 网格的步长与延展格数）。 */
interface SensitivityConfig {
  yieldStep: number;   // 单产每格增量 bu/acre
  yieldExtent: number; // 单产轴中心左右各几格
  priceStep: number;   // 现金价每格增量 $/bu
  priceExtent: number; // 价格轴中心上下各几格
}

interface CropConfig {
  label: string;
  unit: string;          // yield unit
  futuresSymbol: string; // CME symbol（仅展示，不用于盈亏权威计算）
  // 录入兜底默认值（源自 Compeer Grain Margin Manager，见 tasks/domain-cost-model.md）
  revenueDefaults: {
    aph: number;                // 单产 bu/acre
    cashPrice: number;          // 本地现金价 $/bu
    govtPaymentPerAcre: number; // 政府补贴 $/acre
  };
  sensitivity: SensitivityConfig;
}

export const CROP_CONFIG: Record<Crop, CropConfig> = {
  corn: {
    label: "Corn",
    unit: "bu/acre",
    futuresSymbol: "ZC",
    revenueDefaults: { aph: 210, cashPrice: 4.2, govtPaymentPerAcre: 0 },
    sensitivity: { yieldStep: 10, yieldExtent: 3, priceStep: 0.25, priceExtent: 4 },
  },
  soybean: {
    label: "Soybean",
    unit: "bu/acre",
    futuresSymbol: "ZS",
    revenueDefaults: { aph: 60, cashPrice: 10.2, govtPaymentPerAcre: 0 },
    sensitivity: { yieldStep: 4, yieldExtent: 3, priceStep: 0.5, priceExtent: 4 },
  },
};

export const CROPS = Object.keys(CROP_CONFIG) as Crop[];
