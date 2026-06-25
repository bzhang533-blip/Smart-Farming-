# Clerk Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google-only auth via Clerk so every page is protected, JWT is injected into all API calls, and farm data is keyed by the authenticated user.

**Architecture:** `clerkMiddleware()` in `frontend/middleware.ts` protects all routes except `/login`; `apiFetch` picks up the Clerk session token automatically from `window.Clerk.session.getToken()` with no call-site changes; farm API endpoints migrate from `farmId`-keyed to user-scoped `/api/me/farm`.

**Tech Stack:** `@clerk/nextjs` (latest v6), Next.js 16 App Router, MSW for mocks, TypeScript strict.

## Global Constraints

- `frontend/` is the Next.js project root — all commands run there unless noted.
- No `any` without a comment; `strict: true` is enforced.
- Keep amber/stone design tokens throughout — no new blue/gray/indigo.
- Clerk publishable key prefix: `pk_test_` (dev), `pk_live_` (prod). Never commit real keys.
- MSW mock must keep working for local dev without a real Clerk session (token will be `null`, backend bypasses auth check when header is absent in dev).
- `farmId` prop is **removed** from `FarmClient` and `BreakevenClient` — identity comes from JWT.
- Do not modify any Dart backend files.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `frontend/middleware.ts` | Route protection via `clerkMiddleware()` |
| Create | `frontend/src/app/login/page.tsx` | Branded login page with `<SignIn />` |
| Create | `frontend/.env.local` | Local Clerk keys (gitignored) |
| Modify | `frontend/.env.example` | Add Clerk key placeholders |
| Modify | `frontend/src/app/layout.tsx` | Wrap in `<ClerkProvider>` |
| Modify | `frontend/src/components/layout/NavBar.tsx` | Add `<UserButton />` |
| Modify | `frontend/src/lib/api/client.ts` | Auto-inject `Authorization: Bearer` header |
| Modify | `frontend/src/lib/api/farm.ts` | Migrate to `/api/me/farm` endpoints |
| Modify | `frontend/src/lib/mocks/handlers.ts` | Add `/api/me/farm` mock handlers |
| Modify | `frontend/src/app/farm/page.tsx` | Remove hardcoded `farmId` prop |
| Modify | `frontend/src/app/breakeven/page.tsx` | Remove hardcoded `farmId` prop |
| Modify | `frontend/src/components/farm/FarmClient.tsx` | Remove `farmId` prop + `updateFarmProfile` call site |
| Modify | `frontend/src/components/breakeven/BreakevenClient.tsx` | Remove `farmId` prop |

---

### Task 1: Install Clerk and configure environment

**Files:**
- Modify: `frontend/package.json` (dependency added by npm)
- Modify: `frontend/.env.example`
- Create: `frontend/.env.local`

**Interfaces:**
- Produces: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` env vars available to the app.

- [ ] **Step 1: Install `@clerk/nextjs`**

```bash
cd frontend && npm install @clerk/nextjs
```

Expected output ends with: `added N packages` (no errors).

- [ ] **Step 2: Create a Clerk application**

Go to [clerk.com](https://clerk.com) → "Add application" → name it "Smart Farm" → enable **Google** as the only social connection → disable email/password → copy the API keys shown on the dashboard.

- [ ] **Step 3: Create `.env.local` with your keys**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_<your-key-here>
CLERK_SECRET_KEY=sk_test_<your-key-here>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/farm
```

- [ ] **Step 4: Add placeholders to `.env.example`**

Open `frontend/.env.example` and append:

```
# Clerk auth (get keys from clerk.com dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_
CLERK_SECRET_KEY=sk_test_
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/farm
```

- [ ] **Step 5: Verify the package installed**

```bash
cat node_modules/@clerk/nextjs/package.json | grep '"version"'
```

Expected: `"version": "6.x.x"` (major version 6).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat(auth): install @clerk/nextjs"
```

---

### Task 2: Wrap layout in ClerkProvider and add middleware

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Create: `frontend/middleware.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` from env (Task 1)
- Produces: All routes except `/login` redirect to `/login` if no Clerk session exists.

- [ ] **Step 1: Wrap layout in `<ClerkProvider>`**

Replace the entire content of `frontend/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import NavBar from "@/components/layout/NavBar";
import MockProvider from "@/lib/mocks/MockProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Farm",
  description: "A simple profit & breakeven calculator for corn/soybean growers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="min-h-full flex flex-col bg-gray-50">
          <MockProvider>
            <NavBar />
            <main className="flex-1">{children}</main>
          </MockProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Create `frontend/middleware.ts`**

This file must sit at `frontend/middleware.ts` (alongside `package.json`), NOT inside `src/`.

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/login(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx middleware.ts
git commit -m "feat(auth): add ClerkProvider and route-protection middleware"
```

---

### Task 3: Create the login page

**Files:**
- Create: `frontend/src/app/login/page.tsx`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login` (Task 1); `<SignIn />` from `@clerk/nextjs`
- Produces: `/login` renders a branded page with the Clerk Google sign-in button; after sign-in Clerk redirects to `/farm`.

- [ ] **Step 1: Create the login page**

Create `frontend/src/app/login/page.tsx`:

```tsx
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      <div className="mb-8 text-center max-w-sm">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 mb-3">
          Smart Farm
        </p>
        <h1 className="text-3xl font-bold text-stone-900 leading-tight">
          Know your breakeven.
        </h1>
        <p className="mt-3 text-sm text-stone-500 leading-relaxed">
          Enter a few numbers. Instantly see what you need to sell at — no spreadsheet required.
        </p>
      </div>
      <SignIn routing="hash" />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify the page renders**

Start the dev server (`npm run dev`) and open `http://localhost:3000/login` in your browser. You should see the branded heading above a Clerk-rendered Google sign-in button. The button may not work yet (Clerk needs the real domain configured).

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat(auth): add branded login page with Clerk SignIn"
```

---

### Task 4: Add UserButton to NavBar

**Files:**
- Modify: `frontend/src/components/layout/NavBar.tsx`

**Interfaces:**
- Consumes: `<UserButton />` from `@clerk/nextjs` — renders nothing when logged out, avatar + sign-out when logged in.
- Produces: NavBar shows avatar/sign-out for authenticated users; hides on `/login`.

- [ ] **Step 1: Update NavBar**

Replace the entire content of `frontend/src/components/layout/NavBar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const LINKS = [
  { href: "/",          label: "Overview"  },
  { href: "/farm",      label: "Farm"      },
  { href: "/breakeven", label: "Breakeven" },
];

export default function NavBar() {
  const pathname = usePathname();

  // Login page has its own full-page layout — no NavBar needed.
  if (pathname === "/login") return null;

  return (
    <nav className="border-b border-stone-200 bg-white px-6 py-3 flex items-center gap-6">
      <Link
        href="/"
        className="text-sm font-bold text-stone-900 mr-2 hover:text-amber-600 transition-colors"
      >
        Smart Farm
      </Link>
      {LINKS.map(({ href, label }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm transition-colors ${
              isActive
                ? "text-amber-600 font-semibold"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <div className="ml-auto">
        <UserButton afterSignOutUrl="/login" />
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/NavBar.tsx
git commit -m "feat(auth): add UserButton to NavBar, apply amber/stone tokens"
```

---

### Task 5: Auto-inject JWT in apiFetch

**Files:**
- Modify: `frontend/src/lib/api/client.ts`

**Interfaces:**
- Consumes: `window.Clerk.session.getToken()` — Clerk injects the `Clerk` singleton on `window` after the provider loads. Returns `null` when no session (dev without login, MSW bypass mode).
- Produces: every `apiFetch` call automatically sends `Authorization: Bearer <token>` when a Clerk session exists. No call-site changes required.

- [ ] **Step 1: Update `client.ts`**

Replace the entire content of `frontend/src/lib/api/client.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

// Clerk injects itself as window.Clerk after ClerkProvider loads.
// Returns null in SSR, during MSW-only dev, or before session loads.
async function getClerkToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    Clerk?: { session?: { getToken(): Promise<string | null> } };
  };
  return (await w.Clerk?.session?.getToken()) ?? null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await getClerkToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText, body.code);
  }

  return res.json() as Promise<T>;
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/client.ts
git commit -m "feat(auth): auto-inject Clerk JWT into all apiFetch calls"
```

---

### Task 6: Migrate farm API to user-scoped endpoints

**Files:**
- Modify: `frontend/src/lib/api/farm.ts`
- Modify: `frontend/src/lib/mocks/handlers.ts`

**Interfaces:**
- Produces:
  - `getFarmProfile(): Promise<FarmProfile>` — no farmId parameter, calls `GET /api/me/farm`
  - `updateFarmProfile(data): Promise<{ ok: boolean }>` — calls `PUT /api/me/farm`
  - `getMachinery(): Promise<MachineryListResponse>` — no farmId parameter, calls `GET /api/me/farm/machinery`
  - MSW mock handles all three new routes

- [ ] **Step 1: Rewrite `frontend/src/lib/api/farm.ts`**

```typescript
import { apiFetch } from "./client";
import type { FarmProfile, MachineryListResponse } from "@/types";

export function getFarmProfile(): Promise<FarmProfile> {
  return apiFetch("/api/me/farm");
}

export function updateFarmProfile(
  data: Partial<Omit<FarmProfile, "farmId">>,
): Promise<{ ok: boolean }> {
  return apiFetch("/api/me/farm", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function getMachinery(): Promise<MachineryListResponse> {
  return apiFetch("/api/me/farm/machinery");
}
```

Note: `createFarmProfile` is removed — the Dart backend auto-creates a FarmProfile on the first `GET /api/me/farm` for new users.

- [ ] **Step 2: Update MSW mock handlers**

In `frontend/src/lib/mocks/handlers.ts`, replace the farm-profile handler block:

```typescript
  // Farm profile (user-scoped — no farmId in URL)
  http.get("/api/me/farm", () =>
    HttpResponse.json(mockFarmProfile),
  ),

  http.put("/api/me/farm", () =>
    HttpResponse.json({ ok: true }),
  ),

  http.get("/api/me/farm/machinery", () =>
    HttpResponse.json(mockMachinery),
  ),
```

Remove these old handlers (they will 404 if accidentally called):
```
http.get("/api/farm/profile/:farmId", ...)
http.post("/api/farm/profile", ...)
http.put("/api/farm/profile/:farmId", ...)
http.get("/api/farm/machinery", ...)
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors about `farmId` argument still being passed by callers — fix those in Task 7.

- [ ] **Step 4: Commit once Task 7 is green**

Hold this commit until Task 7 is done (they're coupled).

---

### Task 7: Remove farmId props from pages and components

**Files:**
- Modify: `frontend/src/app/farm/page.tsx`
- Modify: `frontend/src/app/breakeven/page.tsx`
- Modify: `frontend/src/components/farm/FarmClient.tsx`
- Modify: `frontend/src/components/breakeven/BreakevenClient.tsx`

**Interfaces:**
- Consumes: `getFarmProfile()`, `getMachinery()`, `updateFarmProfile()` from Task 6 (no farmId arg)
- Produces: all pages load the authenticated user's farm with no hardcoded IDs.

- [ ] **Step 1: Update `frontend/src/app/farm/page.tsx`**

```tsx
import FarmClient from "@/components/farm/FarmClient";

export default function FarmPage() {
  return <FarmClient />;
}
```

- [ ] **Step 2: Update `frontend/src/app/breakeven/page.tsx`**

```tsx
import BreakevenClient from "@/components/breakeven/BreakevenClient";

export default function BreakevenPage() {
  return <BreakevenClient />;
}
```

- [ ] **Step 3: Update `FarmClient.tsx` — remove farmId prop and update API calls**

In `frontend/src/components/farm/FarmClient.tsx`:

a) Change the `Props` interface and component signature:

```tsx
// Remove the Props interface entirely, or replace with:
export default function FarmClient() {
```

b) Remove all uses of the `farmId` variable. The `useEffect` `load` function becomes:

```tsx
async function load() {
  try {
    if (useFarmStore.getState().farm === null) {
      const [f, defs] = await Promise.all([
        getFarmProfile(),   // ← no argument
        getDefaults(),
      ]);
      initFromFetch(f, defs);
    }
    const macRes = await getMachinery();  // ← no argument
    if (!cancelled) {
      setMachinery(macRes.machinery);
      if (originalFarmRef.current === null) {
        originalFarmRef.current = JSON.parse(
          JSON.stringify(useFarmStore.getState().farm),
        );
        originalMachineryRef.current = JSON.parse(
          JSON.stringify(macRes.machinery),
        );
      }
      setLoading(false);
    }
  } catch (err) {
    if (!cancelled) {
      setError(
        err instanceof Error ? err.message : "Failed to load farm profile",
      );
      setLoading(false);
    }
  }
}
```

c) Update `handleSave` — remove `farmId` argument:

```tsx
async function handleSave() {
  if (!farm) return;
  setSaveStatus("saving");
  try {
    await updateFarmProfile({ name: farm.name, fields: farm.fields });
    originalFarmRef.current = JSON.parse(JSON.stringify(farm));
    originalMachineryRef.current = JSON.parse(JSON.stringify(machinery));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  } catch {
    setSaveStatus("idle");
  }
}
```

d) Remove the `useEffect` dependency on `farmId` — change `[farmId, initFromFetch]` to `[initFromFetch]`.

- [ ] **Step 4: Update `BreakevenClient.tsx` — remove farmId prop**

In `frontend/src/components/breakeven/BreakevenClient.tsx`:

a) Remove the `Props` interface and the `farmId` parameter:

```tsx
export default function BreakevenClient() {
```

b) Update the fallback fetch in `useEffect` — remove `farmId`:

```tsx
useEffect(() => {
  if (useFarmStore.getState().farm !== null) return;
  let cancelled = false;
  Promise.all([getFarmProfile(), getDefaults()])
    .then(([f, defs]) => {
      if (!cancelled) {
        initFromFetch(f, defs);
        setLoading(false);
      }
    })
    .catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      }
    });
  return () => { cancelled = true; };
}, [initFromFetch]);
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit Tasks 6 + 7 together**

```bash
git add \
  src/lib/api/farm.ts \
  src/lib/mocks/handlers.ts \
  src/app/farm/page.tsx \
  src/app/breakeven/page.tsx \
  src/components/farm/FarmClient.tsx \
  src/components/breakeven/BreakevenClient.tsx
git commit -m "feat(auth): migrate to /api/me/farm; remove farmId from components"
```

---

### Task 8: End-to-end smoke test

**Files:** no code changes — verification only.

**Goal:** Confirm the auth flow works top-to-bottom in the browser.

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test unauthenticated redirect**

Open `http://localhost:3000/farm` in an incognito window. Should redirect to `/login` and show the branded page with the Google sign-in button.

- [ ] **Step 3: Test sign-in flow**

Click "Continue with Google", complete the OAuth flow. Should redirect back to `/farm` and show the farm profile page (loaded from MSW mock). The NavBar should show your Google avatar in the top-right.

- [ ] **Step 4: Test sign-out**

Click the avatar in the NavBar → click "Sign out". Should redirect to `/login`.

- [ ] **Step 5: Test protected route redirect**

After signing out, try to navigate to `/breakeven` directly. Should redirect to `/login`.

- [ ] **Step 6: Verify JWT header in dev tools**

Sign in, open Chrome DevTools → Network → XHR. Click any request to `/api/me/farm` (or `/defaults`). Confirm the `Authorization: Bearer <token>` header is present.

Note: In MSW mock mode, the `Authorization` header is sent but the mock ignores it — this is correct dev behavior.

- [ ] **Step 7: Commit final smoke-test notes (optional)**

```bash
git commit --allow-empty -m "chore(auth): smoke test passed — auth flow end-to-end verified"
```

---

## Self-Review

**Spec coverage:**
- ✅ Google OAuth only — `<SignIn />` configured in Clerk Dashboard with Google only
- ✅ `clerkMiddleware()` protects all routes except `/login`
- ✅ JWT injected via `apiFetch` automatically
- ✅ NavBar `<UserButton />` with sign-out
- ✅ `/login` branded page
- ✅ `farmId` eliminated from frontend; API is `/api/me/farm`
- ✅ MSW mock updated for new endpoints
- ✅ One farm per user — no farm list/selector UI needed

**Placeholder scan:** None found. All steps contain exact code.

**Type consistency:**
- `getFarmProfile()` — no args in Task 6, called with no args in Task 7 ✅
- `getMachinery()` — no args in Task 6, called with no args in Task 7 ✅
- `updateFarmProfile(data)` — `Partial<Omit<FarmProfile, "farmId">>` in Task 6, called with `{ name, fields }` in Task 7 ✅
- `FarmClient` — no props in Task 7 page, no Props interface in component ✅
- `BreakevenClient` — no props in Task 7 page, no Props interface in component ✅
