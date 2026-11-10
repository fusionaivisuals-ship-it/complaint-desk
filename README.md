# complaint-desk

A complaint intelligence system built on the public [CFPB consumer complaint database](https://www.consumerfinance.gov/data-research/consumer-complaints/), limited to debt collection complaints.

**Status:** Stage 0, repo and guardrails. No complaint data is loaded yet.

- `CLAUDE.md`: project goal, stage plan and working rules for Claude Code
- `DECISIONS.md`: every design decision, the options rejected, and why
- `config/sample-cap.json` and `src/lib/sample-cap.ts`: the sample cap every script must respect
- `.claude/settings.json` and `.claude/hooks/guard.mjs`: what Claude Code is blocked from or must ask about
- `.github/workflows/claude-review.yml`: the automated Claude PR review

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # sample cap and guard hook tests
```
