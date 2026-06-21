import { apiFetch } from "./client";
import type { Scenario } from "@/lib/calc/scenario";

export interface ScenarioSummary {
  id: string;
  name: string;
  crop: string;
  season: string;
  updatedAt: string;
}

export function listScenarios(): Promise<{ scenarios: ScenarioSummary[] }> {
  return apiFetch("/scenarios");
}

export function getScenario(id: string): Promise<Scenario & { id: string }> {
  return apiFetch(`/scenarios/${id}`);
}

export function createScenario(
  scenario: Scenario,
): Promise<{ id: string; updatedAt: string }> {
  return apiFetch("/scenarios", {
    method: "POST",
    body: JSON.stringify(scenario),
  });
}

export function deleteScenario(id: string): Promise<void> {
  return apiFetch(`/scenarios/${id}`, { method: "DELETE" });
}
