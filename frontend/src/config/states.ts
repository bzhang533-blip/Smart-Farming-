import type { State } from "@/types";

interface StateConfig {
  label: string;
  fips: string;
}

export const STATE_CONFIG: Record<State, StateConfig> = {
  IA: { label: "Iowa", fips: "19" },
  IL: { label: "Illinois", fips: "17" },
  IN: { label: "Indiana", fips: "18" },
};

export const STATES = Object.keys(STATE_CONFIG) as State[];
