import { http, HttpResponse } from "msw";
import type { Scenario } from "@/lib/calc/scenario";
import { mockFarmProfile, mockMachinery } from "./data/farm";
import { mockDefaults } from "./data/defaults";

// ── In-memory scenario store (browser session lifetime) ──────────────────────
interface StoredScenario extends Record<string, unknown> {
  id: string;
  createdAt: string;
  updatedAt: string;
}

let scenarioStore: StoredScenario[] = [];

function newId(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `scn_${Date.now()}${hex}`;
}

function summaryFor(s: StoredScenario) {
  const crops = s["crops"] as { crop?: string }[] | undefined;
  const farm = s["farm"] as { name?: string } | undefined;
  return {
    id: s.id,
    name: farm?.name ?? `Scenario ${s.id}`,
    crop: crops?.[0]?.crop ?? "corn",
    season: String(s["year"] ?? "2026"),
    updatedAt: s.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export const handlers = [
  // Farm profile
  http.get("/api/farm/profile/:farmId", () =>
    HttpResponse.json(mockFarmProfile),
  ),

  http.post("/api/farm/profile", () =>
    HttpResponse.json({ farmId: "farm-001" }, { status: 201 }),
  ),

  http.put("/api/farm/profile/:farmId", () =>
    HttpResponse.json({ ok: true }),
  ),

  http.get("/api/farm/machinery", () =>
    HttpResponse.json(mockMachinery),
  ),

  // GET /defaults
  http.get("/defaults", () => HttpResponse.json(mockDefaults)),

  // GET /scenarios — list summaries
  http.get("/scenarios", () =>
    HttpResponse.json({
      scenarios: [...scenarioStore]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(summaryFor),
    }),
  ),

  // POST /scenarios — create
  http.post("/scenarios", async ({ request }) => {
    const body = (await request.json().catch(() => null)) as Scenario | null;
    if (!body) return HttpResponse.json({ message: "Invalid body" }, { status: 400 });
    const now = new Date().toISOString();
    const stored: StoredScenario = {
      ...(body as unknown as Record<string, unknown>),
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    scenarioStore.push(stored);
    return HttpResponse.json({ id: stored.id, updatedAt: stored.updatedAt }, { status: 201 });
  }),

  // GET /scenarios/:id — fetch one
  http.get("/scenarios/:id", ({ params }) => {
    const scenario = scenarioStore.find((s) => s.id === params.id);
    if (!scenario) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    return HttpResponse.json(scenario);
  }),

  // DELETE /scenarios/:id
  http.delete("/scenarios/:id", ({ params }) => {
    const before = scenarioStore.length;
    scenarioStore = scenarioStore.filter((s) => s.id !== params.id);
    if (scenarioStore.length === before)
      return HttpResponse.json({ message: "Not found" }, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),
];
