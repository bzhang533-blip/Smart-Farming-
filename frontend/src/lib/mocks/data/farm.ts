import type { FarmProfile, MachineryListResponse } from "@/types";

export const mockFarmProfile: FarmProfile = {
  farmId: "farm-001",
  name: "Green Acres Farm",
  state: "IA",
  fields: [
    {
      fieldId: "field-001",
      name: "North Field",
      acres: 320,
      zip: "50126",
      crop: "corn",
      aph: 185,
    },
    {
      fieldId: "field-002",
      name: "South Field",
      acres: 240,
      zip: "50126",
      crop: "soybean",
      aph: 52,
    },
  ],
  costStructure: {
    seedCostPerAcre: 110,
    fertilizerCostPerAcre: 95,
    chemicalCostPerAcre: 40,
    landRentPerAcre: 230,
    machineryDepreciationPerAcre: 55,
    laborCostPerAcre: 20,
    otherCostPerAcre: 15,
  },
};

export const mockMachinery: MachineryListResponse = {
  farmId: "farm-001",
  machinery: [
    {
      machineryId: "mach-001",
      type: "tractor",
      model: "John Deere 8R 370",
      purchaseYear: 2022,
      purchasePrice: 420000,
      estimatedUsefulLifeYears: 15,
      annualAcresCovered: 1200,
      referenceValueRange: { low: 310000, high: 360000 },
    },
    {
      machineryId: "mach-002",
      type: "combine",
      model: "John Deere S780",
      purchaseYear: 2021,
      purchasePrice: 550000,
      estimatedUsefulLifeYears: 12,
      annualAcresCovered: 1200,
      referenceValueRange: { low: 390000, high: 430000 },
    },
  ],
};
