import type { BreakevenRequest, BreakevenResult, RevenueInputs } from "@/types";
import { CROP_CONFIG } from "@/config/crops";
import { buildDefaultCostItems } from "@/config/costModel";
import { computeBreakevenPreview } from "@/lib/breakeven/preview";

/**
 * Mock 保本结果：用非权威预览引擎生成，保证与契约同形状、且随请求输入变化。
 * 后端上线后，本 mock 由 `POST /api/breakeven/calculate` 的真实响应替换。
 */

// 各字段的「当地现金价」mock（决策层比对用，非期货价）。
const MOCK_CASH_PRICE: Record<string, number> = {
  "field-001": 4.85, // corn
  "field-002": 11.1, // soybean
};

/** 从请求构造结果；缺失字段用作物默认值兜底，便于直接拉起页面演示。 */
export function breakevenFromRequest(req: Partial<BreakevenRequest>): BreakevenResult {
  const crop = req.crop ?? "corn";
  const fieldId = req.fieldId ?? "field-001";
  const cfg = CROP_CONFIG[crop];
  const items =
    req.costItems && req.costItems.length > 0
      ? req.costItems
      : buildDefaultCostItems(crop);
  const revenue: RevenueInputs = {
    aph: req.aph ?? cfg.revenueDefaults.aph,
    cashPrice: req.cashPrice ?? cfg.revenueDefaults.cashPrice,
    govtPaymentPerAcre: req.govtPaymentPerAcre ?? cfg.revenueDefaults.govtPaymentPerAcre,
  };
  return computeBreakevenPreview({
    fieldId,
    crop,
    season: req.season ?? "2026",
    items,
    revenue,
    currentCashPrice: req.cashPrice ?? MOCK_CASH_PRICE[fieldId] ?? cfg.revenueDefaults.cashPrice,
  });
}

// 默认导出一份玉米 North Field 的结果（无请求体时的兜底）。
export const mockBreakevenResult: BreakevenResult = breakevenFromRequest({
  fieldId: "field-001",
  crop: "corn",
  aph: 210,
});
