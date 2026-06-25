import { apiFetch, hasConfiguredApiBase } from "./client";
import type { Scenario } from "@/lib/calc/scenario";

export interface ScenarioSummary {
  id: string;
  name: string;
  crop: string;
  season: string;
  updatedAt: string;
}

type LocalScenario = Scenario & { id: string; createdAt: string; updatedAt: string };

let localScenarios: LocalScenario[] = [];

function makeLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function summarizeScenario(scenario: LocalScenario): ScenarioSummary {
  return {
    id: scenario.id,
    name: scenario.farm.name ?? `Scenario ${scenario.id}`,
    crop: scenario.crops[0]?.crop ?? "corn",
    season: String(scenario.year),
    updatedAt: scenario.updatedAt,
  };
}

export function listScenarios(): Promise<{ scenarios: ScenarioSummary[] }> {
  if (!hasConfiguredApiBase()) {
    return Promise.resolve({
      scenarios: [...localScenarios]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(summarizeScenario),
    });
  }
  return apiFetch("/scenarios");
}

export function getScenario(id: string): Promise<Scenario & { id: string }> {
  if (!hasConfiguredApiBase()) {
    const scenario = localScenarios.find((item) => item.id === id);
    if (!scenario) return Promise.reject(new Error("Scenario not found"));
    return Promise.resolve(scenario);
  }
  return apiFetch(`/scenarios/${id}`);
}

export function createScenario(
  scenario: Scenario,
): Promise<{ id: string; updatedAt: string }> {
  if (!hasConfiguredApiBase()) {
    const now = new Date().toISOString();
    const saved = { ...scenario, id: makeLocalId(), createdAt: now, updatedAt: now };
    localScenarios = [saved, ...localScenarios];
    return Promise.resolve({ id: saved.id, updatedAt: saved.updatedAt });
  }
  return apiFetch("/scenarios", {
    method: "POST",
    body: JSON.stringify(scenario),
  });
}

export function deleteScenario(id: string): Promise<void> {
  if (!hasConfiguredApiBase()) {
    localScenarios = localScenarios.filter((scenario) => scenario.id !== id);
    return Promise.resolve();
  }
  return apiFetch(`/scenarios/${id}`, { method: "DELETE" });
}
