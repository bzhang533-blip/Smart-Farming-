# Auth System Design — Smart Farm v1

**Date:** 2026-06-25  
**Status:** Approved  
**Scope:** Google OAuth via Clerk, user-scoped farm data, full route protection

---

## 1. Decision

Use **Clerk** as the third-party auth provider.

- Free tier: 10,000 MAU (sufficient for v1)
- Google OAuth: configured in Clerk Dashboard (no code)
- JWT: RS256, verifiable by any language via Clerk's JWKS endpoint
- Next.js App Router: first-class support via `@clerk/nextjs`

Login methods: **Google only** (v1). Email/password deferred to v2.

---

## 2. Architecture

```
User          Frontend (Next.js)        Clerk           Dart Backend
 │                   │                    │                   │
 │─ visit /farm ────▶│                    │                   │
 │                   │─ clerkMiddleware() ▶│                   │
 │                   │◀─ no session ───────│                   │
 │◀─ redirect /login ─│                    │                   │
 │─ Sign in w/ Google▶│─ OAuth flow ───────▶│                   │
 │◀─ back to app ─────│◀─ session + JWT ────│                   │
 │                   │─ GET /api/me/farm ─────────────────────▶│
 │                   │  Authorization: Bearer <JWT>             │
 │                   │◀─ FarmProfile (empty for new users) ─────│
```

**Responsibilities:**
- **Clerk**: Google OAuth flow + JWT issuance. No business data.
- **Frontend**: Route protection via middleware; JWT injected into all API calls.
- **Dart backend**: JWT verification via Clerk JWKS; `userId` from `sub` claim keys all data.

---

## 3. Frontend Changes

### New files

| File | Purpose |
|------|---------|
| `middleware.ts` | `clerkMiddleware()` — protects all routes except `/login` |
| `src/app/login/page.tsx` | Clerk `<SignIn />` with Google button |
| `.env.local` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |

### Modified files

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Wrap tree in `<ClerkProvider>` |
| `src/components/layout/NavBar.tsx` | Add `<UserButton />` (avatar + sign out) |
| `src/lib/api/client.ts` | Inject `Authorization: Bearer <token>` on every `apiFetch` call |
| `src/app/farm/page.tsx` | Replace hardcoded `farmId="farm-001"` with `userId` from `useUser()` |

### Route protection rules

- **Public**: `/login` only
- **Protected**: `/`, `/farm`, `/breakeven` — unauthenticated → redirect to `/login`
- **Post-login redirect**: Clerk returns user to the page they originally tried to access

---

## 4. Backend Changes (Dart)

See `tasks/api-contracts.md` §0 — Auth for the full Dart integration spec.

**Summary:**
1. Add JWT verification middleware using Clerk JWKS endpoint
2. Replace `/api/farm/profile/:farmId` with `/api/me/farm` (user-scoped)
3. Auto-create empty FarmProfile for new users on first `GET /api/me/farm`
4. All `/scenarios/*` endpoints: add JWT verification (userId already needed for ownership)
5. `GET /defaults`: optionally add JWT verification (low-risk, but consistent)

---

## 5. Data Model Impact

`farmId` is eliminated as a user-facing concept. The Dart backend may keep an internal `farmId` as a primary key, but the frontend never sends or receives it — the farm is identified implicitly by the authenticated user.

**FarmProfile auto-creation (new users):**
```json
{
  "name": "<Google display name>'s Farm",
  "state": "IA",
  "fields": [],
  "costStructure": []
}
```

---

## 6. Out of Scope (v1)

- Email/password login
- Multiple farms per user
- Guest/demo mode
- Account deletion
- Role-based access control
