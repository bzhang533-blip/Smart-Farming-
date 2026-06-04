import type { Crop } from "@/types";

interface CropConfig {
  label: string;
  unit: string;          // yield unit
  futuresSymbol: string; // CME symbol
}

export const CROP_CONFIG: Record<Crop, CropConfig> = {
  corn: {
    label: "Corn",
    unit: "bu/acre",
    futuresSymbol: "ZC",
  },
  soybean: {
    label: "Soybean",
    unit: "bu/acre",
    futuresSymbol: "ZS",
  },
};

export const CROPS = Object.keys(CROP_CONFIG) as Crop[];
