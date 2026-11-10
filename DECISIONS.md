# Decisions

Design decisions for complaint-desk, recorded when they were made. Each one lists the options considered, what was chosen, and why. The reasons are Niel's own words from the Stage 0 planning session, with spelling tidied and nothing else changed.

---

## D1: What the automated PR reviewer checks

**Date:** 2026-11-11 · **Stage:** 0

**Options considered**
- **A. Correctness and security only.** Checks bugs, logic errors, committed secrets and injection risks. Ignores everything else.
- **B. Correctness, security and the project's own rules from CLAUDE.md.** Ignores formatting and lint, lockfiles, build output, nitpicks and praise.
- **C. Broad review with severity labels.** Adds readability, naming, performance, test coverage and architecture suggestions.

**Chosen: B**

**Why (in my words)**
> "A does not work: the trade-off is too huge and project drift not being caught. B: if CLAUDE.md is set up right this might be the best choice, even with the trade-offs. C: broad review could be 'dangerous' because it can showcase so many problems that developers start ignoring it."

**Rejected**
- **A:** project drift, such as a script ignoring the sample cap, would go uncaught.
- **C:** so many findings would train me to ignore the reviewer.

**Consequence:** The reviewer is only as good as CLAUDE.md. That's why CLAUDE.md states its rules as numbered statements (R1–R6) that can be checked against a diff, and the review posts a pass/fail row for each rule.

**Implemented in:** `.github/workflows/claude-review.yml`, plus the "Working rules" and "PR review scope" sections of `CLAUDE.md`.

---

## D2: Default sample cap

**Date:** 2026-11-11 · **Stage:** 0

**Options considered**
- **10:** fastest and almost free, but too small to show edge cases.
- **100:** cheap, catches common edge cases, misses rare ones.
- **1,000:** close to a realistic mix and surfaces scale problems, but every mistake costs about 10× more.

**Chosen: 1,000**

**Why (in my words)**
> "10 is too little: as stated, it is too small to find the edge cases, which is precisely why a company would want the system. You can use code to track the standard cases, whereas with an LLM edge cases can be more easily found. 100 is still too small for the same reason. Go with 1,000 for now. It will give at least a good idea of edge cases. It might have to be expanded later, but it is a good start."

**Rejected**
- **10 and 100:** too small to surface the edge cases this system exists to find.

**Open note:** The original brief said "start small while I work out problems", and 1,000 is not small. The cap covers two actions with very different risk. Loading 1,000 rows from a public CSV is cheap. Sending 1,000 complaints to a model is where a bug in a loop costs real money. This should be revisited before Stage 2 sends anything to Haiku, for example by dry-running scripts first.

**How the cap is enforced**
- One value in `config/sample-cap.json`, read by `resolveSampleLimit()` in `src/lib/sample-cap.ts`.
- Asking for more than the cap throws. It is never silently clamped and never silently defaulted.
- Going above the cap needs `--override-sample-cap=<n>` together with `--override-reason="<why>"`, and the override is announced on stderr.
- `src/lib/sample-cap.test.ts` tests this behaviour.
- Rule R1 in CLAUDE.md makes the CI reviewer flag hardcoded limits.
- Under D3, Claude Code must ask before editing `config/sample-cap.json`.

---

## D3: What Claude Code is blocked from touching without asking

**Date:** 2026-11-11 · **Stage:** 0

**Options considered**
- **A. Secrets only.** Deny `.env*` and nothing else.
- **B. Secrets, guardrail files and irreversible commands.** Deny `.env*`. Ask before editing the sample cap config, Claude settings and hooks, CI workflows, CLAUDE.md and DECISIONS.md. Ask before `git push`, production deploys, destructive database commands and `rm -rf`.
- **C. Lockdown.** Everything in B, plus every shell command asks unless it is on a short read-only allowlist.

**Chosen: B**

**Why (in my words)**
> "A is out: I would be too unsure of what could be changed, and what could be changed wrongly or cause simple issues. B seems to be the one that breaks even. It has cases for both guarding files, without too much of a trade-off."

**Rejected**
- **A:** I couldn't be sure what might be changed, or changed wrongly.
- **C:** constant prompts lead to approving without reading, the same failure as D1-C.

**How it is enforced (in configuration, not only CLAUDE.md)**
1. **Permission rules** in `.claude/settings.json`:
   - `deny`: Read and Edit on `.env` and `.env.*`.
   - `ask`: Edit on each guardrail file, plus `git push`, `vercel`, `psql` and `rm -r`/`rm -rf`.
   - The precedence is deny, then ask, then allow, so no allow rule can override these.
2. **PreToolUse hook** `.claude/hooks/guard.mjs`. Permission rules match the command text Claude usually writes, and the docs say they are not a security boundary. For example, `git -C . push`, `/bin/rm -rf` or a `node -e` script that opens `.env` get past them. The hook inspects every Bash command and MCP tool input:
   - It denies anything referencing a `.env` file.
   - It asks on irreversible commands in any form, including destructive SQL sent through an MCP tool.
   - It asks on shell writes to guardrail files.
   - `tests/guard.test.mjs` proves each case.

---

## Implementation choices made by Claude (not yet reviewed by Niel)

These were filled in while building Stage 0. They follow from D1–D3, but I didn't choose them. Accept or change them.

- **`disableBypassPermissionsMode: "disable"` in project settings.** Without it, bypass mode would skip every ask rule in D3.
- **A small `allow` list** (`npm test`, `npm run lint`, `npm run build`, `git status`, `git diff`, `git log`) to keep D3 from creating prompt fatigue.
- **The reviewer runs on every push to a PR** (`synchronize`), with one run per PR at a time. Each push costs one review on the API key. Removing `synchronize` would review once per PR instead.
- **The reviewer posts one summary comment** in a fixed structure and is limited to read-only tools plus `gh pr diff`, `gh pr view` and `gh pr comment`.
- **The hook is written in Node, not bash,** so it runs the same on Windows, macOS and the CI runner.
