# AGENTS.md — Smart Farm

> Operational instructions for AI coding agents working in this repository.
> Human-curated. Update when observed failures warrant new rules; remove rules already enforced by tooling.
> Canonical project framing: `CLAUDE.md` (§0 defines the v1 scope). Contracts & calc conventions: `docs/v1-alignment.md`.

---

## Mission

Smart Farm (v1) is a **single-crop profit & breakeven calculator** for U.S. Corn Belt corn and soybean growers. The loop is small and self-contained:

```
Farmer input → calc engine (frontend TS) → output (P&L · breakeven · sensitivity heatmap) ; backend serves defaults + stores scenarios
```

A farmer enters yield, a **hand-entered local cash price**, and costs, then sees the breakeven price and whether they're profitable. The bar is: easier than the spreadsheets farmers use today, with the breakeven math correct.

**Hard constraints agents must internalize:**
- Frontend: Next.js (App Router) + TypeScript. Backend: Dart. **No cross-contamination.**
- **The calc engine lives in the frontend** (`frontend/src/lib/breakeven/`, pure TS — the single authoritative implementation). The backend does **not** compute margins; it only serves `GET /defaults` and persists scenarios. Never add a backend breakeven/margin endpoint.
- Crops: corn / soybean (an `other` slot is reserved). Architecture is **data-driven** — new crops / regions / cost items are config entries, never code branches.
- **v1 OUT — do not build**: live quotes / futures / basis, buy-sell signals, alerts, decision cockpit, rotation advice, marketing logs, insurance, depreciation engines, PDF reports. Cash price is hand-entered; v1 connects to no live data feed.

---

## Toolchain

### Frontend (`frontend/`)

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server → http://localhost:3000 |
| `npm run build` | Production build (type-checks included) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check only |

> No `test` script is configured yet; introduce vitest only after planning it in `tasks/todo.md`.
> **Next.js 16 warning**: this version has breaking changes vs. training data. Read `node_modules/next/dist/docs/` before writing any frontend code. Heed deprecation notices.
> MSW mock data ships with the app — frontend runs standalone without the backend.

### Backend (`backend/`)

| Command | Purpose |
|---------|---------|
| `dart run backend/backend.dart` | Start Dart API server |

---

## Judgment Boundaries

### 🚫 NEVER
- Write, modify, or refactor Dart / backend code (frontend-agent scope only)
- Add a backend endpoint that computes breakeven / margin / sensitivity — that math is the frontend's single source of truth
- Build any v1-OUT feature (market data, futures, basis, signals, alerts, cockpit, rotation) — see Mission
- Hardcode `if (state === 'IA')` or any crop/region branch — always use `src/config/` data-driven patterns
- Use a futures price to calculate farmer profit or breakeven — **always use the hand-entered local cash price**
- Implement backend logic to "fill in" a missing endpoint — write the contract in `tasks/api-contracts.md` and proxy via MSW mock instead
- Commit `.env` files, API keys, credentials, or secrets
- Force-push to `main` or run destructive git operations without explicit user instruction

### ⚠️ ASK FIRST
- Adding or removing npm / Dart dependencies
- Changing the shape of any endpoint in `tasks/api-contracts.md` or the `Scenario` schema in `docs/v1-alignment.md` (requires backend alignment)
- Modifying shared TypeScript types in `src/types/` in a breaking way
- Deleting existing feature code (confirm scope before removing working features)

### ✅ ALWAYS
- Write the plan in `tasks/todo.md` before touching any code: one goal sentence + checklist
- Mark tasks complete and add a review note when finished; move entry to "已完成"
- When an API contract doesn't exist: document expected request/response in `tasks/api-contracts.md` with `TODO: 待后端确认`, then build against MSW mock
- Keep `src/types/`, `tasks/api-contracts.md`, and `docs/v1-alignment.md` in sync — they are co-maintained, change one → align the others
- Route all fetch calls through `lib/api/` — no bare `fetch()` in components
- Update `tasks/lessons.md` after any user correction with: rule → why → how to apply

---

## Agent Roles

This project coordinates multiple specialized agents. Each agent reads this root AGENTS.md plus its scope-specific context.

### 🖥️ Frontend Agent
**Scope**: `frontend/` only.
**Stack**: Next.js 16 (App Router) · React 19 · TypeScript `strict: true` · Tailwind CSS 4.
**Reads first**: `frontend/AGENTS.md` (Next.js 16 breaking-change warnings), `docs/v1-alignment.md`, `tasks/api-contracts.md`.
**Key rules**:
- Owns the whole input → calc → output chain. The calc engine (`src/lib/breakeven/`) is the authoritative financial implementation — keep it pure and 0-guarded (no `#DIV/0!` / NaN).
- MSW handlers (`src/lib/mocks/handlers.ts`) are the only place API behavior is simulated — keep them in sync with `api-contracts.md`.
- No `any` types without an inline comment explaining why it's unavoidable.

### ⚙️ Backend Agent
**Scope**: `backend/` only.
**Stack**: Dart.
**Reads first**: `tasks/api-contracts.md` + `docs/v1-alignment.md` — the authoritative contract for every endpoint shape and the `Scenario` schema.
**Key rules**:
- v1 surface is only `GET /defaults` (default values) + scenario persistence (CRUD). **Do not compute margins / breakeven / sensitivity** — that is the frontend's single source of truth.
- All field names, units, and response shapes are the contract. Deviations must be discussed and the file updated before implementation.
- Units: USD (2 decimal places), bu/acre, acres. Never mix unit systems.

### 🗺️ Planning / Architecture Agent
**Scope**: `tasks/`, `docs/`, `CLAUDE.md`, `AGENTS.md`.
**Responsibilities**: Break features into tasks, maintain the contract + alignment docs, update `tasks/todo.md` and `tasks/lessons.md`, resolve cross-agent ambiguity.
**Key rule**: Outputs are plans, contracts, and lessons — does not write implementation code.

### 🔍 Review Agent
**Scope**: Read-only across all files.
**Responsibilities**: Code review, type consistency between `src/types/`, `tasks/api-contracts.md`, and `docs/v1-alignment.md`, security review, lesson extraction.
**Key rule**: Posts findings only — does not commit changes directly.

---

## Non-Obvious Domain Rules

These rules are invisible to agents without explicit guidance and frequently cause wrong output:

1. **Breakeven = total cost per acre ÷ yield** — always compare it against the **hand-entered local cash price**, never a futures quote. Using futures gives a categorically wrong answer for farmers.

2. **The calc engine is frontend TS, and it is the only implementation.** The backend does not compute. This keeps the sensitivity sliders instant (no round-trip) and prevents two copies of the formula from drifting apart. Do not move margin math to the backend.

3. **Cash price is a hand-entered input.** v1 has no live market feed, no ZIP/basis lookup. `GET /defaults` returns *default values* to pre-fill the form, not live prices.

4. **Net Family Living = max(0, family living − non-farm income)** — only the shortfall is counted as cost. Guard every division: yield = 0 / acres = 0 must return a safe value (0 or N/A), never `#DIV/0!` / NaN (a known competitor defect we fixed).

5. **Machinery and land are cost variables** — each is a single `$/acre` number that affects breakeven. Do not build appraisal features, TractorHouse comparisons, or auction-value estimation. Out of scope.

6. **Data-driven extensibility is non-negotiable** — adding a crop, region, or cost item must require only a config entry (`src/config/crops.ts`, `src/config/costModel.ts`, `src/config/states.ts`). If you're writing an `if/switch` on a crop or region name, stop and refactor to the config pattern.

---

## Context Map

```
smart-farm/
├── frontend/src/
│   ├── app/              # Route pages: /farm (input), /breakeven (output)
│   ├── components/       # UI by domain: farm/, breakeven/, layout/
│   ├── config/           # crops.ts, costModel.ts, states.ts — all enumerations live here
│   ├── lib/breakeven/    # Calc engine — pure TS, the authoritative financial implementation
│   ├── lib/api/          # Typed fetch wrappers
│   ├── lib/mocks/        # MSW handlers + seed data, mirrors api-contracts.md
│   └── types/            # Shared TS types, co-maintained with api-contracts.md + v1-alignment.md
├── backend/              # Dart REST API — GET /defaults + scenario persistence (no calc)
├── docs/v1-alignment.md  # v1 contract + calc conventions (source of truth)
└── tasks/
    ├── api-contracts.md  # REST endpoint shapes (defaults + scenarios)
    ├── domain-cost-model.md # Competitor (Compeer) cost-model reference for calibration
    ├── todo.md           # Task tracking — plan before implement
    └── lessons.md        # Accumulated rules from past corrections

Note: the legacy /market and /dashboard pages (futures/basis/signals) were removed on
2026-06-13 as v1-OUT. The tree now holds only the v1 core: /farm (input) + /breakeven (output).
```
