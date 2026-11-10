# complaint-desk

## Goal
A complaint intelligence system built on the public US CFPB consumer complaint database, limited to **debt collection** complaints. It's a portfolio project, so every design choice is recorded in DECISIONS.md.

## Stack
Next.js (App Router, TypeScript) · Tailwind · Vercel · Postgres on Neon · GitHub + GitHub Actions

## Stage plan
- **Stage 0**: repo, guardrails, CI review, placeholder page. *(current)*
- **Stage 1**: load a capped sample of debt collection complaints into Neon.
- **Stage 2**: classify complaints with Claude Haiku 5.5.
- **Stage 3**: expose the data through an MCP server.
- **Stage 4**: add an analyst agent.

Only work on the current stage. Don't start the next stage until it's asked for.

## Working rules
Each rule is written so a reviewer can check it against a diff.

- **R1. Sample cap.** Any code that loads complaints or sends them to a model gets its limit from `resolveSampleLimit()` in `src/lib/sample-cap.ts`. The cap value (currently 1000) lives only in `config/sample-cap.json`. Never hardcode a row or batch limit, never clamp silently, never add a default above the cap. To go above the cap, pass an explicit override with a reason (`--override-sample-cap=<n> --override-reason="<why>"`).
- **R2. Secrets.** Secrets come from environment variables only. Never commit them, log them, or read `.env*` files.
- **R3. Stage scope.** A PR changes only what the current stage needs. Code that belongs to a later stage is a violation.
- **R4. Guardrail files.** Changes to `config/sample-cap.json`, `.claude/`, `.github/workflows/`, `CLAUDE.md` or `DECISIONS.md` must say why in the PR description. Decision changes also update DECISIONS.md.
- **R5. Errors.** Network, database and model calls handle failure explicitly. No swallowed errors, no empty `catch`.
- **R6. Tests.** New logic in `src/lib/` comes with a test. Run `npm test`, `npm run lint` and `npm run build` before proposing a commit.

## PR review scope (DECISIONS.md D1)
The automated reviewer checks **correctness, security, and rules R1–R6**. It deliberately ignores formatting and lint (ESLint handles those), `package-lock.json`, build output, wording nitpicks, and praise or summaries.

## Commands
`npm run dev` · `npm test` · `npm run lint` · `npm run build`

## Next.js agent notes
@AGENTS.md
