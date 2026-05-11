# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Project management SaaS for general contracting. Built with Next.js App Router, Convex (real-time backend), and Clerk (auth).

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
npx convex dev    # Start Convex dev backend (run alongside pnpm dev)
```

## Architecture

### Routing

- `src/app/(authenticated)/` — all protected routes (dashboard, tasks, board, calendar, projects, timeline, templates, analytics, invitations, settings)
- `src/app/sign-in/` and `src/app/sign-up/` — Clerk-hosted auth pages
- `src/app/supabase-*/` — temporary Supabase migration test pages (not production routes)
- Root `/` redirects to `/dashboard`

### Auth

Clerk handles authentication. `src/middleware.disabled.ts` contains the Clerk middleware (currently disabled). The `(authenticated)` layout wraps pages in `ClerkProvider` via the `Providers` component.

When a user signs in, `useStoreUser()` (`src/hooks/use-store-user.ts`) syncs the Clerk user to the Convex `users` table.

### Data Layer

**Primary: Convex** (`convex/` directory)

All production data lives in Convex. Schema is defined in `convex/schema.ts`. Key tables:

- `projects` → `tasks` → `subtasks` → `workOrders` (4-level task hierarchy)
- `projectMembers` — role-based access: owner/editor/viewer
- `invitations`, `users`, `comments`, `attachments`, `activityLog`, `analytics`, `notifications`

Convex functions are TypeScript files in `convex/` (e.g., `projects.ts`, `tasks.ts`). Auto-generated types land in `convex/_generated/`. Use `useQuery`/`useMutation` from `convex/react` in components.

**Secondary: Supabase** (migration in progress, not production)

Supabase clients live in `src/utils/supabase/client.ts` (browser) and `src/utils/supabase/server.ts` (server/RSC). Query helpers are in `src/lib/supabase/`. These are only used by the `supabase-*` test pages.

### Providers (`src/components/providers.tsx`)

Wraps all authenticated pages in order: ThemeProvider → ClerkProvider → ConvexProviderWithClerk → Toaster.

### Authenticated Layout Shell (`src/app/(authenticated)/layout.tsx`)

Renders: `Sidebar`, `CommandPalette`, `QuickAdd`, `OfflineIndicator`, `ErrorBoundary` around page content.

### Offline Support

`src/hooks/use-offline-sync.ts` maintains an IndexedDB queue of pending Convex mutations. When the app comes back online, queued mutations replay in order. Convex handles WebSocket reconnection natively; IndexedDB covers edge cases.

### Styling

- Tailwind CSS v4 with PostCSS (`postcss.config.mjs`)
- Radix UI primitives + shadcn/ui components
- `cn()` in `src/lib/utils.ts` — combines `clsx` + `tailwind-merge`
- Dark/light mode via `next-themes`

### Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

## Environment Variables

Required in `.env.local`:

```
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=           # only needed for supabase-* test pages
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```
