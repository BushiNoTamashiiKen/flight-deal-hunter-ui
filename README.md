# Skyflint — Flight Deal Hunter UI

Skyflint is a single-page Next.js app that mirrors the **flight-deal-hunter** Cursor Agent Skill workflow: Step 1 intake (structured like `SKILL.md`), an animated 8-step Trip Hunt Progress checklist with a live agent log, and a visual ranked report matching the skill’s Step 8 Markdown template.

## Quick start

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) (recommended; the repo uses `pnpm-lock.yaml`)

### Install and run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Workspace root (avoid the “wrong directory” issue)

Open **`flight-deal-hunter-ui`** itself as the editor workspace (the folder that contains this `README.md`, `package.json`, and `.git`). Do **not** open a parent folder like `Highmood` and expect tools to land in Skyflint — shells and some automation use the **workspace root**, not a sibling path.

Quick check from a terminal:

```bash
cd /path/to/flight-deal-hunter-ui
git rev-parse --show-toplevel   # must end with flight-deal-hunter-ui
pnpm verify-root               # exits 1 if you are in the wrong repo/root
```

This repo ships **`.vscode/settings.json`** so integrated terminals default to **`${workspaceFolder}`** when you opened the correct folder.

### Production build (local)

```bash
pnpm build
pnpm start
```

For the **Docker image**, builds use standalone output:

```bash
BUILD_TARGET=docker pnpm build
pnpm start
```

## Live vs demo mode

Create `.env.local` (see `.env.example`).

| Variable         | Required | Description                                                                 |
| ---------------- | -------- | --------------------------------------------------------------------------- |
| `CURSOR_API_KEY` | No\*     | Cursor API key (`cursor_…`). Enables live `@cursor/sdk` agent runs from `/api/hunt`. |

\*If unset, the API runs **demo mode**: a canned CPT ⇄ Lisbon October replay that streams NDJSON like a real run (workflow steps + ranked Markdown).

Get a key from [Cursor Cloud Agents / API](https://cursor.com/dashboard/cloud-agents) (user or team service account).

## Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/%3Cuser%3E/%3Crepo%3E)

Replace `<user>/<repo>` in the URL above with your GitHub owner and repository name.

**Manual:** In the [Netlify](https://app.netlify.com) dashboard, **Add new site → Import an existing project**, connect the Git repo, and add **`CURSOR_API_KEY`** under **Site configuration → Environment variables**. Netlify auto-detects pnpm; `netlify.toml` sets Node 20, pnpm 9, and `@netlify/plugin-nextjs`.

**Timeouts:** On Netlify Pro, synchronous functions are limited (config sets **26s** for `api/hunt` in `netlify.toml`). **Demo mode** finishes within that budget. **Live** Cursor agent runs can run longer — use a higher tier / different architecture, or refactor the hunt endpoint to **enqueue + poll** (Background Functions on Netlify do not preserve streaming). For unrestricted duration with streaming, use **Docker** or a **VPS** below.

**Commit SHA:** Netlify sets **`COMMIT_REF`** on builds. `/api/health` returns it as `commit` (along with `VERCEL_GIT_COMMIT_SHA` as a fallback for other hosts).

## Deploy with Docker

```bash
docker compose up --build
```

Docker Compose reads **`CURSOR_API_KEY`** (and other vars) from a `.env` file in the project root. The image is built with `BUILD_TARGET=docker` so Next emits **standalone** output.

## Self-host on a VPS

Build with standalone output and run Node behind a reverse proxy:

```bash
BUILD_TARGET=docker pnpm install --frozen-lockfile
BUILD_TARGET=docker pnpm build
NODE_ENV=production pnpm start
```

Example **nginx** location (TLS certificates assumed elsewhere):

```nginx
server {
  listen 443 ssl;
  server_name skyflint.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;
  }
}
```

## Configuration

| Variable                       | Default / notes                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `CURSOR_API_KEY`               | Optional. Omit for demo mode.                                                         |
| `NEXT_PUBLIC_SITE_URL`         | Canonical URL for metadata, OG URLs, sitemap (no trailing slash).                     |
| `SKYFLINT_DISABLE_RATELIMIT`   | Set to `1` to disable POST `/api/hunt` rate limiting (default: **10 req / 5 min** per IP). |
| `COMMIT_REF`                   | Injected on Netlify; powers `/api/health` `commit` field.                           |
| `BUILD_TARGET`                 | Set to `docker` only for standalone Docker/VPS builds — **omit** for Netlify.       |

## Health check

`GET /api/health` returns JSON:

```json
{ "status": "ok", "mode": "live"|"demo", "commit": "<sha or local>" }
```

`mode` is `live` when `CURSOR_API_KEY` is set. `commit` prefers `COMMIT_REF` (Netlify), then `VERCEL_GIT_COMMIT_SHA`, then `"local"`.

## Rate limiting

`POST /api/hunt` is limited to **10 requests per 5 minutes** per client IP (sliding window, in-memory). Set **`SKYFLINT_DISABLE_RATELIMIT=1`** to disable (useful for local debugging). Not suitable for multi-instance horizontal scale without a shared store.

## Security headers

The app sets (via `next.config.mjs`, mirrored in `netlify.toml` for static paths):

- **Strict-Transport-Security** — `max-age=63072000; includeSubDomains; preload`
- **X-Content-Type-Options** — `nosniff`
- **X-Frame-Options** — `DENY`
- **Referrer-Policy** — `strict-origin-when-cross-origin`
- **Permissions-Policy** — `camera=(), microphone=(), geolocation=()`

## Skill integration

1. The client POSTs validated intake JSON to **`POST /api/hunt`** (`application/json`).
2. The route streams **NDJSON** (`application/x-ndjson`): `log`, `step`, `report`, and optional `error` events.
3. With `CURSOR_API_KEY` set, the handler dynamically imports `@cursor/sdk`, creates a local agent (`composer-2`), and sends a prompt built by `lib/hunt-prompt.ts` that embeds the 8-step checklist, serialized intake JSON, and markers `[[SKYFLINT_STEP_DONE:N]]` / `[[SKYFLINT_REPORT_BEGIN]]` / `[[SKYFLINT_REPORT_END]]`.
4. Without a key, `lib/demo-run.ts` streams a CPT → Lisbon scenario aligned with the ranked-report template.

## Project layout (high level)

- `app/page.tsx` — Skyflint shell
- `app/api/hunt/route.ts` — NDJSON stream, SDK or demo
- `components/intake-form.tsx` — zod + react-hook-form intake
- `lib/demo-run.ts` — demo replay content
- `lib/parse-report.ts` — Markdown → UI structure for results

## Tech stack

Next.js 14 (App Router), TypeScript (strict), Tailwind CSS v4, shadcn/ui (Base UI primitives), `@cursor/sdk`, `zod`, `react-hook-form`, `date-fns`, `next-themes`, `lucide-react`.
