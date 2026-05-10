# Skyflint — Flight Deal Hunter UI

Skyflint is a single-page Next.js app that mirrors the **flight-deal-hunter** Cursor Agent Skill workflow: Step 1 intake (structured like `SKILL.md`), an animated 8-step Trip Hunt Progress checklist with a live agent log, and a visual ranked report matching the skill’s Step 8 Markdown template.

## Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) (recommended; the repo uses a `pnpm-lock.yaml`)

## Configuration

Create `.env.local` (see `.env.example`):

| Variable           | Required | Description                                                                 |
| ------------------ | -------- | ----------------------------------------------------------------------------- |
| `CURSOR_API_KEY`   | No\*     | Cursor API key (`cursor_…`). Enables live `@cursor/sdk` agent runs from `/api/hunt`. |

\*If unset, the API runs **demo mode**: a canned CPT ⇄ Lisbon October replay that streams NDJSON exactly like a real run (workflow steps + ranked Markdown).

Get a key from [Cursor Cloud Agents / API](https://cursor.com/dashboard/cloud-agents) (user or team service account).

## Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
pnpm build
pnpm start
```

## Skill integration

1. The client POSTs validated intake JSON to **`POST /api/hunt`** (`application/json`).
2. The route streams **NDJSON** (`application/x-ndjson`): `log`, `step`, `report`, and optional `error` events.
3. With `CURSOR_API_KEY` set, the handler dynamically imports `@cursor/sdk`, creates a local agent (`composer-2`), and sends a prompt built by `lib/hunt-prompt.ts` that embeds:
   - The 8-step checklist from the skill
   - Serialized intake JSON
   - Required markers `[[SKYFLINT_STEP_DONE:N]]` and `[[SKYFLINT_REPORT_BEGIN]]` / `[[SKYFLINT_REPORT_END]]` so the UI can progress steps and extract the final report.
4. Without a key, `lib/demo-run.ts` streams a realistic CPT → Lisbon scenario aligned with the ranked-report template.

## Project layout (high level)

- `app/page.tsx` — Skyflint shell
- `app/api/hunt/route.ts` — NDJSON stream, SDK or demo
- `components/intake-form.tsx` — zod + react-hook-form intake
- `lib/demo-run.ts` — demo replay content
- `lib/parse-report.ts` — Markdown → UI structure for results

## Tech stack

Next.js 14 (App Router), TypeScript (strict), Tailwind CSS v4, shadcn/ui (Base UI primitives), `@cursor/sdk`, `zod`, `react-hook-form`, `date-fns`, `next-themes`, `lucide-react`.
