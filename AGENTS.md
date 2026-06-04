# AGENTS.md — Smart Farm

> Operational instructions for AI coding agents working in this repository.
> Human-curated. Update when observed failures warrant new rules; remove rules already enforced by tooling.

---

## Mission

Smart Farm is a profit-planning tool for U.S. small/mid-sized farms in the Corn Belt (IA · IL · IN), targeting corn and soybean growers. The core loop: connect local elevator cash prices + farm cost structure → true breakeven price → sell / hold signal.

**Hard constraints agents must internalize:**
- Frontend: Next.js (App Router) + TypeScript. Backend: Dart. **No cross-contamination.**
- Breakeven truth lives in the backend (single source of truth). Frontend may preview inline; never treat frontend math as authoritative.
- MVP covers IA/IL/IN × corn/soybean only. Architecture is **data-driven** — new states/crops require only config changes, never code branches.

---

## Toolchain

### Frontend (`frontend/`)

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server → http://localhost:3000 |
| `npm run build` | Production build (type-checks included) |
| `npm run lint` | ESLint |

> **Next.js 16 warning**: This version has breaking changes vs. training data. Read `node_modules/next/dist/docs/` before writing any frontend code. Heed deprecation notices.
> MSW mock data ships with the app — frontend runs standalone without the backend.

### Backend (`backend/`)

| Command | Purpose |
|---------|---------|
| `dart run backend/backend.dart` | Start Dart API server |

---

## Judgment Boundaries

### 🚫 NEVER
- Write, modify, or refactor Dart / backend code (frontend-agent scope only)
- Hardcode `if (state === 'IA')` or any state/crop branch — always use `src/config/` data-driven patterns
- Use CME futures price to calculate farmer profit or breakeven — **always use local cash price**
- Implement backend logic to "fill in" a missing API endpoint — write the contract in `tasks/api-contracts.md` and proxy via MSW mock instead
- Commit `.env` files, API keys, credentials, or secrets
- Force-push to `main` or run destructive git operations without explicit user instruction

### ⚠️ ASK FIRST
- Adding or removing npm / Dart dependencies
- Changing the shape of any endpoint in `tasks/api-contracts.md` (requires backend alignment)
- Modifying shared TypeScript types in `src/types/` in a breaking way
- Any schema migration or destructive data operation

### ✅ ALWAYS
- Write the plan in `tasks/todo.md` before touching any code: one goal sentence + checklist
- Mark tasks complete and add a review note when finished; move entry to "已完成"
- When an API contract doesn't exist: document expected request/response in `tasks/api-contracts.md` with `TODO: 待后端确认`, then build against MSW mock
- Keep `src/types/` in sync with `tasks/api-contracts.md` — they are co-maintained
- Route all fetch calls through `lib/api/` — no bare `fetch()` in components
- Update `tasks/lessons.md` after any user correction with: rule → why → how to apply

---

## Agent Roles

This project coordinates multiple specialized agents. Each agent reads this root AGENTS.md plus its scope-specific context.

### 🖥️ Frontend Agent
**Scope**: `frontend/` only.  
**Stack**: Next.js 16 (App Router) · React 19 · TypeScript `strict: true` · Tailwind CSS 4.  
**Reads first**: `frontend/AGENTS.md` (Next.js 16 breaking-change warnings), `tasks/api-contracts.md`.  
**Key rules**:
- MSW handlers (`frontend/src/lib/mocks/handlers.ts`) are the only place API behavior is simulated — keep them in sync with `api-contracts.md`.
- No `any` types without an inline comment explaining why it's unavoidable.
- Component split: presentational components in `components/`, data-fetching logic in page files or dedicated hooks.

### ⚙️ Backend Agent
**Scope**: `backend/` only.  
**Stack**: Dart.  
**Reads first**: `tasks/api-contracts.md` — this is the authoritative contract for every endpoint shape.  
**Key rules**:
- All field names, units, and response shapes in `tasks/api-contracts.md` are the contract. Deviations must be discussed and the file updated before implementation.
- Financial calculations (breakeven, profit) are the backend's responsibility and must be the single source of truth.
- Units: USD (2 decimal places), bu/acre, acres. Never mix unit systems.

### 🗺️ Planning / Architecture Agent
**Scope**: `tasks/`, `CLAUDE.md`, `AGENTS.md`.  
**Responsibilities**: Break features into tasks, write API contracts, update `tasks/todo.md` and `tasks/lessons.md`, resolve cross-agent ambiguity.  
**Key rule**: Outputs are plans, contracts, and lessons — does not write implementation code.

### 🔍 Review Agent
**Scope**: Read-only across all files.  
**Responsibilities**: Code review, type consistency between `src/types/` and `tasks/api-contracts.md`, security review, lesson extraction.  
**Key rule**: Posts findings only — does not commit changes directly.

---

## Non-Obvious Domain Rules

These rules are invisible to agents without explicit guidance and frequently cause wrong output:

1. **`basis = cash − futures`** — stored as a time series per ZIP/region. It is not a static discount; it fluctuates seasonally and is the primary driver of whether a sale is profitable. Never compute or display profit without factoring in basis.

2. **Breakeven = total cost per acre ÷ yield** — always compare this against the **local cash price**, never the CME futures quote. Using futures gives a categorically wrong answer for farmers.

3. **"Real-time" means daily / hourly elevator price updates** — not tick-level streaming. Do not add WebSockets or sub-minute polling for cash prices. Farmers call their elevator once a day, not every second.

4. **Machinery is a cost variable** — it affects breakeven (cost per acre, payback period). Do not build appraisal features, TractorHouse comparisons, or auction-value estimation. That is explicitly out of scope.

5. **Data-driven extensibility is non-negotiable** — adding a new state or crop must require only a config entry in `src/config/crops.ts` or `src/config/states.ts`. If you find yourself writing an `if/switch` on a crop or state name, stop and refactor to use the config pattern.

---

## Context Map

```
smart-farm/
├── frontend/src/
│   ├── app/              # Route pages: /dashboard, /farm, /market
│   ├── components/       # UI by domain: dashboard/, farm/, market/, layout/
│   ├── config/           # crops.ts, states.ts — all enumerations live here
│   ├── lib/api/          # Typed fetch wrappers (breakeven, dashboard, farm, market)
│   ├── lib/mocks/        # MSW handlers + seed data, mirrors api-contracts.md
│   └── types/            # Shared TS types, co-maintained with api-contracts.md
├── backend/              # Dart REST API (breakeven engine, data aggregation)
└── tasks/
    ├── api-contracts.md  # Source of truth for all REST endpoint shapes
    ├── todo.md           # Task tracking — plan before implement
    └── lessons.md        # Accumulated rules from past corrections
```
