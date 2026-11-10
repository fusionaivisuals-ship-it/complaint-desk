#!/usr/bin/env node
// PreToolUse guard for complaint-desk (DECISIONS.md D3).
//
// Permission rules in .claude/settings.json are the first layer. They match the
// command text Claude usually writes, but the docs say they are not a security
// boundary: `git -C . push`, `/bin/rm -rf x` or `node -e "...readFileSync('.env')"`
// slip past a `Bash(git push *)` / `Bash(rm -rf *)` / `Read(.env)` rule.
// This hook is the second layer: it inspects the full Bash command (and MCP
// tool input) with its own logic and returns a permission decision.
//
//   deny -> .env files (secrets)            : never, no prompt
//   ask  -> irreversible commands           : you approve each one
//   ask  -> shell writes to guardrail files : you approve each one
//
// Silent (exit 0, no output) means "no opinion": the normal permission flow runs.
// Written in Node, not bash, so it runs the same on Windows, macOS and CI.

import { readFileSync } from "node:fs";

const GUARDED_FILES = [
  "config/sample-cap.json",
  ".claude/settings.json",
  ".claude/hooks/",
  ".github/workflows/",
  "CLAUDE.md",
  "DECISIONS.md",
];

// .env, .env.local, .env.production ... but not .env.example (a template, no secrets).
const ENV_FILE = /(^|[\s"'`=/\\(<>:])\.env(?!\.example\b)(\.[\w.-]+)?(?=$|[\s"'`;|&)<>])/;

const IRREVERSIBLE = [
  { re: /\bgit\b[^;&|\n]*\bpush\b/, why: "git push publishes commits" },
  { re: /\bvercel\b[^;&|\n]*(--prod\b|\bdeploy\b|\bpromote\b|\bremove\b|\brm\b)/, why: "Vercel deploy/promote/remove" },
  { re: /\b(drop\s+(table|database|schema|index|view)|truncate\s+(table\s+)?\w|delete\s+from)\b/i, why: "destructive SQL (DROP/TRUNCATE/DELETE)" },
  { re: /\b(prisma\s+migrate\s+reset|drizzle-kit\s+drop|neonctl\b[^;&|\n]*\bdelete\b)/, why: "destructive database command" },
  { re: /(^|[\s;&|(])(\S*\/)?rm\s+(-[a-zA-Z]*[rRf][a-zA-Z]*\s+|--recursive\s+|--force\s+)/, why: "rm with -r/-f deletes without undo" },
];

// Commands that only read; mentioning a guarded file in these is fine.
const READ_ONLY_START = /^\s*(cat|head|tail|less|grep|rg|wc|ls|git\s+(diff|log|show|status|blame))\b/;
const SHELL_SEPARATOR = /[;&|`]|\$\(|>/;

function decide(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: decision,
        permissionDecisionReason: `[complaint-desk guard] ${reason}`,
      },
    }),
  );
  process.exit(0);
}

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // unreadable input: no opinion, permission rules still apply
}

const tool = input.tool_name ?? "";
const toolInput = input.tool_input ?? {};

// Text to inspect: the shell command for Bash, the whole input for MCP tools
// (e.g. a run_sql tool on a database MCP server).
let text = "";
if (tool === "Bash") text = String(toolInput.command ?? "");
else if (tool.startsWith("mcp__")) text = JSON.stringify(toolInput);
else process.exit(0); // file tools are covered by Read/Edit rules in settings.json

if (ENV_FILE.test(text)) {
  decide("deny", "Touching .env files is blocked. Secrets stay out of Claude's context (D3).");
}

for (const { re, why } of IRREVERSIBLE) {
  if (re.test(text)) decide("ask", `Irreversible action needs your approval: ${why} (D3).`);
}

if (tool === "Bash") {
  const normalized = text.replace(/\\/g, "/");
  const hit = GUARDED_FILES.find((p) => normalized.includes(p));
  const readOnly = READ_ONLY_START.test(text) && !SHELL_SEPARATOR.test(text);
  if (hit && !readOnly) {
    decide("ask", `Shell command touches guardrail file ${hit}; needs your approval (D3).`);
  }
}

process.exit(0);
