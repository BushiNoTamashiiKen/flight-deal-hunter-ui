/**
 * Ensures cwd is this repository (basename flight-deal-hunter-ui).
 * Run: node scripts/verify-workspace-root.mjs
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
process.chdir(repoRoot);

let topLevel;
try {
  topLevel = execSync("git rev-parse --show-toplevel", {
    encoding: "utf8",
  }).trim();
} catch {
  console.error("verify-workspace-root: not a git repository");
  process.exit(1);
}

const expected = "flight-deal-hunter-ui";
if (path.basename(topLevel) !== expected) {
  console.error("verify-workspace-root: wrong git toplevel:", topLevel);
  console.error(
    `Open the folder named "${expected}" in your editor (File → Open Folder).`,
  );
  process.exit(1);
}

if (path.resolve(topLevel) !== path.resolve(repoRoot)) {
  console.error("verify-workspace-root: script location does not match git root");
  console.error("  git says:", topLevel);
  console.error("  script lives under:", repoRoot);
  process.exit(1);
}

console.log("Workspace root OK:", topLevel);
