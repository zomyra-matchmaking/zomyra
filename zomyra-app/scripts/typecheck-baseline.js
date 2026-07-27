#!/usr/bin/env node
/**
 * Typecheck regression guard.
 *
 * `tsc --noEmit` does not pass on this codebase: the Emergent output shipped three
 * pre-existing errors (see docs/MIGRATION.md §3 "Type safety"), each owned by a later
 * module. A permanently-red `yarn typecheck` gets ignored, so Module 0 records those
 * three in scripts/typecheck-baseline.json and this script fails only on errors that
 * are *not* in that baseline.
 *
 *   yarn typecheck            raw `tsc --noEmit` — shows everything, including the known three
 *   yarn typecheck:baseline   green today; red the moment a new type error is introduced
 *
 * Errors are keyed by (file, TS code) and counted, not matched on line numbers — line
 * numbers shift constantly and would make the baseline noise. When a module fixes one of
 * the known errors, run `yarn typecheck:baseline --update` and commit the smaller baseline.
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BASELINE_PATH = path.join(__dirname, "typecheck-baseline.json");
const ERROR_RE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;

/** Runs tsc and returns a map of "file::TScode" -> { file, code, count, sample }. */
function collectErrors() {
  const tsc = path.join(ROOT, "node_modules", ".bin", "tsc");
  if (!fs.existsSync(tsc)) {
    console.error("typecheck: node_modules/.bin/tsc not found — run `yarn install` first.");
    process.exit(2);
  }

  const res = spawnSync(tsc, ["--noEmit", "--pretty", "false"], {
    cwd: ROOT,
    encoding: "utf8",
  });

  if (res.error) {
    console.error(`typecheck: could not run tsc — ${res.error.message}`);
    process.exit(2);
  }

  const errors = {};
  for (const line of `${res.stdout}${res.stderr}`.split("\n")) {
    const m = ERROR_RE.exec(line);
    if (!m) continue; // indented continuation lines and blank lines
    const [, file, , , code, message] = m;
    const key = `${file}::${code}`;
    if (!errors[key]) errors[key] = { file, code, count: 0, sample: message.trim() };
    errors[key].count += 1;
  }
  return errors;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(
      `typecheck: no baseline at ${path.relative(ROOT, BASELINE_PATH)} — ` +
        "create one with `yarn typecheck:baseline --update`.",
    );
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")).errors ?? {};
}

function writeBaseline(errors) {
  const payload = {
    _comment:
      "Known-failing typecheck errors, allowed until the owning module fixes them. " +
      "Regenerate with `yarn typecheck:baseline --update`. See scripts/typecheck-baseline.js.",
    updated: new Date().toLocaleDateString("en-CA"), // local YYYY-MM-DD, matches MIGRATION.md dates
    errors,
  };
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  const total = Object.values(errors).reduce((n, e) => n + e.count, 0);
  console.log(`typecheck: baseline written — ${total} known error(s) recorded.`);
}

function main() {
  const errors = collectErrors();

  if (process.argv.includes("--update")) {
    writeBaseline(errors);
    return;
  }

  const baseline = readBaseline();
  const regressions = [];
  for (const [key, entry] of Object.entries(errors)) {
    const allowed = baseline[key]?.count ?? 0;
    if (entry.count > allowed) {
      regressions.push({ ...entry, allowed });
    }
  }

  if (regressions.length > 0) {
    console.error("\ntypecheck: new type errors not present in the baseline:\n");
    for (const r of regressions) {
      console.error(`  ${r.file}  ${r.code}  (${r.count} found, ${r.allowed} allowed)`);
      console.error(`    ${r.sample}`);
    }
    console.error("\nRun `yarn typecheck` for the full output with line numbers.\n");
    process.exit(1);
  }

  const fixed = Object.entries(baseline).filter(
    ([key, entry]) => (errors[key]?.count ?? 0) < entry.count,
  );
  if (fixed.length > 0) {
    console.log("typecheck: no regressions. These baseline errors are now fixed:\n");
    for (const [, entry] of fixed) console.log(`  ${entry.file}  ${entry.code}`);
    console.log("\nRun `yarn typecheck:baseline --update` and commit the smaller baseline.");
    return;
  }

  const total = Object.values(errors).reduce((n, e) => n + e.count, 0);
  console.log(`typecheck: no regressions (${total} known baseline error(s) remain).`);
}

main();
