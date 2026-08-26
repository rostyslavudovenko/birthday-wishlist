# Birthday Wishlist Agent Guide

## Overview

Birthday Wishlist is a retro-Mac-styled, single-page React application that lets visitors reserve gifts without duplicate purchases. It serves a public directory at `/`, public or unlisted lists at `/w/:slug`, and a client-side not-found page. There is no custom application server: the browser communicates directly with Supabase/PostgreSQL.

## Architecture and key paths

* `src/main.tsx` initializes React Strict Mode and `BrowserRouter`; `src/App.tsx` owns the three routes.
* `src/pages/` holds route-level loading, error, and orchestration logic. `WishlistPage.tsx` owns reservation state and live-update lifecycle.
* `src/components/` contains reusable presentational and accessible UI pieces. Preserve the established retro window classes and dialog focus/keyboard behavior.
* `src/services/` is the client data boundary: `wishlists.ts` queries the public `featured_wishlists` view and wishlist RPC; `gifts.ts` calls gift RPCs; `realtime.ts` manages Supabase Broadcast channels.
* `src/lib/supabase.ts` creates the single browser client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
* `src/utils/storage.ts` owns the local visitor token and locally remembered reservation IDs. Do not expose or persist reservation ownership outside this browser storage model.
* `src/types/` contains frontend DTOs. Services map snake_case Supabase rows to camelCase UI types.
* `supabase/migrations/` defines the tracked administration RPC migrations. The deployed database also supplies the public wishlist/reservation RPCs and view used by the frontend; inspect a safe schema backup before altering those contracts.
* `scripts/wishlist-importer/`, `schemas/wishlist.schema.json`, and `docs/wishlist-importer.md` implement private wishlist validation, export, import, and synchronization.
* `docs/supabase-backup.md` and `scripts/backup-supabase.sh` document the database backup process.
* `.github/workflows/supabase-health-check.yml` performs a scheduled, read-only public-data health check.

## Data, privacy, and realtime flows

1. The directory reads only `featured_wishlists`. A wishlist page fetches metadata through `get_wishlist` and gifts through `get_wishlist_gifts`.
2. Each browser creates and retains a UUID visitor token locally. Reserving calls `reserve_gift`; releasing calls `release_gift` with that token. Database conditional logic is the source of truth for race prevention and release authorization.
3. After a successful mutation, `WishlistPage` optimistically updates its local gift/reservation-ID state and broadcasts `wishlist-changed` on `wishlist:<slug>`. Other clients refetch on the broadcast, window focus, and restored visibility.
4. Public responses and exports must never reveal reservation names, tokens, timestamps, or browser ownership. Unlisted lists must stay out of the directory.

## Development and verification

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

There is no automated unit-test script. For code changes, run `npm run lint` and `npm run build`; manually verify affected routes, loading/error states, reservation ownership, and live refresh when relevant.

Private wishlist operations are covered by the `birthday-wishlist-admin` skill. Follow that skill for validation, preflight, import, export, and synchronization workflows.

Production Supabase backup procedures are covered by the `birthday-wishlist-backup` skill. Follow that skill before migrations or significant bulk synchronization.

## Conventions and constraints

* Use TypeScript, functional React components, hooks, and `type` imports for type-only dependencies. Frontend source uses double quotes and trailing commas; keep the surrounding file's style in scripts/configuration.
* Keep API calls in `src/services/`, keep UI data in camelCase, and map database fields at the service boundary.
* Preserve accessible semantics, labels, focus restoration, Escape handling, and disabled states in menus and dialogs.
* Keep state local to pages/components; the project has no global state library. Do not add one without a clear cross-route need.
* Do not replace conditional reservation RPCs with client-side availability checks, expose reservation fields, or treat Supabase Broadcast as durable state. Always refetch after external changes.
* Never put `SUPABASE_SECRET_KEY` in Vite variables, browser code, Cloudflare Pages, tracked files, or logs. The service-role-only import/sync RPCs are for trusted local Node scripts, never browser roles.
* `wishlists/private/`, `.env.wishlist-importer`, and `backups/` are intentionally ignored and may contain private information. Do not display or commit their contents.
* Keep gift `key` values stable: they identify gifts during export/sync and must be unique per wishlist.
* Preserve the `public`/`unlisted` distinction; only public lists may be featured.
* Cloudflare Pages deploys the Vite `dist/` output from `npm run build`; production requires only the two `VITE_SUPABASE_*` frontend variables.

## Skills

* Check the project-local `skills/` directory when a task may match an existing specialized workflow.
* Use a relevant existing skill when applicable; do not load or follow unrelated skills.
* Prefer existing skills over rediscovering a documented workflow.
* If the same non-trivial, project-specific workflow is performed repeatedly, consider whether it should become a reusable skill.
* Before creating a new skill, check whether an existing skill already covers the workflow.
* Keep project-wide rules and stable architecture information in `AGENTS.md`; keep operation-specific procedures in skills.
* Do not create skills for simple or one-off tasks.
* When a new skill would clearly improve consistency or reduce repeated work, propose it before creating it.
