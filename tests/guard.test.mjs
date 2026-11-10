// Proves the PreToolUse hook (.claude/hooks/guard.mjs) enforces DECISIONS.md D3.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HOOK = fileURLToPath(new URL("../.claude/hooks/guard.mjs", import.meta.url));

function decision(tool_name, tool_input) {
  const r = spawnSync(process.execPath, [HOOK], { input: JSON.stringify({ tool_name, tool_input }) });
  assert.equal(r.status, 0);
  const out = r.stdout.toString();
  return out ? JSON.parse(out).hookSpecificOutput.permissionDecision : "none";
}
const bash = (command) => decision("Bash", { command });

const cases = [
  // secrets: deny
  ["cat .env", "deny"],
  [`node -e "require('fs').readFileSync('.env.local')"`, "deny"],
  ["cp .env.example .env.local", "deny"],
  ["cat .env.example", "none"],
  ["echo $NODE_ENV", "none"],
  // irreversible: ask
  ["git push origin main", "ask"],
  ["git -C . push", "ask"],
  ["/bin/rm -rf build", "ask"],
  ["vercel --prod", "ask"],
  ["psql -c 'DELETE FROM complaints'", "ask"],
  // guardrail files written from the shell: ask
  ["sed -i s/1000/9999/ config/sample-cap.json", "ask"],
  ["cat CLAUDE.md > copy.md", "ask"],
  // ordinary work: no opinion
  ["cat config/sample-cap.json", "none"],
  ["git diff CLAUDE.md", "none"],
  ["git status", "none"],
  ["rm notes.txt", "none"],
  ["npm run build", "none"],
];

for (const [command, expected] of cases) {
  test(`Bash: ${command} -> ${expected}`, () => assert.equal(bash(command), expected));
}

test("MCP SQL tools: destructive SQL asks, reads pass", () => {
  assert.equal(decision("mcp__neon__run_sql", { sql: "DROP TABLE complaints" }), "ask");
  assert.equal(decision("mcp__neon__run_sql", { sql: "select 1" }), "none");
});

test("file tools are left to settings.json rules", () => {
  assert.equal(decision("Edit", { file_path: "/repo/.env" }), "none");
});
