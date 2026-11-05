# File Studio (app)

Next.js App Router application for INeedThis / File Studio.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server (webpack — required for WASM/polyfills) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:engine` | Engine + API smoke suite |
| `npm run test:upload` | PDF/data conversion artifact suite |

## Architecture

- UI: single page studio (`src/app/page.tsx`) + tool modal
- Engines: `src/engines/{pdf,image,media,data}`
- Heavy jobs: `src/workers/engine-worker.ts` via `src/lib/run-engine.ts`
- Local assets: `/public/pdf.worker.min.mjs`, `/public/ffmpeg/*`
- Only API route: `src/app/api/video-downloader` (server-assisted)

See the root [README](../README.md) for the full product overview.
