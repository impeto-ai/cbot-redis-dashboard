# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # Next.js dev server (http://localhost:3000)
npm run build   # Production build
npm run start   # Run production build
npm run lint    # next lint
```

There is **no test runner configured** — do not claim tests exist or add test commands to CI steps.

Required env vars in `.env.local` (none are checked in):
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis REST credentials (both required by `lib/redis-direct.ts`; missing credentials throw)
- `LOGIN_STREAMERFEED`, `SENHA_STREAMERFEED`, `URL_STREAMFERFEED` — StreamerFeed source (used by the upstream ingester, not this app directly)
- `NEXT_PUBLIC_APP_URL`

Build gotcha: `next.config.mjs` sets `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true`. `npm run build` will not catch TS or lint errors — run `npm run lint` and `tsc --noEmit` manually before assuming a change is clean. Note there are two Next configs (`next.config.js` and `next.config.mjs`); Next.js picks `.js` first, so changes intended for the active config should go in `next.config.js`.

## Architecture

This is a Next.js 15 App Router dashboard that renders near-real-time commodity futures, FX, and dollar-curve data read from an Upstash Redis cache. The app only reads Redis — a separate upstream ingester (`STREAMER_SERVICE_SPEC.md`, out of this repo) writes the keys.

### Data flow (end-to-end)

1. External CMA/StreamerFeed ingester writes Redis keys shaped like `cbot:ZSH6`, `cbot:ZCZ6`, `cambio:DOL COM`, `cambio:EUROCOM`, `dollar:CURVA DE DOLAR 90D`, `dollar:PTAX`, `b3:*`.
2. `app/api/redis/route.ts` (`GET /api/redis`) calls `lib/redis-direct.ts::getAllValues()` which:
   - Fetches `KEYS *` via Upstash REST, filters by substring (`ZS`, `ZC`, `ZW`, `ZM`, `ZL`, `CURVA DE DOLAR`, `PTAX`, `cambio:DOL COM`, `cambio:EUROCOM`, `b3:`).
   - Batches the `GET`s in a single Upstash `/pipeline` POST; falls back to per-key `GET` (capped at 50) on pipeline failure.
   - Has an in-memory two-tier cache (`CACHE_TTL=10s` fresh, `STALE_CACHE_TTL=60s` stale-while-revalidate) plus a **circuit breaker** that trips on HTTP 429 / "Too Many Requests" and blocks requests for 60s. When working on Redis calls, be aware that a tripped breaker makes all endpoints silently serve cached / empty data.
   - The route itself has its own in-process rate limit (30 req/min per `clientIp` key, which is hardcoded to `"api-client"` — effectively a global limit).
3. `hooks/useMarketData.ts` is the single client entry point for the above. It uses SWR with `refreshInterval: 60000`, `dedupingInterval: 5000`, `revalidateOnFocus: false`, a custom fetcher with exponential backoff retry (3 attempts), and a `forceUpdate` counter that bumps every 5 min. It also tracks CBOT-Brazil market hours (DST-aware) and `document.hidden` visibility. Every consumer — `Dashboard`, `Marquee`, `ExchangeRates`, `PTAXChart` — calls this same hook; SWR deduping is what prevents N parallel fetches.
4. `components/Dashboard.tsx` runs seven substring loops over the Redis map to split it into `soybean`/`corn`/`wheat`/`meal`/`oil`/`b3`/`curva` buckets, then feeds them into `DraggableTables` (dnd-kit reorderable grid) which renders `CBOTDataTables` (futures) and `MarketDataTable` (dollar curve).

Additional pages: `/commodities-analysis` (ZM/ZL deep-dive) and `/redis-explorer` (key browser) — both hit `/api/redis/keys` and `/api/redis/value?key=...`.

### Parsing

Redis values are raw StreamerFeed payloads shaped `{ symbolId: { symbol }, arrValues: [{ "01": "…" }, { "09": "…" }, …] }`, where the numeric keys are CMA field codes. `utils/parseMarketData.ts`, `utils/parseB3Data.ts`, and `utils/parseData.ts` translate those codes into the typed `ParsedMarketData` / `ParsedCurvaData` shapes in `types/market-data.ts`. The value may arrive as a JSON string, a parsed object, or a single-key wrapper like `{ "ZSH6": {…actual payload…} }` — always run it through the "ensure object + unwrap single-symbol key" preamble before reading fields (see `parseMarketData.ts:6-39`). Product is inferred from substring of `symbolId.symbol`: `ZS`→SOJA, `ZC`→MILHO, `ZW`→TRIGO, `ZM`→FARELO, `ZL`→ÓLEO.

### The "smooth" vs legacy component split

For the two hot-path tables there are **two parallel implementations**:
- `components/CBOTDataTables.tsx` + `components/MarketDataTable.tsx` — legacy, uses `useDataFlash` + `StableTable` memoization wrapper.
- `components/CBOTDataTables.smooth.tsx` + `components/MarketDataTable.smooth.tsx` — current, uses `hooks/useSmoothTransition.ts::useSmoothValue` (rAF-interpolated numbers) + `hooks/useValueFlash.ts` (per-cell flash class).

`Dashboard.tsx` still imports the non-smooth versions. `DraggableTables.tsx` is the integration point — check which pair it's currently wiring before editing. Do not assume a fix applied to one pair propagates; edit both or consolidate. There is also a parked `components/Dashboard.optimized.tsx.bak` (Web Worker via `workers/marketDataParser.worker.ts` + `hooks/useMarketDataParser.ts`) and a `VirtualizedCBOTTable.tsx.bak` — these are unfinished migrations, not to be imported as-is.

### Path alias & styling

- `@/*` resolves to repo root (`tsconfig.json`). `@/components`, `@/hooks`, `@/lib`, `@/utils`, `@/types` are all used.
- Tailwind + shadcn/ui (neutral base, `components/ui/`). `tailwind.config.js` hardcodes dark background (`#1a1a1a`); `app/layout.tsx` also hardcodes `<html className="dark">`. The dashboard is dark-mode only.
- `app/layout.tsx` sends aggressive `Cache-Control: no-store` headers and `next.config.js` repeats this for every route. `app/page.tsx` and `app/layout.tsx` both set `export const dynamic = "force-dynamic"` and `revalidate = 0`. New pages that read live data must do the same or they'll be statically cached.

### Hydration & SSR

- `components/HydrationFix.tsx` is mounted in `RootLayout` to strip attributes injected by browser extensions (Grammarly etc.) that cause hydration mismatches; `<body suppressHydrationWarning>` is also set.
- `components/NoSSR.tsx` and `components/ClientHeader.tsx` exist because several pieces of state (flash animations, scroll preservation, worker) must not run during SSR. Wrap anything that reads `window`/`document` or uses animation refs in `NoSSR` instead of adding `typeof window !== "undefined"` guards inline.

## Conventions worth knowing

- Comments, logs, and user-facing text in this repo are in **Portuguese (pt-BR)**. Match the existing language when editing; keep new identifiers in English.
- Everything client-side that uses hooks must start with `"use client"` — this is an App Router project and most components are client components.
- `.bak` files are intentional parking spots (see `Dashboard.optimized.tsx.bak`, `VirtualizedCBOTTable.tsx.bak`); don't delete without checking whether the "real" file is still the older implementation.
- Three markdown design docs at repo root — `ARCHITECTURE.md`, `OPTIMIZATION_GUIDE.md`, `SMOOTH_TRANSITIONS_GUIDE.md`, `SKELETON_LOADING_GUIDE.md`, `STREAMER_SERVICE_SPEC.md` — describe the upstream Java streamer and the in-flight perf/transition migrations. They document *intent* and can drift from code; verify against source before quoting them as truth.
